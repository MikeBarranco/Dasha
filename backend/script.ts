import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.achievement.findMany().then(console.log).finally(() => prisma.$disconnect());
