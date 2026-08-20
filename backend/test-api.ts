import { PrismaClient } from '@prisma/client';
import { OrganizationController } from './src/controllers/organization.controller';

const req: any = {
  user: { id: '' },
  body: {
    name: 'Test',
    species: 'dog',
    size: 'medium',
    color: 'Negro',
    story: 'Test story',
    photosBase64: []
  }
};

const res: any = {
  status: (code: number) => {
    console.log('STATUS:', code);
    return { json: (data: any) => console.log('JSON:', data) };
  }
};

const next = (err: any) => console.log('NEXT ERROR:', err);

async function run() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (user) {
    req.user.id = user.id;
    await OrganizationController.directIntakeAnimal(req, res, next);
  }
  await prisma.$disconnect();
}
run().catch(console.error);
