import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class RescueAssignmentController {
  
  // GET /api/v1/rescue-assignments/:id
  static async getAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      const assignment = await prisma.rescueAssignment.findUnique({
        where: { id },
        include: {
          volunteer: { select: { id: true, name: true, avatarUrl: true } },
          report: {
            select: {
              id: true,
              destinationOrgId: true,
              animalProfile: { select: { id: true, name: true } },
              destinationOrg: { select: { id: true, name: true } }
            }
          }
        }
      });

      if (!assignment) {
        res.status(404).json({ error: 'Asignación no encontrada' });
        return;
      }

      // Need to query location (PostGIS Point)
      const locationRes: any[] = await prisma.$queryRaw`
        SELECT 
          ST_X(start_location::geometry) as start_lng, ST_Y(start_location::geometry) as start_lat,
          ST_X(current_location::geometry) as current_lng, ST_Y(current_location::geometry) as current_lat
        FROM rescue_assignments WHERE id = ${id}::uuid
      `;
      
      const reportLoc: any[] = await prisma.$queryRaw`
        SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
        FROM reports WHERE id = ${assignment.reportId}::uuid
      `;
      
      const orgLoc: any[] = assignment.report.destinationOrgId ? await prisma.$queryRaw`
        SELECT ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
        FROM organizations WHERE id = ${assignment.report.destinationOrgId}::uuid
      ` : [];

      let currentLocation = null;
      if (locationRes[0]?.current_lat && locationRes[0]?.current_lng) {
        currentLocation = { lat: locationRes[0].current_lat, lng: locationRes[0].current_lng, updatedAt: assignment.lastLocationAt };
      }

      let origin = null;
      if (reportLoc[0]?.lat && reportLoc[0]?.lng) {
        origin = { lat: reportLoc[0].lat, lng: reportLoc[0].lng };
      }

      let destination = null;
      if (orgLoc[0]?.lat && orgLoc[0]?.lng && assignment.report.destinationOrg) {
        destination = { 
          lat: orgLoc[0].lat, 
          lng: orgLoc[0].lng,
          organization: { id: assignment.report.destinationOrg.id, name: assignment.report.destinationOrg.name }
        };
      }

      res.status(200).json({
        id: assignment.id,
        status: assignment.status,
        volunteer: {
          id: assignment.volunteer.id,
          name: assignment.volunteer.name,
          photoUrl: assignment.volunteer.avatarUrl
        },
        report: { id: assignment.report.id },
        animal: assignment.report.animalProfile ? { id: assignment.report.animalProfile.id, name: assignment.report.animalProfile.name } : null,
        origin,
        destination,
        currentLocation
      });

    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/v1/rescue-assignments/:id
  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const userId = (req as any).user?.id;

      const assignment = await prisma.rescueAssignment.findUnique({ where: { id }, include: { report: true } });
      if (!assignment) {
        res.status(404).json({ error: 'Asignación no encontrada' });
        return;
      }

      const updated = await prisma.rescueAssignment.update({
        where: { id },
        data: { 
          status,
          ...(status === 'completed' ? { completedAt: new Date() } : {})
        }
      });

      // Notificar al creador del reporte y a la org destino
      const { NotificationService } = await import('../services/notification.service.js');
      
      const statusMap: Record<string, string> = {
        accepted: 'Aceptado',
        on_the_way: 'En camino',
        arrived: 'En el sitio',
        completed: 'Completado',
        cancelled: 'Cancelado'
      };

      await NotificationService.sendNotification({
        userId: assignment.report.userId,
        title: 'Actualización de tu rescate',
        body: `El traslado está ahora: ${statusMap[status] || status}.`,
        type: 'status_change',
        referenceId: assignment.reportId,
        referenceType: 'report',
        link: `/reports/${assignment.reportId}`
      });

      // Emitir via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`rescue:${id}`).emit('status_updated', { status });
      }

      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/rescue-assignments/:id/location
  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { lat, lng } = req.body;
      const userId = (req as any).user?.id;

      if (!lat || !lng) {
        res.status(400).json({ error: 'Se requieren lat y lng' });
        return;
      }

      const assignment = await prisma.rescueAssignment.findUnique({ where: { id } });
      if (!assignment || assignment.volunteerId !== userId) {
        res.status(403).json({ error: 'No tienes permiso para actualizar esta asignación' });
        return;
      }

      await prisma.$executeRaw`
        UPDATE rescue_assignments
        SET current_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
            last_location_at = NOW()
        WHERE id = ${id}::uuid
      `;

      // Emitir via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`rescue:${id}`).emit('location_updated', { lat, lng, updatedAt: new Date().toISOString() });
      }

      res.status(200).json({ message: 'Ubicación actualizada' });
    } catch (error) {
      next(error);
    }
  }
}
