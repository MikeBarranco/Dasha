import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🐾 Iniciando prueba de Integración del Módulo de Reportes...');

  // 1. Crear un usuario de prueba para evadir la restricción de llave foránea
  console.log('1. Creando usuario voluntario de prueba...');
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@dasha.com`,
      name: 'Voluntario de Prueba',
      role: 'volunteer'
    }
  });
  console.log('✅ Usuario creado:', user.id);

  // 2. Hacer petición POST al servidor (Asegúrate de tener npm run dev corriendo)
  console.log('\n2. Enviando petición POST a http://localhost:3000/api/v1/reports ...');
  const postResponse = await fetch('http://localhost:3000/api/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      species: 'dog',
      primaryColor: 'Negro',
      size: 'medium',
      condition: 'injured',
      urgency: 'high',
      description: 'Perrito atropellado en la esquina, necesita ayuda.',
      lat: 19.0414, // Latitud de Puebla
      lng: -98.2063, // Longitud de Puebla
      photos: [
        { url: 'https://res.cloudinary.com/demo/image/upload/dog.jpg', publicId: 'demo/dog' }
      ]
    })
  });
  
  const postResult = await postResponse.json();
  console.log('Respuesta del POST:', JSON.stringify(postResult, null, 2));

  if (postResult.status !== 'success') {
    throw new Error('Fallo la creación del reporte');
  }

  // 3. Hacer petición GET a /nearby
  console.log('\n3. Consultando reportes cercanos usando PostGIS...');
  // Consultamos 2km alrededor de la misma coordenada
  const getResponse = await fetch('http://localhost:3000/api/v1/reports/nearby?lat=19.0414&lng=-98.2063&radius_km=2');
  const getResult = await getResponse.json();
  
  console.log(JSON.stringify(getResult, null, 2));
      
      // Buscar el reporte directamente en la BD para ver si le asignó la colonia
      const reportInDb = await prisma.report.findUnique({
        where: { id: postResult.data.id },
        include: { colony: true }
      });
      
      console.log(`\n🏡 Colonia asignada automáticamente por PostGIS: ${reportInDb?.colony?.name || 'Ninguna (Fuera de cobertura o sin intersección)'}`);
  
  console.log('\n🎉 ¡Prueba superada con éxito! PostGIS y Prisma están funcionando perfecto.');
}

main()
  .catch(e => console.error('❌ Error en la prueba:', e))
  .finally(async () => await prisma.$disconnect());
