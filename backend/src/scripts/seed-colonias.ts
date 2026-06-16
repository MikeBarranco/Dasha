import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const geojsonPath = path.resolve(__dirname, '../../../frontend/public/data/colonias-puebla.geojson');
  console.log(`Leeyendo archivo desde: ${geojsonPath}`);
  
  const rawData = fs.readFileSync(geojsonPath, 'utf8');
  const data = JSON.parse(rawData);
  
  console.log(`Encontradas ${data.features.length} colonias en el archivo GeoJSON. Insertando en PostgreSQL...`);
  
  let count = 0;
  for (const feature of data.features) {
    if (feature.geometry && feature.geometry.type === 'Polygon') {
      const name = feature.properties.name || 'Sin nombre';
      // Generamos un ID amigable
      const id = name.replace(/\s+/g, '-').toLowerCase() + '-' + count;
      const geometryJson = JSON.stringify(feature.geometry);
      
      try {
        await prisma.$executeRaw`
          INSERT INTO "colonies" ("id", "name", "city", "municipality", "geometry", "created_at", "active_reports_count")
          VALUES (
            ${id}, 
            ${name}, 
            'Puebla', 
            'Puebla', 
            ST_GeomFromGeoJSON(${geometryJson}),
            NOW(),
            0
          )
          ON CONFLICT ("id") DO NOTHING;
        `;
        count++;
        if (count % 100 === 0) console.log(`...insertadas ${count} colonias`);
      } catch (error) {
        console.error(`Error al insertar colonia ${name}:`, (error as Error).message);
      }
    } else {
      console.log('Omitiendo feature sin geometría o que no es Polygon.');
    }
  }
  
  console.log(`¡Importación finalizada! Total insertadas con éxito: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
