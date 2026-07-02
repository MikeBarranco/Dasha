import type { Report, Severity } from '../data/mockReports';
import type { Animal, AnimalStatus } from '../data/mockAnimals';
import type { Ally, AllyType } from '../data/mockAllies';
import type { LostPet } from '../data/mockLostPets';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
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

export type Colonia = {
  name: string;
  postalCode: string;
  lat: number;
  lng: number;
};

// GET /colonies?cp=XXXXX -> colonias de ese código postal (backend con 822 sembradas).
// Se lee tolerante por si el backend cambia nombres de campo.
export async function getColoniesByCp(cp: string): Promise<Colonia[]> {
  const data = await requestRaw<Record<string, unknown>[]>(
    `/colonies?cp=${encodeURIComponent(cp)}`,
  );
  return (data ?? [])
    .map((raw) => ({
      name: String(raw.name ?? raw.colonia ?? raw.neighborhood ?? ''),
      postalCode: String(raw.postalCode ?? raw.postal_code ?? raw.cp ?? cp),
      lat: Number(raw.lat ?? raw.latitude ?? 0),
      lng: Number(raw.lng ?? raw.lon ?? raw.longitude ?? 0),
    }))
    .filter((colonia) => colonia.name);
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

// Lista pública de mascotas perdidas para el modo Perdidos del mapa y el conteo
// del tablero. Tolerante a los nombres de campo del backend.
export async function getLostPets(): Promise<LostPet[]> {
  const data = await requestRaw<Record<string, unknown>[]>('/lost-pets');
  return (data ?? []).map((raw) => {
    const species = String(raw.species ?? '');
    let photo = '';
    if (typeof raw.photo === 'string') photo = raw.photo;
    else if (typeof raw.photoUrl === 'string') photo = raw.photoUrl;
    else if (Array.isArray(raw.photos) && raw.photos.length > 0) {
      const first = raw.photos[0];
      photo = typeof first === 'string' ? first : String((first as Record<string, unknown>)?.url ?? '');
    }
    return {
      id: String(raw.id ?? ''),
      petName: String(raw.petName ?? raw.name ?? 'Mascota'),
      species: species === 'cat' || species === 'gato' ? 'gato' : 'perro',
      photo: photo || '/placeholder-animal.svg',
      lat: Number(raw.lat ?? 0),
      lng: Number(raw.lng ?? 0),
      searchRadiusKm: Number(raw.searchRadiusKm ?? raw.search_radius_km ?? 1),
      lostAt: String(
        raw.lastSeenAt ?? raw.lostAt ?? raw.lost_at ?? raw.createdAt ?? raw.created_at ?? '',
      ),
      description: raw.description
        ? String(raw.description)
        : raw.distinctiveMarks
          ? String(raw.distinctiveMarks)
          : undefined,
      contactPhone:
        String(raw.contactWhatsapp ?? raw.contactPhone ?? raw.whatsapp ?? '') || undefined,
      reward: raw.reward ? String(raw.reward) : undefined,
    };
  });
}

// Fetch autenticado tolerante a la forma de la respuesta: acepta el dato directo
// (como /me, que viene plano) o envuelto en { data }.
async function authedRaw<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Inicia sesión para continuar');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as { message?: string }).message
        : undefined;
    throw new Error(message ?? 'Ocurrió un error con el servidor');
  }
  if (body && typeof body === 'object' && !Array.isArray(body) && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAgo: string;
};

// Lee las notificaciones del usuario. Tolerante: el backend puede nombrar los
// campos de varias formas (title/message, body/message, read/isRead/seen, etc.).
export async function getNotifications(): Promise<AppNotification[]> {
  const data = await authedRaw<Record<string, unknown>[]>('/me/notifications');
  return (data ?? []).map((raw) => {
    const readValue = raw.isRead ?? raw.is_read ?? raw.read ?? raw.seen ?? raw.readAt;
    return {
      id: String(raw.id ?? raw._id ?? ''),
      type: String(raw.type ?? 'system'),
      title: String(raw.title ?? raw.message ?? 'Aviso'),
      body: String(raw.body ?? raw.description ?? (raw.title ? '' : raw.message) ?? ''),
      link: raw.link ? String(raw.link) : raw.url ? String(raw.url) : null,
      read: Boolean(readValue),
      createdAgo: timeAgo(
        String(raw.sentAt ?? raw.sent_at ?? raw.createdAt ?? raw.created_at ?? ''),
      ),
    };
  });
}

