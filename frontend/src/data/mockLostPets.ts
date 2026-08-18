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
  reward?: string;
  // Nombre de la colonia donde se perdio (lo regresa el backend en /lost-pets).
  // Puede venir vacio si el reporte no tiene colonia asignada.
  colonyName?: string;
};

// El modo Perdidos del mapa usa datos reales de getLostPets(); aquí solo viven
// el tipo y los ayudantes de color/antigüedad.

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
