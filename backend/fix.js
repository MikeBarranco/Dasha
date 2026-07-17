const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fixLevels() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    const expectedLevel = Math.floor(u.experiencePoints / 100) + 1;
    if (u.level !== expectedLevel) {
      await prisma.user.update({ where: { id: u.id }, data: { level: expectedLevel } });
      console.log('Fixed user:', u.email, 'to level', expectedLevel);
    }
  }
}
fixLevels().finally(() => prisma.$disconnect());
