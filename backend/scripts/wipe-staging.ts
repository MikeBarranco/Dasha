import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️ INICIANDO LIMPIEZA DE BASE DE DATOS DE STAGING ⚠️');
  console.log('Este script borrará toda la información excepto los administradores.');
  
  try {
    // Usamos una transacción para asegurar que si algo falla, no se borre nada a medias
    await prisma.$transaction(async (tx) => {
      console.log('Borrando donaciones...');
      await tx.donation.deleteMany({});
      
      console.log('Borrando necesidades...');
      await tx.need.deleteMany({});
      
      console.log('Borrando solicitudes de adopción...');
      await tx.adoptionApplication.deleteMany({});
      
      console.log('Borrando reportes y rescates...');
      await tx.report.deleteMany({});
      
      console.log('Borrando animales...');
      await tx.animalProfile.deleteMany({});
      
      console.log('Borrando foros...');
      await tx.forumPost.deleteMany({});
      
      console.log('Borrando organizaciones y empleados...');
      await tx.organizationEmployee.deleteMany({});
      await tx.organization.deleteMany({});
      
      console.log('Borrando notificaciones...');
      await tx.notification.deleteMany({});
      
      console.log('Borrando sesiones OAuth...');
      await tx.oAuthAccount.deleteMany({});

      console.log('Borrando usuarios (excepto administradores)...');
      const deletedUsers = await tx.user.deleteMany({
        where: {
          role: {
            not: 'admin' // Aseguramos que los admin se conserven
          }
        }
      });
      console.log(`Se eliminaron ${deletedUsers.count} usuarios no administradores.`);
    });
    
    console.log('✅ LIMPIEZA COMPLETADA CON ÉXITO ✅');
    console.log('La base de datos sigue intacta (las tablas existen), solo se vaciaron los registros.');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
