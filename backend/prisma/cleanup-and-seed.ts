import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { prisma } = await import('../dist/config/db.js');
  console.log('Limpiando base de datos de animales repetidos...');

  // 1. Limpiar todos los perfiles de animales y sus fotos (Cascade delete debería encargarse de las fotos si está configurado, 
  // pero por si acaso borramos todo lo relacionado a animales dummy).
  await prisma.animalPhoto.deleteMany({});
  await prisma.animalProfile.deleteMany({});
  
  // Borramos los reportes que no tengan animal profile para limpiar la basura generada
  // (Como Prisma no tiene un delete fácil de huérfanos, borramos los reportes con status in_treatment, recovering, looking_for_foster que hicimos)
  await prisma.report.deleteMany({
    where: {
      status: { in: ['in_treatment', 'recovering', 'looking_for_foster'] }
    }
  });

  console.log('Base de datos limpia. Sembrando 3 casos únicos...');

  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No hay usuarios en la base de datos para asignar reportes.");

  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Refugio Esperanza',
        description: 'Dedicados a salvar peluditos de la calle.',
        address: 'Boulevard 5 de Mayo, Puebla',
        phone: '2221112233',
        orgType: 'shelter',
        isVerified: true
      }
    });
    await prisma.$executeRaw`UPDATE organizations SET location = ST_SetSRID(ST_MakePoint(-98.20346, 19.04129), 4326) WHERE id = ${org.id}::uuid`;
  }

  // 1. Solovino (En tratamiento)
  const report1 = await prisma.report.create({
    data: { userId: user.id, species: 'dog', primaryColor: 'Café', size: 'medium', condition: 'injured', description: 'Atropellado', status: 'in_treatment' }
  });

  await prisma.animalProfile.create({
    data: {
      reportId: report1.id,
      organizationId: org.id,
      name: 'Solovino',
      species: 'dog',
      breed: 'Mestizo',
      status: 'in_treatment',
      diagnosis: 'Fractura expuesta de fémur derecho y deshidratación.',
      treatment: 'Cirugía ortopédica (fijadores externos), antibióticos y analgésicos.',
      totalCostNeeded: 4500.00,
      totalRaised: 1250.00,
      isPublic: true,
      photos: {
        create: [
          { url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80', publicId: 'solo_1', caption: 'Día 1: Recién rescatado de la avenida' },
          { url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80', publicId: 'solo_2', caption: 'Día 3: En la clínica con su vendaje' }
        ]
      }
    }
  });

  // 2. Canela (Recuperándose) - Usando nuevas URLs de imágenes comprobadas
  const report2 = await prisma.report.create({
    data: { userId: user.id, species: 'dog', primaryColor: 'Negro', size: 'medium', condition: 'malnourished', description: 'Desnutrición extrema', status: 'recovering' }
  });

  await prisma.animalProfile.create({
    data: {
      reportId: report2.id,
      organizationId: org.id,
      name: 'Canela',
      species: 'dog',
      status: 'recovering',
      diagnosis: 'Desnutrición severa, anemia y sarna demodécica.',
      treatment: 'Baños medicados semanales, vitaminas y dieta hipercalórica.',
      totalCostNeeded: 2500.00,
      totalRaised: 2500.00,
      isPublic: true,
      photos: {
        create: [
          { url: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=800&q=80', publicId: 'can_1', caption: 'Día 1: Muy débil' },
          { url: 'https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=800&q=80', publicId: 'can_2', caption: 'Día 15: Comiendo mejor' },
          { url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80', publicId: 'can_3', caption: 'Mes 1: Lista para adopción' }
        ]
      }
    }
  });

  // 3. Benito (Buscando hogar temporal)
  const report3 = await prisma.report.create({
    data: { userId: user.id, species: 'cat', primaryColor: 'Naranja', size: 'small', condition: 'sick', description: 'Gatito con gripa', status: 'looking_for_foster' }
  });

  await prisma.animalProfile.create({
    data: {
      reportId: report3.id,
      organizationId: org.id,
      name: 'Benito',
      species: 'cat',
      status: 'looking_for_foster',
      diagnosis: 'Infección respiratoria superior (ya superada).',
      treatment: 'Gotas oftálmicas y antibiótico oral terminado.',
      totalCostNeeded: 800.00,
      totalRaised: 800.00,
      isPublic: true,
      photos: {
        create: [
          { url: 'https://images.unsplash.com/photo-1513245543132-31f507417b26?auto=format&fit=crop&w=800&q=80', publicId: 'ben_1', caption: 'Día 1: Con infección' },
          { url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80', publicId: 'ben_2', caption: 'Semana 2: Ojos sanos' }
        ]
      }
    }
  });

  console.log('¡Limpieza y nueva siembra terminada exitosamente!');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
