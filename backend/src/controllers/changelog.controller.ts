// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotificationService } from '../services/notification.service';

export class ChangelogController {
  static async getPublicEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const entries = await prisma.changelogEntry.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          version: true,
          title: true,
          date: true,
          changes: true
        },
        orderBy: { date: 'desc' }
      });
      res.status(200).json(entries);
    } catch (error) {
      next(error);
    }
  }

  static async createEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { version, date, title, items, changes, type } = req.body;
      let finalChanges: string[] = [];
      if (Array.isArray(items)) finalChanges = items;
      else if (Array.isArray(changes)) finalChanges = changes;
      else if (items) finalChanges = [items];
      else if (changes) finalChanges = [changes];
      
      // @ts-ignore
      const newEntry = await prisma.changelogEntry.create({
        data: {
          version,
          date: date ? new Date(date) : new Date(),
          title,
          changes: finalChanges as any,
          type,
          isPublished: true, // Asumimos que si lo publican desde el panel, es visible
        }
      });

      // Send Push notification
      NotificationService.sendWebPushToAll('¡Nuevas actualizaciones en Dasha! 🐾', `Revisa las novedades: ${title}`, '/novedades')
        .catch((err: any) => console.error('Error enviando push de novedad:', err));

      res.status(201).json(newEntry);
    } catch (error) {
      next(error);
    }
  }

  static async updateEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { version, date, title, items, changes, type } = req.body;
      
      let finalChanges: any = undefined;
      if (Array.isArray(items)) finalChanges = items;
      else if (Array.isArray(changes)) finalChanges = changes;
      else if (items) finalChanges = [items];
      else if (changes) finalChanges = [changes];
      
      const updateData: any = {};
      if (version !== undefined) updateData.version = version;
      if (date !== undefined) updateData.date = new Date(date);
      if (title !== undefined) updateData.title = title;
      if (finalChanges !== undefined) updateData.changes = finalChanges;
      if (type !== undefined) updateData.type = type;

      // @ts-ignore
      const updated = await prisma.changelogEntry.update({
        where: { id },
        data: updateData
      });
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prisma.changelogEntry.delete({ where: { id } });
      res.status(200).json({ message: 'Novedad eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }
}
