import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const nullCount = await prisma.colony.count({ where: { postalCode: null } });
  const notNullCount = await prisma.colony.count({ where: { postalCode: { not: null } } });
  console.log('NULL_CP:', nullCount, 'WITH_CP:', notNullCount);
}

main().finally(() => prisma.$disconnect());
