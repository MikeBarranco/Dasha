import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcrypt';

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
          volunteerRejectionReason: true,
          passwordHash: true, // Agregado para evaluar hasPassword
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

      const expectedLevel = Math.floor(user.experiencePoints / 100) + 1;
      if (expectedLevel > user.level) {
        user.level = expectedLevel;
        prisma.user.update({
          where: { id: userId },
          data: { level: expectedLevel }
        }).catch(err => console.error('Error auto-leveling user:', err));
      }

      const { passwordHash, ...userWithoutPassword } = user;

      res.status(200).json({
        ...userWithoutPassword,
        hasPassword: !!passwordHash
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/me/password
  static async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'currentPassword y newPassword son requeridos' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      if (!user.passwordHash) {
        res.status(400).json({ error: 'El usuario no tiene una contraseña configurada, ingresa a través de tu proveedor social.' });
        return;
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const newPasswordHash = await bcrypt.hash(newPassword, salt);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      res.status(200).json({ message: 'Contraseña actualizada correctamente' });
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

  // GET /api/v1/me/achievements/available
  static async getAvailableAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: { pointsReward: 'asc' }
      });
      res.status(200).json(achievements);
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

  static async getMyOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      // Buscar si el usuario pertenece a alguna organización a través de organization_employees
      const employee = await prisma.organizationEmployee.findFirst({
        where: { userId },
        include: {
          organization: true
        }
      });

      if (!employee) {
        res.status(404).json({ error: 'No perteneces a ninguna organización' });
        return;
      }

      // Devolver la organización + su rol
      res.status(200).json({
        ...employee.organization,
        roleInOrg: employee.roleInOrg,
        isVerifiedEmployee: employee.isVerified
      });
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

  static async getMyContributions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const needContributions = await prisma.needContribution.findMany({
        where: { userId },
        include: { need: true },
        orderBy: { createdAt: 'desc' }
      });

      const donations = await prisma.donation.findMany({
        where: { userId },
        include: { animal: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({
        needs: needContributions,
        donations
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyAdopted(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const adoptedAnimals = await prisma.animalProfile.findMany({
        where: { adoptedByUserId: userId },
        include: {
          organization: { select: { name: true } },
          photos: true
        }
      });

      res.status(200).json(adoptedAnimals);
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

  static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { reason } = req.body; // Opcional, para analíticas si el frontend lo envía

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      // Proteger cuentas del Core Team
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role === 'admin') {
        res.status(403).json({ error: 'Las cuentas del Core Team no pueden ser eliminadas.' });
        return;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false } // Borrado lógico
      });

      res.status(200).json({ message: 'Cuenta inactivada exitosamente' });
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

      // Notificar a todos los administradores
      const { NotificationService } = await import('../services/notification.service.js');
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true }
      });
      
      const adminPushPromises = admins.map(admin => 
        NotificationService.sendNotification({
          userId: admin.id,
          title: 'Nueva solicitud de voluntario',
          body: `${updatedUser.name} ha enviado una solicitud de voluntariado.`,
          type: 'system_alert',
          link: '/admin/volunteers'
        })
      );
      await Promise.allSettled(adminPushPromises);

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
