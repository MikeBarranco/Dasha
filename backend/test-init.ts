import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

try {
  const prisma = new PrismaClient({
    connectionUrl: process.env.DATABASE_URL
  });
  console.log("Success with 'connectionUrl'");
} catch (e) {
  console.error("ERROR:", e.message);
}
