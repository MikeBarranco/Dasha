import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeString(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

async function main() {
  const filePath = '/app/cp.csv';
  console.log(`Leyendo archivo desde: ${filePath}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  console.log(`Encontradas ${lines.length} líneas en el CSV.`);
  let count = 0;
  let notFound = 0;

  const allColonies = await prisma.colony.findMany({
    select: { id: true, name: true }
  });
  
  console.log(`Cargadas ${allColonies.length} colonias desde la Base de Datos para el cruce.`);

  const coloniesMap = new Map<string, string[]>();
  for (const c of allColonies) {
    const norm = normalizeString(c.name);
    if (!coloniesMap.has(norm)) coloniesMap.set(norm, []);
    coloniesMap.get(norm)!.push(c.id);
  }

  const updates: Promise<any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    if (cols.length < 2) continue;

    const postalCode = cols[0].trim();
    const asentamiento = cols[1].trim();

    if (!postalCode || !asentamiento) continue;

    const normName = normalizeString(asentamiento);
    const matchedIds = coloniesMap.get(normName);

    if (matchedIds && matchedIds.length > 0) {
      for (const id of matchedIds) {
        updates.push(prisma.colony.update({
          where: { id },
          data: { postalCode }
        }));
        count++;
      }
    } else {
      notFound++;
    }
  }

  console.log(`Actualizando ${updates.length} colonias en la BD...`);
  
  const batchSize = 500;
  for (let i = 0; i < updates.length; i += batchSize) {
    await Promise.all(updates.slice(i, i + batchSize));
    console.log(`Progreso: ${Math.min(i + batchSize, updates.length)} / ${updates.length}`);
  }

  console.log(`¡Importación finalizada! Total actualizadas: ${count}. No encontradas en BD: ${notFound}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
