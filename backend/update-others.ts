import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { prisma } = await import('./dist/config/db.js');
  console.log('Actualizando fotos de Canela y Benito...');

  // --- CANELA ---
  const canela = await prisma.animalProfile.findFirst({
    where: { name: 'Canela' }
  });

  if (canela) {
    await prisma.animalPhoto.deleteMany({ where: { animalId: canela.id } });
    await prisma.animalPhoto.createMany({
      data: [
        {
          animalId: canela.id,
          url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Thin_dog_in_cardboard_box_202606261306_teoyvq.jpg',
          publicId: 'Thin_dog_in_cardboard_box_202606261306_teoyvq',
          caption: 'Día 1: Desnutrida y abandonada'
        },
        {
          animalId: canela.id,
          url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Dog_eating_from_bowl_202606261307_spv5xm.jpg',
          publicId: 'Dog_eating_from_bowl_202606261307_spv5xm',
          caption: 'Día 15: Comiendo mejor en el veterinario'
        },
        {
          animalId: canela.id,
          url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Small_dog_sitting_on_sofa_202606261307_c6ln9e.jpg',
          publicId: 'Small_dog_sitting_on_sofa_202606261307_c6ln9e',
          caption: 'Mes 1: ¡Recuperada y lista para adopción!'
        }
      ]
    });
    console.log('¡Fotos de Canela actualizadas!');
  }

  // --- BENITO ---
  const benito = await prisma.animalProfile.findFirst({
    where: { name: 'Benito' }
  });

  if (benito) {
    await prisma.animalPhoto.deleteMany({ where: { animalId: benito.id } });
    await prisma.animalPhoto.createMany({
      data: [
        {
          animalId: benito.id,
          url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Sick_kitten_hiding_under_car_202606261309_n0q9x9.jpg',
          publicId: 'Sick_kitten_hiding_under_car_202606261309_n0q9x9',
          caption: 'Día 1: Encontrado enfermo en la calle'
        },
        {
          animalId: benito.id,
          url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Semana_2__En_tratamiento___The_202606261310_ndloz0.jpg',
          publicId: 'Semana_2__En_tratamiento___The_202606261310_ndloz0',
          caption: 'Semana 2: En tratamiento'
        },
        {
          animalId: benito.id,
          url: 'https://res.cloudinary.com/dq785ju4s/image/upload/Mes_1__Sano___The_exact_202606261310_npfmuh.jpg',
          publicId: 'Mes_1__Sano___The_exact_202606261310_npfmuh',
          caption: 'Mes 1: Sano, jugando en casa temporal'
        }
      ]
    });
    console.log('¡Fotos de Benito actualizadas!');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
