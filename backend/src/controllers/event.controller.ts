import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class EventController {
  // GET /events
  static async getUpcomingEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const events = await prisma.event.findMany({
        where: {
          isActive: true,
          eventDate: { gte: new Date() } // Solo futuros
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
