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

// Marca como desbloqueadas las medallas cuyo nombre coincide con un logro real.
export function resolveMedals(unlockedNames: string[]): (MedalInfo & { unlocked: boolean })[] {
  const set = new Set(unlockedNames.map(normalize));
  return medalCatalog.map((medal) => ({ ...medal, unlocked: set.has(normalize(medal.name)) }));
}
