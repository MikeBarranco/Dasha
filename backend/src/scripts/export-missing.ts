import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const missing = await prisma.colony.findMany({ 
    where: { postalCode: null }, 
    select: { name: true, municipality: true } 
  });
  console.log('Asentamiento,Municipio');
  missing.forEach(m => console.log(m.name + ',' + m.municipality));
}

main().finally(() => prisma.$disconnect());
