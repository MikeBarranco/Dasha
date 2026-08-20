import { prisma } from './config/db';
import { AnimalService } from './services/animal.service';

async function run() {
  const user = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!user) return console.log('no admin user');
  
  const emp = await prisma.organizationEmployee.findFirst({ where: { userId: user.id } });
  if (!emp) return console.log('no emp');

  console.log('Testing dummy report creation...');
  const uploadedPhotos = [{
    url: 'http://test.com',
    publicId: 'test_id'
  }];

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
        create: uploadedPhotos.map((p, i) => ({
          url: p.url,
          publicId: p.publicId,
          orderIndex: i,
          uploadedBy: user.id
        }))
      }
    }
  });
  console.log('Dummy report:', dummyReport.id);

  console.log('Testing animal creation...');
  const animalData = {
    reportId: dummyReport.id,
    organizationId: emp.organizationId,
    name: 'Test',
    species: 'dog',
    status: 'in_treatment',
    isPublic: true
  };

  const animal = await AnimalService.createProfile(animalData as any, uploadedPhotos);
  console.log('Animal:', animal.id);
  
  await prisma.$disconnect();
}
run().catch(console.error);
