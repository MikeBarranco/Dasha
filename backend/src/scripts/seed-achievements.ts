import 'dotenv/config';
import { prisma } from '../config/db';

async function main() {
  const achievements = [
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
      code: 'first_rescue',
      name: 'Rescatista Principiante',
      description: 'Aceptaste y completaste tu primer rescate.',
      iconUrl: 'https://res.cloudinary.com/dtg0cd8tq/image/upload/v1700000000/dasha_achievements/first_rescue.png',
      category: 'volunteer',
      requirementType: 'rescues_count',
      requirementValue: 1,
      tier: 'bronze',
      pointsReward: 100
    }
  ];

  console.log('🌱 Sembrando logros en la base de datos...');

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: ach as any,
      create: ach as any,
    });
    console.log(`✅ Logro ${ach.code} sincronizado.`);
  }

  console.log('🎉 Semilla de logros completada.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
