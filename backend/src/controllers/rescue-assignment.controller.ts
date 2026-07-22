import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotificationService } from '../services/notification.service';

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
              userId: true,
              destinationOrgId: true,
              species: true,
              address: true,
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
        currentLocation = { lat: locationRes[0].current_lat, lng: locationRes[0].current_lng };
      } else if (locationRes[0]?.start_lat && locationRes[0]?.start_lng) {
        currentLocation = { lat: locationRes[0].start_lat, lng: locationRes[0].start_lng };
      }

      res.status(200).json({
        ...assignment,
        currentLocation,
        startLocation: locationRes[0]?.start_lat ? { lat: locationRes[0].start_lat, lng: locationRes[0].start_lng } : null,
        reportLocation: reportLoc[0]?.lat ? { lat: reportLoc[0].lat, lng: reportLoc[0].lng } : null,
        orgLocation: orgLoc[0]?.lat ? { lat: orgLoc[0].lat, lng: orgLoc[0].lng } : null,
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

      if (status === 'completed') {
        prisma.user.update({
          where: { id: assignment.volunteerId },
          data: { experiencePoints: { increment: 50 } }
        }).catch((err: any) => console.error('Error granting XP for rescue:', err));
      }

      await prisma.$executeRaw`
        INSERT INTO case_actions (
          id, report_id, actor_id, action_type, description, created_at
        ) VALUES (
          gen_random_uuid(), 
          ${assignment.reportId}::uuid, 
          ${userId ? userId : null}::uuid, 
          'status_changed'::"ActionType", 
          ${'Cambio de estado del rescate a: ' + status}, 
          NOW()
        );
      `;

      // El NotificationService ya está importado arriba
      
      const statusMap: Record<string, string> = {
        accepted: 'Aceptado',
        on_the_way: 'En camino',
        arrived: 'En el sitio',
        completed: 'Completado',
        cancelled: 'Cancelado'
      };

      const species = assignment.report.species === 'dog' ? 'Perro' : (assignment.report.species === 'cat' ? 'Gato' : 'Animal');
      const addressText = assignment.report.address ? ' en ' + assignment.report.address : '';
      const reportName = 'Reporte de ' + species + addressText;

      await NotificationService.sendNotification({
        userId: assignment.report.userId,
        title: 'Actualización de tu rescate',
        body: 'El traslado para el ' + reportName + ' está ahora: ' + (statusMap[status] || status) + '.',
        type: 'status_change',
        referenceId: assignment.reportId,
        referenceType: 'report',
        link: '/reports/' + assignment.reportId
      });

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

      if (!lat || !lng) {
        res.status(400).json({ error: 'Faltan coordenadas (lat, lng)' });
        return;
      }

      await prisma.$executeRaw`
        UPDATE rescue_assignments
        SET current_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
            last_location_at = NOW()
        WHERE id = ${id}::uuid
      `;

      const io = req.app.get('io');
      if (io) {
        io.to('rescue:' + id).emit('location_updated', { lat, lng, updatedAt: new Date().toISOString() });
      }

      res.status(200).json({ message: 'Ubicación actualizada' });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/rescue-assignments/:id/photos
  static async addRescuePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { photoUrl, description } = req.body;
      const userId = (req as any).user?.id;

      if (!photoUrl) {
        res.status(400).json({ error: 'photoUrl es requerido' });
        return;
      }

      const assignment = await prisma.rescueAssignment.findUnique({
        where: { id }
      });

      if (!assignment) {
        res.status(404).json({ error: 'Asignación no encontrada' });
        return;
      }

      await prisma.$executeRaw`
        INSERT INTO case_actions (
          id, report_id, actor_id, action_type, description, photo_url, created_at
        ) VALUES (
          gen_random_uuid(), 
          ${assignment.reportId}::uuid, 
          ${userId ? userId : null}::uuid, 
          'photo_added'::"ActionType", 
          ${description || 'Foto del traslado añadida'}, 
          ${photoUrl}, 
          NOW()
        );
      `;

      res.status(201).json({ status: 'success', message: 'Foto añadida al historial del caso' });
    } catch (error) {
      next(error);
    }
  }
}
