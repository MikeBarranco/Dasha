import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class AdminController {
  // ==========================================
  // USUARIOS
  // ==========================================
  static async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  static async deleteManualNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const log = await prisma.auditLog.findUnique({ where: { id } });
      if (!log || log.action !== 'send_manual_notification') {
        return res.status(404).json({ error: 'Aviso no encontrado' });
      }

      const { title, body } = log.metadata as any;

      // Remove notifications from users' inboxes
      if (title && body) {
        await prisma.notification.deleteMany({
          where: {
            title: title,
            body: body,
            type: 'system'
          }
        });
      }

      // Delete the history record
      await prisma.auditLog.delete({ where: { id } });

      res.status(200).json({ message: 'Aviso eliminado correctamente de la historia y de los usuarios' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
      
      const protectedEmails = [
        'isarumachorro.742@gmail.com',
        'espartan1047@gmail.com',
        'mike.11.barranco@gmail.com',
        'monicatapia1002@gmail.com',
        'sumayramontserrat@gmail.com'
      ];
      if (protectedEmails.includes(user.email)) {
        res.status(403).json({ error: 'No se pueden eliminar las cuentas del equipo fundador.' });
        return;
      }
      
      if (user.role === 'admin') {
        res.status(403).json({ error: 'No se puede eliminar a un administrador. Debe ser degradado a ciudadano primero.' });
        return;
      }

      // Para evitar errores de llaves foráneas, borramos en transacción todo lo que le pertenece
      await prisma.$transaction(async (tx) => {
        // FASE 1: Obtener los IDs de los reportes del usuario y limpiar sus dependencias
        const userReports = await tx.report.findMany({ where: { userId: id }, select: { id: true } });
        const reportIds = userReports.map(r => r.id);

        if (reportIds.length > 0) {
          // Mascotas perdidas vinculadas a los reportes
          const lostPets = await tx.lostPet.findMany({ where: { reportId: { in: reportIds } }, select: { id: true } });
          const lostPetIds = lostPets.map(lp => lp.id);
          if (lostPetIds.length > 0) {
            await tx.lostPetMatch.deleteMany({ where: { lostPetId: { in: lostPetIds } } });
            await tx.lostPet.deleteMany({ where: { id: { in: lostPetIds } } });
          }

          // Dependencias estándar de los reportes
          await tx.lostPetMatch.deleteMany({ where: { matchedReportId: { in: reportIds } } });
          await tx.reportStatusHistory.deleteMany({ where: { reportId: { in: reportIds } } });
          await tx.caseAction.deleteMany({ where: { reportId: { in: reportIds } } });
          await tx.rescueAssignment.deleteMany({ where: { reportId: { in: reportIds } } });
          await tx.resource.deleteMany({ where: { reportId: { in: reportIds } } });
          await tx.reportFlag.deleteMany({ where: { reportId: { in: reportIds } } });
          await tx.reportPhoto.deleteMany({ where: { reportId: { in: reportIds } } });
          
          // Finalmente, borrar los reportes
          await tx.report.deleteMany({ where: { userId: id } });
        }

        // FASE 2: Limpiar acciones del Usuario como "Actor" en cosas ajenas
        await tx.reportPhoto.deleteMany({ where: { uploadedBy: id } });
        await tx.reportStatusHistory.deleteMany({ where: { changedBy: id } });
        await tx.caseAction.deleteMany({ where: { actorId: id } });
        await tx.rescueAssignment.deleteMany({ where: { volunteerId: id } });
        await tx.resource.deleteMany({ where: { providerId: id } });
        await tx.donation.deleteMany({ where: { userId: id } });
        await tx.forumVote.deleteMany({ where: { userId: id } });
        await tx.forumReply.deleteMany({ where: { userId: id } });
        await tx.forumPost.deleteMany({ where: { userId: id } });
        await tx.auditLog.deleteMany({ where: { adminId: id } });
        await tx.discountCode.deleteMany({ where: { userId: id } });
        await tx.lostPet.deleteMany({ where: { ownerId: id } });
        await tx.reportFlag.deleteMany({ where: { flaggedBy: id } });

        // FASE 3: Desvincular de relaciones opcionales (poner en NULL)
        await tx.report.updateMany({ where: { volunteerId: id }, data: { volunteerId: null } });
        await tx.animalProfile.updateMany({ where: { currentFosterId: id }, data: { currentFosterId: null } });
        await tx.animalProfile.updateMany({ where: { adoptedByUserId: id }, data: { adoptedByUserId: null } });
        await tx.resource.updateMany({ where: { acceptedBy: id }, data: { acceptedBy: null } });
        await tx.donation.updateMany({ where: { approvedBy: id }, data: { approvedBy: null } });
        await tx.adoptionApplication.updateMany({ where: { reviewedBy: id }, data: { reviewedBy: null } });
        await tx.reportFlag.updateMany({ where: { reviewedBy: id }, data: { reviewedBy: null } });

        // FASE 4: Borrar dependencias directas de pertenencia (1 a N fuerte)
        await tx.medicalRecord.deleteMany({ where: { veterinarianId: id } });
        await tx.vaccination.deleteMany({ where: { veterinarianId: id } });
        await tx.organizationEmployee.deleteMany({ where: { userId: id } });
        await tx.fosterAssignment.deleteMany({ where: { fosterId: id } });
        await tx.adoptionApplication.deleteMany({ where: { applicantId: id } });
        await tx.authProvider.deleteMany({ where: { userId: id } });
        await tx.userAvatar.deleteMany({ where: { userId: id } });
        await tx.pushSubscription.deleteMany({ where: { userId: id } });
        await tx.notification.deleteMany({ where: { userId: id } });
        await tx.eventReminder.deleteMany({ where: { userId: id } });
        await tx.userAchievement.deleteMany({ where: { userId: id } });
        await tx.reputationEvent.deleteMany({ where: { userId: id } });

        // Finalmente, borrar al usuario
        await tx.user.delete({ where: { id } });
      });

      res.status(200).json({ message: 'Usuario y sus reportes eliminados correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { role } = req.body;
      const requesterId = (req as any).user?.id;
      
      if (!['citizen', 'volunteer', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Rol inválido' });
        return;
      }

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      if (requesterId === id) {
        res.status(403).json({ error: 'No puedes cambiar tu propio rol.' });
        return;
      }

      const protectedEmails = [
        'isarumachorro.742@gmail.com',
        'espartan1047@gmail.com',
        'mike.11.barranco@gmail.com',
        'monicatapia1002@gmail.com',
        'sumayramontserrat@gmail.com'
      ];
      
      if (protectedEmails.includes(targetUser.email) && role !== 'admin') {
        res.status(403).json({ error: 'Las cuentas fundadoras no pueden perder sus privilegios de administrador.' });
        return;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { role }
      });
      res.status(200).json({ message: 'Rol actualizado correctamente', user: updated });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // REPORTES
  // ==========================================
  static async getAllReports(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.query;
      
      const whereClause: any = {};
      if (userId) {
        whereClause.userId = userId as string;
      }

      const reports = await prisma.report.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          photos: true
        }
      });
      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async updateReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = req.body;
      
      const currentReport = await prisma.report.findUnique({ where: { id } });
      
      const updated = await prisma.report.update({
        where: { id },
        data
      });

      if (currentReport && data.status && currentReport.status !== data.status) {
        const statusMap: Record<string, string> = {
          active: 'Activo',
          in_progress: 'En Camino',
          rescued: 'Rescatado',
          closed: 'Cerrado'
        };
        const statusName = statusMap[data.status as string] || data.status;
        const animalDesc = `${currentReport.species === 'dog' ? 'Perro' : (currentReport.species === 'cat' ? 'Gato' : 'Animal')} (${currentReport.primaryColor})`;
        const addressText = currentReport.address ? ` en ${currentReport.address}` : '';
        const reportName = `Reporte de ${animalDesc}${addressText}`;

        const { NotificationService } = await import('../services/notification.service.js');
        await NotificationService.sendNotification({
          userId: currentReport.userId,
          title: 'Actualización de tu reporte',
          body: `El estado del ${reportName} ha cambiado a: ${statusName}.`,
          type: 'status_change',
          referenceId: id,
          referenceType: 'report'
        });
      }

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      
      await prisma.$transaction(async (tx) => {
        // Desvincular duplicados
        await tx.report.updateMany({
          where: { isDuplicateOf: id },
          data: { isDuplicateOf: null }
        });

        const lostPet = await tx.lostPet.findUnique({ where: { reportId: id } });
        if (lostPet) {
          await tx.lostPetMatch.deleteMany({ where: { lostPetId: lostPet.id } });
        }

        await tx.lostPet.deleteMany({ where: { reportId: id } });
        await tx.animalProfile.deleteMany({ where: { reportId: id } });

        await tx.reportStatusHistory.deleteMany({ where: { reportId: id } });
        await tx.caseAction.deleteMany({ where: { reportId: id } });
        await tx.rescueAssignment.deleteMany({ where: { reportId: id } });
        await tx.resource.deleteMany({ where: { reportId: id } });
        await tx.lostPetMatch.deleteMany({ where: { matchedReportId: id } });
        await tx.reportFlag.deleteMany({ where: { reportId: id } });
        
        // El modelo ReportPhoto tiene onDelete: Cascade en el schema, así que se borra solo
        
        await tx.report.delete({ where: { id } });
      });
      
      res.status(200).json({ message: 'Reporte eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ORGANIZACIONES / ALIADOS
  // ==========================================
  static async getAllOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const orgs = await prisma.organization.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(orgs);
    } catch (error) {
      next(error);
    }
  }

  static async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { logoBase64, lat, lng, ...data } = req.body;
      
      let logoUrl = null;
      let logoPublicId = null;

      if (logoBase64) {
        const uploadRes = await cloudinary.uploader.upload(logoBase64, {
          folder: 'dasha/orgs'
        });
        logoUrl = uploadRes.secure_url;
        logoPublicId = uploadRes.public_id;
      }

      // We cannot set PostGIS location via Prisma directly in `create` if it's Unsupported.
      // So we first create the org, then update location with raw SQL.
      const org = await prisma.organization.create({
        data: {
          ...data,
          logoUrl,
          logoPublicId
        }
      });

      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE organizations
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          WHERE id = ${org.id}::uuid;
        `;
      }

      res.status(201).json(org);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { logoBase64, lat, lng, ...data } = req.body;
      
      const updateData: any = { ...data };

      if (logoBase64 && logoBase64.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(logoBase64, {
          folder: 'dasha/orgs'
        });
        updateData.logoUrl = uploadRes.secure_url;
        updateData.logoPublicId = uploadRes.public_id;
      }

      const updated = await prisma.organization.update({
        where: { id },
        data: updateData
      });

      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE organizations
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          WHERE id = ${updated.id}::uuid;
        `;
      }

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.organization.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Organización eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ANIMALES EN REHABILITACIÓN
  // ==========================================
  static async getAllAnimals(req: Request, res: Response, next: NextFunction) {
    try {
      const animals = await prisma.animalProfile.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          photos: true,
          organization: { select: { name: true } },
          timeline: { orderBy: { date: 'desc' } }
        }
      });
      res.status(200).json(animals);
    } catch (error) {
      next(error);
    }
  }

  static async createAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const { photosBase64, ...data } = req.body; // photosBase64 is an array of strings
      
      const animal = await prisma.animalProfile.create({
        data
      });

      if (photosBase64 && Array.isArray(photosBase64)) {
        for (let i = 0; i < photosBase64.length; i++) {
          const b64 = photosBase64[i];
          const uploadRes = await cloudinary.uploader.upload(b64, {
            folder: 'dasha/animals'
          });
          await prisma.animalPhoto.create({
            data: {
              animalId: animal.id,
              url: uploadRes.secure_url,
              publicId: uploadRes.public_id,
              orderIndex: i
            }
          });
        }
      }

      res.status(201).json(animal);
    } catch (error) {
      next(error);
    }
  }

  static async updateAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { photosBase64, ...data } = req.body;
      
      const currentAnimal = await prisma.animalProfile.findUnique({ where: { id } });
      
      const updated = await prisma.animalProfile.update({
        where: { id },
        data
      });

      if (currentAnimal && data.status && currentAnimal.status !== data.status) {
        const statusMap: Record<string, string> = {
          'in_treatment': 'tratamiento',
          'recovering': 'recuperado',
          'looking_for_foster': 'veterinaria',
          'in_foster': 'veterinaria',
          'looking_for_adoption': 'recuperado',
          'adopted': 'adopcion'
        };
        
        const type = statusMap[data.status] || 'veterinaria';
        const titleMap: Record<string, string> = {
          'in_treatment': 'En tratamiento',
          'recovering': 'En recuperación',
          'looking_for_foster': 'Buscando hogar temporal',
          'in_foster': 'En hogar temporal',
          'looking_for_adoption': 'Listo para adopción',
          'adopted': '¡Adoptado!'
        };
        
        await prisma.animalTimelineEvent.create({
          data: {
            animalId: id,
            title: titleMap[data.status] || `Cambio de estado`,
            description: `El estado del caso se actualizó automáticamente.`,
            type,
            date: new Date()
          }
        });
      }

      // If new photos are provided, we could append them or replace them.
      // We will append them here.
      if (photosBase64 && Array.isArray(photosBase64)) {
        for (let i = 0; i < photosBase64.length; i++) {
          const b64 = photosBase64[i];
          if (b64.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(b64, {
              folder: 'dasha/animals'
            });
            await prisma.animalPhoto.create({
              data: {
                animalId: updated.id,
                url: uploadRes.secure_url,
                publicId: uploadRes.public_id,
                orderIndex: 99 // simplistic order append
              }
            });
          }
        }
      }

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.animalProfile.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Animal eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAnimalPhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, photoId } = req.params as { id: string; photoId: string };

      const photo = await prisma.animalPhoto.findFirst({
        where: { id: photoId, animalId: id }
      });

      if (!photo) {
        res.status(404).json({ error: 'Foto no encontrada o no pertenece a este animal' });
        return;
      }

      if (photo.publicId) {
        await cloudinary.uploader.destroy(photo.publicId).catch(() => {});
      }

      await prisma.animalPhoto.delete({
        where: { id: photoId }
      });

      res.status(200).json({ message: 'Foto eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async createAnimalTimelineEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const animalId = req.params.id as string;
      const { title, description, type, date } = req.body;
      
      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      if (!animal) {
        res.status(404).json({ error: 'Animal no encontrado' });
        return;
      }

      const event = await prisma.animalTimelineEvent.create({
        data: {
          animalId,
          title,
          description,
          type,
          date: date ? new Date(date) : new Date()
        }
      });
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }

  static async updateAnimalTimelineEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, eventId } = req.params as { id: string; eventId: string };
      const { title, description, type, date } = req.body;

      const updated = await prisma.animalTimelineEvent.updateMany({
        where: { id: eventId, animalId: id },
        data: {
          title,
          description,
          type,
          ...(date && { date: new Date(date) })
        }
      });

      if (updated.count === 0) {
        res.status(404).json({ error: 'Evento no encontrado o no pertenece a este animal' });
        return;
      }

      const event = await prisma.animalTimelineEvent.findUnique({ where: { id: eventId } });
      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAnimalTimelineEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, eventId } = req.params as { id: string; eventId: string };

      const deleted = await prisma.animalTimelineEvent.deleteMany({
        where: { id: eventId, animalId: id }
      });

      if (deleted.count === 0) {
        res.status(404).json({ error: 'Evento no encontrado o no pertenece a este animal' });
        return;
      }

      res.status(200).json({ message: 'Evento eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FORO
  // ==========================================
  static async getForumReports(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await prisma.forumPostFlag.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          post: true,
          flagger: { select: { id: true, name: true, email: true } }
        }
      });
      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async getAllForumPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const posts = await prisma.forumPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { replies: true } }
        }
      });
      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  }

  static async deleteForumPost(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.forumPost.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Post del foro eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteForumReply(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.forumReply.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Respuesta del foro eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // SOLICITUDES DE VOLUNTARIADO
  // ==========================================
  static async getVolunteerApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const applications = await prisma.user.findMany({
        where: {
          volunteerStatus: { not: null }
        },
        select: {
          id: true,
          name: true,
          email: true,
          volunteerStatus: true,
          ineFrontUrl: true,
          selfieUrl: true,
          isFoster: true,
          fosterCapacity: true,
          phone: true,
          volunteerPrefs: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      const formatted = applications.map(app => ({
        ...app,
        idDocUrl: app.ineFrontUrl,
        idSelfieUrl: app.selfieUrl,
        ineFrontUrl: undefined,
        selfieUrl: undefined
      }));

      res.status(200).json(formatted);
    } catch (error) {
      next(error);
    }
  }

  static async updateVolunteerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body; // 'approved' o 'rejected'

      if (status !== 'approved' && status !== 'rejected') {
        res.status(400).json({ error: 'El estado debe ser approved o rejected' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      // Actualizar estado (y rol si es aprobado)
      const dataToUpdate: any = { volunteerStatus: status };
      if (status === 'approved') {
        dataToUpdate.role = 'volunteer';
      }

      // Si aprueban o rechazan, por privacidad destruimos el INE y selfie (tal como pidió Isabel)
      // Nota: Si queremos destruir en Cloudinary necesitamos extraer el public_id de la URL.
      // Como guardamos las URLs directas (y no el publicId para los usuarios), 
      // extraer el public_id de una URL de Cloudinary estándar:
      const extractPublicId = (url: string) => {
        const parts = url.split('/');
        const fileWithExt = parts[parts.length - 1];
        const folder = parts[parts.length - 2];
        const id = fileWithExt.split('.')[0];
        return `${folder}/${id}`; // dasha/volunteers/xxx
      };

      if (user.ineFrontUrl) await cloudinary.uploader.destroy(extractPublicId(user.ineFrontUrl)).catch(() => {});
      if (user.selfieUrl) await cloudinary.uploader.destroy(extractPublicId(user.selfieUrl)).catch(() => {});

      // Limpiamos las URLs de la BD para ahorrar espacio visual y por seguridad
      dataToUpdate.ineFrontUrl = null;
      dataToUpdate.ineBackUrl = null; // En caso de que queden usuarios viejos con reverso
      dataToUpdate.selfieUrl = null;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          volunteerStatus: true,
          role: true
        }
      });

      const { NotificationService } = await import('../services/notification.service.js');
      if (status === 'approved') {
        await NotificationService.sendNotification({
          userId: id,
          title: '¡Solicitud aprobada! 🎉',
          body: 'Felicidades, tu solicitud ha sido aprobada. Ahora eres parte de Dasha.',
          type: 'system'
        });
      } else {
        await NotificationService.sendNotification({
          userId: id,
          title: 'Actualización de solicitud',
          body: 'Tu solicitud de voluntariado no pudo ser aprobada en este momento.',
          type: 'system'
        });
      }

      res.status(200).json({ message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`, user: updatedUser });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // EVENTOS
  // ==========================================
  static async getAllEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await prisma.event.findMany({
        orderBy: { eventDate: 'desc' },
        include: {
          organization: { select: { name: true } }
        }
      });
      res.status(200).json(events);
    } catch (error) {
      next(error);
    }
  }

  static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { imageBase64, eventDate, endDate, organizationId, ...data } = req.body;
      
      let imageUrl = null;
      let imagePublicId = null;

      if (imageBase64) {
        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
          folder: 'dasha/events'
        });
        imageUrl = uploadRes.secure_url;
        imagePublicId = uploadRes.public_id;
      }

      const event = await prisma.event.create({
        data: {
          ...data,
          organizationId,
          eventDate: new Date(eventDate),
          endDate: endDate ? new Date(endDate) : null,
          imageUrl,
          imagePublicId
        }
      });

      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }

  static async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { imageBase64, eventDate, endDate, organizationId, ...data } = req.body;
      
      const updateData: any = { ...data };
      if (organizationId) updateData.organizationId = organizationId;
      if (eventDate) updateData.eventDate = new Date(eventDate);
      if (endDate) updateData.endDate = new Date(endDate);

      if (imageBase64 && imageBase64.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
          folder: 'dasha/events'
        });
        updateData.imageUrl = uploadRes.secure_url;
        updateData.imagePublicId = uploadRes.public_id;
      }

      const updated = await prisma.event.update({
        where: { id },
        data: updateData
      });

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.event.delete({
        where: { id }
      });
      res.status(200).json({ message: 'Evento eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
  // ==========================================
  // NOVEDADES (CHANGELOG)
  // ==========================================
  static async getAllChangelogEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const entries = await prisma.changelogEntry.findMany({
        orderBy: { date: 'desc' }
      });
      res.status(200).json(entries);
    } catch (error) {
      next(error);
    }
  }

  static async createChangelogEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { version, title, date, changes, isPublished } = req.body;
      
      let parsedChanges: string[] = [];
      if (Array.isArray(changes)) {
        parsedChanges = changes;
      } else if (typeof changes === 'string') {
        parsedChanges = changes.split('\n').filter(line => line.trim() !== '');
      }

      const entry = await prisma.changelogEntry.create({
        data: { 
          version, 
          title, 
          changes: parsedChanges, 
          date: date ? new Date(date) : new Date(), 
          isPublished: isPublished || false 
        }
      });

      // Notificación masiva si se publica
      if (entry.isPublished) {
        const { NotificationService } = await import('../services/notification.service.js');
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        
        // Enviar notificación (in-app y push) a cada usuario
        for (const u of allUsers) {
          await NotificationService.sendNotification({
            userId: u.id,
            title: `Nuevo Aviso: ${title}`,
            body: 'Toca para leer más información en la sección de Comunidad.',
            type: 'system',
            referenceId: entry.id,
            referenceType: 'changelog'
          });
        }
      }

      res.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  }

  static async updateChangelogEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { version, title, date, changes, isPublished } = req.body;
      
      const updateData: any = {};
      if (version !== undefined) updateData.version = version;
      if (title) updateData.title = title;
      if (date) updateData.date = new Date(date);
      if (isPublished !== undefined) updateData.isPublished = isPublished;

      if (changes !== undefined) {
        if (Array.isArray(changes)) {
          updateData.changes = changes;
        } else if (typeof changes === 'string') {
          updateData.changes = changes.split('\n').filter((line: string) => line.trim() !== '');
        }
      }

      // Evitar notificación masiva duplicada si ya estaba publicado
      // Podría implementarse una bandera extra o comparar, pero por simplicidad solo se notifica al crear si isPublished=true
      
      const updated = await prisma.changelogEntry.update({
        where: { id },
        data: updateData
      });

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteChangelogEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.changelogEntry.delete({ where: { id } });
      res.status(200).json({ message: 'Novedad eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // NOTIFICACIONES MANUALES (AVISOS)
  // ==========================================
  static async sendManualNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = (req as any).user?.id;
      const { audience, title, body, link } = req.body;
      
      if (!['all', 'citizens', 'volunteers', 'allies'].includes(audience)) {
        res.status(400).json({ error: 'Audiencia no válida' });
        return;
      }
      if (!title || !body) {
        res.status(400).json({ error: 'Título y cuerpo son requeridos' });
        return;
      }

      const whereClause: any = { isActive: true };
      if (audience === 'citizens') {
        whereClause.role = 'citizen';
      } else if (audience === 'volunteers') {
        whereClause.role = 'volunteer';
      } else if (audience === 'allies') {
        whereClause.role = { in: ['ally_admin', 'ally_staff', 'ally_vet'] };
      }

      const targetUsers = await prisma.user.findMany({ where: whereClause, select: { id: true } });
      const { NotificationService } = await import('../services/notification.service.js');

      // Bulk create notifications in DB
      const notificationsData = targetUsers.map(u => ({
        userId: u.id,
        title,
        body,
        type: 'system' as any,
        link
      }));
      await prisma.notification.createMany({ data: notificationsData });

      // Run push notifications in background without awaiting
      const userIds = targetUsers.map(u => u.id);
      const pushPayload = JSON.stringify({ title, body, url: link || '/' });
      NotificationService.sendPushToUsersAsync(userIds, pushPayload).catch(err => {
        console.error('Error background bulk push:', err);
      });

      // Guardar el historial en AuditLog
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'send_manual_notification',
          targetType: audience,
          metadata: { title, body, link, sentCount: targetUsers.length }
        }
      });

      res.status(200).json({ message: 'Notificaciones enviadas', sentCount: targetUsers.length });
    } catch (error) {
      next(error);
    }
  }

  static async getManualNotificationsHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await prisma.auditLog.findMany({
        where: { action: 'send_manual_notification' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, targetType: true, metadata: true, createdAt: true }
      });

      const formatted = history.map(h => {
        const meta: any = h.metadata || {};
        return {
          id: h.id,
          title: meta.title || 'Aviso',
          body: meta.body || '',
          audience: h.targetType,
          link: meta.link,
          sentCount: meta.sentCount || 0,
          createdAt: h.createdAt
        };
      });

      res.status(200).json(formatted);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // DENUNCIAS (FLAGS) Y MEDALLAS
  // ==========================================
  static async getAllFlags(req: Request, res: Response, next: NextFunction) {
    try {
      const flags = await prisma.reportFlag.findMany({
        include: {
          flagger: { select: { name: true, email: true } },
          report: { select: { species: true, condition: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(flags);
    } catch (error) {
      next(error);
    }
  }

  static async deleteFlag(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await prisma.reportFlag.delete({ where: { id } });
      res.status(200).json({ message: 'Denuncia eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async revokeUserAchievement(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const achievementId = req.params.achievementId as string;
      
      const deleted = await prisma.userAchievement.deleteMany({
        where: { userId, achievementId }
      });

      if (deleted.count === 0) {
        res.status(404).json({ error: 'El usuario no tiene esta medalla asignada' });
        return;
      }

      res.status(200).json({ message: 'Medalla revocada correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
