import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/db';

async function main() {
  console.log('Iniciando actualización masiva de códigos postales (Batch)...');
  
  const filePath = path.join(__dirname, '../../colonias_con_cp.tsv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  let sqlQueries = '';
  let count = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const columns = line.split('\t');
    if (columns.length >= 5) {
      const slugId = columns[0].trim();
      const postalCode = columns[4].trim();

      if (slugId && postalCode) {
        // Build raw SQL string for the batch
        sqlQueries += "UPDATE colonies SET postal_code = '" + postalCode + "' WHERE id = '" + slugId + "';\n";
        count++;
      }
    }
  }

  console.log("Ejecutando " + count + " updates en un solo comando hacia la BD...");

  try {
    // Ejecutar todo el batch de jalón
    await prisma.$executeRawUnsafe(sqlQueries);
    console.log('--- RESUMEN ---');
    console.log("✅ ¡Éxito! Se actualizaron los CPs de " + count + " colonias de forma ultra rápida.");
  } catch (error) {
    console.error('Error durante la actualización masiva:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
