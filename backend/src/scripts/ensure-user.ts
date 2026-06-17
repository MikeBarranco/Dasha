import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const userId = 'f557ba42-799e-4454-b676-5125a354d425';
  
  await prisma.$executeRaw`
    INSERT INTO "users" ("id", "email", "name", "role")
    VALUES (
      ${userId}::uuid, 
      'frontend-test@dasha.com', 
      'Usuario Frontend', 
      'citizen'
    )
    ON CONFLICT ("id") DO NOTHING;
  `;
  console.log('Usuario frontend asegurado.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
