import { prisma } from '../config/db';
import { Prisma } from '@prisma/client';

export class ReportService {
  /**
   * Crea un reporte en la base de datos y le asigna la coordenada geográfica (PostGIS)
   */
  static async createReport(data: any) {
    // 1. Insertamos el reporte (sin las coordenadas inicialmente, porque Prisma no soporta inyectarlas directo en el create)
    // Usamos una transacción para que si falla el update de coordenadas o la foto, se cancele todo
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.report.create({
        data: {
          userId: data.userId,
          species: data.species,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          size: data.size,
          condition: data.condition,
          urgency: data.urgency,
          description: data.description || '',
          // Insertamos las fotos en la misma transacción (relación)
          photos: {
            create: data.photos.map((photo: any) => ({
              url: photo.url,
              publicId: photo.publicId,
              uploadedBy: data.userId
            }))
          }
        },
        include: {
          photos: true
        }
      });

      // 2. Inyectar la coordenada geoespacial con SQL Crudo (PostGIS) y buscar la colonia
      await tx.$executeRaw`
        UPDATE "reports"
        SET 
          location = ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326),
          colony_id = (
            SELECT id FROM "colonies"
            WHERE ST_Intersects("geometry", ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography)
            LIMIT 1
          )
        WHERE id = ${report.id}::uuid;
      `;

      return report;
    });
  }

  /**
   * Obtiene reportes cercanos usando PostGIS (ST_DWithin)
   */
  static async getNearbyReports(lat: number, lng: number, radiusKm: number, species?: string, status: string = 'active') {
    const radiusMeters = radiusKm * 1000;

    // Prisma $queryRaw nos permite usar la magia espacial
    // Se calcula la distancia en metros entre cada reporte y el punto brindado.
    let reports: any[];
    
    if (species) {
      reports = await prisma.$queryRaw`
        SELECT 
          r.id, r.species, r.primary_color, r.size, r.condition, r.urgency, r.status, r.description, r.created_at,
          ST_X(r.location::geometry) as lng,
          ST_Y(r.location::geometry) as lat,
          ST_Distance(r.location, ST_MakePoint(${lng}, ${lat})::geography) AS distance_meters,
          c.name as colonia,
          (SELECT url FROM report_photos rp WHERE rp.report_id = r.id ORDER BY rp.created_at ASC LIMIT 1) as photo
        FROM reports r
        LEFT JOIN colonies c ON r.colony_id = c.id
        WHERE r.status = ${status}::"ReportStatus"
          AND r.species = ${species}::"Species"
          AND r.location IS NOT NULL
          AND ST_DWithin(r.location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
        ORDER BY distance_meters ASC
        LIMIT 50;
      `;
    } else {
      reports = await prisma.$queryRaw`
        SELECT 
          r.id, r.species, r.primary_color, r.size, r.condition, r.urgency, r.status, r.description, r.created_at,
          ST_X(r.location::geometry) as lng,
          ST_Y(r.location::geometry) as lat,
          ST_Distance(r.location, ST_MakePoint(${lng}, ${lat})::geography) AS distance_meters,
          c.name as colonia,
          (SELECT url FROM report_photos rp WHERE rp.report_id = r.id ORDER BY rp.created_at ASC LIMIT 1) as photo
        FROM reports r
        LEFT JOIN colonies c ON r.colony_id = c.id
        WHERE r.status = ${status}::"ReportStatus"
          AND r.location IS NOT NULL
          AND ST_DWithin(r.location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
        ORDER BY distance_meters ASC
        LIMIT 50;
      `;
    }

    return reports;
  }

  /**
   * Helper para traducir la urgencia a severidad y formatear el objeto
   */
  private static formatReportForFrontend(row: any) {
    let severity = 'media';
    if (row.urgency === 'critical' || row.urgency === 'high') severity = 'critica';
    if (row.urgency === 'low') severity = 'baja';

    let statusStr = 'Activo';
    if (row.status !== 'active') statusStr = row.status;

    return {
      id: row.id,
      lat: row.lat,
      lng: row.lng,
      colonia: row.colonia || 'Desconocida',
      species: row.species === 'dog' ? 'perro' : (row.species === 'cat' ? 'gato' : row.species),
      condition: row.condition,
      severity: severity,
      photoUrl: row.photo || null,
      description: row.description,
      status: statusStr,
      createdAt: row.created_at
    };
  }

  /**
   * Obtiene TODOS los reportes activos (para la vista principal del mapa)
   */
  static async getAllActiveReports() {
    const reports: any[] = await prisma.$queryRaw`
      SELECT 
        r.id, r.species, r.condition, r.urgency, r.status, r.description, r.created_at,
        ST_X(r.location::geometry) as lng,
        ST_Y(r.location::geometry) as lat,
        c.name as colonia,
        (SELECT url FROM report_photos rp WHERE rp.report_id = r.id ORDER BY rp.created_at ASC LIMIT 1) as photo
      FROM reports r
      LEFT JOIN colonies c ON r.colony_id = c.id
      WHERE r.status = 'active'::"ReportStatus"
        AND r.location IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT 100;
    `;

    return reports.map(this.formatReportForFrontend);
  }

  /**
   * Obtiene un reporte específico por su ID
   */
  static async getReportById(id: string) {
    const reports: any[] = await prisma.$queryRaw`
      SELECT 
        r.id, r.species, r.condition, r.urgency, r.status, r.description, r.created_at,
        ST_X(r.location::geometry) as lng,
        ST_Y(r.location::geometry) as lat,
        c.name as colonia,
        (SELECT url FROM report_photos rp WHERE rp.report_id = r.id ORDER BY rp.created_at ASC LIMIT 1) as photo
      FROM reports r
      LEFT JOIN colonies c ON r.colony_id = c.id
      WHERE r.id = ${id}::uuid
      LIMIT 1;
    `;

    if (!reports || reports.length === 0) {
      return null;
    }

    return this.formatReportForFrontend(reports[0]);
  }
}
