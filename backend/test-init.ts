import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

try {
  
  const prisma = new PrismaClient();
  
  console.log("Success with database URL");
} catch (e) {
  console.error("ERROR:", (e as Error).message);
}