// Marca una notificación como leída. Contrato de Isabel: PATCH al recurso con
// el cuerpo { isRead: true } (no una subruta /read).
export async function markNotificationRead(id: string): Promise<void> {
  await authedRaw(`/me/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  });
}

// Guarda la suscripción Web Push de este dispositivo. Enviamos el JSON estándar
// del navegador (endpoint + keys p256dh/auth) más una etiqueta del dispositivo.
export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await authedRaw('/me/push-subscription', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth,
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : undefined,
    }),
  });
}

export type Achievement = {
  name: string;
  description: string;
  image: string;
};

export type MeProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  avatarUrl: string | null;
  level: number;
  experience: number;
  reportsCount: number;
  rescuesCount: number;
  achievements: Achievement[];
};

export async function getMe(): Promise<MeProfile> {
  const raw = await authedRaw<Record<string, unknown>>('/me');
  const count =
    raw._count && typeof raw._count === 'object' ? (raw._count as Record<string, unknown>) : {};

  // Cada elemento desbloqueado viene como { achievement: { name, description, iconUrl } }.
  const rawAchievements = Array.isArray(raw.achievements) ? raw.achievements : [];
  const achievements: Achievement[] = rawAchievements
    .map((item) => {
      const nested =
        item && typeof item === 'object' && 'achievement' in item
          ? (item as Record<string, unknown>).achievement
          : item;
      const obj = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : {};
      return {
        name: String(obj.name ?? ''),
        description: String(obj.description ?? ''),
        image: String(obj.iconUrl ?? obj.image ?? ''),
      };
    })
    .filter((item) => item.name || item.image);

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role: String(raw.role ?? 'citizen'),
    phone: String(raw.phone ?? ''),
    avatarUrl: typeof raw.avatarUrl === 'string' && raw.avatarUrl ? raw.avatarUrl : null,
    level: Number(raw.level ?? 1),
    experience: Number(raw.experiencePoints ?? raw.experience ?? 0),
    reportsCount: Number(raw.reportsCount ?? count.reports ?? 0),
    rescuesCount: Number(raw.rescuesCount ?? count.rescueAssignments ?? 0),
    achievements,
  };
}

export async function updateMe(data: {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<void> {
  await authedRaw('/me', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function postVolunteerApplication(data: {
  ineFrontBase64: string;
  ineBackBase64: string;
  selfieBase64: string;
  isFoster?: boolean;
  fosterCapacity?: number;
  phone?: string;
  zone?: string;
  availability?: string;
  helpType?: string;
  motivation?: string;
}): Promise<void> {
  await authedRaw('/me/volunteer-application', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMyReports(): Promise<Report[]> {
  const data = await authedRaw<Record<string, unknown>[]>('/me/reports');
  return (data ?? []).map((raw) => {
    const species = String(raw.species ?? '');
    let photo = '';
    if (typeof raw.photo === 'string') photo = raw.photo;
    else if (typeof raw.photoUrl === 'string') photo = raw.photoUrl;
    else if (Array.isArray(raw.photos) && raw.photos.length > 0) {
      const first = raw.photos[0];
      photo = typeof first === 'string' ? first : String((first as Record<string, unknown>)?.url ?? '');
    }
    const conditionRaw = String(raw.condition ?? '');
    const urgencyRaw = String(raw.urgency ?? raw.severity ?? '');
    const statusRaw = String(raw.status ?? '');
    return {
      id: String(raw.id ?? ''),
      lat: Number(raw.lat ?? 0),
      lng: Number(raw.lng ?? 0),
      colonia: String(raw.colonia ?? 'Sin colonia'),
      species: species === 'cat' || species === 'gato' ? 'gato' : 'perro',
      condition: conditionLabels[conditionRaw] ?? conditionRaw,
      severity: (urgencyToSeverity[urgencyRaw] ??
        (['baja', 'media', 'critica'].includes(urgencyRaw) ? urgencyRaw : 'media')) as Severity,
      photo: photo || '/placeholder-animal.svg',
      description: String(raw.description ?? ''),
      reportedAgo: timeAgo(String(raw.created_at ?? raw.createdAt ?? '')),
      status: statusLabels[statusRaw] ?? (statusRaw || 'Activo'),
    };
  });
}

type RawAnimal = {
  id: string;
  name: string;
  species: string;
  history?: string | null;
  story?: string | null;
  status: string;
  diagnosis: string | null;
  treatment: string | null;
  estimatedCost?: string | number | null;
  totalCostNeeded?: string | number | null;
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
      story: raw.history ?? raw.story ?? '',
      diagnosis: raw.diagnosis ?? raw.treatment ?? 'En valoración',
      vet: raw.organization?.name ?? 'Aliado Dasha',
      totalNeeded: Number(raw.estimatedCost ?? raw.totalCostNeeded ?? 0),
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
