export type LostPetInput = {
  petName: string;
  species: 'perro' | 'gato';
  size: string;
  color: string;
  lastSeenAt: string;
  lat: number;
  lng: number;
  description: string;
  contactName: string;
  contactPhone: string;
  reward: string;
  photoBase64: string;
};

export type LostPetResult = {
  id: string;
};

// Mock temporal. Cuando Isabel tenga el endpoint de mascotas perdidas
// (un tipo de reporte aparte de "perro de calle"), se reemplaza por la
// llamada real al backend, igual que createReport en api.ts.
export async function createLostPetReport(input: LostPetInput): Promise<LostPetResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const slug = input.petName.trim().toLowerCase().replace(/\s+/g, '-') || 'mascota';
  return { id: `perdido-${slug}-${Date.now()}` };
}
