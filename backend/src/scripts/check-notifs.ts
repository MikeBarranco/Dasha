import 'dotenv/config';
import { prisma } from '../config/db';

async function checkNotifs() {
  const notifs = await prisma.notification.findMany({
    orderBy: { sentAt: 'desc' },
    take: 3,
    include: { user: { select: { email: true, name: true } } }
  });
  console.log(JSON.stringify(notifs, null, 2));
}

checkNotifs().finally(() => prisma.$disconnect());
