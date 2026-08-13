import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export class StatsController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Reportes Activos (status = active)
      const reportesTotales = await prisma.report.count();
      const reportesActivos = await prisma.report.count({
        where: { status: 'active' }
      });

      // 2. Rescates Logrados
      const rescatesLogrados = await prisma.rescueAssignment.count({
        where: { status: 'completed' }
      });

      // 3. Voluntarios Activos
      const voluntarios = await prisma.user.count({
        where: { role: 'volunteer' }
      });

      // 4. Aliados (Organizations verificadas/aprobadas)
      const aliadosRegistrados = await prisma.organization.count({
        where: { isVerified: true, isApproved: true }
      });

      // 5. Adopciones Logradas
      const adopcionesLogradas = await prisma.animalProfile.count({
        where: { status: 'adopted' }
      });

      // 6. Animales en Búsqueda de Hogar
      const animalesEnAdopcion = await prisma.animalProfile.count({
        where: { status: 'looking_for_adoption', isPublic: true }
      });

      // 7. Donaciones Verificadas
      const donacionesVerificadas = await prisma.donation.count({
        where: { status: 'approved' }
      });

      res.status(200).json({
        reportesTotales,
        reportesActivos,
        rescatesLogrados,
        voluntarios,
        voluntariosActivos: voluntarios,
        aliadosRegistrados,
        adopcionesLogradas,
        adopciones: adopcionesLogradas,
        animalesEnAdopcion,
        donacionesVerificadas,
        porMes: [],
        rankingColonias: []
      });
    } catch (error) {
      next(error);
    }
  }
}
