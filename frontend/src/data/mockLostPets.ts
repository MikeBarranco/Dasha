export type LostPet = {
  id: string;
  petName: string;
  species: 'perro' | 'gato';
  photo: string;
  lat: number;
  lng: number;
  searchRadiusKm: number;
  lostAt: string;
  description?: string;
  contactPhone?: string;
};

// Mock temporal para el modo Perdidos del mapa. Cuando Isabel tenga el endpoint
// de mascotas perdidas, se reemplaza por getLostPets() con fallback a estos.
export const mockLostPets: LostPet[] = [
  {
    id: 'lp1',
    petName: 'Rocky',
    species: 'perro',
    photo: '/placeholder-animal.svg',
    lat: 19.0508,
    lng: -98.214,
    searchRadiusKm: 1.5,
    lostAt: '2026-06-25',
    description: 'Husky café con blanco, lleva collar azul.',
    contactPhone: '2223334455',
  },
  {
    id: 'lp2',
    petName: 'Luna',
    species: 'gato',
    photo: '/placeholder-animal.svg',
    lat: 19.031,
    lng: -98.191,
    searchRadiusKm: 1,
    lostAt: '2026-06-21',
    description: 'Gata gris, muy asustadiza.',
    contactPhone: '2221122334',
  },
  {
    id: 'lp3',
    petName: 'Max',
    species: 'perro',
    photo: '/placeholder-animal.svg',
    lat: 19.0455,
    lng: -98.231,
    searchRadiusKm: 2,
    lostAt: '2026-06-15',
    description: 'Labrador beige, responde a su nombre.',
    contactPhone: '2225566778',
  },
];

export function daysLost(lostAt: string): number {
  const diff = Date.now() - new Date(lostAt).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function lostColor(lostAt: string): string {
  const days = daysLost(lostAt);
  if (days <= 3) return '#FDE047';
  if (days <= 7) return '#FB923C';
  return '#EF4444';
}
