import { API_URL, getStoredUser } from './api';

export type LostPetInput = {
  petName: string;
  species: 'perro' | 'gato';
  size: string;
  color: string;
  lastSeenAt: string;
  lat: number;
  lng: number;
  searchRadiusKm: number;
  description: string;
  contactName: string;
  contactPhone: string;
  reward: string;
  photoBase64: string;
};

export type LostPetResult = {
  id: string;
};

const sizeMap: Record<string, string> = {
  Pequeño: 'small',
  Mediano: 'medium',
  Grande: 'large',
};

// Publica una mascota perdida en el backend (POST /lost-pets, protegido).
export async function createLostPetReport(input: LostPetInput): Promise<LostPetResult> {
  if (!getStoredUser()) throw new Error('Inicia sesión para publicar');

  const body = {
    petName: input.petName,
    species: input.species === 'gato' ? 'cat' : 'dog',
    size: sizeMap[input.size] ?? 'medium',
    condition: 'lost',
    lat: input.lat,
    lng: input.lng,
    searchRadiusKm: input.searchRadiusKm,
    reward: input.reward || undefined,
    contactWhatsapp: input.contactPhone,
    description: input.description || undefined,
    photosBase64: input.photoBase64 ? [input.photoBase64] : [],
  };

  const response = await fetch(`${API_URL}/lost-pets`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as
    | { id?: string; data?: { id?: string }; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.message ?? 'No se pudo publicar. Intenta de nuevo.');
  }

  return { id: String(data?.id ?? data?.data?.id ?? '') };
}
