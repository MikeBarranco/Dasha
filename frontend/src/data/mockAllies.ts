export type AllyType = 'veterinary' | 'shelter' | 'ngo' | 'educational';

export type AllyEvent = {
  title: string;
  date: string;
  place?: string;
};

export type AllyBadge = {
  label: string;
};

export type Ally = {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  orgType: AllyType;
  isVerified: boolean;
  lat: number;
  lng: number;
  schedule?: string;
  gallery?: string[];
  events?: AllyEvent[];
  badges?: AllyBadge[];
};

export const allyTypeLabels: Record<AllyType, string> = {
  veterinary: 'Veterinaria',
  shelter: 'Refugio',
  ngo: 'Asociación',
  educational: 'Educativo',
};

export const mockAllies: Ally[] = [
  {
    id: 'al1',
    name: 'Veterinaria San Roque',
    description: 'Clínica veterinaria con atención de urgencias y descuentos en esterilización.',
    logoUrl: null,
    address: 'Av. Juárez 1502, La Paz, Puebla',
    phone: '2223334455',
    whatsapp: '2223334455',
    website: null,
    orgType: 'veterinary',
    isVerified: true,
    lat: 19.0414,
    lng: -98.2063,
    schedule: 'Lun a Sáb 9:00 a 20:00',
    events: [
      { title: 'Jornada de esterilización', date: '12 jul 2026', place: 'En clínica' },
      { title: 'Vacunación antirrábica gratuita', date: '3 ago 2026', place: 'En clínica' },
    ],
    badges: [{ label: 'Aliado verificado' }, { label: 'Atiende urgencias' }],
  },
  {
    id: 'al2',
    name: 'Refugio Patitas Felices',
    description: 'Refugio de rescate y adopción de perros y gatos en situación de calle.',
    logoUrl: null,
    address: 'Camino Real 320, San Manuel, Puebla',
    phone: '2221122334',
    whatsapp: '2221122334',
    website: null,
    orgType: 'shelter',
    isVerified: true,
    lat: 19.0185,
    lng: -98.2042,
    schedule: 'Todos los días 10:00 a 18:00',
    events: [{ title: 'Feria de adopción', date: '20 jul 2026', place: 'Parque Juárez' }],
    badges: [{ label: 'Aliado verificado' }, { label: 'Adopciones' }],
  },
  {
    id: 'al3',
    name: 'Asociación Huellas de Puebla',
    description: 'Asociación civil de bienestar animal: jornadas de vacunación y esterilización.',
    logoUrl: null,
    address: 'Blvd. 5 de Mayo 210, Centro, Puebla',
    phone: '2225566778',
    whatsapp: null,
    website: 'https://huellasdepuebla.org',
    orgType: 'ngo',
    isVerified: false,
    lat: 19.0445,
    lng: -98.1986,
    schedule: 'Lun a Vie 9:00 a 15:00',
    badges: [{ label: 'Jornadas comunitarias' }],
  },
];
