import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class EventController {
  // GET /events
  static async getUpcomingEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const events = await prisma.event.findMany({
        where: {
          isActive: true,
          OR: [
            { endDate: { gte: now } },
            { endDate: null, eventDate: { gte: now } }
          ]
        },
        orderBy: { eventDate: 'asc' },
        include: {
          organization: { select: { name: true, logoUrl: true } },
          _count: { select: { eventReminders: true } }
        }
      });
      res.status(200).json(events);
    } catch (error) {
      next(error);
    }
  }

  // POST /organizations/:id/events (Portal Aliados)
  static async createOrganizationEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.id as string;
      const userId = (req as any).user?.id;
      const { title, description, category, eventDate, endDate, address, lat, lng, imageBase64 } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      // Validar que el usuario pertenece a la organización como admin
      const isEmployee = await prisma.organizationEmployee.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } }
      });

      if (!isEmployee || isEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permiso para crear eventos para esta organización' });
        return;
      }

      let imageUrl = null;
      let imagePublicId = null;

      if (imageBase64) {
        const { v2: cloudinary } = await import('cloudinary');
        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
          folder: 'dasha/events'
        });
        imageUrl = uploadRes.secure_url;
        imagePublicId = uploadRes.public_id;
      }

      let finalCategory = category || 'other';
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

      const event = await prisma.event.create({
        data: {
          organizationId: orgId,
          title,
          description,
          category: finalCategory,
          eventDate: new Date(eventDate),
          endDate: endDate ? new Date(endDate) : null,
          address: address || '',
          imageUrl,
          imagePublicId,
          isActive: true, // Se publica directamente
          // Si el mapa es necesario, usar raw query para ST_MakePoint. Por ahora omitimos location geométrica directa.
        }
      });

      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE events
          SET location = ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)
          WHERE id = ${event.id}::uuid
        `;
      }

      res.status(201).json({
        status: 'success',
        message: 'Evento publicado correctamente',
        event
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /events/:id
  static async getEventDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          organization: { select: { name: true, logoUrl: true, description: true } },
          _count: { select: { eventReminders: true } }
        }
      });

      if (!event) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
      }

      res.status(200).json(event);
    } catch (error) {
      next(error);
    }
  }

  // POST /events/:id/reminders (Asistiré)
  static async rsvpEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
      }

      const reminder = await prisma.eventReminder.upsert({
        where: { eventId_userId: { eventId, userId } },
        update: {},
        create: { eventId, userId }
      });

      res.status(200).json({ message: 'Asistencia confirmada', reminder });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /events/:id/reminders (Cancelar asistencia)
  static async cancelRsvp(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id as string;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      await prisma.eventReminder.deleteMany({
        where: { eventId, userId }
      });

      res.status(200).json({ message: 'Asistencia cancelada' });
    } catch (error) {
      next(error);
    }
  }
}
