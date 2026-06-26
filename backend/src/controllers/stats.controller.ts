import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class StatsController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Reportes Activos (status = active)
      const reportesActivos = await prisma.report.count({
        where: { status: 'active' }
      });

      // 2. Rescates Logrados (status = rescued, in_treatment, recovering, etc.)
      // O podemos contar por los RescueAssignment completados.
      // Miguel puso un ejemplo de 342, contemos reportes rescatados o con asignación completa.
      const rescatesLogrados = await prisma.rescueAssignment.count({
        where: { status: 'completed' }
      });

      // 3. Voluntarios (usuarios con role = volunteer o volunteerStatus = approved)
      const voluntarios = await prisma.user.count({
        where: { role: 'volunteer' }
      });

      res.status(200).json({
        reportesActivos,
        rescatesLogrados,
        voluntarios
      });
    } catch (error) {
      next(error);
    }
  }
}
