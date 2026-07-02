import 'dotenv/config';
import { prisma } from '../config/db';

async function checkReports() {
  const reports = await prisma.report.findMany({
    include: { animalProfile: { select: { name: true } } }
  });
  console.log(JSON.stringify(reports.map(r => ({
    id: r.id,
    condition: r.condition,
    description: r.description,
    status: r.status,
    animalName: r.animalProfile?.name
  })), null, 2));
}

checkReports()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
