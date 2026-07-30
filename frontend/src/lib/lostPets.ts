import { API_URL, getStoredUser, handleUnauthorized, SESSION_EXPIRED_MESSAGE } from './api';

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
    // La columna es INTEGER: nunca mandamos un decimal (evita el error 22P02).
    searchRadiusKm: Math.max(1, Math.round(input.searchRadiusKm)),
    reward: input.reward || undefined,
    contactWhatsapp: input.contactPhone,
    description: input.description || undefined,
    photosBase64: input.photoBase64 ? [input.photoBase64] : [],
    // Datos que el formulario ya pedía y que el backend ya guarda: el color
    // ayuda a identificarla y la última vez que se vio acota la búsqueda.
    color: input.color || undefined,
    lastSeenAt: input.lastSeenAt || undefined,
    contactName: input.contactName || undefined,
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

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(data?.message ?? 'No se pudo publicar. Intenta de nuevo.');
  }

  return { id: String(data?.id ?? data?.data?.id ?? '') };
}
