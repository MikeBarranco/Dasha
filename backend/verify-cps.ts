import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/config/db';

async function main() {
  const count = await prisma.colony.count({
    where: { postalCode: { not: null } }
  });
  
  const sample = await prisma.colony.findMany({
    where: { postalCode: { not: null } },
    take: 3,
    select: { name: true, postalCode: true }
  });

  console.log('--- VERIFICACIÓN ---');
  console.log(`Total de colonias con CP en la Base de Datos: ${count}`);
  console.log('Muestra aleatoria de 3 colonias:', sample);
}

main().finally(() => prisma.$disconnect());
