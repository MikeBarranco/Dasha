import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          level: true,
          experiencePoints: true,
          reputationScore: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}
