import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class OrganizationApplicationController {
  
  // POST /api/v1/organization-applications (Ciudadanos aplican para registrar su clínica/refugio)
  static async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { name, orgType, description, phone, address, lat, lng } = req.body;

      // Create the organization unverified
      const org = await prisma.organization.create({
        data: {
          name,
          orgType,
          description,
          phone,
          address,
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

      res.status(201).json({ message: 'Postulación enviada exitosamente. Un administrador la revisará pronto.', organization: org });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/organization-applications (Admin ve las postulaciones pendientes)
  static async getApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const applications = await prisma.organization.findMany({
        where: { isVerified: false, isActive: true },
        include: {
          employees: {
            where: { roleInOrg: 'admin' },
            include: { user: { select: { name: true, email: true, phone: true } } }
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
      const { status } = req.body; // 'approved' o 'rejected'

      const org = await prisma.organization.findUnique({ where: { id } });
      if (!org) {
        res.status(404).json({ error: 'Organización no encontrada' });
        return;
      }

      if (status === 'approved') {
        await prisma.$transaction(async (tx) => {
          await tx.organization.update({
            where: { id },
            data: { isVerified: true }
          });
          await tx.organizationEmployee.updateMany({
            where: { organizationId: id },
            data: { isVerified: true }
          });
        });
        res.status(200).json({ message: 'Postulación aprobada' });
      } else if (status === 'rejected') {
        // En este caso, simplemente borramos la postulación y el employee (cascade no está por defecto en employee, así que lo borramos a mano si hace falta)
        await prisma.$transaction(async (tx) => {
          await tx.organizationEmployee.deleteMany({ where: { organizationId: id } });
          await tx.organization.delete({ where: { id } });
        });
        res.status(200).json({ message: 'Postulación rechazada y eliminada' });
      } else {
        res.status(400).json({ error: 'Status inválido. Use approved o rejected.' });
      }
    } catch (error) {
      next(error);
    }
  }
}
