import 'dotenv/config';
import { prisma } from '../config/db';

async function clearReports() {
  console.log('Limpiando todos los reportes y animales de la base de datos de Staging...');
  
  // Truncate cascade borra los reportes y todas sus tablas dependientes (AnimalProfile, Fotos, Timeline, etc)
  // Sin borrar a los usuarios.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE reports CASCADE;`);

  console.log('¡Reportes eliminados con éxito!');
}

clearReports()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
