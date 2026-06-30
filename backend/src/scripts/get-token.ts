import { prisma } from '../config/db';
import jwt from 'jsonwebtoken';

async function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('No JWT_SECRET in environment');
    process.exit(1);
  }

  const citizen = await prisma.user.findFirst({ where: { role: 'citizen' } });
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });

  if (citizen) {
    const citizenToken = jwt.sign({ id: citizen.id, role: citizen.role }, secret, { expiresIn: '7d' });
    console.log('\n--- TOKEN DE CIUDADANO (Para probar enviar la solicitud) ---');
    console.log(citizenToken);
  } else {
    console.log('\nNo hay ciudadanos en la base de datos.');
  }

  if (admin) {
    const adminToken = jwt.sign({ id: admin.id, role: admin.role }, secret, { expiresIn: '7d' });
    console.log('\n--- TOKEN DE ADMINISTRADOR (Para probar aprobar la solicitud) ---');
    console.log(adminToken);
  } else {
    console.log('\nNo hay administradores en la base de datos.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
