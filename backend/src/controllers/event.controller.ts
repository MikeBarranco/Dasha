import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class EventController {
  // GET /events
  static async getUpcomingEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const userId = (req as any).user?.id;

      const includeClause: any = {
        organization: { select: { name: true, logoUrl: true } },
        _count: { select: { eventReminders: true } }
      };

      if (userId) {
        includeClause.eventReminders = {
          where: { userId },
          select: { id: true }
        };
      }

      const events = await prisma.event.findMany({
        where: {
          isActive: true,
          OR: [
            { endDate: { gte: now } },
            { endDate: null, eventDate: { gte: now } }
          ]
        },
        orderBy: { eventDate: 'asc' },
        include: includeClause
      });

      const mapped = events.map((e: any) => {
        const { eventReminders, _count, ...rest } = e;
        return {
          ...rest,
          interested: _count?.eventReminders ?? 0,
          interestedCount: _count?.eventReminders ?? 0,
          isInterested: eventReminders ? eventReminders.length > 0 : false,
        };
      });

      res.status(200).json(mapped);
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

  // Normaliza la categoria que manda el frontend (en espanol) al enum del backend.
  // Mismo mapa que usa createOrganizationEvent.
  private static normalizeCategory(category: string | undefined): string {
    const map: Record<string, string> = {
      esterilizacion: 'sterilization',
      vacunacion: 'vaccination',
      estetica: 'grooming',
      colecta: 'donation',
      adopcion: 'adoption',
      charla: 'talk',
      otro: 'other',
      campaign: 'other',
    };
    if (!category) return 'other';
    return map[category.toLowerCase()] ?? category;
  }

  // PATCH /organizations/:id/events/:eventId (Portal Aliados)
  // Editar un evento ya publicado (p. ej. agregar la foto que faltaba o corregir
  // la fecha). Solo actualiza los campos que llegan; la ubicacion solo se cambia
  // si se mandan lat y lng nuevos.
  static async updateOrganizationEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.id as string;
      const eventId = req.params.eventId as string;
      const userId = (req as any).user?.id;
      const { title, description, category, eventDate, endDate, address, lat, lng, imageBase64 } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      // Solo el admin de la organizacion puede editar sus eventos.
      const isEmployee = await prisma.organizationEmployee.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } }
      });
      if (!isEmployee || isEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permiso para editar eventos de esta organización' });
        return;
      }

      // El evento debe existir y pertenecer a esta organizacion.
      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing || existing.organizationId !== orgId) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
      }

      // Armamos el update solo con los campos que llegan (edicion parcial).
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = EventController.normalizeCategory(category);
      if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
      if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
      if (address !== undefined) updateData.address = address || '';

      // Si mandan una imagen nueva (base64), la subimos y reemplazamos la anterior.
      if (imageBase64) {
        const { v2: cloudinary } = await import('cloudinary');
        const uploadRes = await cloudinary.uploader.upload(imageBase64, { folder: 'dasha/events' });
        updateData.imageUrl = uploadRes.secure_url;
        updateData.imagePublicId = uploadRes.public_id;
      }

      const event = await prisma.event.update({ where: { id: eventId }, data: updateData });

      // La ubicacion geografica solo se toca si mandan coordenadas nuevas.
      if (lat && lng) {
        await prisma.$executeRaw`
          UPDATE events
          SET location = ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)
          WHERE id = ${eventId}::uuid
        `;
      }

      res.status(200).json({ status: 'success', message: 'Evento actualizado', event });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /organizations/:id/events/:eventId (Portal Aliados)
  // Cancelar/quitar un evento. Es un borrado SUAVE (isActive=false): el evento
  // desaparece de todas las listas (getUpcomingEvents filtra isActive=true) sin
  // romper las llaves foraneas de EventReminder (no tienen cascade).
  static async deleteOrganizationEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.id as string;
      const eventId = req.params.eventId as string;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const isEmployee = await prisma.organizationEmployee.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } }
      });
      if (!isEmployee || isEmployee.roleInOrg !== 'admin') {
        res.status(403).json({ error: 'No tienes permiso para eliminar eventos de esta organización' });
        return;
      }

      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing || existing.organizationId !== orgId) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
      }

      await prisma.event.update({ where: { id: eventId }, data: { isActive: false } });

      res.status(200).json({ status: 'success', message: 'Evento eliminado' });
    } catch (error) {
      next(error);
    }
  }

  // GET /events/:id
  static async getEventDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.id;

      const includeClause: any = {
        organization: { select: { name: true, logoUrl: true, description: true } },
        _count: { select: { eventReminders: true } }
      };

      if (userId) {
        includeClause.eventReminders = {
          where: { userId },
          select: { id: true }
        };
      }

      const event = await prisma.event.findUnique({
        where: { id },
        include: includeClause
      });

      if (!event) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
      }

      const { eventReminders, _count, ...rest } = event as any;
      res.status(200).json({
        ...rest,
        interested: _count?.eventReminders ?? 0,
        interestedCount: _count?.eventReminders ?? 0,
        isInterested: eventReminders ? eventReminders.length > 0 : false,
      });
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
