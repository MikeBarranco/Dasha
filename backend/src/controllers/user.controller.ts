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
          phone: true,
          role: true,
          level: true,
          experiencePoints: true,
          reputationScore: true,
          avatarUrl: true,
          _count: {
            select: {
              reports: true,
              rescueAssignments: true
            }
          },
          achievements: {
            include: {
              achievement: true
            }
          }
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

  static async updateAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { isAvailable, searchRadiusKm, lat, lng } = req.body;

      // 1. Verificar que el usuario sea voluntario aprobado
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { volunteerStatus: true }
      });

      if (!user || user.volunteerStatus !== 'approved') {
        res.status(403).json({ error: 'Solo voluntarios aprobados pueden ponerse en modo activo' });
        return;
      }

      // 2. Actualizar datos base (no geográficos)
      await prisma.user.update({
        where: { id: userId },
        data: {
          isAvailable,
          searchRadiusKm
        }
      });

      // 3. Si mandó lat y lng (modo activo), actualizar PostGIS y fecha
      if (lat !== undefined && lng !== undefined) {
        await prisma.$executeRaw`
          UPDATE "users"
          SET 
            last_location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
            last_location_at = NOW()
          WHERE id = ${userId}::uuid;
        `;
      }

      // 4. Retornar usuario actualizado (sin campos sensibles)
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isAvailable: true,
          searchRadiusKm: true,
          volunteerStatus: true
        }
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }

  static async getMyReports(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      // Obtener reportes con la foto principal
      const reports = await prisma.report.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          photos: {
            take: 1
          }
        }
      });

      res.status(200).json(reports);
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const { name, phone, avatarUrl } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name, phone, avatarUrl },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          level: true,
          experiencePoints: true,
          reputationScore: true,
          avatarUrl: true
        }
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
}
