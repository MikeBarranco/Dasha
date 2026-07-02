import { prisma } from '../config/db';

async function checkReports() {
  const activeReports = await prisma.report.findMany({
    where: { status: 'active' },
    select: { id: true, condition: true, description: true, species: true }
  });
  console.log(JSON.stringify(activeReports, null, 2));
}

checkReports().finally(() => prisma.$disconnect());
