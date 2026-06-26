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
          AND NOT EXISTS (SELECT 1 FROM lost_pets lp WHERE lp.report_id = r.id)
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
          AND NOT EXISTS (SELECT 1 FROM lost_pets lp WHERE lp.report_id = r.id)
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
      size: row.size,
      condition: row.condition,
      severity: severity,
      photoUrl: row.photo || null,
      description: row.description,
      status: statusStr,
      createdAt: row.created_at
    };
  }

  /**
   * Obtiene TODOS los reportes activos (para la vista principal del mapa) con filtros opcionales
   */
  static async getAllActiveReports(filters?: { species?: string; condition?: string; urgency?: string; size?: string; }) {
    const conditions = [
      Prisma.sql`r.status = 'active'::"ReportStatus"`, 
      Prisma.sql`r.location IS NOT NULL`,
      Prisma.sql`NOT EXISTS (SELECT 1 FROM lost_pets lp WHERE lp.report_id = r.id)`
    ];
    
    if (filters?.species) conditions.push(Prisma.sql`r.species = ${filters.species}::"Species"`);
    if (filters?.condition) conditions.push(Prisma.sql`r.condition = ${filters.condition}::"Condition"`);
    if (filters?.urgency) conditions.push(Prisma.sql`r.urgency = ${filters.urgency}::"Urgency"`);
    if (filters?.size) conditions.push(Prisma.sql`r.size = ${filters.size}::"Size"`);

    const whereClause = Prisma.join(conditions, ' AND ');

    const reports: any[] = await prisma.$queryRaw`
      SELECT 
        r.id, r.species, r.size, r.condition, r.urgency, r.status, r.description, r.created_at,
        ST_X(r.location::geometry) as lng,
        ST_Y(r.location::geometry) as lat,
        c.name as colonia,
        (SELECT url FROM report_photos rp WHERE rp.report_id = r.id ORDER BY rp.created_at ASC LIMIT 1) as photo
      FROM reports r
      LEFT JOIN colonies c ON r.colony_id = c.id
      WHERE ${whereClause}
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
        r.id, r.species, r.size, r.condition, r.urgency, r.status, r.description, r.created_at,
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

  /**
   * Actualiza el estado de un reporte y registra el cambio en el historial
   */
  static async updateReportStatus(reportId: string, newStatus: any, userId: string) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Obtener el reporte actual para saber el estado previo
      const currentReport = await tx.report.findUnique({
        where: { id: reportId },
        select: { status: true }
      });

      if (!currentReport) {
        throw new Error('Reporte no encontrado');
      }

      // Actualizar el reporte
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: newStatus,
          updatedAt: new Date()
        }
      });

      // Registrar el cambio en el historial
      await tx.reportStatusHistory.create({
        data: {
          reportId,
          fromStatus: currentReport.status,
          toStatus: newStatus,
          changedBy: userId
        }
      });

      return updatedReport;
    });
  }

  /**
   * Asigna un reporte a un voluntario (Aceptar caso)
   */
  static async acceptRescueCase(reportId: string, volunteerId: string) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Validar reporte
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: { status: true }
      });

      if (!report) {
        throw new Error('Reporte no encontrado');
      }

      if (report.status !== 'active') {
        throw new Error('El reporte no está activo o ya fue aceptado');
      }

      // 2. Validar voluntario
      const volunteer = await tx.user.findUnique({
        where: { id: volunteerId },
        select: { volunteerStatus: true }
      });

      if (!volunteer || volunteer.volunteerStatus !== 'approved') {
        throw new Error('Solo voluntarios aprobados pueden aceptar casos');
      }

      // 3. Crear RescueAssignment
      const assignment = await tx.rescueAssignment.create({
        data: {
          reportId,
          volunteerId,
          status: 'accepted'
        }
      });

      // 4. Actualizar estado del reporte
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: 'in_progress',
          volunteerId,
          updatedAt: new Date()
        }
      });

      // 5. Registrar en ReportStatusHistory y CaseAction
      await tx.reportStatusHistory.create({
        data: {
          reportId,
          fromStatus: 'active',
          toStatus: 'in_progress',
          changedBy: volunteerId
        }
      });

      await tx.caseAction.create({
        data: {
          reportId,
          actorId: volunteerId,
          actionType: 'accepted',
          description: 'El voluntario ha aceptado el caso de rescate'
        }
      });

      return {
        report: updatedReport,
        assignment
      };
    });
  }

  /**
   * Verifica si existe un reporte activo de la misma especie en un radio de 500m.
   * Utilizado para prevención de duplicados (A.4).
   */
  static async checkNearbyDuplicate(lat: number, lng: number, species: string): Promise<boolean> {
    const nearbyReports: any[] = await prisma.$queryRaw`
      SELECT id 
      FROM reports 
      WHERE species = ${species}::"Species"
        AND status = 'active'::"ReportStatus"
        AND location IS NOT NULL
        AND ST_DWithin(
          location, 
          ST_MakePoint(${lng}, ${lat})::geography, 
          500
        )
      LIMIT 1;
    `;
    
    return nearbyReports.length > 0;
  }
}
