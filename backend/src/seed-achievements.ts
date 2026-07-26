import * as dotenv from 'dotenv';
dotenv.config();
import { prisma } from './config/db.js';

const achievements = [
  // Grupo A — contador simple
  { code: 'first_report', name: 'Primer reporte', description: 'Creaste tu primer reporte', iconUrl: '/achievements/first_report.png', requirementType: 'reports_count', requirementValue: 1, category: 'reporter', tier: 'bronze', pointsReward: 10 },
  { code: 'hawk_eye', name: 'Ojo de halcón', description: 'Creaste 5 reportes', iconUrl: '/achievements/hawk_eye.png', requirementType: 'reports_count', requirementValue: 5, category: 'reporter', tier: 'silver', pointsReward: 25 },
  { code: 'city_guardian', name: 'Guardián de la ciudad', description: 'Creaste 20 reportes', iconUrl: '/achievements/city_guardian.png', requirementType: 'reports_count', requirementValue: 20, category: 'reporter', tier: 'gold', pointsReward: 60 },
  
  { code: 'block_hero', name: 'Héroe de la cuadra', description: 'Completaste 1 rescate', iconUrl: '/achievements/block_hero.png', requirementType: 'rescues_count', requirementValue: 1, category: 'volunteer', tier: 'bronze', pointsReward: 20 },
  { code: 'four_paws_angel', name: 'Ángel de 4 patas', description: 'Completaste 5 rescates', iconUrl: '/achievements/four_paws_angel.png', requirementType: 'rescues_count', requirementValue: 5, category: 'volunteer', tier: 'silver', pointsReward: 50 },
  { code: 'rescue_legend', name: 'Leyenda del rescate', description: 'Completaste 25 rescates', iconUrl: '/achievements/rescue_legend.png', requirementType: 'rescues_count', requirementValue: 25, category: 'volunteer', tier: 'gold', pointsReward: 150 },
  
  // Nota: level no existe en RequirementType pero lo dejaremos como special o crearemos la lógica después
  { code: 'level_3', name: 'Rescatista nivel 3', description: 'Alcanzaste el nivel 3', iconUrl: '/achievements/level_3.png', requirementType: 'special', requirementValue: 3, category: 'volunteer', tier: 'silver', pointsReward: 30 },
  
  { code: 'generous_heart', name: 'Corazón generoso', description: 'Realizaste 1 donación', iconUrl: '/achievements/generous_heart.png', requirementType: 'donations_count', requirementValue: 1, category: 'donor', tier: 'bronze', pointsReward: 15 },
  // donation_amount tampoco existe por defecto, usamos special
  { code: 'great_patron', name: 'Gran mecenas', description: 'Donaste más de 1000', iconUrl: '/achievements/great_patron.png', requirementType: 'special', requirementValue: 1000, category: 'donor', tier: 'gold', pointsReward: 80 },
  { code: 'helping_hands', name: 'Manos que ayudan', description: 'Donación en especie', iconUrl: '/achievements/helping_hands.png', requirementType: 'special', requirementValue: 1, category: 'donor', tier: 'bronze', pointsReward: 15 },
  { code: 'solidary_pantry', name: 'Despensa solidaria', description: 'Cubriste 3 necesidades', iconUrl: '/achievements/solidary_pantry.png', requirementType: 'special', requirementValue: 3, category: 'donor', tier: 'silver', pointsReward: 40 },
  
  // forum_reply_count y forum_post_count
  { code: 'pack_sage', name: 'Sabio de la manada', description: '10 respuestas en el foro', iconUrl: '/achievements/pack_sage.png', requirementType: 'special', requirementValue: 10, category: 'social', tier: 'silver', pointsReward: 30 },
  { code: 'community_pillar', name: 'Pilar de la comunidad', description: '10 posts en el foro', iconUrl: '/achievements/community_pillar.png', requirementType: 'special', requirementValue: 10, category: 'social', tier: 'silver', pointsReward: 40 },
  
  { code: 'dasha_founder', name: 'Fundador Dasha', description: 'Eres miembro fundador', iconUrl: '/achievements/dasha_founder.png', requirementType: 'special', requirementValue: 1, category: 'special', tier: 'special', pointsReward: 50 },

  // Grupo B — necesitan un dato o definición
  { code: 'night_watch', name: 'Ronda nocturna', description: 'Reportar entre 10pm y 6am', iconUrl: '/achievements/night_watch.png', requirementType: 'special', requirementValue: 1, category: 'reporter', tier: 'silver', pointsReward: 20 },
  { code: 'fast_response', name: 'Respuesta rápida', description: 'Aceptar un critical rápido', iconUrl: '/achievements/fast_response.png', requirementType: 'special', requirementValue: 1, category: 'volunteer', tier: 'gold', pointsReward: 50 },
  { code: 'full_cycle', name: 'Ciclo completo', description: 'Reporte llega a adopción', iconUrl: '/achievements/full_cycle.png', requirementType: 'special', requirementValue: 1, category: 'reporter', tier: 'gold', pointsReward: 100 },
  { code: 'open_house', name: 'Casa abierta', description: 'Hogar temporal 1 vez', iconUrl: '/achievements/open_house.png', requirementType: 'special', requirementValue: 1, category: 'foster', tier: 'bronze', pointsReward: 30 },
  { code: 'safe_haven', name: 'Refugio seguro', description: 'Hogar temporal 3 veces', iconUrl: '/achievements/safe_haven.png', requirementType: 'special', requirementValue: 3, category: 'foster', tier: 'silver', pointsReward: 80 },
  { code: 'golden_home', name: 'Hogar de oro', description: 'Hogar temporal 10 veces', iconUrl: '/achievements/golden_home.png', requirementType: 'special', requirementValue: 10, category: 'foster', tier: 'gold', pointsReward: 200 },
  { code: 'faithful_godfather', name: 'Padrino fiel', description: '3 donaciones al mismo animal', iconUrl: '/achievements/faithful_godfather.png', requirementType: 'special', requirementValue: 3, category: 'donor', tier: 'gold', pointsReward: 100 },
  { code: 'inspiring_voice', name: 'Voz que inspira', description: '5 publicaciones con foto', iconUrl: '/achievements/inspiring_voice.png', requirementType: 'special', requirementValue: 5, category: 'social', tier: 'silver', pointsReward: 40 },
  { code: 'always_present', name: 'Siempre presente', description: '30 acciones en total', iconUrl: '/achievements/always_present.png', requirementType: 'special', requirementValue: 30, category: 'special', tier: 'gold', pointsReward: 100 },
  { code: 'in_the_rain', name: 'Bajo la lluvia', description: 'Completar un rescate critical', iconUrl: '/achievements/in_the_rain.png', requirementType: 'special', requirementValue: 1, category: 'volunteer', tier: 'silver', pointsReward: 60 }
];

async function main() {
  console.log('🌱 Sembrando medallas y logros...');

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: {
        name: ach.name,
        description: ach.description,
        iconUrl: ach.iconUrl,
        requirementType: ach.requirementType as any,
        requirementValue: ach.requirementValue,
        category: ach.category as any,
        tier: ach.tier as any,
        pointsReward: ach.pointsReward,
      },
      create: {
        code: ach.code,
        name: ach.name,
        description: ach.description,
        iconUrl: ach.iconUrl,
        requirementType: ach.requirementType as any,
        requirementValue: ach.requirementValue,
        category: ach.category as any,
        tier: ach.tier as any,
        pointsReward: ach.pointsReward,
      },
    });
  }

  console.log('✅ Se crearon/actualizaron', achievements.length, 'medallas');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
