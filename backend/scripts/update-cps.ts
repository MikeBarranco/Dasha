import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/config/db';

async function main() {
  console.log('Actualizando CPs para la demo...');
  const res1 = await prisma.$executeRaw`UPDATE colonies SET postal_code = '72000' WHERE city ILIKE '%Puebla%' AND name ILIKE '%Centro%'`;
  console.log('CP 72000 actualizados:', res1);

  const res2 = await prisma.$executeRaw`UPDATE colonies SET postal_code = '72590' WHERE city ILIKE '%Puebla%' AND name ILIKE '%Manuel%'`;
  console.log('CP 72590 actualizados:', res2);
}

main().catch(console.error).finally(() => prisma.$disconnect());
