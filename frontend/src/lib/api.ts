import type { Report, Severity } from '../data/mockReports';
import type { Animal, AnimalStatus, TimelineEvent } from '../data/mockAnimals';
import type { Ally, AllyType } from '../data/mockAllies';
import { mockAllies } from '../data/mockAllies';
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

// Contexto de aliado del usuario actual: a qué organización pertenece y con qué
// rol. Gatea el portal de aliado. El backend lo expondrá en GET /me/organization
// (spec en pendientes-isabel.md, 11.1). Mientras no exista, dejamos que un ADMIN
// lo previsualice con datos de ejemplo (preview) para poder construir y probar.
export type AllyRole = 'owner' | 'vet';

export type AllyContext = {
  organizationId: string;
  organizationName: string;
  role: AllyRole;
  preview: boolean;
};

export async function getMyOrganization(): Promise<AllyContext | null> {
  try {
    const raw = await authedRaw<Record<string, unknown>>('/me/organization');
    const orgObj =
      raw && typeof raw === 'object'
        ? ((raw.organization ?? raw) as Record<string, unknown>)
        : null;
    const id = orgObj ? String(orgObj.id ?? orgObj._id ?? '') : '';
    if (id) {
      const roleRaw = String((raw as Record<string, unknown>).role ?? 'owner');
      return {
        organizationId: id,
        organizationName: String(orgObj?.name ?? 'Mi organización'),
        role: roleRaw === 'vet' ? 'vet' : 'owner',
        preview: false,
      };
    }
  } catch {
    // El endpoint /me/organization aún no existe en el backend.
  }

  const user = getStoredUser();
  if (user?.role === 'admin') {
    return {
      organizationId: mockAllies[0].id,
      organizationName: mockAllies[0].name,
      role: 'owner',
      preview: true,
    };
  }
  return null;
}

// Edición de la ficha del aliado por su propio responsable (scopeada a SU
// organización). Backend: PATCH /me/organization (spec en pendientes-isabel.md,
// 11.3). En vista previa no se llama; se refleja en pantalla.
export type MyOrgInput = {
  name: string;
  slogan?: string;
  description?: string;
  schedule?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  logoBase64?: string;
  coverBase64?: string;
};

export async function updateMyOrganization(input: MyOrgInput): Promise<void> {
  await authedRaw('/me/organization', { method: 'PATCH', body: JSON.stringify(input) });
}

// Equipo (veterinarios) del propio aliado. Backend: /me/organization/team
// (spec en pendientes-isabel.md, 11.1). Lectura tolerante a la forma.
export type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'vet';
  title: string;
  photoUrl: string | null;
};

function mapTeamMember(raw: Record<string, unknown>): TeamMember {
  const user =
    raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : null;
  const src = user ?? raw;
  const roleRaw = String(raw.role ?? 'vet');
  const photo = src.photoUrl ?? src.photo_url ?? src.avatarUrl ?? src.avatar_url;
  return {
    userId: String(raw.userId ?? raw.user_id ?? user?.id ?? raw.id ?? ''),
    name: String(src.name ?? 'Sin nombre'),
    email: String(src.email ?? ''),
    role: roleRaw === 'owner' ? 'owner' : 'vet',
    title: String(raw.title ?? ''),
    photoUrl: typeof photo === 'string' && photo ? photo : null,
  };
}

export async function getMyOrgTeam(): Promise<TeamMember[]> {
  const data = await authedRaw<Record<string, unknown>[]>('/me/organization/team');
  return (data ?? []).map(mapTeamMember);
}

