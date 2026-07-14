import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { prisma } = await import('./dist/config/db.js');
  console.log('Actualizando fotos de Solovino...');

  const solovino = await prisma.animalProfile.findFirst({
    where: { name: 'Solovino' }
  });

  if (!solovino) {
    throw new Error('Solovino no encontrado');
  }

  // Borrar fotos anteriores
  await prisma.animalPhoto.deleteMany({
    where: { animalId: solovino.id }
  });

  // Agregar nuevas fotos
  await prisma.animalPhoto.createMany({
    data: [
      {
        animalId: solovino.id,
        url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Stray_dog_sitting_on_street_202606261257_eor5s1.jpg',
        publicId: 'Stray_dog_sitting_on_street_202606261257_eor5s1',
        caption: 'Día 1: Recién rescatado de la avenida'
      },
      {
        animalId: solovino.id,
        url: 'https://res.cloudinary.com/dq785ju4s/image/upload/The_exact_same_medium-sized_mixed-breed_202606261257_lzcqqu.jpg',
        publicId: 'The_exact_same_medium-sized_mixed-breed_202606261257_lzcqqu',
        caption: 'Día 3: En la clínica con su vendaje'
      },
      {
        animalId: solovino.id,
        url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Dog_running_in_sunny_park_202606261257_jprdgs.jpg',
        publicId: 'Dog_running_in_sunny_park_202606261257_jprdgs',
        caption: 'Mes 1: ¡Sano y feliz en el parque!'
      }
    ]
  });

  console.log('¡Fotos de Solovino actualizadas!');
  await prisma.$disconnect();
}

main().catch(console.error);
