import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { prisma } = await import('../src/config/db');
  console.log('Sembrando datos de prueba para Miguel...');

  // 1. Crear algunas Organizaciones (Allies)
  const org1 = await prisma.organization.create({
    data: {
      name: 'Refugio Esperanza',
      description: 'Dedicados a salvar peluditos de la calle.',
      address: 'Boulevard 5 de Mayo, Puebla',
      phone: '2221112233',
      orgType: 'shelter',
      isVerified: true
    }
  });
  
  await prisma.$executeRaw`UPDATE organizations SET location = ST_SetSRID(ST_MakePoint(-98.20346, 19.04129), 4326) WHERE id = ${org1.id}::uuid`;

  const org2 = await prisma.organization.create({
    data: {
      name: 'Veterinaria San Roque',
      description: 'Atención médica 24/7.',
      address: 'Cholula, Puebla',
      phone: '2223334455',
      orgType: 'veterinary',
      isVerified: true
    }
  });

  await prisma.$executeRaw`UPDATE organizations SET location = ST_SetSRID(ST_MakePoint(-98.30346, 19.05129), 4326) WHERE id = ${org2.id}::uuid`;

  // Crear reportes dummy falsos para los animales
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No hay usuarios para crear reportes falsos");

  const report1 = await prisma.report.create({
    data: {
      userId: user.id,
      species: 'dog',
      primaryColor: 'Café',
      size: 'medium',
      condition: 'injured',
      description: 'Perrito herido',
      status: 'in_treatment'
    }
  });

  const report2 = await prisma.report.create({
    data: {
      userId: user.id,
      species: 'cat',
      primaryColor: 'Blanco',
      size: 'small',
      condition: 'malnourished',
      description: 'Gatito desnutrido',
      status: 'recovering'
    }
  });

  // 2. Crear AnimalProfiles asociados a esos reportes y organizaciones
  await prisma.animalProfile.create({
    data: {
      reportId: report1.id,
      organizationId: org1.id,
      name: 'Firulais',
      species: 'dog',
      breed: 'Mestizo',
      status: 'in_treatment',
      isPublic: true,
      photos: {
        create: [
          { url: 'https://res.cloudinary.com/dasha/image/upload/v1/dummy_dog.jpg', publicId: 'dummy_dog' }
        ]
      }
    }
  });

  await prisma.animalProfile.create({
    data: {
      reportId: report2.id,
      organizationId: org2.id,
      name: 'Michi',
      species: 'cat',
      status: 'recovering',
      isPublic: true,
      photos: {
        create: [
          { url: 'https://res.cloudinary.com/dasha/image/upload/v1/dummy_cat.jpg', publicId: 'dummy_cat' }
        ]
      }
    }
  });

  console.log('¡Siembra terminada con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
