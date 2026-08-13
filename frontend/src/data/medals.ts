import type { Achievement, AvailableAchievement } from '../lib/api';

export type MedalInfo = {
  id: string;
  name: string;
  image: string;
  description: string;
};

// Catálogo completo de medallas. En el perfil se muestran todas; se "encienden"
// las que el usuario ya desbloqueó (vienen en achievements de GET /me).
export const medalCatalog: MedalInfo[] = [
  {
    id: 'primer-reporte',
    name: 'Primer reporte',
    image: '/medals/medalla-primer-reporte.png',
    description: 'Reporta tu primer animal en situación de calle.',
  },
  {
    id: 'ojo-de-halcon',
    name: 'Ojo de halcón',
    image: '/medals/medalla-ojo-de-halcon.png',
    description: 'Haz varios reportes y ayuda a detectar animales en riesgo.',
  },
  {
    id: 'ciudadano-activo',
    name: 'Ciudadano Activo',
    image: '/medals/medalla-ojo-de-halcon.png',
    description: 'Has creado 5 reportes exitosos.',
  },
  {
    id: 'guardian-ciudad',
    name: 'Guardián de la ciudad',
    image: '/medals/medalla-guardian-ciudad.png',
    description: 'Mantente activo reportando en tu zona.',
  },
  {
    id: 'ronda-nocturna',
    name: 'Ronda nocturna',
    image: '/medals/medalla-ronda-nocturna.png',
    description: 'Reporta animales durante la noche.',
  },
  {
    id: 'heroe-cuadra',
    name: 'Héroe de la cuadra',
    image: '/medals/medalla-heroe-cuadra.webp',
    description: 'Completa tu primer rescate como voluntario.',
  },
  {
    id: 'angel-4-patas',
    name: 'Ángel de 4 patas',
    image: '/medals/medalla-angel-4-patas.webp',
    description: 'Apoya en varios rescates de animales.',
  },
  {
    id: 'nivel-3',
    name: 'Rescatista nivel 3',
    image: '/medals/medalla-nivel-3.webp',
    description: 'Alcanza el nivel 3 ayudando a la comunidad.',
  },
  {
    id: 'leyenda-rescate',
    name: 'Leyenda del rescate',
    image: '/medals/medalla-leyenda-rescate.webp',
    description: 'Conviértete en un referente del rescate.',
  },
  {
    id: 'respuesta-rapida',
    name: 'Respuesta rápida',
    image: '/medals/medalla-respuesta-rapida.webp',
    description: 'Atiende un reporte urgente muy rápido.',
  },
  {
    id: 'bajo-la-lluvia',
    name: 'Bajo la lluvia',
    image: '/medals/medalla-bajo-la-lluvia.webp',
    description: 'Ayuda a un animal en condiciones difíciles.',
  },
  {
    id: 'casa-abierta',
    name: 'Casa abierta',
    image: '/medals/medalla-casa-abierta.webp',
    description: 'Ofrece hogar temporal por primera vez.',
  },
  {
    id: 'refugio-seguro',
    name: 'Refugio seguro',
    image: '/medals/medalla-refugio-seguro.webp',
    description: 'Da hogar temporal a varios animales.',
  },
  {
    id: 'hogar-de-oro',
    name: 'Hogar de oro',
    image: '/medals/medalla-hogar-de-oro.webp',
    description: 'Sé un hogar temporal excepcional.',
  },
  {
    id: 'corazon-generoso',
    name: 'Corazón generoso',
    image: '/medals/medalla-corazon-generoso.webp',
    description: 'Haz tu primera donación.',
  },
  {
    id: 'padrino-fiel',
    name: 'Padrino fiel',
    image: '/medals/medalla-padrino-fiel.webp',
    description: 'Apadrina a un animal de forma constante.',
  },
  {
    id: 'gran-mecenas',
    name: 'Gran mecenas',
    image: '/medals/medalla-gran-mecenas.webp',
    description: 'Apoya con donaciones importantes.',
  },
  {
    id: 'manos-que-ayudan',
    name: 'Manos que ayudan',
    image: '/medals/medalla-manos-que-ayudan.webp',
    description: 'Dona insumos como croquetas o transporte.',
  },
  {
    id: 'despensa-solidaria',
    name: 'Despensa solidaria',
    image: '/medals/medalla-despensa-solidaria.webp',
    description: 'Aporta alimento para los rescatados.',
  },
  {
    id: 'voz-que-inspira',
    name: 'Voz que inspira',
    image: '/medals/medalla-voz-que-inspira.webp',
    description: 'Comparte y difunde casos en la comunidad.',
  },
  {
    id: 'sabio-manada',
    name: 'Sabio de la manada',
    image: '/medals/medalla-sabio-manada.webp',
    description: 'Aporta consejos útiles en el foro.',
  },
  {
    id: 'pilar-comunidad',
    name: 'Pilar de la comunidad',
    image: '/medals/medalla-pilar-comunidad.webp',
    description: 'Sé un miembro clave de la comunidad.',
  },
  {
    id: 'siempre-presente',
    name: 'Siempre presente',
    image: '/medals/medalla-siempre-presente.webp',
    description: 'Participa de forma constante en Dasha.',
  },
  {
    id: 'fundador-dasha',
    name: 'Fundador Dasha',
    image: '/medals/medalla-fundador-dasha.webp',
    description: 'Forma parte de los primeros miembros de Dasha.',
  },
  {
    id: 'ciclo-completo',
    name: 'Ciclo completo',
    image: '/medals/medalla-ciclo-completo.webp',
    description: 'Acompaña a un animal del rescate a su adopción.',
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export type Medal = MedalInfo & { unlocked: boolean };

// Arte por tipo de requisito, para logros del backend que no empatan por nombre
// con nuestro catálogo. Así nunca queda una medalla sin imagen.
const artByRequirement: Record<string, string> = {
  report_count: '/medals/medalla-primer-reporte.png',
  rescue_count: '/medals/medalla-heroe-cuadra.webp',
  donation_count: '/medals/medalla-corazon-generoso.webp',
  adoption_count: '/medals/medalla-ciclo-completo.webp',
};
const DEFAULT_ART = '/medals/medalla-fundador-dasha.webp';

// Texto legible del requisito, para que el usuario sepa cómo ganarla.
const requirementNouns: Record<string, [string, string]> = {
  report_count: ['reporte', 'reportes'],
  rescue_count: ['rescate', 'rescates'],
  donation_count: ['donación', 'donaciones'],
  adoption_count: ['adopción', 'adopciones'],
};

function pickArt(name: string, iconUrl: string, requirementType: string): string {
  const local = medalCatalog.find((medal) => normalize(medal.name) === normalize(name));
  if (local) return local.image;
  if (/^https?:\/\//i.test(iconUrl)) return iconUrl;
  return artByRequirement[requirementType] ?? DEFAULT_ART;
}

function describe(achievement: AvailableAchievement): string {
  const base = achievement.description.trim();
  const nouns = requirementNouns[achievement.requirementType];
  const value = achievement.requirementValue;
  const requirement =
    nouns && value > 0 ? `Necesitas ${value} ${value === 1 ? nouns[0] : nouns[1]}.` : '';
  const points = achievement.pointsReward > 0 ? `Otorga ${achievement.pointsReward} puntos.` : '';
  return [base, requirement, points].filter(Boolean).join(' ');
}

// Arma la lista de medallas a partir del catálogo REAL del backend
// (GET /me/achievements/available) y marca las que el usuario ya desbloqueó.
// Si el backend aún no responde, mostramos SOLO los logros que el usuario ya
// tiene: nunca medallas inventadas que jamás se podrían desbloquear.
// Quita medallas repetidas por nombre (defensivo): si el catálogo o los logros
// desbloqueados vienen con duplicados (p. ej. un seed corrido dos veces en el
// backend), nunca se muestran dos veces la misma medalla.
function dedupeByName(medals: Medal[]): Medal[] {
  const seen = new Set<string>();
  return medals.filter((medal) => {
    const key = normalize(medal.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildMedals(
  available: AvailableAchievement[],
  unlocked: Achievement[],
): Medal[] {
  const unlockedCodes = new Set(unlocked.map((item) => item.code).filter(Boolean));
  const unlockedNames = new Set(unlocked.map((item) => normalize(item.name)));

  if (available.length === 0) {
    return dedupeByName(
      unlocked.map((item, index) => ({
        id: item.code || `logro-${index}`,
        name: item.name,
        image: pickArt(item.name, item.image, ''),
        description: item.description,
        unlocked: true,
      })),
    );
  }

  return dedupeByName(
    available.map((item) => ({
      id: item.code || item.id,
      name: item.name,
      image: pickArt(item.name, item.iconUrl, item.requirementType),
      description: describe(item),
      unlocked:
        (Boolean(item.code) && unlockedCodes.has(item.code)) ||
        unlockedNames.has(normalize(item.name)),
    })),
  );
}
