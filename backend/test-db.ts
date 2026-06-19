import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
prisma.$connect()
  .then(() => {
    console.log('DB OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('DB ERROR:', err);
    process.exit(1);
  });
