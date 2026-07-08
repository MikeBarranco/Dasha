import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminUsers = await prisma.user.findMany({ where: { role: 'admin' } });
  const allBadges = await prisma.achievement.findMany();
  
  if (adminUsers.length === 0 || allBadges.length === 0) {
    console.log('No hay administradores o no hay medallas cargadas.');
    return;
  }
  
  for (const user of adminUsers) {
    let count = 0;
    for (const badge of allBadges) {
      try {
        await prisma.userAchievement.upsert({
          where: { userId_achievementId: { userId: user.id, achievementId: badge.id } },
          update: {},
          create: { userId: user.id, achievementId: badge.id }
        });
        count++;
      } catch (e) {
        // Ignorar si la medalla ya existe
      }
    }
    console.log(`¡Le dimos ${count} medallas a ${user.email} (Admin)!`);
  }
}

main().finally(() => prisma.$disconnect());
