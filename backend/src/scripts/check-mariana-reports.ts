import { config } from 'dotenv';
config();

import prisma from '../config/db';

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Mariana Lopez', mode: 'insensitive' } }
  });
  
  if (!user) {
    console.log('User Mariana Lopez not found');
    return;
  }

  const reports = await prisma.report.findMany({
    where: { userId: user.id },
    include: {
      photos: true,
      colony: true,
      lostPet: true
    }
  });

  console.log(JSON.stringify(reports, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
