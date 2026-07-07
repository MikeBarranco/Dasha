import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

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
}
