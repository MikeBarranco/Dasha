import 'dotenv/config';
import { prisma } from '../config/db';

async function clearPhotos() {
  await prisma.animalPhoto.deleteMany({});
  console.log('¡Todas las fotos genéricas han sido removidas!');
}

clearPhotos()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
