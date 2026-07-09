export type Medal = {
  id: string;
  name: string;
  image: string;
  unlocked: boolean;
};

export type UserProfile = {
  name: string;
  role: 'Ciudadano' | 'Voluntario';
  level: number;
  levelName: string;
  xp: number;
  xpToNext: number;
  stats: {
    reportes: number;
    rescates: number;
    seguidos: number;
  };
  medals: Medal[];
};

export const mockUser: UserProfile = {
  name: 'Ana Torres',
  role: 'Ciudadano',
  level: 2,
  levelName: 'Rescatista de la comunidad',
  xp: 140,
  xpToNext: 250,
  stats: {
    reportes: 5,
    rescates: 3,
    seguidos: 4,
  },
  medals: [
    {
      id: 'primer-reporte',
      name: 'Primer reporte',
      image: '/medals/medalla-primer-reporte.png',
      unlocked: true,
    },
    {
      id: 'guardian-ciudad',
      name: 'Guardián de la ciudad',
      image: '/medals/medalla-guardian-ciudad.png',
      unlocked: true,
    },
    {
      id: 'ojo-de-halcon',
      name: 'Ojo de halcón',
      image: '/medals/medalla-ojo-de-halcon.png',
      unlocked: false,
    },
    {
      id: 'ronda-nocturna',
      name: 'Ronda nocturna',
      image: '/medals/medalla-ronda-nocturna.png',
      unlocked: false,
    },
  ],
};