export async function addMyOrgTeamMember(email: string): Promise<void> {
  await authedRaw('/me/organization/team', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function removeMyOrgTeamMember(userId: string): Promise<void> {
  await authedRaw(`/me/organization/team/${userId}`, { method: 'DELETE' });
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
  // Cada foto puede traer un caption tipo "Día 1: ...", "Semana 2: ..." con el
  // que se arma la línea de tiempo de rehabilitación (dato real de Isabel).
  photos: { url: string; orderIndex: number; caption?: string | null }[] | null;
  organization: { name?: string; address?: string } | null;
  // Respaldo a futuro: si el backend algún día expone case_actions anidadas, se
  // leen bajo cualquiera de estos nombres; si no vienen, se usan los captions.
  timeline?: unknown;
  caseActions?: unknown;
  case_actions?: unknown;
  timelineEvents?: unknown;
};

type RawAnimalPhoto = { url: string; orderIndex: number; caption?: string | null };

const animalStatusLabels: Record<string, AnimalStatus> = {
  in_treatment: 'En tratamiento',
  recovering: 'Recuperándose',
  looking_for_foster: 'Buscando hogar',
  looking_for_adoption: 'Buscando hogar',
};

// Texto legible cuando un evento del timeline no trae descripción propia.
const actionTypeLabels: Record<string, string> = {
  created: 'Reporte creado',
  sighting_added: 'Nuevo avistamiento',
  accepted: 'Un voluntario tomó el caso',
  on_the_way: 'Voluntario en camino',
  sheltered: 'Puesto a resguardo',
  sent_to_vet: 'Llevado a la veterinaria',
  record_created: 'Ficha de rehabilitación creada',
  status_changed: 'Cambio de estado',
  resource_offered: 'Recurso ofrecido',
  resource_delivered: 'Recurso entregado',
  donation_made: 'Donación recibida',
  donation_approved: 'Donación aprobada',
  foster_assigned: 'Hogar temporal asignado',
  adopted: 'Adoptado',
  flagged: 'Reporte marcado',
  note: 'Nota',
};

type RawTimelineEvent = {
  title?: string | null;
  description?: string | null;
  actionType?: string | null;
  action_type?: string | null;
  when?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
  eventDate?: string | null;
  date?: string | null;
};

// Fecha legible para el timeline: prioriza cercanía (Hoy/Ayer/semanas) y para
// eventos viejos muestra la fecha corta, que se lee mejor que "hace 540 d".
function formatTimelineDate(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
  }
  return new Date(then).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Respaldo a futuro: arma el timeline si el backend expone case_actions anidadas.
function timelineFromCaseActions(raw: RawAnimal): TimelineEvent[] | undefined {
  const source = raw.timeline ?? raw.caseActions ?? raw.case_actions ?? raw.timelineEvents;
  if (!Array.isArray(source) || source.length === 0) return undefined;

  const events = source
    .map((item) => {
      const entry = (item ?? {}) as RawTimelineEvent;
      const type = entry.actionType ?? entry.action_type ?? '';
      const title = (entry.title ?? entry.description ?? actionTypeLabels[type] ?? '').trim();
      if (!title) return null;
      const iso = String(
        entry.createdAt ?? entry.created_at ?? entry.eventDate ?? entry.date ?? '',
      );
      const ms = iso ? new Date(iso).getTime() : Number.NaN;
      return {
        title,
        when: entry.when?.trim() || formatTimelineDate(iso),
        sortKey: Number.isNaN(ms) ? 0 : ms,
      };
    })
    .filter((event): event is { title: string; when: string; sortKey: number } => event !== null);

  if (events.length === 0) return undefined;

  // Orden cronológico (lo más antiguo primero), como lee una historia.
  events.sort((a, b) => a.sortKey - b.sortKey);
  return events.map(({ title, when }) => ({ title, when }));
}

// Dato real actual: cada foto trae un caption como "Día 1: rescatado en la calle".
// Lo partimos en el momento (antes de ":") y la descripción (después). Las fotos
// llegan ya ordenadas por orderIndex, así que el timeline queda cronológico.
function timelineFromCaptions(photos: RawAnimalPhoto[]): TimelineEvent[] | undefined {
  const events = photos
    .map((photo) => (photo.caption ?? '').trim())
    .filter(Boolean)
    .map((caption) => {
      const colon = caption.indexOf(':');
      if (colon > 0 && colon < caption.length - 1) {
        return { when: caption.slice(0, colon).trim(), title: caption.slice(colon + 1).trim() };
      }
      return { when: '', title: caption };
    })
    .filter((event) => event.title.length > 0);

  return events.length > 0 ? events : undefined;
}

function mapTimeline(raw: RawAnimal, photos: RawAnimalPhoto[]): TimelineEvent[] | undefined {
  return timelineFromCaseActions(raw) ?? timelineFromCaptions(photos);
}

function mapAnimal(raw: RawAnimal): Animal {
  const sortedPhotos = [...(raw.photos ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);
  const photos = sortedPhotos.map((photo) => photo.url).filter(Boolean);
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
    timeline: mapTimeline(raw, sortedPhotos),
  };
}

export async function getAnimals(): Promise<Animal[]> {
  const data = await requestRaw<RawAnimal[]>('/animals');
  return (data ?? []).map(mapAnimal);
}

// Animales que atiende el propio aliado. Backend: /me/organization/animals
// (spec en pendientes-isabel.md, 11.5). El cambio de estatus va a
// PATCH /me/organization/animals/:id { status } con el enum del backend.
export async function getMyOrgAnimals(): Promise<Animal[]> {
  const data = await authedRaw<RawAnimal[]>('/me/organization/animals');
  return (data ?? []).map(mapAnimal);
}

export async function updateMyOrgAnimalStatus(id: string, status: string): Promise<void> {
  await authedRaw(`/me/organization/animals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
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
