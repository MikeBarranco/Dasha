import { prisma } from '../config/db';

export class AchievementService {
  /**
   * Evalúa y otorga logros relacionados a la creación de reportes.
   * Debe llamarse después de que un usuario crea exitosamente un reporte.
   */
  static async checkAndGrantReporterAchievements(userId: string) {
    try {
      // 1. Obtener la cantidad total de reportes creados por el usuario
      const reportCount = await prisma.report.count({
        where: { userId }
      });

      // 2. Obtener los logros que el usuario YA tiene
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true }
      });
      const earnedCodes = userAchievements.map(ua => ua.achievement.code);

      // 3. Evaluar reglas
      const codesToGrant: string[] = [];

      if (reportCount >= 1 && !earnedCodes.includes('first_report')) {
        codesToGrant.push('first_report');
      }
      
      if (reportCount >= 5 && !earnedCodes.includes('active_citizen')) {
        codesToGrant.push('active_citizen');
      }

      // 4. Otorgar los logros correspondientes
      for (const code of codesToGrant) {
        // Buscar el ID del logro en el catálogo
        const achievement = await prisma.achievement.findUnique({
          where: { code }
        });

        if (achievement) {
          // Otorgar logro
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id
            }
          });

          // Opcional: Sumar los puntos de experiencia del logro al usuario
          if (achievement.pointsReward > 0) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                experiencePoints: {
                  increment: achievement.pointsReward
                }
              }
            });
          }

          const { NotificationService } = await import('./notification.service.js');
          await NotificationService.sendNotification({
            userId,
            title: '¡Nueva Medalla Desbloqueada! 🏅',
            body: `Has ganado la medalla: ${achievement.name}. ¡Gracias por tu ayuda!`,
            type: 'achievement'
          });
        }
      }
    } catch (error) {
      console.error('Error al otorgar logros de reportero:', error);
      // No lanzamos el error para no interrumpir el flujo principal
    }
  }
}
