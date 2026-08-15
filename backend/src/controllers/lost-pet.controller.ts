import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';
import { Prisma } from '@prisma/client';

export class LostPetController {
  
  /**
   * Crea un reporte de mascota perdida
   * Esto internamente crea un 'Report' y lo vincula a un 'LostPet'
   */
  static async createLostPet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { 
        petName, species, primaryColor, color, secondaryColor, size, condition, 
        distinctiveMarks, description, lat, lng, searchRadiusKm, reward, contactWhatsapp, contactName, lastSeenAt,
        photosBase64 
      } = req.body;

      if (!lat || !lng || !species || !size || !condition || !photosBase64 || !Array.isArray(photosBase64) || photosBase64.length === 0) {
        res.status(400).json({ error: 'Faltan campos obligatorios o fotos' });
        return;
      }

      // 1. Subir fotos a Cloudinary
      const uploadPromises = photosBase64.map((base64: string) => 
        cloudinary.uploader.upload(base64, { folder: 'dasha/lost_pets' })
      );
      const cloudinaryResults = await Promise.all(uploadPromises);

      const photosData = cloudinaryResults.map(res => ({
        url: res.secure_url,
        publicId: res.public_id,
        uploadedBy: userId
      }));

      // 2. Transacción de Prisma para crear Report y LostPet
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // A. Crear el Report base
        const report = await tx.report.create({
          data: {
            userId,
            species,
            primaryColor: primaryColor || color || 'Desconocido',
            secondaryColor,
            size,
            condition,
            urgency: 'high', // Las mascotas perdidas son urgentes por defecto
            description: description || distinctiveMarks || '',
            status: 'active',
            photos: {
              create: photosData
            }
          }
        });

        // B. Crear el LostPet vinculado usando Raw Query (porque lastSeenLocation es Unsupported y obligatorio)
        const radius = searchRadiusKm || 3;
        const rewardVal = reward != null ? Number(reward) : null;
        const seenAt = lastSeenAt ? new Date(lastSeenAt) : new Date();
        const safeContactName = contactName || null;
        const safeContactWhatsapp = contactWhatsapp || null;
        const safePetName = petName || null;
        const safeDistinctiveMarks = distinctiveMarks || null;
        
        const lostPetRes: any[] = await tx.$queryRaw`
          INSERT INTO lost_pets (
            report_id, owner_id, pet_name, distinctive_marks, 
            last_seen_location, last_seen_at, search_radius_km, reward, contact_whatsapp, contact_name, is_found
          ) VALUES (
            ${report.id}::uuid, ${userId}::uuid, ${safePetName}, ${safeDistinctiveMarks}, 
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), ${seenAt}, ${radius}, ${rewardVal}, ${safeContactWhatsapp}, ${safeContactName}, false
          ) RETURNING id;
        `;

        const lostPetId = lostPetRes[0].id;

        // C. Actualizar coordenadas PostGIS y Colonia en Report
        await tx.$executeRaw`
          UPDATE "reports"
          SET 
            location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
            colony_id = (
              SELECT id FROM "colonies"
              WHERE ST_Intersects("geometry", ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography)
              LIMIT 1
            )
          WHERE id = ${report.id}::uuid;
        `;

        return { reportId: report.id, lostPetId };
      });

      // 3. Notificar a usuarios a 1km a la redonda
      try {
        const { NotificationService } = await import('../services/notification.service.js');
        const nearbyUsers: any[] = await prisma.$queryRaw`
          SELECT id 
          FROM "users" 
          WHERE ST_DWithin(last_location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 1000)
            AND id != ${userId}::uuid
            AND is_active = true
        `;
        // Nota: en PostgreSQL, PostGIS mide distancias en metros si la geografía es geography(Point, 4326)
        
        if (nearbyUsers.length > 0) {
          const pushPromises = nearbyUsers.map(u => 
            NotificationService.sendNotification({
              userId: u.id,
              title: '¡Mascota perdida cerca de ti!',
              body: `Se ha reportado una mascota perdida a menos de 1km de tu última ubicación: ${petName || 'Mascota'}.`,
              type: 'system',
              link: `/map?reportId=${result.reportId}`
            })
          );
          await Promise.allSettled(pushPromises);
        }
      } catch (err) {
        console.error('Error enviando alertas de mascota perdida por cercanía:', err);
      }

      res.status(201).json({
        message: 'Mascota perdida reportada con éxito',
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene las mascotas perdidas activas (isFound = false) para pintarlas en el mapa
   */
  static async getActiveLostPets(req: Request, res: Response, next: NextFunction) {
    try {
      // Extraemos lat, lng de PostGIS con queryRaw
      const lostPets: any[] = await prisma.$queryRaw`
        SELECT 
          lp.id as "lostPetId",
          r.id as "reportId",
          lp.pet_name as "petName",
          r.species,
          r.primary_color as "primaryColor",
          r.size,
          lp.distinctive_marks as "distinctiveMarks",
          lp.search_radius_km as "searchRadiusKm",
          lp.reward,
          lp.contact_whatsapp as "contactWhatsapp",
          lp.last_seen_at as "lastSeenAt",
          r.created_at as "createdAt",
          ST_X(lp.last_seen_location::geometry) as lng,
          ST_Y(lp.last_seen_location::geometry) as lat,
          c.name as "colonyName",
          (SELECT url FROM report_photos rp WHERE rp.report_id = r.id ORDER BY rp.created_at ASC LIMIT 1) as photo
        FROM lost_pets lp
        JOIN reports r ON lp.report_id = r.id
        LEFT JOIN colonies c ON r.colony_id = c.id
        WHERE lp.is_found = false
          AND r.status = 'active'
        ORDER BY r.created_at DESC;
      `;

      res.status(200).json(lostPets);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Marca una mascota como encontrada
   */
  static async markAsFound(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      // Validar que el usuario sea el dueño de la mascota perdida
      const lostPet = await prisma.lostPet.findUnique({
        where: { id }
      });

      if (!lostPet) {
        res.status(404).json({ error: 'Mascota perdida no encontrada' });
        return;
      }

      if (lostPet.ownerId !== userId) {
        res.status(403).json({ error: 'No tienes permiso para modificar este reporte' });
        return;
      }

      // Usar transacción para actualizar el LostPet y el Report base
      await prisma.$transaction(async (tx) => {
        await tx.lostPet.update({
          where: { id },
          data: { isFound: true }
        });

        await tx.report.update({
          where: { id: lostPet.reportId },
          data: { 
            status: 'closed',
            closedAt: new Date()
          }
        });
      });

      res.status(200).json({ message: '¡Felicidades! La mascota ha sido marcada como encontrada.' });
    } catch (error) {
      next(error);
    }
  }
}
