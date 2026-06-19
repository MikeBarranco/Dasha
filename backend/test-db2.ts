import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './src/config/db';

async function test() {
  try {
    await prisma.$connect();
    console.log('DB OK');
  } catch(e) {
    console.error('DB ERROR:', e);
  } finally {
    process.exit(0);
  }
}
test();
