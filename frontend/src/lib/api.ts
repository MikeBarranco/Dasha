import type { Report, Severity } from '../data/mockReports';
import type { Animal, AnimalStatus } from '../data/mockAnimals';
import type { Ally, AllyType } from '../data/mockAllies';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'dasha-token';
const USER_KEY = 'dasha-user';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setSession(user: AuthUser, token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

type Envelope<T> = {
  status: string;
  message?: string;
  data?: T;
};

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (auth) {
    const token = getToken();
    if (!token) throw new Error('Inicia sesión para continuar');
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = (await response.json().catch(() => ({}))) as Envelope<T>;

  if (!response.ok || body.status === 'error') {
    throw new Error(body.message ?? 'Ocurrió un error con el servidor');
  }

  return body.data as T;
}

export async function register(name: string, email: string, password: string) {
  return request<{ user: AuthUser; token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<{ user: AuthUser; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export type CreateReportInput = {
  species: 'dog' | 'cat';
  primaryColor: string;
  secondaryColor?: string;
  size: 'small' | 'medium' | 'large';
  condition: 'injured' | 'malnourished' | 'sick' | 'stable' | 'lost' | 'aggressive';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  lat: number;
  lng: number;
  photoBase64: string;
};

export async function createReport(input: CreateReportInput) {
  return request<{ id?: string }>(
    '/reports',
    { method: 'POST', body: JSON.stringify(input) },
    true,
  );
}

type RawReport = {
  id: string;
  species: string;
  condition: string;
  urgency: string;
  status: string;
  description: string | null;
  created_at: string;
  lat: number;
  lng: number;
  colonia: string | null;
  photo: string | null;
};

const conditionLabels: Record<string, string> = {
  injured: 'Herido',
  malnourished: 'Desnutrido',
  sick: 'Enfermo',
  stable: 'Estable',
  lost: 'Perdido',
  aggressive: 'Agresivo',
};

const urgencyToSeverity: Record<string, Severity> = {
  critical: 'critica',
  high: 'critica',
  medium: 'media',
  low: 'baja',
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  in_progress: 'Voluntario en camino',
  rescued: 'Rescatado',
};

function timeAgo(iso: string): string {
  if (!iso) return 'hace un momento';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function mapReport(raw: RawReport): Report {
  return {
    id: String(raw.id),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    colonia: raw.colonia ?? 'Sin colonia',
    species: raw.species === 'cat' ? 'gato' : 'perro',
    condition: conditionLabels[raw.condition] ?? raw.condition,
    severity: urgencyToSeverity[raw.urgency] ?? 'media',
    photo: raw.photo ?? '/placeholder-animal.svg',
    description: raw.description ?? '',
    reportedAgo: timeAgo(raw.created_at),
    status: statusLabels[raw.status] ?? raw.status,
  };
}

export async function getNearbyReports(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<Report[]> {
  const data = await request<RawReport[]>(
    `/reports/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`,
  );
  return (data ?? []).map(mapReport);
}

// GET /reports y GET /stats devuelven el dato directo (sin envoltura {status,data}).
async function requestRaw<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error('No se pudo consultar el servidor');
  return (await response.json()) as T;
}

type ListedReport = {
  id: string;
  lat: number;
  lng: number;
  colonia: string | null;
  species: string;
  condition: string;
  severity: string;
  photoUrl: string | null;
  description: string | null;
  status: string | null;
  createdAt: string;
};

export async function getReports(): Promise<Report[]> {
  const data = await requestRaw<ListedReport[]>('/reports');
  return (data ?? []).map((raw) => ({
    id: String(raw.id),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    colonia: raw.colonia ?? 'Sin colonia',
    species: raw.species === 'gato' || raw.species === 'cat' ? 'gato' : 'perro',
    condition: conditionLabels[raw.condition] ?? raw.condition,
    severity: (['baja', 'media', 'critica'].includes(raw.severity)
      ? raw.severity
      : 'media') as Severity,
    photo: raw.photoUrl ?? '/placeholder-animal.svg',
    description: raw.description ?? '',
    reportedAgo: timeAgo(raw.createdAt),
    status: raw.status ?? 'Activo',
  }));
}

export type Stats = {
  reportesActivos: number;
  rescatesLogrados: number;
  voluntarios: number;
};

export async function getStats(): Promise<Stats> {
  return requestRaw<Stats>('/stats');
}

type RawAnimal = {
  id: string;
  name: string;
  species: string;
  story: string | null;
  status: string;
  diagnosis: string | null;
  treatment: string | null;
  totalCostNeeded: string | null;
  totalRaised: string | null;
  photos: { url: string; orderIndex: number }[] | null;
  organization: { name?: string; address?: string } | null;
};

const animalStatusLabels: Record<string, AnimalStatus> = {
  in_treatment: 'En tratamiento',
  recovering: 'Recuperándose',
  looking_for_foster: 'Buscando hogar',
  looking_for_adoption: 'Buscando hogar',
};

export async function getAnimals(): Promise<Animal[]> {
  const data = await requestRaw<RawAnimal[]>('/animals');
  return (data ?? []).map((raw) => {
    const photos = [...(raw.photos ?? [])]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((photo) => photo.url)
      .filter(Boolean);
    return {
      id: String(raw.id),
      name: raw.name,
      species: raw.species === 'cat' || raw.species === 'gato' ? 'gato' : 'perro',
      size: 'Mediano',
      zone: raw.organization?.address ?? raw.organization?.name ?? 'Puebla',
      photos: photos.length > 0 ? photos : ['/placeholder-animal.svg'],
      story: raw.story ?? '',
      diagnosis: raw.diagnosis ?? raw.treatment ?? 'En valoración',
      vet: raw.organization?.name ?? 'Aliado Dasha',
      totalNeeded: Number(raw.totalCostNeeded ?? 0),
      totalRaised: Number(raw.totalRaised ?? 0),
      status: animalStatusLabels[raw.status] ?? 'En tratamiento',
    };
  });
}

type RawAlly = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  orgType: string;
  isVerified: boolean;
  lat: number;
  lng: number;
};

const allyTypes: AllyType[] = ['veterinary', 'shelter', 'ngo', 'educational'];

export async function getAllies(): Promise<Ally[]> {
  const data = await requestRaw<RawAlly[]>('/allies');
  return (data ?? []).map((raw) => ({
    id: String(raw.id),
    name: raw.name,
    description: raw.description ?? '',
    logoUrl: raw.logoUrl ?? null,
    address: raw.address ?? '',
    phone: raw.phone ?? null,
    whatsapp: raw.whatsapp ?? null,
    website: raw.website ?? null,
    orgType: allyTypes.includes(raw.orgType as AllyType) ? (raw.orgType as AllyType) : 'ngo',
    isVerified: Boolean(raw.isVerified),
    lat: Number(raw.lat),
    lng: Number(raw.lng),
  }));
}
