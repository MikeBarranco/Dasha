// Tablero de necesidades de los aliados (recursos que piden y que un patrocinador
// puede cubrir). Los tipos se alinean con la tabla `resources` de BD.txt
// (resource_type). El backend aún no existe: mientras tanto se muestran datos de
// DEMOSTRACIÓN etiquetados, que se reemplazan solos cuando el endpoint responda.

export type NeedType = 'food' | 'transport' | 'foster' | 'medical_service' | 'supplies' | 'other';

export const needTypeLabels: Record<NeedType, string> = {
  food: 'Alimento',
  transport: 'Transporte',
  foster: 'Hogar temporal',
  medical_service: 'Servicio veterinario',
  supplies: 'Insumos',
  other: 'Otro',
};

// open = sin cubrir; covered = alguien se comprometió; delivered = ya entregado.
export type NeedStatus = 'open' | 'covered' | 'delivered';

export type Need = {
  id: string;
  type: NeedType;
  title: string;
  description: string;
  quantity: string;
  organizationName: string;
  organizationId: string;
  animalName: string | null;
  status: NeedStatus;
  coveredByName: string | null;
  createdAgo: string;
};

// Aportes del usuario (necesidades que ha cubierto) para la sección "Mis aportes"
// del perfil. Demo etiquetada mientras el backend no exista.
export type Contribution = {
  id: string;
  type: NeedType;
  title: string;
  organizationName: string;
  status: 'covered' | 'delivered';
  createdAgo: string;
};

export const demoContributions: Contribution[] = [
  {
    id: 'c1',
    type: 'food',
    title: 'Croquetas para cachorros',
    organizationName: 'Refugio Huellitas',
    status: 'delivered',
    createdAgo: 'hace 1 sem',
  },
  {
    id: 'c2',
    type: 'transport',
    title: 'Traslado a la veterinaria',
    organizationName: 'Patitas al Rescate',
    status: 'covered',
    createdAgo: 'hace 2 d',
  },
  {
    id: 'c3',
    type: 'supplies',
    title: 'Cobijas y jaulas',
    organizationName: 'Gatitos Puebla',
    status: 'delivered',
    createdAgo: 'hace 3 sem',
  },
  {
    id: 'c4',
    type: 'medical_service',
    title: 'Consulta veterinaria donada',
    organizationName: 'Refugio Huellitas',
    status: 'delivered',
    createdAgo: 'hace 1 mes',
  },
];

export const demoNeeds: Need[] = [
  {
    id: 'demo-1',
    type: 'food',
    title: 'Croquetas para cachorros',
    description: 'Tenemos 6 cachorros en recuperación y se nos está acabando el alimento.',
    quantity: '20 kg',
    organizationName: 'Refugio Huellitas',
    organizationId: 'demo-org-1',
    animalName: null,
    status: 'open',
    coveredByName: null,
    createdAgo: 'hace 2 h',
  },
  {
    id: 'demo-2',
    type: 'transport',
    title: 'Traslado a la veterinaria',
    description: 'Necesitamos llevar a Canela a una cita de rayos X el viernes.',
    quantity: '1 traslado',
    organizationName: 'Patitas al Rescate',
    organizationId: 'demo-org-2',
    animalName: 'Canela',
    status: 'open',
    coveredByName: null,
    createdAgo: 'ayer',
  },
  {
    id: 'demo-3',
    type: 'foster',
    title: 'Hogar temporal',
    description: 'Buscamos casa temporal por 3 semanas para un gatito ya esterilizado.',
    quantity: '1 espacio',
    organizationName: 'Gatitos Puebla',
    organizationId: 'demo-org-3',
    animalName: 'Nube',
    status: 'covered',
    coveredByName: 'Ana T.',
    createdAgo: 'hace 3 d',
  },
  {
    id: 'demo-4',
    type: 'medical_service',
    title: 'Consulta veterinaria donada',
    description: 'Agradecemos veterinarios que puedan donar una consulta de valoración.',
    quantity: '2 consultas',
    organizationName: 'Refugio Huellitas',
    organizationId: 'demo-org-1',
    animalName: null,
    status: 'open',
    coveredByName: null,
    createdAgo: 'hace 5 d',
  },
];
