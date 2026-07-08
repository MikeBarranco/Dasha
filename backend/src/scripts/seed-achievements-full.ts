import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const achievements = [
    // Reporter
    {
      code: 'first_report',
      name: 'Primer Reporte',
      description: 'Creaste tu primer reporte de un animal en la plataforma.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_report.png',
      category: 'reporter',
      requirementType: 'reports_count',
      requirementValue: 1,
      tier: 'bronze',
      pointsReward: 50
    },
    {
      code: 'active_citizen',
      name: 'Ciudadano Activo',
      description: 'Has creado 5 reportes exitosos.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/active_citizen.png',
      category: 'reporter',
      requirementType: 'reports_count',
      requirementValue: 5,
      tier: 'silver',
      pointsReward: 150
    },
    {
      code: 'heroic_reporter',
      name: 'Reportero Heroico',
      description: 'Has creado 20 reportes verificados.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/active_citizen.png',
      category: 'reporter',
      requirementType: 'reports_count',
      requirementValue: 20,
      tier: 'gold',
      pointsReward: 500
    },

    // Volunteer
    {
      code: 'first_rescue',
      name: 'Rescatista Principiante',
      description: 'Aceptaste y completaste tu primer rescate.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_rescue.png',
      category: 'volunteer',
      requirementType: 'rescues_count',
      requirementValue: 1,
      tier: 'bronze',
      pointsReward: 100
    },
    {
      code: 'dedicated_rescuer',
      name: 'Rescatista Dedicado',
      description: 'Has completado 10 rescates exitosos.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_rescue.png',
      category: 'volunteer',
      requirementType: 'rescues_count',
      requirementValue: 10,
      tier: 'silver',
      pointsReward: 300
    },
    {
      code: 'guardian_angel',
      name: 'Ángel Guardián',
      description: 'Has completado 50 rescates salvando vidas.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_rescue.png',
      category: 'volunteer',
      requirementType: 'rescues_count',
      requirementValue: 50,
      tier: 'gold',
      pointsReward: 1000
    },

    // Donor
    {
      code: 'first_donation',
      name: 'Corazón Noble',
      description: 'Realizaste tu primera donación a la causa.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_report.png',
      category: 'donor',
      requirementType: 'donations_count',
      requirementValue: 1,
      tier: 'bronze',
      pointsReward: 100
    },
    {
      code: 'generous_donor',
      name: 'Donante Generoso',
      description: 'Has realizado 5 donaciones para ayudar a los peludos.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/active_citizen.png',
      category: 'donor',
      requirementType: 'donations_count',
      requirementValue: 5,
      tier: 'silver',
      pointsReward: 400
    },
    
    // Special
    {
      code: 'early_adopter',
      name: 'Pionero Dasha',
      description: 'Fuiste de los primeros en unirte a la plataforma Dasha.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_rescue.png',
      category: 'special',
      requirementType: 'special',
      requirementValue: 1,
      tier: 'gold',
      pointsReward: 500
    },
    {
      code: 'community_leader',
      name: 'Líder de la Manada',
      description: 'Otorgado por contribuciones excepcionales a la comunidad.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_rescue.png',
      category: 'special',
      requirementType: 'special',
      requirementValue: 1,
      tier: 'gold',
      pointsReward: 1500
    }
  ];

  console.log('🌱 Sembrando nuevos logros en la base de datos...');

  for (const ach of achievements) {
    try {
      await prisma.achievement.upsert({
        where: { code: ach.code },
        update: {
           name: ach.name,
           description: ach.description,
           iconUrl: ach.iconUrl,
           category: ach.category as any,
           requirementType: ach.requirementType as any,
           requirementValue: ach.requirementValue,
           tier: ach.tier as any,
           pointsReward: ach.pointsReward
        },
        create: {
           code: ach.code,
           name: ach.name,
           description: ach.description,
           iconUrl: ach.iconUrl,
           category: ach.category as any,
           requirementType: ach.requirementType as any,
           requirementValue: ach.requirementValue,
           tier: ach.tier as any,
           pointsReward: ach.pointsReward
        }
      });
      console.log(`✅ Logro ${ach.code} sincronizado.`);
    } catch(e) {
      console.error(`Error con el logro ${ach.code}:`, e);
    }
  }
}

main().finally(() => prisma.$disconnect());
