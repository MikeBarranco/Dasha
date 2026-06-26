import 'dotenv/config';
import { prisma } from './src/config/db';

async function main() {
  const latestReport = await prisma.report.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log('Latest Report:', latestReport);

  if (latestReport) {
    const raw = await prisma.$queryRaw`SELECT id, ST_AsText(location) as loc FROM reports WHERE id = ${latestReport.id}::uuid`;
    console.log('Raw location:', raw);
  }
}
main().catch(console.error);
