import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          level: true,
          experiencePoints: true,
          reputationScore: true,
          avatarUrl: true,
          volunteerStatus: true,
          _count: {
            select: {
              reports: true,
              rescueAssignments: true
            }
          },
          achievements: {
            include: {
              achievement: true
            }
          }
        }
      });

      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/me/availability
  static async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAvailable: true, searchRadiusKm: true }
      });

      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      const locationRes: any[] = await prisma.$queryRaw`
        SELECT ST_X(last_location::geometry) as lng, ST_Y(last_location::geometry) as lat
        FROM users WHERE id = ${userId}::uuid
      `;

      res.status(200).json({
        isAvailable: user.isAvailable,
        searchRadiusKm: user.searchRadiusKm,
        lat: locationRes[0]?.lat || null,
        lng: locationRes[0]?.lng || null
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { isAvailable, searchRadiusKm, lat, lng } = req.body;

      // 1. Verificar que el usuario sea voluntario aprobado
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { volunteerStatus: true }
      });

      if (!user || user.volunteerStatus !== 'approved') {
        res.status(403).json({ error: 'Solo voluntarios aprobados pueden ponerse en modo activo' });
        return;
      }

      // 2. Actualizar datos base (no geográficos)
      await prisma.user.update({
        where: { id: userId },
        data: {
          isAvailable,
          searchRadiusKm
        }
      });

      // 3. Si mandó lat y lng (modo activo), actualizar PostGIS y fecha
      if (lat !== undefined && lng !== undefined) {
        await prisma.$executeRaw`
          UPDATE "users"
          SET 
            last_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
            last_location_at = NOW()
          WHERE id = ${userId}::uuid;
        `;
      }

      // 4. Retornar usuario actualizado (sin campos sensibles)
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isAvailable: true,
          searchRadiusKm: true,
          volunteerStatus: true
        }
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  static async getMyReports(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      // Obtener reportes con la foto principal
      const reports = await prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          photos: {
            take: 1
          },
          colony: true
        }
      });

      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async getMyRescueAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { status } = req.query;

      const assignments = await prisma.rescueAssignment.findMany({
        where: {
          volunteerId: userId,
          ...(status ? { status: status as any } : {})
        },
        include: {
          report: true,
          destinationOrg: { select: { id: true, name: true } }
        },
        orderBy: { acceptedAt: 'desc' }
      });

      res.status(200).json(assignments);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { name, phone, avatarUrl } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name, phone, avatarUrl },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          level: true,
          experiencePoints: true,
          reputationScore: true,
          avatarUrl: true
        }
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  static async applyForVolunteer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { 
        idDocBase64, idSelfieBase64, 
        isFoster, fosterCapacity, 
        phone, zone, availability, helpType, motivation 
      } = req.body;

      if (!idDocBase64 || !idSelfieBase64) {
        res.status(400).json({ error: 'Debes proporcionar tu identificación y una selfie' });
        return;
      }

      // Subir a Cloudinary
      const uploadOpts = { folder: 'dasha/volunteers' };
      const [docRes, selfieRes] = await Promise.all([
        cloudinary.uploader.upload(idDocBase64, uploadOpts),
        cloudinary.uploader.upload(idSelfieBase64, uploadOpts)
      ]);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          volunteerStatus: 'pending',
          ineFrontUrl: docRes.secure_url,
          ineBackUrl: null, // Ya no se pide reverso por separado
          selfieUrl: selfieRes.secure_url,
          isFoster: isFoster || false,
          fosterCapacity: fosterCapacity || 0,
          phone: phone || undefined,
          volunteerPrefs: {
            zone,
            availability,
            helpType,
            motivation
          }
        },
        select: {
          id: true,
          name: true,
          volunteerStatus: true,
          isFoster: true,
          phone: true,
          volunteerPrefs: true
        }
      });

      res.status(200).json({ message: 'Solicitud enviada correctamente', user: updatedUser });
    } catch (error) {
      console.error('Error en applyForVolunteer:', error);
      next(error);
    }
  }

  static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' }
      });
      res.status(200).json(notifications);
    } catch (error) {
      next(error);
    }
  }

  static async updateNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params as { id: string };
      const { isRead } = req.body;

      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      const notif = await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead }
      });

      if (notif.count === 0) {
        return res.status(404).json({ error: 'Notificación no encontrada' });
      }

      res.status(200).json({ message: 'Notificación actualizada' });
    } catch (error) {
      next(error);
    }
  }

  static async markAllNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'No autorizado' });

      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });

      res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
      next(error);
    }
  }

  static async savePushSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const subscription = req.body;

      if (!userId) return res.status(401).json({ error: 'No autorizado' });
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Suscripción inválida' });
      }

      const { NotificationService } = await import('../services/notification.service.js');
      const saved = await NotificationService.saveSubscription(userId, subscription);
      
      res.status(200).json(saved);
    } catch (error) {
      next(error);
    }
  }
}
