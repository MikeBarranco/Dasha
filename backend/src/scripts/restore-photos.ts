import 'dotenv/config';
import { prisma } from '../config/db';

async function restorePhotos() {
  const animals = await prisma.animalProfile.findMany();
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dq785ju4s';
  const getUrl = (pubId: string) => `https://res.cloudinary.com/${cloudName}/image/upload/v1/${pubId}`;
  
  const photoMap: Record<string, string[]> = {
    'Canela': [
      'Stray_dog_sitting_on_street_202606261257_eor5s1',
      'The_exact_same_medium-sized_mixed-breed_202606261257_lzcqqu',
      'Dog_running_in_sunny_park_202606261257_jprdgs'
    ],
    'Solovino': [
      'Thin_dog_in_cardboard_box_202606261306_teoyvq',
      'Dog_eating_from_bowl_202606261307_spv5xm',
      'Small_dog_sitting_on_sofa_202606261307_c6ln9e'
    ],
    'Benito': [
      'Sick_kitten_hiding_under_car_202606261309_n0q9x9',
      'Semana_2__En_tratamiento___The_202606261310_ndloz0',
      'Mes_1__Sano___The_exact_202606261310_npfmuh'
    ]
  };

  for (const animal of animals) {
    const pubIds = photoMap[animal.name];
    if (pubIds) {
      for (let i = 0; i < pubIds.length; i++) {
        await prisma.animalPhoto.create({
          data: {
            animalId: animal.id,
            url: getUrl(pubIds[i]),
            publicId: pubIds[i],
            orderIndex: i
          }
        });
      }
      console.log(`Fotos restauradas para ${animal.name}`);
    }
  }
}

restorePhotos()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
