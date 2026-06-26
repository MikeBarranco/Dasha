import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { prisma } = await import('./dist/config/db.js');
  console.log('Intercambiando nombres...');

  const animal1 = await prisma.animalProfile.findFirst({ where: { name: 'Solovino' } });
  const animal2 = await prisma.animalProfile.findFirst({ where: { name: 'Canela' } });

  if (animal1 && animal2) {
    // Para evitar conflictos de unique (si los hubiera) usamos un nombre temporal
    await prisma.animalProfile.update({
      where: { id: animal1.id },
      data: { name: 'TempName123' }
    });

    await prisma.animalProfile.update({
      where: { id: animal2.id },
      data: { name: 'Solovino' }
    });

    await prisma.animalProfile.update({
      where: { id: animal1.id },
      data: { name: 'Canela' }
    });

    console.log('¡Nombres intercambiados exitosamente!');
  } else {
    console.log('No se encontraron ambos animales.');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
