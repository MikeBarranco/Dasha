import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log('Iniciando limpieza de medallas duplicadas...');
  
  try {
    // 1. Identificar medallas en inglés que son duplicados de las de español
    const duplicates = [
      'first_report', 'veteran_reporter', 'rescue_legend',
      'generous_heart', 'great_patron', 'helping_hands', 'solidary_pantry'
    ];

    for (const code of duplicates) {
      const ach = await prisma.achievement.findUnique({ where: { code } });
      if (ach) {
        // Borrar referencias en UserAchievement primero
        const delUsers = await prisma.userAchievement.deleteMany({
          where: { achievementId: ach.id }
        });
        
        // Borrar el logro
        await prisma.achievement.delete({
          where: { id: ach.id }
        });
        
        console.log(`✅ Eliminada medalla duplicada: ${code} (se borraron ${delUsers.count} asignaciones a usuarios)`);
      }
    }
    
    console.log('¡Limpieza completada! Ya no llegarán notificaciones dobles.');
  } catch (error) {
    console.error('Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates();
