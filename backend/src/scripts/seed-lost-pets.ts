import 'dotenv/config';
import { prisma } from '../config/db';

async function main() {
  console.log('🌱 Iniciando sembrado de mascotas perdidas para la demo...');

  // Borrar mascotas perdidas anteriores (Max y Luna) para evitar duplicados
  await prisma.$executeRaw`DELETE FROM lost_pets WHERE pet_name IN ('Max', 'Luna')`;
  await prisma.report.deleteMany({
    where: { description: { in: ['Llevaba un collar azul. Es muy asustadizo.', 'Gatita carey. Maúlla mucho.'] } }
  });

  // 1. Obtener un usuario ciudadano al azar (o el admin)
  const owner = await prisma.user.findFirst({
    where: { role: 'citizen' }
  });

  if (!owner) {
    console.error('❌ No se encontró ningún usuario para ser dueño de la mascota perdida.');
    return;
  }

  const ownerId = owner.id;

  // Mascota Perdida 1: "Max" (Perrito cerca de un parque)
  const maxReport = await prisma.report.create({
    data: {
      userId: ownerId,
      species: 'dog',
      primaryColor: 'Café',
      secondaryColor: 'Blanco',
      size: 'medium',
      condition: 'lost',
      urgency: 'high',
      description: 'Llevaba un collar azul. Es muy asustadizo.',
      status: 'active',
      photos: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=500&q=80',
            publicId: 'dasha/demo/max_lost_1',
            uploadedBy: ownerId
          }
        ]
      }
    }
  });

  const lat1 = 19.0414; // Puebla Capital (Centro)
  const lng1 = -98.2063;

  const maxLost = await prisma.$queryRaw`
    INSERT INTO lost_pets (
      report_id, owner_id, pet_name, distinctive_marks, 
      last_seen_location, last_seen_at, search_radius_km, reward, contact_whatsapp, is_found
    ) VALUES (
      ${maxReport.id}::uuid, ${ownerId}::uuid, 'Max', 'Mancha blanca en el ojo izquierdo', 
      ST_SetSRID(ST_MakePoint(${lng1}, ${lat1}), 4326), NOW(), 3, 500, '3312345678', false
    ) RETURNING id;
  `;

  await prisma.$executeRaw`
    UPDATE reports
    SET location = ST_SetSRID(ST_MakePoint(${lng1}, ${lat1}), 4326)
    WHERE id = ${maxReport.id}::uuid;
  `;

  console.log('✅ Mascota perdida 1 (Max) creada.');

  // Mascota Perdida 2: "Luna" (Gatita)
  const lunaReport = await prisma.report.create({
    data: {
      userId: ownerId,
      species: 'cat',
      primaryColor: 'Negro',
      secondaryColor: 'Naranja',
      size: 'small',
      condition: 'lost',
      urgency: 'medium',
      description: 'Gatita carey. Maúlla mucho.',
      status: 'active',
      photos: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?w=500&q=80',
            publicId: 'dasha/demo/luna_lost_1',
            uploadedBy: ownerId
          }
        ]
      }
    }
  });

  const lat2 = 19.0300; // Puebla Capital (Un poco más al sur)
  const lng2 = -98.2100;

  const lunaLost = await prisma.$queryRaw`
    INSERT INTO lost_pets (
      report_id, owner_id, pet_name, distinctive_marks, 
      last_seen_location, last_seen_at, search_radius_km, reward, contact_whatsapp, is_found
    ) VALUES (
      ${lunaReport.id}::uuid, ${ownerId}::uuid, 'Luna', 'Gatita tipo carey', 
      ST_SetSRID(ST_MakePoint(${lng2}, ${lat2}), 4326), NOW(), 2, 0, '3311223344', false
    ) RETURNING id;
  `;

  await prisma.$executeRaw`
    UPDATE reports
    SET location = ST_SetSRID(ST_MakePoint(${lng2}, ${lat2}), 4326)
    WHERE id = ${lunaReport.id}::uuid;
  `;

  console.log('✅ Mascota perdida 2 (Luna) creada.');
  console.log('🎉 ¡Sembrado de mascotas perdidas completado!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
