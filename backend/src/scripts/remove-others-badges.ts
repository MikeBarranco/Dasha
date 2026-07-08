import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const usersToStrip = await prisma.user.findMany({
    where: { 
      email: { not: 'isarumachorro.742@gmail.com' } 
    },
    select: { id: true, email: true }
  });

  console.log(`Quitándole las medallas a ${usersToStrip.length} usuarios...`);

  let count = 0;
  for (const user of usersToStrip) {
    const res = await prisma.userAchievement.deleteMany({
      where: { userId: user.id }
    });
    if (res.count > 0) {
      console.log(`Se eliminaron ${res.count} medallas de ${user.email}`);
      count++;
    }
  }
  console.log(`Proceso terminado. Se limpiaron las medallas de ${count} usuarios.`);
}

main().finally(() => prisma.$disconnect());
