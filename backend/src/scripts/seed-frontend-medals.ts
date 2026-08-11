import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Limpiando medallas inventadas anteriores...');
  await prisma.userAchievement.deleteMany({});
  await prisma.achievement.deleteMany({});

  const achievements = [
    { code: 'primer-reporte', name: 'Primer reporte', description: 'Reporta tu primer animal en situación de calle.', iconUrl: '/medals/medalla-primer-reporte.png', category: 'reporter', requirementType: 'reports_count', requirementValue: 1, tier: 'bronze', pointsReward: 50 },
    { code: 'ojo-de-halcon', name: 'Ojo de halcón', description: 'Haz varios reportes y ayuda a detectar animales en riesgo.', iconUrl: '/medals/medalla-ojo-de-halcon.png', category: 'reporter', requirementType: 'reports_count', requirementValue: 5, tier: 'silver', pointsReward: 100 },
    { code: 'guardian-ciudad', name: 'Guardián de la ciudad', description: 'Mantente activo reportando en tu zona.', iconUrl: '/medals/medalla-guardian-ciudad.png', category: 'reporter', requirementType: 'reports_count', requirementValue: 20, tier: 'gold', pointsReward: 300 },
    { code: 'ronda-nocturna', name: 'Ronda nocturna', description: 'Reporta animales durante la noche.', iconUrl: '/medals/medalla-ronda-nocturna.png', category: 'reporter', requirementType: 'special', requirementValue: 1, tier: 'silver', pointsReward: 150 },
    
    { code: 'heroe-cuadra', name: 'Héroe de la cuadra', description: 'Completa tu primer rescate como voluntario.', iconUrl: '/medals/medalla-heroe-cuadra.webp', category: 'volunteer', requirementType: 'rescues_count', requirementValue: 1, tier: 'bronze', pointsReward: 100 },
    { code: 'angel-4-patas', name: 'Ángel de 4 patas', description: 'Apoya en varios rescates de animales.', iconUrl: '/medals/medalla-angel-4-patas.webp', category: 'volunteer', requirementType: 'rescues_count', requirementValue: 5, tier: 'silver', pointsReward: 250 },
    { code: 'nivel-3', name: 'Rescatista nivel 3', description: 'Alcanza el nivel 3 ayudando a la comunidad.', iconUrl: '/medals/medalla-nivel-3.webp', category: 'volunteer', requirementType: 'rescues_count', requirementValue: 20, tier: 'gold', pointsReward: 500 },
    { code: 'leyenda-rescate', name: 'Leyenda del rescate', description: 'Conviértete en un referente del rescate.', iconUrl: '/medals/medalla-leyenda-rescate.webp', category: 'volunteer', requirementType: 'rescues_count', requirementValue: 50, tier: 'gold', pointsReward: 1000 },
    { code: 'respuesta-rapida', name: 'Respuesta rápida', description: 'Atiende un reporte urgente muy rápido.', iconUrl: '/medals/medalla-respuesta-rapida.webp', category: 'volunteer', requirementType: 'special', requirementValue: 1, tier: 'silver', pointsReward: 200 },
    { code: 'bajo-la-lluvia', name: 'Bajo la lluvia', description: 'Ayuda a un animal en condiciones difíciles.', iconUrl: '/medals/medalla-bajo-la-lluvia.webp', category: 'volunteer', requirementType: 'special', requirementValue: 1, tier: 'silver', pointsReward: 200 },
    
    { code: 'casa-abierta', name: 'Casa abierta', description: 'Ofrece hogar temporal por primera vez.', iconUrl: '/medals/medalla-casa-abierta.webp', category: 'volunteer', requirementType: 'special', requirementValue: 1, tier: 'bronze', pointsReward: 100 },
    { code: 'refugio-seguro', name: 'Refugio seguro', description: 'Da hogar temporal a varios animales.', iconUrl: '/medals/medalla-refugio-seguro.webp', category: 'volunteer', requirementType: 'special', requirementValue: 5, tier: 'silver', pointsReward: 300 },
    { code: 'hogar-de-oro', name: 'Hogar de oro', description: 'Sé un hogar temporal excepcional.', iconUrl: '/medals/medalla-hogar-de-oro.webp', category: 'volunteer', requirementType: 'special', requirementValue: 10, tier: 'gold', pointsReward: 600 },
    
    { code: 'corazon-generoso', name: 'Corazón generoso', description: 'Haz tu primera donación.', iconUrl: '/medals/medalla-corazon-generoso.webp', category: 'donor', requirementType: 'donations_count', requirementValue: 1, tier: 'bronze', pointsReward: 50 },
    { code: 'padrino-fiel', name: 'Padrino fiel', description: 'Apadrina a un animal de forma constante.', iconUrl: '/medals/medalla-padrino-fiel.webp', category: 'donor', requirementType: 'donations_count', requirementValue: 5, tier: 'silver', pointsReward: 250 },
    { code: 'gran-mecenas', name: 'Gran mecenas', description: 'Apoya con donaciones importantes.', iconUrl: '/medals/medalla-gran-mecenas.webp', category: 'donor', requirementType: 'donations_count', requirementValue: 20, tier: 'gold', pointsReward: 1000 },
    { code: 'manos-que-ayudan', name: 'Manos que ayudan', description: 'Dona insumos como croquetas o transporte.', iconUrl: '/medals/medalla-manos-que-ayudan.webp', category: 'donor', requirementType: 'special', requirementValue: 1, tier: 'bronze', pointsReward: 50 },
    { code: 'despensa-solidaria', name: 'Despensa solidaria', description: 'Aporta alimento para los rescatados.', iconUrl: '/medals/medalla-despensa-solidaria.webp', category: 'donor', requirementType: 'special', requirementValue: 5, tier: 'silver', pointsReward: 200 },
    
    { code: 'voz-que-inspira', name: 'Voz que inspira', description: 'Comparte y difunde casos en la comunidad.', iconUrl: '/medals/medalla-voz-que-inspira.webp', category: 'special', requirementType: 'special', requirementValue: 1, tier: 'bronze', pointsReward: 50 },
    { code: 'sabio-manada', name: 'Sabio de la manada', description: 'Aporta consejos útiles en el foro.', iconUrl: '/medals/medalla-sabio-manada.webp', category: 'special', requirementType: 'special', requirementValue: 10, tier: 'silver', pointsReward: 150 },
    { code: 'pilar-comunidad', name: 'Pilar de la comunidad', description: 'Sé un miembro clave de la comunidad.', iconUrl: '/medals/medalla-pilar-comunidad.webp', category: 'special', requirementType: 'special', requirementValue: 50, tier: 'gold', pointsReward: 500 },
    { code: 'siempre-presente', name: 'Siempre presente', description: 'Participa de forma constante en Dasha.', iconUrl: '/medals/medalla-siempre-presente.webp', category: 'special', requirementType: 'special', requirementValue: 100, tier: 'silver', pointsReward: 300 },
    { code: 'fundador-dasha', name: 'Fundador Dasha', description: 'Forma parte de los primeros miembros de Dasha.', iconUrl: '/medals/medalla-fundador-dasha.webp', category: 'special', requirementType: 'special', requirementValue: 1, tier: 'gold', pointsReward: 1000 },
    { code: 'ciclo-completo', name: 'Ciclo completo', description: 'Acompaña a un animal del rescate a su adopción.', iconUrl: '/medals/medalla-ciclo-completo.webp', category: 'volunteer', requirementType: 'special', requirementValue: 1, tier: 'gold', pointsReward: 500 },
  ];

  console.log('🌱 Sembrando las 24 medallas oficiales del Frontend...');

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
