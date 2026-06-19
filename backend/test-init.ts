import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

try {
  // En Prisma v7.8.0, no necesitas pasar nada. Prisma lee el .env automáticamente.
  const prisma = new PrismaClient();
  
  console.log("Success with database URL");
} catch (e) {
  console.error("ERROR:", (e as Error).message);
}
