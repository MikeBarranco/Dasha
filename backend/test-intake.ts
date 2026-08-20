import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!user) return console.log('no admin user');
  
  const emp = await prisma.organizationEmployee.findFirst({ where: { userId: user.id } });
  if (!emp) return console.log('no emp');

  console.log('Testing dummy report creation...');
  const dummyReport = await prisma.report.create({
    data: {
      userId: user.id,
      species: 'dog',
      primaryColor: 'red',
      size: 'medium',
      condition: 'stable',
      description: 'Ingreso directo al refugio',
      status: 'closed',
      address: 'Ingreso directo',
      photos: {
        create: [{
          url: 'http://test.com',
          publicId: 'test_id',
          orderIndex: 0,
          uploadedBy: user.id
        }]
      }
    }
  });
  console.log('Dummy report:', dummyReport.id);

  console.log('Testing animal creation...');
  const animal = await prisma.$transaction(async (tx) => {
    return await tx.animalProfile.create({
      data: {
        report: { connect: { id: dummyReport.id } },
        organization: { connect: { id: emp.organizationId } },
        name: 'Test',
        species: 'dog',
        status: 'in_treatment',
        photos: {
          create: [{
            url: 'http://test.com',
            publicId: 'test_id',
            orderIndex: 0
          }]
        }
      }
    });
  });
  console.log('Animal:', animal.id);
}
run().catch(console.error).finally(() => prisma.$disconnect());
