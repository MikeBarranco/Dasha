import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { ReportService } from '../services/report.service';
import { analyzeAnimalPhoto } from '../services/animalAnalysis.service';
import { AchievementService } from '../services/achievement.service';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../config/db';

// Configurar Cloudinary (toma las credenciales de process.env automáticamente)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class ReportController {
  
  static async createReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoBase64, photos, ...restData } = req.body;
      const userId = (req as any).user?.id; // Inyectado por el auth.middleware
      
      const finalPhotos = photos || [];

      // Si aún mandan photoBase64 (flujo antiguo), lo subimos desde el backend
      if (photoBase64) {
        const uploadResult = await cloudinary.uploader.upload(photoBase64, {
          folder: 'dasha_reports',
        });
        finalPhotos.push({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        });
      }

      // Asegurar regla estricta de BD.txt (guardar url y public_id obligatoriamente)
      const data = {
        ...restData,
        userId: userId || restData.userId, // Prioriza el del JWT
        photos: finalPhotos
      };

      const report = await ReportService.createReport(data);
      
      // Evaluar logros de reportero de forma asíncrona (sin bloquear la respuesta)
      if (data.userId) {
        AchievementService.checkAndGrantReporterAchievements(data.userId);
        // Otorgar XP por reporte
        prisma.user.update({
          where: { id: data.userId },
          data: { experiencePoints: { increment: 10 } }
        }).catch((err: any) => console.error('Error granting XP for report:', err));
        
        prisma.reputationEvent.create({
          data: {
            userId: data.userId,
            reason: 'report',
            points: 10
          }
        }).catch((err: any) => console.error('Error creating reputation event:', err));
      }

      // DSH-29: Notificar a voluntarios cercanos si es urgencia alta o crítica
      if (data.urgency === 'high' || data.urgency === 'critical') {
        (async () => {
          try {
            // El NotificationService ya está importado arriba
            // Buscar voluntarios disponibles cercanos al reporte (dentro de su search_radius_km)
            const nearbyVolunteers: any[] = await prisma.$queryRaw`
              SELECT id, search_radius_km
              FROM users
              WHERE is_available = true
                AND volunteer_status = 'approved'
                AND last_location IS NOT NULL
                AND ST_DWithin(
                  last_location::geography,
                  ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography,
                  search_radius_km * 1000
                )
            `;

            for (const vol of nearbyVolunteers) {
              await NotificationService.sendNotification({
                userId: vol.id,
                title: '¡Emergencia cerca de ti!',
                body: `Se ha reportado un ${data.species === 'dog' ? 'perro' : 'gato'} con urgencia ${data.urgency === 'high' ? 'alta' : 'crítica'}.`,
                type: 'system_alert',
                referenceId: report.id,
                referenceType: 'report',
                link: `/reports/${report.id}`
              });
            }
          } catch (err) {
            console.error('Error notifying nearby volunteers (DSH-29):', err);
          }
        })();
      }
      
      res.status(201).json({
        status: 'success',
        message: 'Reporte creado correctamente con coordenadas.',
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const { lat, lng, radius_km, species, status } = req.query as any;
      
      const reports = await ReportService.getNearbyReports(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius_km),
        species,
        status
      );

      res.status(200).json({
        status: 'success',
        results: reports.length,
        data: reports
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { species, condition, urgency, size } = req.query as any;
      const filters = { species, condition, urgency, size };

      const reports = await ReportService.getAllActiveReports(filters);
      // El contrato de Miguel pide regresar el arreglo directamente, sin envolverlo en "data"
      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async getReportById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const report = await ReportService.getReportById(id);
      
      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' });
        return;
      }
      
      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      await ReportService.updateReportStatus(id, status, userId);
      
      // Devolver el reporte actualizado en formato frontend
      const updatedReport = await ReportService.getReportById(id);
      
      res.status(200).json(updatedReport);
    } catch (error: any) {
      if (error.message === 'Reporte no encontrado') {
        res.status(404).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }

  static async acceptCase(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const result = await ReportService.acceptRescueCase(id, userId);
      
      // Devolver el assignment directamente para que el frontend pueda leer el ID
      res.status(200).json(result.assignment);
    } catch (error: any) {
      if (error.message === 'Reporte no encontrado') {
        res.status(404).json({ error: error.message });
      } else if (
        error.message === 'El reporte no está activo o ya fue aceptado' ||
        error.message === 'Solo voluntarios aprobados pueden aceptar casos'
      ) {
        res.status(403).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }

  static async checkDuplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const { lat, lng, species } = req.query;

      if (!lat || !lng || !species) {
        res.status(400).json({ error: 'Faltan parámetros requeridos: lat, lng, species' });
        return;
      }

      const hasDuplicate = await ReportService.checkNearbyDuplicate(
        parseFloat(lat as string),
        parseFloat(lng as string),
        species as string
      );

      res.status(200).json({ hasDuplicate });
    } catch (error) {
      next(error);
    }
  }

  static async analyzePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { cloudinaryUrl } = req.body;

      if (!cloudinaryUrl) {
        res.status(400).json({ error: 'Falta la URL de Cloudinary (cloudinaryUrl)' });
        return;
      }

      const analysisResult = await analyzeAnimalPhoto(cloudinaryUrl);
      
      res.status(200).json({
        status: 'success',
        data: analysisResult
      });
    } catch (error) {
      next(error);
    }
  }

  static async addSighting(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { lat, lng, description, photoUrl } = req.body;
      const userId = (req as any).user?.id;

      if (!lat || !lng) {
        res.status(400).json({ error: 'Latitud y longitud son requeridas' });
        return;
      }

      await prisma.$executeRaw`
        INSERT INTO case_actions (
          id, report_id, actor_id, action_type, description, metadata, created_at
        ) VALUES (
          gen_random_uuid(), 
          ${id}::uuid, 
          ${userId ? userId : null}::uuid, 
          'sighting_added'::"ActionType", 
          ${description || 'Nuevo avistamiento reportado'}, 
          ${JSON.stringify({ photoUrl, lat, lng })}::jsonb, 
          NOW()
        );
      `;

      // Actualizar ǧltima ubicacin del reporte
      await prisma.$executeRaw`
        UPDATE reports
        SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        WHERE id = ${id}::uuid;
      `;

      res.status(201).json({ status: 'success', message: 'Avistamiento sumado exitosamente' });
    } catch (error) {
      next(error);
    }
  }
}
