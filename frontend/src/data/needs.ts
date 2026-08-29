// Tablero de necesidades de los aliados (recursos que piden y que un patrocinador
// puede cubrir). Los tipos se alinean con la tabla `resources` de BD.txt
// (resource_type). Los datos salen del backend (/organizations/:id/needs y el
// agregado /needs); aquí solo viven los tipos y las etiquetas compartidas.

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

// Lista CERRADA de unidades (no texto libre). DEBE coincidir con
// NeedController.NEED_UNITS del backend. "pesos" cubre la necesidad monetaria.
export const needUnitOptions = [
  'kg',
  'bolsas',
  'latas',
  'piezas',
  'litros',
  'cobijas',
  'traslados',
  'noches',
  'pesos',
] as const;

export type Need = {
  id: string;
  type: NeedType;
  title: string;
  description: string;
  // Texto de cantidad listo para mostrar (ej. "20 kg"), derivado de targetAmount +
  // unit. Vacío si no hay cantidad.
  quantity: string;
  // Unidad estructurada (kg, bolsas, pesos…), null si no tiene.
  unit: string | null;
  organizationName: string;
  organizationId: string;
  animalName: string | null;
  status: NeedStatus;
  coveredByName: string | null;
  // Teléfono de quien se comprometió (solo en la vista del portal del aliado,
  // para el botón de WhatsApp). null en las vistas públicas por privacidad.
  coveredByPhone: string | null;
  // Meta económica y lo reunido (Isabel: targetAmount/coveredAmount). Cuando hay
  // meta se muestra una barra de progreso y se puede aportar parcial; sin meta la
  // necesidad se cubre completa de una vez.
  targetAmount: number | null;
  coveredAmount: number;
  createdAgo: string;
};

// Aportes del usuario (necesidades que ha cubierto) para la sección "Mis aportes"
// del perfil. Se llena desde GET /me/contributions.
export type Contribution = {
  id: string;
  type: NeedType;
  title: string;
  organizationName: string;
  status: 'covered' | 'delivered';
  createdAgo: string;
};
