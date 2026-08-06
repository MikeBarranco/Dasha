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
        AchievementService.checkAndGrantReporterAchievements(data.userId)
          .catch((err: any) => console.error('Error in checkAndGrantReporterAchievements:', err));
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
                type: 'rescue_alert',
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
      const userId = (req as any).user?.id;
      const report = await ReportService.getReportById(id, userId);
      
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

      // Notificar al dueño y a followers
      try {
        const { NotificationService } = await import('../services/notification.service.js');
        const reportModel = await prisma.report.findUnique({
          where: { id },
          include: { followers: true }
        });

        if (reportModel) {
          const statusMap: any = {
            active: 'Activo',
            in_progress: 'En progreso (Rescate en camino)',
            rescued: 'Rescatado',
            in_treatment: 'En tratamiento médico',
            recovering: 'En recuperación',
            looking_for_foster: 'Buscando hogar temporal',
            in_foster: 'En hogar temporal',
            looking_for_adoption: 'Buscando adopción',
            adopted: '¡Adoptado!',
            closed: 'Cerrado',
            duplicate: 'Duplicado',
            not_found: 'No encontrado'
          };
          const statusName = statusMap[status] || status;

          const notifyUsers = new Set<string>();
          if (reportModel.userId) notifyUsers.add(reportModel.userId);
          reportModel.followers.forEach(f => notifyUsers.add(f.userId));

          for (const uId of notifyUsers) {
            await NotificationService.sendNotification({
              userId: uId,
              title: 'Actualización de reporte',
              body: `El estado del reporte al que le das seguimiento ha cambiado a: ${statusName}.`,
              type: 'status_change',
              referenceId: id,
              referenceType: 'report',
              link: '/reports/' + id
            });
          }
        }
      } catch (err) {
        console.error('Error enviando push update status', err);
      }
      
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
      const { lat, lng, description, photoUrl, photoBase64 } = req.body;
      const userId = (req as any).user?.id;

      if (!lat || !lng) {
        res.status(400).json({ error: 'Latitud y longitud son requeridas' });
        return;
      }

      let finalPhotoUrl = photoUrl;

      if (photoBase64) {
        const uploadResult = await cloudinary.uploader.upload(photoBase64, {
          folder: 'dasha_reports_sightings',
        });
        finalPhotoUrl = uploadResult.secure_url;
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
          ${JSON.stringify({ photoUrl: finalPhotoUrl, lat, lng })}::jsonb, 
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

  // ==========================================
  // SEGUIMIENTO DE REPORTES
  // ==========================================

  static async followReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const reportId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      await prisma.reportFollower.upsert({
        where: { userId_reportId: { userId, reportId } },
        update: {},
        create: { userId, reportId }
      });

      res.status(200).json({ message: 'Ahora sigues este reporte' });
    } catch (error) {
      next(error);
    }
  }

  static async unfollowReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const reportId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      await prisma.reportFollower.deleteMany({
        where: { userId, reportId }
      });

      res.status(200).json({ message: 'Dejaste de seguir este reporte' });
    } catch (error) {
      next(error);
    }
  }

  // ============================  // Función para mapear motivos en español al enum de Prisma FlagReason
  static mapReason(reason: string): any {
    const normalized = reason.toLowerCase();
    if (normalized.includes('ofensivo') || normalized.includes('inapropiado')) return 'inappropriate';
    if (normalized.includes('spam') || normalized.includes('publicidad')) return 'spam';
    if (normalized.includes('falsa') || normalized.includes('internet') || normalized.includes('no hay')) return 'fake';
    return 'other';
  }

  // REPORTE DE ABUSO O FALSO REPORTE
  // ==========================================
  
  static async flagReport(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = req.params.id as string;
      const { reason, notes, details } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Debe proporcionar una razón para el reporte' });
        return;
      }

      const reportModel = await prisma.report.findUnique({ where: { id: reportId } });
      if (!reportModel) {
        res.status(404).json({ error: 'Reporte no encontrado' });
        return;
      }

      const mappedReason = ReportController.mapReason(reason);

      const flag = await prisma.reportFlag.create({
        data: {
          reportId,
          flaggedBy: userId,
          reason: mappedReason,
          notes: details || notes || reason,
          status: 'open'
        }
      });

      res.status(201).json({ message: 'Reporte de calle marcado exitosamente', flag });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // Aliado ofrece recurso en un reporte (POST /reports/:id/offer)
  // ==========================================
  
  static async offerResource(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = req.params.id as string;
      const userId = (req as any).user?.id;
      const { title, description, resourceType } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      if (!title || !resourceType) {
        res.status(400).json({ error: 'Faltan campos obligatorios: title, resourceType' });
        return;
      }

      // Check if report exists
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' });
        return;
      }

      // Check if user is an ally (has organization)
      const emp = await prisma.organizationEmployee.findFirst({
        where: { userId, isVerified: true },
        select: { organizationId: true }
      });

      const resource = await prisma.resource.create({
        data: {
          providerId: userId,
          organizationId: emp ? emp.organizationId : null,
          reportId,
          title,
          description,
          resourceType: resourceType || 'medical_service', // default to medical_service
          status: 'offered'
        }
      });

      // Registrar accion
      await prisma.caseAction.create({
        data: {
          reportId,
          actorId: userId,
          actionType: 'resource_offered',
          description: `Oferta de ayuda: ${title}`,
          metadata: { resourceId: resource.id }
        }
      });

      res.status(201).json({
        message: 'Oferta de ayuda registrada exitosamente',
        data: resource
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ADOPCIONES MVP
  // ==========================================
  static async adoptRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = req.params.id as string;
      const applicantId = (req as any).user?.id;
      const { message } = req.body;

      if (!applicantId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' });
        return;
      }

      // Evitar duplicados del mismo usuario para el mismo reporte
      const existing = await prisma.reportAdoptionRequest.findFirst({
        where: { reportId, applicantId }
      });

      if (existing) {
        res.status(400).json({ error: 'Ya has enviado una solicitud de adopción para este reporte.' });
        return;
      }

      const adoptionReq = await prisma.reportAdoptionRequest.create({
        data: {
          reportId,
          applicantId,
          message: message || 'Me interesa adoptar a esta mascota.'
        },
        include: { applicant: true }
      });

      // Notificar al dueño del reporte
      if (report.userId !== applicantId) {
        const { NotificationService } = await import('../services/notification.service.js');
        await NotificationService.sendNotification({
          userId: report.userId,
          title: '¡Alguien quiere adoptar! 🏠',
          body: `${adoptionReq.applicant.name} está interesado(a) en adoptar. Revisa los interesados en tu reporte.`,
          type: 'system',
          referenceId: reportId,
          referenceType: 'report',
          link: `/reports/${reportId}`
        });
      }

      res.status(201).json({
        status: 'success',
        message: 'Solicitud enviada correctamente',
        data: adoptionReq
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdoptionRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = req.params.id as string;
      const userId = (req as any).user?.id;

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' });
        return;
      }

      // Solo el dueño del reporte (o un admin) puede ver los interesados
      const isAdmin = (req as any).user?.role === 'admin';
      if (report.userId !== userId && !isAdmin) {
        res.status(403).json({ error: 'No tienes permiso para ver los interesados de este reporte' });
        return;
      }

      const requests = await prisma.reportAdoptionRequest.findMany({
        where: { reportId },
        include: {
          applicant: {
            select: { id: true, name: true, phone: true, email: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(requests);
    } catch (error) {
      next(error);
    }
  }
  static async adoptDirectly(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = req.params.id as string;
      const userId = (req as any).user?.id;
      const { photoBase64, name } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      if (!photoBase64) {
        res.status(400).json({ error: 'Se requiere una foto (selfie) como prueba de adopción' });
        return;
      }

      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' });
        return;
      }

      if (report.status === 'adopted' || report.status === 'closed') {
        res.status(400).json({ error: 'El reporte ya está cerrado o el animal ya fue adoptado' });
        return;
      }

      // 1. Subir la foto a cloudinary
      const { v2: cloudinary } = await import('cloudinary');
      const uploadRes = await cloudinary.uploader.upload(photoBase64, {
        folder: 'dasha/animals'
      });

      // 2. Crear perfil del animal a nombre del ciudadano y actualizar el reporte en transacción
      const animal = await prisma.$transaction(async (tx) => {
        const newAnimal = await tx.animalProfile.create({
          data: {
            report: { connect: { id: report.id } },
            adopter: { connect: { id: userId } },
            name: name || 'Adoptado',
            species: report.species || 'dog',
            color: report.primaryColor,
            status: 'adopted',
            adoptedAt: new Date(),
            photos: {
              create: {
                url: uploadRes.secure_url,
                publicId: uploadRes.public_id,
                orderIndex: 0
              }
            }
          }
        });

        // Actualizar el reporte a status 'adopted'
        await tx.report.update({
          where: { id: report.id },
          data: { status: 'adopted' }
        });

        return newAnimal;
      });

      res.status(201).json({
        status: 'success',
        message: '¡Felicidades por tu adopción!',
        animal
      });
    } catch (error) {
      next(error);
    }
  }
}
