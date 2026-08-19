import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { v2 as cloudinary } from 'cloudinary';
import { deleteCloudinaryFile, deleteMultipleCloudinaryFiles } from '../utils/cloudinary';

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
        const userDonations = await tx.donation.findMany({ where: { userId: id }, select: { id: true } });
            if (userDonations.length > 0) {
              await tx.donationProof.deleteMany({ where: { donationId: { in: userDonations.map(d => d.id) } } });
            }
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
          photos: true,
          colony: { select: { name: true } }
        }
      });

      const mappedReports = reports.map(r => ({
        ...r,
        colonia: r.colony?.name || r.address || 'Sin colonia'
      }));

      res.status(200).json(mappedReports);
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
          in_treatment: 'En Tratamiento',
          recovering: 'En Recuperación',
          looking_for_foster: 'Buscando Hogar Temporal',
          in_foster: 'En Hogar Temporal',
          looking_for_adoption: 'Buscando Adopción',
          adopted: 'Adoptado',
          closed: 'Cerrado',
          duplicate: 'Duplicado',
          not_found: 'No Encontrado',
          deceased: 'Fallecido'
        };
        const statusName = statusMap[data.status as string] || data.status;
        const animalDesc = `${currentReport.species === 'dog' ? 'Perro' : (currentReport.species === 'cat' ? 'Gato' : 'Animal')} (${currentReport.primaryColor})`;
        const addressText = currentReport.address ? ` en ${currentReport.address}` : '';
        const reportName = `Reporte de ${animalDesc}${addressText}`;

        const { NotificationService } = await import('../services/notification.service.js');
        await NotificationService.sendNotification({
          userId: currentReport.userId,
          title: 'Actualización de tu reporte',
          body: `El estado de tu ${reportName} ha cambiado a: ${statusName}.`,
          type: 'status_change',
          referenceId: id,
          referenceType: 'report',
          link: '/perfil'
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

      // Cloudinary Cleanup
      const reportPhotos = await prisma.reportPhoto.findMany({ where: { reportId: id } });
      await deleteMultipleCloudinaryFiles(reportPhotos.map(p => p.publicId));

      const animalProfiles = await prisma.animalProfile.findMany({ where: { reportId: id }, select: { id: true } });
      for (const ap of animalProfiles) {
        const animalPhotos = await prisma.animalPhoto.findMany({ where: { animalId: ap.id } });
        await deleteMultipleCloudinaryFiles(animalPhotos.map(p => p.publicId));
        
        const medicalRecords = await prisma.medicalRecord.findMany({ where: { animalId: ap.id } });
        for (const rec of medicalRecords) {
          if (rec.photoUrls && Array.isArray(rec.photoUrls)) {
            await deleteMultipleCloudinaryFiles(rec.photoUrls as string[]);
          }
        }
      }
      
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
        const animalProfiles = await tx.animalProfile.findMany({ where: { reportId: id }, select: { id: true } });
        for (const ap of animalProfiles) {
          await tx.animalPhoto.deleteMany({ where: { animalId: ap.id } });
          await tx.medicalRecord.deleteMany({ where: { animalId: ap.id } });
          await tx.vaccination.deleteMany({ where: { animalId: ap.id } });
          await tx.resource.deleteMany({ where: { animalId: ap.id } });
          const donations = await tx.donation.findMany({ where: { animalId: ap.id }, select: { id: true } });
            if (donations.length > 0) {
              await tx.donationProof.deleteMany({ where: { donationId: { in: donations.map(d => d.id) } } });
            }
            await tx.donation.deleteMany({ where: { animalId: ap.id } });
          await tx.caseAction.deleteMany({ where: { animalId: ap.id } });
          await tx.fosterAssignment.deleteMany({ where: { animalId: ap.id } });
          await tx.adoptionApplication.deleteMany({ where: { animalId: ap.id } });
          await tx.animalTimelineEvent.deleteMany({ where: { animalId: ap.id } });
          await tx.animalFollower.deleteMany({ where: { animalId: ap.id } });
        }
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
      const orgs: any[] = await prisma.$queryRaw`
        SELECT 
          id, name, description, logo_url as "logoUrl", cover_url as "coverUrl", 
          address, phone, whatsapp, org_type as "orgType", is_active as "isActive",
          is_verified as "isVerified", created_at as "createdAt", website,
          ST_X(location::geometry) as lng,
          ST_Y(location::geometry) as lat,
          is_approved as "isApproved"
        FROM organizations
        WHERE is_approved = true AND is_active = true
        ORDER BY created_at DESC;
      `;
      res.status(200).json(orgs);
    } catch (error) {
      next(error);
    }
  }

  static async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const { logoBase64, lat, lng, services, ...data } = req.body;
      
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
      
      const orgData: any = {
        ...data,
        logoUrl,
        logoPublicId
      };
      
      if (data.isVerified === true) {
        orgData.isApproved = true;
      }

      const org = await prisma.organization.create({
        data: orgData
      });

      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE organizations
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          WHERE id = ${org.id}::uuid;
        `;
      }

      res.status(201).json({ message: 'Aliado creado correctamente', org });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { logoBase64, lat, lng, services, ...data } = req.body;
      
      const updateData: any = { ...data };

      if (data.isVerified === true) {
        updateData.isApproved = true;
      }

      if (logoBase64 && logoBase64.startsWith('data:image')) {
        const uploadRes = await cloudinary.uploader.upload(logoBase64, {
          folder: 'dasha/orgs'
        });
        updateData.logoUrl = uploadRes.secure_url;
        updateData.logoPublicId = uploadRes.public_id;
      }

      const currentOrg = await prisma.organization.findUnique({
        where: { id },
        include: { employees: { where: { roleInOrg: 'admin' }, select: { userId: true } } }
      });

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

      // Notificar si acaba de ser aprobada
      if (currentOrg && !currentOrg.isVerified && data.isVerified) {
        try {
          const { NotificationService } = await import('../services/notification.service.js');
          for (const emp of currentOrg.employees) {
            await NotificationService.sendNotification({
              userId: emp.userId,
              title: '¡Organización Aprobada!',
              body: `Felicidades, ${updated.name} ha sido aprobada. Ahora eres un aliado oficial de Dasha.`,
              type: 'system',
              link: '/portal'
            });
          }
        } catch (err) {
          console.error('Error notifying org approval', err);
        }
      }

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const org = await prisma.organization.findUnique({ where: { id } });
      if (org) {
        await deleteCloudinaryFile(org.logoUrl);
        await deleteCloudinaryFile(org.coverUrl);
      }
      // Delete applicant INEs (from org.application... wait, Org doesn't have application docs, Users do)
      await prisma.$transaction(async (tx) => {
        await tx.report.updateMany({ where: { destinationOrgId: id }, data: { destinationOrgId: null } });
        await tx.animalProfile.updateMany({ where: { organizationId: id }, data: { organizationId: null } });
        await tx.resource.updateMany({ where: { organizationId: id }, data: { organizationId: null } });
        await tx.organizationEmployee.deleteMany({ where: { organizationId: id } });
        await tx.discountCode.deleteMany({ where: { organizationId: id } });
        const needs = await tx.need.findMany({ where: { organizationId: id }, select: { id: true } });
        if (needs.length > 0) {
          await tx.needContribution.deleteMany({ where: { needId: { in: needs.map(n => n.id) } } });
          await tx.need.deleteMany({ where: { organizationId: id } });
        }
        await tx.organization.delete({ where: { id } });
      });
      res.status(200).json({ message: 'Organización eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // EQUIPO DE LA ORGANIZACIÓN (ADMIN)
  // ==========================================
  static async getOrganizationTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.params.id as string;
      const team = await prisma.organizationEmployee.findMany({
        where: { organizationId },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } }
        }
      });
      
      // Alias 'role' para empatar con el frontend de Miguel
      const mappedTeam = team.map(member => ({
        ...member,
        role: member.roleInOrg
      }));

      res.status(200).json(mappedTeam);
    } catch (error) {
      next(error);
    }
  }

  static async addOrganizationTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.params.id as string;
      const { email, roleInOrg, role } = req.body;
      const finalRole = roleInOrg || role || 'veterinarian';
      
      if (!email) {
        res.status(400).json({ error: 'El email es obligatorio' });
        return;
      }

      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) {
        res.status(404).json({ error: 'Usuario no encontrado en la plataforma Dasha' });
        return;
      }

      const existingEmployee = await prisma.organizationEmployee.findFirst({
        where: { userId: targetUser.id }
      });

      if (existingEmployee) {
        res.status(400).json({ error: 'Este usuario ya es miembro de una organización' });
        return;
      }

      const newMember = await prisma.organizationEmployee.create({
        data: {
          organizationId,
          userId: targetUser.id,
          roleInOrg: finalRole,
          isVerified: true,
          invitedEmail: email
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } }
        }
      });

      try {
        const { NotificationService } = await import('../services/notification.service.js');
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        if (org) {
          await NotificationService.sendNotification({
            userId: targetUser.id,
            title: '¡Ahora eres aliado!',
            body: `Has sido agregado como responsable de la organización ${org.name}. Bienvenido a la red de aliados.`,
            type: 'system',
            link: '/portal'
          });
        }
      } catch (err) {
        console.error('Error sending push to new employee', err);
      }

      res.status(201).json({ message: 'Miembro agregado exitosamente', member: newMember });
    } catch (error) {
      next(error);
    }
  }

  static async removeOrganizationTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.params.id as string;
      const paramId = (req.params.employeeId || req.params.userId) as string;

      const employeeToRemove = await prisma.organizationEmployee.findFirst({
        where: {
          organizationId,
          OR: [
            { id: paramId },
            { userId: paramId }
          ]
        }
      });

      if (!employeeToRemove) {
        res.status(404).json({ error: 'El miembro no pertenece a esta organización' });
        return;
      }

      await prisma.organizationEmployee.delete({
        where: { id: employeeToRemove.id }
      });

      res.status(200).json({ message: 'Miembro eliminado del equipo' });
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
        data: {
          ...data
        }
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

        // Notificar a followers
        try {
          const { NotificationService } = await import('../services/notification.service.js');
          const followers = await prisma.animalFollower.findMany({ where: { animalId: id } });
          const statusName = titleMap[data.status] || data.status;
          for (const f of followers) {
            await NotificationService.sendNotification({
              userId: f.userId,
              title: 'Actualización de animal',
              body: `El animal que sigues, ${currentAnimal.name}, ahora está: ${statusName}.`,
              type: 'status_change',
              referenceId: id,
              referenceType: 'animal',
              link: '/animals/' + id
            });
          }
        } catch (err) {
          console.error('Error enviando push a followers del animal', err);
        }
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
      const photos = await prisma.animalPhoto.findMany({ where: { animalId: id } });
      await deleteMultipleCloudinaryFiles(photos.map(p => p.publicId));
      
      const medicalRecords = await prisma.medicalRecord.findMany({ where: { animalId: id } });
      for (const rec of medicalRecords) {
        if (rec.photoUrls && Array.isArray(rec.photoUrls)) {
           await deleteMultipleCloudinaryFiles(rec.photoUrls as string[]);
        }
      }

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
  // DENUNCIAS (TODO TIPO)
  // ==========================================
  static async getForumReports(req: Request, res: Response, next: NextFunction) {
    try {
      const postFlags = await prisma.forumPostFlag.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          post: { include: { user: { select: { name: true } } } },
          flagger: { select: { id: true, name: true, email: true } }
        }
      });

      const replyFlags = await prisma.forumReplyFlag.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reply: { include: { user: { select: { name: true } } } },
          flagger: { select: { id: true, name: true, email: true } }
        }
      });

      const reportFlags = await prisma.reportFlag.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          report: { include: { user: { select: { name: true } }, photos: { take: 1, select: { url: true } } } },
          flagger: { select: { id: true, name: true, email: true } }
        }
      });

      const mappedPostFlags = postFlags.map(f => ({
        id: f.id,
        reason: f.reason,
        createdAt: f.createdAt,
        reporter: { name: f.flagger.name },
        post: {
          id: f.post.id,
          title: f.post.title,
          content: f.post.content,
          author: { name: f.post.user.name },
          imageUrl: f.post.images?.[0] || undefined
        },
        type: 'post'
      }));

      const mappedReplyFlags = replyFlags.map(f => ({
        id: f.id,
        reason: f.reason,
        createdAt: f.createdAt,
        reporter: { name: f.flagger.name },
        post: {
          id: f.reply.id,
          title: 'Comentario en el foro',
          content: f.reply.content,
          author: { name: f.reply.user.name }
        },
        type: 'reply'
      }));

      const mappedReportFlags = reportFlags.map(f => ({
        id: f.id,
        reason: f.reason,
        createdAt: f.createdAt,
        reporter: { name: f.flagger.name },
        post: {
          id: f.report.id,
          title: `Reporte de Animal: ${f.report.species}`,
          content: f.report.description,
          author: { name: f.report.user?.name || 'Usuario Anónimo' },
          imageUrl: f.report.photos?.[0]?.url || undefined
        },
        type: 'report'
      }));

      const allFlags = [...mappedPostFlags, ...mappedReplyFlags, ...mappedReportFlags]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.status(200).json(allFlags);
    } catch (error) {
      next(error);
    }
  }

  static async dismissForumReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      
      const deletedPostFlag = await prisma.forumPostFlag.deleteMany({ where: { id } });
      if (deletedPostFlag.count > 0) {
        res.status(200).json({ message: 'Denuncia descartada' });
        return;
      }

      const deletedReplyFlag = await prisma.forumReplyFlag.deleteMany({ where: { id } });
      if (deletedReplyFlag.count > 0) {
        res.status(200).json({ message: 'Denuncia descartada' });
        return;
      }

      const deletedReportFlag = await prisma.reportFlag.deleteMany({ where: { id } });
      if (deletedReportFlag.count > 0) {
        res.status(200).json({ message: 'Denuncia descartada' });
        return;
      }

      res.status(404).json({ error: 'Denuncia no encontrada' });
    } catch (error) {
      next(error);
    }
  }

  static async getAllForumPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const includeClause: any = {
        user: { select: { name: true, email: true } },
        _count: { select: { replies: true } }
      };

      if (userId) {
        includeClause.flags = {
          where: { flaggedBy: userId },
          select: { id: true }
        };
        includeClause.votes = {
          where: { userId, value: 1 },
          select: { id: true }
        };
      }

      const postsRaw = await prisma.forumPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: includeClause
      });

      const posts = postsRaw.map((p: any) => {
        const { flags, votes, ...rest } = p;
        return {
          ...rest,
          hasReported: flags ? flags.length > 0 : false,
          likedByMe: votes ? votes.length > 0 : false
        };
      });

      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  }

  static async deleteForumPost(req: Request, res: Response, next: NextFunction) {
      try {
        const id = req.params.id as string;
        
        await prisma.$transaction(async (tx) => {
          const post = await tx.forumPost.findUnique({ where: { id } });
          if (post) {
            // Eliminar reportes (flags)
            await tx.forumPostFlag.deleteMany({ where: { postId: id } });
            
            // Eliminar votos del post y de las respuestas de este post
            await tx.forumVote.deleteMany({
              where: {
                OR: [
                  { postId: id },
                  { reply: { postId: id } }
                ]
              }
            });
            
            // Eliminar flags de las respuestas de este post
            const replies = await tx.forumReply.findMany({ where: { postId: id } });
            if (replies.length > 0) {
              await tx.forumReplyFlag.deleteMany({
                where: { replyId: { in: replies.map(r => r.id) } }
              });
            }
            
            // Eliminar respuestas
            await tx.forumReply.deleteMany({ where: { postId: id } });
            
            // Usamos deleteMany en vez de delete para evitar error si hay doble click
            await tx.forumPost.deleteMany({ where: { id } });
          } else {
            // Como el frontend unifica los reportes, puede ser un comentario
            const reply = await tx.forumReply.findUnique({ where: { id } });
            if (reply) {
              await tx.forumReplyFlag.deleteMany({ where: { replyId: id } });
              await tx.forumVote.deleteMany({ where: { replyId: id } });
              await tx.forumReply.deleteMany({ where: { id } });
            } else {
              // Si ya se borró por un doble click, no hacemos nada y evitamos que falle
            }
          }
        });
        
        res.status(200).json({ message: 'Post del foro eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteForumReply(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      
      await prisma.$transaction(async (tx) => {
        // Eliminar votos de la respuesta
        await tx.forumVote.deleteMany({
          where: { replyId: id }
        });
        
        // Eliminar denuncias de la respuesta
        await tx.forumReplyFlag.deleteMany({
          where: { replyId: id }
        });
        
        // Eliminar la respuesta
        await tx.forumReply.delete({
          where: { id }
        });
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
        idSelfieUrl: app.selfieUrl
      }));

      res.status(200).json(formatted);
    } catch (error) {
      next(error);
    }
  }

  static async updateVolunteerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, rejectionReason } = req.body; // 'approved' o 'rejected'

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
      } else if (status === 'rejected') {
        dataToUpdate.volunteerRejectionReason = rejectionReason || 'No cumple con los requisitos';
      }

      // Si aprueban o rechazan, por privacidad destruimos el INE y selfie (tal como pidió Isabel)
      // Nota: Si queremos destruir en Cloudinary necesitamos extraer el public_id de la URL.
      // Como guardamos las URLs directas (y no el publicId para los usuarios), 
      if (user.ineFrontUrl) await deleteCloudinaryFile(user.ineFrontUrl);
      if (user.selfieUrl) await deleteCloudinaryFile(user.selfieUrl);

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
          volunteerRejectionReason: true,
          role: true
        }
      });

      const { NotificationService } = await import('../services/notification.service.js');
      if (status === 'approved') {
        await NotificationService.sendNotification({
          userId: id,
          title: '¡Solicitud aprobada! 🎉',
          body: 'Felicidades, tu solicitud ha sido aprobada. Ahora eres parte de Dasha.',
          type: 'system',
          link: '/perfil'
        });
      } else {
        await NotificationService.sendNotification({
          userId: id,
          title: 'Actualización de solicitud',
          body: `Tu solicitud de voluntariado fue rechazada: ${rejectionReason || 'No cumple con los requisitos.'}`,
          type: 'system',
          link: '/perfil'
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
      const { imageBase64, eventDate, endDate, organizationId, location, lat, lng, ...data } = req.body;
      
      let imageUrl = null;
      let imagePublicId = null;

      if (imageBase64) {
        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
          folder: 'dasha/events'
        });
        imageUrl = uploadRes.secure_url;
        imagePublicId = uploadRes.public_id;
      }

      let finalCategory = data.category || 'other';
      const categoryMap: Record<string, string> = {
        'esterilizacion': 'sterilization',
        'vacunacion': 'vaccination',
        'estetica': 'grooming',
        'colecta': 'donation',
        'adopcion': 'adoption',
        'charla': 'talk',
        'otro': 'other',
        'campaign': 'other'
      };
      if (finalCategory && categoryMap[finalCategory.toLowerCase()]) {
        finalCategory = categoryMap[finalCategory.toLowerCase()];
      }
      data.category = finalCategory;

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
      const { imageBase64, eventDate, endDate, organizationId, location, lat, lng, ...data } = req.body;
      
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

      if (updateData.category) {
        const categoryMap: Record<string, string> = {
          'esterilizacion': 'sterilization',
          'vacunacion': 'vaccination',
          'estetica': 'grooming',
          'colecta': 'donation',
          'adopcion': 'adoption',
          'charla': 'talk',
          'otro': 'other',
          'campaign': 'other'
        };
        if (categoryMap[updateData.category.toLowerCase()]) {
          updateData.category = categoryMap[updateData.category.toLowerCase()];
        }
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
      await prisma.$transaction(async (tx) => {
        await tx.eventReminder.deleteMany({ where: { eventId: id } });
        await tx.event.delete({ where: { id } });
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
      
      if (!['all', 'citizens', 'volunteers', 'allies', 'admin'].includes(audience)) {
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
      } else if (audience === 'admin') {
        whereClause.role = 'admin';
      }

      const targetUsers = await prisma.user.findMany({ where: whereClause, select: { id: true } });
      const { NotificationService } = await import('../services/notification.service.js');

      // Guardar el historial en AuditLog primero (fail fast)
      const auditLog = await prisma.auditLog.create({
        data: {
          adminId,
          action: 'send_manual_notification',
          targetType: audience,
          metadata: { title, body, link, sentCount: targetUsers.length }
        }
      });

      // Bulk create notifications in DB
      const notificationsData = targetUsers.map(u => ({
        userId: u.id,
        title,
        body,
        type: 'system' as any,
        link
      }));
      await prisma.notification.createMany({ data: notificationsData });

      // Run push notifications in background sin bloquear
      const userIds = targetUsers.map(u => u.id);
      const pushPayload = JSON.stringify({ 
        title, 
        body, 
        icon: '/pwa-192x192.png',
        data: { url: link || '/' } 
      });
      NotificationService.sendPushToUsersAsync(userIds, pushPayload).catch(err => {
        console.error('Error background bulk push:', err);
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





