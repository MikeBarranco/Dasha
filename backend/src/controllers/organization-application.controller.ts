import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotificationService } from '../services/notification.service';

export class OrganizationApplicationController {
  
  // POST /api/v1/organization-applications (Ciudadanos aplican para registrar su clínica/refugio)
  static async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { name, orgType, description, phone, address, zipCode, lat, lng } = req.body;

      // Concatenar el zipCode a la dirección si viene
      const finalAddress = zipCode ? `${address || ''} CP. ${zipCode}`.trim() : address;

      // Create the organization unverified
      const org = await prisma.organization.create({
        data: {
          name,
          orgType,
          description,
          phone,
          address: finalAddress,
          isVerified: false,
          isActive: true
        }
      });

      // Si vienen coords, actualizar PostGIS
      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE organizations
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          WHERE id = ${org.id}::uuid;
        `;
      }

      // Link the user as the admin of this new unverified org
      await prisma.organizationEmployee.create({
        data: {
          organizationId: org.id,
          userId,
          roleInOrg: 'admin',
          isVerified: false
        }
      });

      // Notificar a todos los administradores
      const admins = await prisma.user.findMany({
        where: { role: 'admin' },
        select: { id: true }
      });
      
      const adminPushPromises = admins.map(admin => 
        NotificationService.sendNotification({
          userId: admin.id,
          title: 'Nueva postulación de aliado',
          body: `Se ha recibido una nueva postulación para ${org.name}.`,
          type: 'system',
          link: '/admin/organizations'
        })
      );
      await Promise.allSettled(adminPushPromises);

      res.status(201).json({ message: 'Postulación enviada exitosamente. Un administrador la revisará pronto.', organization: org });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/organization-applications (Admin ve las postulaciones pendientes)
  static async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const applications = await prisma.organization.findMany({
        where: { isApproved: false, isActive: true },
        include: {
          employees: {
            where: { roleInOrg: 'admin' },
            include: { user: { select: { id: true, name: true, email: true, phone: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json(applications);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/organization-applications/:id (Admin aprueba o rechaza)
  static async updateApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, rejectionReason } = req.body; // 'approved' o 'rejected'

      const org = await prisma.organization.findUnique({ 
        where: { id },
        include: {
          employees: {
            where: { roleInOrg: 'admin' },
            take: 1
          }
        }
      });
      if (!org) {
        res.status(404).json({ error: 'Organización no encontrada' });
        return;
      }

      const applicantId = org.employees[0]?.userId;

      if (status === 'approved') {
        await prisma.$transaction(async (tx) => {
          await tx.organization.update({
            where: { id },
            data: { isVerified: true, isApproved: true }
          });
          await tx.organizationEmployee.updateMany({
            where: { organizationId: id },
            data: { isVerified: true }
          });
        });
        
        if (applicantId) {
          await NotificationService.sendNotification({
            userId: applicantId,
            title: '¡Postulación Aprobada!',
            body: `Tu organización ${org.name} ha sido aprobada. ¡Bienvenido a la red!`,
            type: 'system',
            link: '/portal'
          });
        }
        
        res.status(200).json({ message: 'Postulación aprobada' });
      } else if (status === 'rejected') {
        // Solo la marcamos como rechazada (isActive: false) y guardamos el motivo
        await prisma.organization.update({
          where: { id },
          data: { 
            isActive: false,
            isVerified: false,
            rejectionReason: rejectionReason || 'No cumple con los requisitos'
          }
        });
        // Desactivar también al empleado temporal
        await prisma.organizationEmployee.updateMany({
          where: { organizationId: id },
          data: { isVerified: false }
        });
        
        if (applicantId) {
          await NotificationService.sendNotification({
            userId: applicantId,
            title: 'Postulación Rechazada',
            body: `Tu solicitud para ${org.name} fue rechazada: ${rejectionReason || 'No cumple con los requisitos.'}`,
            type: 'system',
            link: '/'
          });
        }
        
        res.status(200).json({ message: 'Postulación rechazada' });
      } else {
        res.status(400).json({ error: 'Status inválido' });
      }
    } catch (error) {
      next(error);
    }
  }
}
