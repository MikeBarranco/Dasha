import type { Report, Severity } from '../data/mockReports';
import type {
  Animal,
  AnimalStatus,
  TimelineEvent,
  MedicalRecord,
  MedicalEntry,
  MedicalEntryType,
} from '../data/mockAnimals';
import type { Ally, AllyType, AllyMember, AllyAnimal, AllyPaymentInfo } from '../data/mockAllies';
import {
  type Need,
  type NeedType,
  type NeedStatus,
  type Contribution,
} from '../data/needs';
import type { LostPet } from '../data/mockLostPets';
import { releaseNotes, type ReleaseNote } from '../data/novedades';
import { type CommunityEvent, type ForumPost, type ForumReply } from '../data/mockComunidad';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
// El token de sesión ya no vive en el frontend: viaja en una cookie HttpOnly que
// el backend fija y el navegador adjunta solo (credentials: 'include'). Aquí solo
// guardamos el perfil para pintar nombre/avatar y para saber si hay sesión activa.
const USER_KEY = 'dasha-user';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  // El avatar viaja en la sesión (backend) para que se vea igual en cualquier
  // dispositivo; puede no venir en respuestas viejas, por eso es opcional.
  avatarUrl?: string | null;
};

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setSession(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
}

// Evento con el que la UI se entera de que la sesión cambió (entrar, salir o
// expirar). Lo escucha useAuth para repintar al instante.
export const AUTH_CHANGE_EVENT = 'dasha-auth-change';

// El backend respondió 401: la cookie de sesión expiró o ya no es válida. El
// perfil guardado hacía creer a la app que seguíamos dentro (y por eso salían
// errores raros al publicar). Lo limpiamos para que la interfaz refleje la
// realidad: las pantallas protegidas mandan a login solas.
export function handleUnauthorized(): void {
  if (!getStoredUser()) return;
  clearSession();
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

// Mensaje único para cuando se cae la sesión, para no inventar textos distintos.
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Vuelve a iniciar sesión.';

// Actualiza solo el avatar del usuario en sesión (tras cambiarlo o al recibirlo
// del backend), sin tocar el resto del perfil guardado.
export function setStoredUserAvatar(url: string | null): void {
  const user = getStoredUser();
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, avatarUrl: url }));
}

// Mantiene el rol del usuario en sesión al día con lo que dice el backend. Al
// aprobar una solicitud de voluntario, el rol cambia en el backend pero el perfil
// guardado seguía diciendo "citizen" hasta cerrar y volver a entrar. Al detectar
// el cambio lo actualizamos y avisamos a la UI (así el panel de voluntario y los
// accesos aparecen sin tener que reingresar).
export function syncStoredUserRole(role: string): void {
  const user = getStoredUser();
  if (!user || !role || user.role === role) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, role }));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
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

  // Sin token que revisar: usamos el perfil guardado como señal de sesión para
  // cortar antes de la red y dar un mensaje claro. La cookie va en credentials.
  if (auth && !getStoredUser()) {
    throw new Error('Inicia sesión para continuar');
  }

  // ¿Había sesión ANTES de la llamada? Si no la había, un 401 no es "sesión
  // caída" sino un login/registro con credenciales incorrectas.
  const hadSession = getStoredUser() !== null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const body = (await response.json().catch(() => ({}))) as Envelope<T>;

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(
      hadSession ? SESSION_EXPIRED_MESSAGE : (body.message ?? 'Correo o contraseña incorrectos'),
    );
  }

  if (!response.ok || body.status === 'error') {
    throw new Error(body.message ?? 'Ocurrió un error con el servidor');
  }

  return body.data as T;
}

export async function register(name: string, email: string, password: string) {
  return request<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<{ user: AuthUser }>('/auth/login', {
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
  // Banderas que el formulario ya preguntaba y que el backend guarda en la ficha:
  // sirven para que el voluntario sepa a qué se enfrenta antes de llegar.
  isAggressive?: boolean;
  hasCollar?: boolean;
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
  activeAssignmentId?: string | null;
  active_assignment_id?: string | null;
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

// Estados en los que un reporte ya NO debe salir en el mapa (ya se resolvió). El
// feed ideal del backend ya los excluye, pero filtramos aquí también para que un
// rescatado nunca se quede pintado. Tolerante a inglés y español.
const terminalReportStatuses = new Set([
  'rescued',
  'completed',
  'closed',
  'cancelled',
  'rescatado',
  'completado',
  'cerrado',
  'cancelado',
  'resuelto',
]);

function isTerminalReportStatus(status: string | null | undefined): boolean {
  return status ? terminalReportStatuses.has(status.toLowerCase()) : false;
}

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
    activeAssignmentId: raw.activeAssignmentId ?? raw.active_assignment_id ?? null,
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
  const response = await fetch(`${API_URL}${path}`, { credentials: 'include' });
  if (!response.ok) throw new Error('No se pudo consultar el servidor');
  return (await response.json()) as T;
}

export type Colonia = {
  name: string;
  postalCode: string;
  lat: number;
  lng: number;
};

// Saca el arreglo de una respuesta que puede venir cruda ([...]) o envuelta en
// { data | colonies | results | items: [...] }. Evita que un cambio de forma del
// backend truene el .map y deje la pantalla sin datos.
function unwrapArray(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of ['data', 'colonies', 'results', 'items']) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
  }
  return [];
}

// GET /colonies/search?cp=XXXXX -> colonias de ese código postal, con el CENTROIDE
// (lat/lng) de cada una (api_updates_miguel.md, 7). Se lee tolerante por si el
// backend envuelve la respuesta ({ data: [...] }) o cambia nombres de campo.
export async function getColoniesByCp(cp: string): Promise<Colonia[]> {
  const body = await requestRaw<unknown>(
    `/colonies/search?cp=${encodeURIComponent(cp)}`,
  );
  return unwrapArray(body)
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
  activeAssignmentId?: string | null;
  active_assignment_id?: string | null;
  isFollowing?: boolean;
  is_following?: boolean;
};

export async function getReports(): Promise<Report[]> {
  const data = await requestRaw<ListedReport[]>('/reports');
  return (data ?? [])
    // Los reportes ya resueltos no van al mapa: al rescatar, el pin desaparece.
    .filter((raw) => !isTerminalReportStatus(raw.status))
    .map((raw) => ({
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
      // Estado legible (antes salía el valor crudo del backend, p. ej. "in_progress").
      status: raw.status ? (statusLabels[raw.status] ?? raw.status) : 'Activo',
      // Id del traslado en curso: habilita "Ver rescate en vivo" desde el pin del mapa.
      activeAssignmentId: raw.activeAssignmentId ?? raw.active_assignment_id ?? null,
      isFollowing: Boolean(raw.isFollowing ?? raw.is_following ?? false),
    }));
}

// Detalle enriquecido de un reporte (GET /reports/:id). Trae las fotos originales
// + las de los avistamientos (para el carrusel), las ofertas de aliados, y la
// fecha de creación (para calcular cuánto lleva en la calle). Contrato de Isabel
// (28 jul). Se lee tolerante a la forma.
export type ReportSighting = {
  id: string;
  photoUrl: string;
  description: string;
  createdAt: string;
};

export type ReportOffer = {
  id: string;
  title: string;
  description: string;
  resourceType: string;
  organizationName: string;
};

export type ReportDetailData = {
  createdAt: string;
  // Fotos para el carrusel: las originales del reporte + las de los avistamientos.
  photos: string[];
  sightings: ReportSighting[];
  offers: ReportOffer[];
  // Si el usuario en sesión ya sigue este reporte (valor confiable del detalle,
  // el del listado del mapa puede venir desactualizado).
  isFollowing: boolean;
};

function strField(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

export async function getReportDetail(id: string): Promise<ReportDetailData> {
  const body = await requestRaw<Record<string, unknown> | null>(`/reports/${id}`);
  const raw =
    body && typeof body === 'object'
      ? ('data' in body && body.data && typeof body.data === 'object'
          ? (body.data as Record<string, unknown>)
          : (body as Record<string, unknown>))
      : {};

  // Fotos originales: arreglo de { url, publicId } o de strings.
  const rawPhotos = Array.isArray(raw.photos) ? (raw.photos as unknown[]) : [];
  const originalPhotos = rawPhotos
    .map((item) =>
      typeof item === 'string' ? item : strField(item as Record<string, unknown>, 'url', 'photoUrl'),
    )
    .filter(Boolean);

  const rawSightings = Array.isArray(raw.sightings) ? (raw.sightings as unknown[]) : [];
  const sightings: ReportSighting[] = rawSightings
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: strField(item, 'id', '_id'),
      photoUrl: strField(item, 'photoUrl', 'photo_url', 'url'),
      description: strField(item, 'description'),
      createdAt: strField(item, 'createdAt', 'created_at'),
    }));

  const rawOffers = Array.isArray(raw.offers) ? (raw.offers as unknown[]) : [];
  const offers: ReportOffer[] = rawOffers
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: strField(item, 'id', '_id'),
      title: strField(item, 'title'),
      description: strField(item, 'description'),
      resourceType: strField(item, 'resourceType', 'resource_type') || 'other',
      organizationName:
        strField(item, 'organizationName', 'organization_name', 'orgName') || 'Aliado',
    }));

  // Para el carrusel: fotos originales primero, luego las de los avistamientos.
  const sightingPhotos = sightings.map((s) => s.photoUrl).filter(Boolean);
  const photos = [...originalPhotos, ...sightingPhotos];

  return {
    createdAt: strField(raw, 'createdAt', 'created_at'),
    photos,
    sightings,
    offers,
    isFollowing: raw.isFollowing === true || raw.is_following === true,
  };
}

export type Stats = {
  reportesActivos: number;
  rescatesLogrados: number;
  voluntarios: number;
};

export async function getStats(): Promise<Stats> {
  return requestRaw<Stats>('/stats');
}

// --- Impacto / estadísticas públicas (pantalla /impacto, UI 2.13) ---
// Métricas comunitarias. Se leen tolerantes a nombres de campo (es/en). Un valor
// null = el backend aún no manda ese dato: la tarjeta se OCULTA (no inventamos un
// número). Si la llamada completa falla, se propaga el error (la pantalla muestra
// "no se pudo cargar" + reintentar), nunca datos falsos.
export type ImpactMonth = { month: string; reportes: number; rescates: number };
export type ImpactColonia = { name: string; count: number };

export type ImpactStats = {
  rescatesLogrados: number | null;
  adopciones: number | null;
  animalesEnAdopcion: number | null;
  aliadosRegistrados: number | null;
  donacionesVerificadas: number | null;
  voluntariosActivos: number | null;
  reportesTotales: number | null;
  tiempoPromedioHoras: number | null;
  porMes: ImpactMonth[];
  rankingColonias: ImpactColonia[];
};

// Número tolerante: acepta el primer alias presente; null si ninguno es numérico.
function numOrNull(raw: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

export async function getImpactStats(): Promise<ImpactStats> {
  const raw = await requestRaw<Record<string, unknown>>('/stats');
  const obj = raw && typeof raw === 'object' ? raw : {};

  const monthlyRaw = Array.isArray(obj.porMes)
    ? obj.porMes
    : Array.isArray(obj.monthly)
      ? obj.monthly
      : Array.isArray(obj.byMonth)
        ? obj.byMonth
        : [];
  const porMes: ImpactMonth[] = monthlyRaw
    .map((item) => {
      const m = (item ?? {}) as Record<string, unknown>;
      return {
        month: String(m.month ?? m.mes ?? m.label ?? ''),
        reportes: Number(m.reportes ?? m.reports ?? 0) || 0,
        rescates: Number(m.rescates ?? m.rescues ?? 0) || 0,
      };
    })
    .filter((item) => item.month);

  const coloniasRaw = Array.isArray(obj.rankingColonias)
    ? obj.rankingColonias
    : Array.isArray(obj.topColonies)
      ? obj.topColonies
      : Array.isArray(obj.colonias)
        ? obj.colonias
        : [];
  const rankingColonias: ImpactColonia[] = coloniasRaw
    .map((item) => {
      const c = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(c.name ?? c.nombre ?? c.colonia ?? ''),
        count: Number(c.count ?? c.rescates ?? c.total ?? 0) || 0,
      };
    })
    .filter((item) => item.name);

  return {
    rescatesLogrados: numOrNull(obj, 'rescatesLogrados', 'rescues', 'rescuesCount', 'totalRescues'),
    adopciones: numOrNull(obj, 'adopciones', 'adopcionesLogradas', 'adoptions', 'adopted', 'adoptedCount'),
    animalesEnAdopcion: numOrNull(
      obj,
      'animalesEnAdopcion',
      'animalsInAdoption',
      'enAdopcion',
      'inAdoption',
    ),
    aliadosRegistrados: numOrNull(
      obj,
      'aliadosRegistrados',
      'alliesRegistered',
      'aliados',
      'allies',
    ),
    donacionesVerificadas: numOrNull(
      obj,
      'donacionesVerificadas',
      'donationsApproved',
      'verifiedDonations',
      'donations',
    ),
    voluntariosActivos: numOrNull(
      obj,
      'voluntariosActivos',
      'activeVolunteers',
      'voluntarios',
      'volunteers',
    ),
    reportesTotales: numOrNull(obj, 'reportesTotales', 'reportsTotal', 'reports', 'totalReports'),
    tiempoPromedioHoras: numOrNull(
      obj,
      'tiempoPromedioHoras',
      'avgRescueHours',
      'avgReportToRescueHours',
    ),
    porMes,
    rankingColonias,
  };
}

// Novedades (changelog) público. Cuando Isabel exponga GET /novedades, la página
// de Novedades se alimenta desde el panel sin tocar código. Mientras no exista (o
// si falla / viene vacío), se usa la lista estática de data/novedades.ts como
// respaldo, para que el escaparate nunca se quede en blanco. Tolerante a nombres
// de campo y al formato de fecha (ISO o texto ya legible).
function formatNovedadDate(raw: string): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function getNovedades(): Promise<ReleaseNote[]> {
  try {
    const data = await requestRaw<Record<string, unknown>[]>('/novedades');
    if (!Array.isArray(data) || data.length === 0) return releaseNotes;
    return data.map((raw) => {
      const changesRaw = raw.changes ?? raw.items ?? raw.notes;
      const changes = Array.isArray(changesRaw)
        ? changesRaw.map((item) => String(item)).filter((item) => item.trim().length > 0)
        : typeof changesRaw === 'string'
          ? changesRaw.split('\n').map((line) => line.trim()).filter(Boolean)
          : [];
      return {
        version: String(raw.version ?? ''),
        date: formatNovedadDate(String(raw.date ?? raw.releasedAt ?? raw.createdAt ?? '')),
        title: String(raw.title ?? ''),
        changes,
      };
    });
  } catch {
    return releaseNotes;
  }
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
      // Colonia del reporte (backend: colonyName). Se muestra en la lista y el popup.
      colonyName: String(raw.colonyName ?? raw.colony_name ?? raw.colonia ?? '') || undefined,
    };
  });
}

// Fetch autenticado tolerante a la forma de la respuesta: acepta el dato directo
// (como /me, que viene plano) o envuelto en { data }.
async function authedRaw<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!getStoredUser()) throw new Error('Inicia sesión para continuar');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as unknown;
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }
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
// Guarda la suscripción Web Push de este dispositivo. Contrato exacto del backend
// (api_updates_miguel.md, 2): { endpoint, keys: { p256dh, auth } }. Mandamos solo
// esos campos: el backend valida con Zod y los extras podrían rechazarse.
export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  await authedRaw('/me/push-subscription', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
      },
    }),
  });
}

export type Achievement = {
  // Código del logro en el backend (first_report, etc.). Es la forma fiable de
  // saber cuál desbloqueó el usuario, más que el nombre.
  code: string;
  name: string;
  description: string;
  image: string;
};

// Catálogo REAL de logros que existen, con sus requisitos.
// GET /me/achievements/available (api_updates_miguel.md, 1).
export type AvailableAchievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  requirementType: string;
  requirementValue: number;
  pointsReward: number;
  iconUrl: string;
};

// Tolerante: si el endpoint aún no responde, devolvemos [] y el perfil muestra
// solo los logros que el usuario YA tiene (nunca medallas inventadas).
export async function getAvailableAchievements(): Promise<AvailableAchievement[]> {
  try {
    const data = await authedRaw<Record<string, unknown>[]>('/me/achievements/available');
    if (!Array.isArray(data)) return [];
    return data.map((raw) => ({
      id: String(raw.id ?? ''),
      code: String(raw.code ?? ''),
      name: String(raw.name ?? ''),
      description: String(raw.description ?? ''),
      requirementType: String(raw.requirementType ?? raw.requirement_type ?? ''),
      requirementValue: Number(raw.requirementValue ?? raw.requirement_value ?? 0),
      pointsReward: Number(raw.pointsReward ?? raw.points_reward ?? 0),
      iconUrl: String(raw.iconUrl ?? raw.icon_url ?? ''),
    }));
  } catch {
    return [];
  }
}

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
  // Estado real de la solicitud de voluntario: 'none' | 'pending' | 'approved' |
  // 'rejected'. null = el backend aún no lo envía (usamos la bandera local).
  volunteerStatus: string | null;
  // ¿La cuenta tiene contraseña propia? Las de solo-Google no, así que en ajustes
  // se oculta "cambiar contraseña" para ellas. Si el backend no lo indica,
  // asumimos que sí (el registro con correo/contraseña existe).
  hasPassword: boolean;
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
        code: String(obj.code ?? ''),
        name: String(obj.name ?? ''),
        description: String(obj.description ?? ''),
        image: String(obj.iconUrl ?? obj.image ?? ''),
      };
    })
    .filter((item) => item.name || item.image);

  // El backend manda el rol vigente: si cambió (p. ej. lo aprobaron como
  // voluntario), lo reflejamos en la sesión guardada sin pedir reingresar.
  const role = String(raw.role ?? 'citizen');
  syncStoredUserRole(role);

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role,
    phone: String(raw.phone ?? ''),
    avatarUrl: typeof raw.avatarUrl === 'string' && raw.avatarUrl ? raw.avatarUrl : null,
    level: Number(raw.level ?? 1),
    experience: Number(raw.experiencePoints ?? raw.experience ?? 0),
    reportsCount: Number(raw.reportsCount ?? count.reports ?? 0),
    rescuesCount: Number(raw.rescuesCount ?? count.rescueAssignments ?? 0),
    achievements,
    volunteerStatus:
      typeof raw.volunteerStatus === 'string'
        ? raw.volunteerStatus
        : typeof raw.volunteer_status === 'string'
          ? raw.volunteer_status
          : null,
    hasPassword: resolveHasPassword(raw),
  };
}

// Deducimos si la cuenta tiene contraseña propia. Preferimos una bandera explícita
// del backend; si no viene, una cuenta con proveedor "google" (o solo googleId) no
// tiene contraseña. En la duda asumimos que sí (para no ocultar el cambio a quien
// se registró con correo).
function resolveHasPassword(raw: Record<string, unknown>): boolean {
  if (typeof raw.hasPassword === 'boolean') return raw.hasPassword;
  if (typeof raw.has_password === 'boolean') return raw.has_password;
  const provider = String(raw.authProvider ?? raw.provider ?? '').toLowerCase();
  if (provider === 'google') return false;
  const googleOnly = Boolean(raw.googleId ?? raw.google_id) && !provider;
  return !googleOnly;
}

export async function updateMe(data: {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<void> {
  await authedRaw('/me', { method: 'PATCH', body: JSON.stringify(data) });
}

// Cambia la contraseña de la cuenta. No es tolerante: si falla (contraseña actual
// incorrecta, etc.) queremos mostrar el error real. PATCH /me/password.
export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await authedRaw('/me/password', { method: 'PATCH', body: JSON.stringify(data) });
}

// Elimina la cuenta del usuario (borrado con cascada de sus datos, del lado del
// backend). Manda el motivo opcional para entender por qué se van. DELETE /me.
export async function deleteAccount(data?: {
  reason?: string;
  feedback?: string;
}): Promise<void> {
  const reason = data?.reason?.trim();
  const feedback = data?.feedback?.trim();
  const body: Record<string, string> = {};
  if (reason) body.reason = reason;
  if (feedback) body.feedback = feedback;
  await authedRaw('/me', {
    method: 'DELETE',
    ...(Object.keys(body).length ? { body: JSON.stringify(body) } : {}),
  });
}

// Contexto de aliado del usuario actual: a qué organización pertenece y con qué
// rol. Gatea el portal de aliado. El backend lo expondrá en GET /me/organization
// (spec en pendientes-isabel.md, 11.1). Mientras no exista, dejamos que un ADMIN
// lo previsualice con datos de ejemplo (preview) para poder construir y probar.
export type AllyRole = 'owner' | 'vet';

// Decisión de producto: TODOS los aliados tienen el portal completo (reciben
// perritos, rehabilitan, adoptan) y pueden ser destino de un rescate, sin
// importar su tipo. Ya no hay distinción de "ciclo completo" por org_type; el
// tipo queda solo como etiqueta.

export type AllyContext = {
  organizationId: string;
  organizationName: string;
  orgType: string;
  role: AllyRole;
  preview: boolean;
  // Presente SOLO cuando un administrador está viendo el portal de un aliado que
  // no es suyo. Acota cada llamada /me/organization/* a esa organización con
  // ?organizationId=. Un aliado real lo deja en undefined (su org sale de la sesión).
  adminOrgId?: string;
};

// Sufijo de consulta para acotar una llamada /me/organization/* a una organización
// concreta. Solo lo usa un administrador viendo el portal de un aliado; backend
// ?organizationId= (pendientes-isabel.md, sección 15, opción A).
function orgScope(orgId?: string): string {
  return orgId ? `?organizationId=${encodeURIComponent(orgId)}` : '';
}

// El backend distingue el rol dentro de la organización como role_in_org
// (admin|veterinarian|assistant en BD). Aquí lo reducimos a owner|vet: el
// responsable (admin) es owner; el resto, vet.
function normalizeAllyRole(raw: unknown): AllyRole {
  const value = String(raw ?? 'owner').toLowerCase();
  return value === 'owner' || value === 'admin' ? 'owner' : 'vet';
}

export async function getMyOrganization(): Promise<AllyContext | null> {
  try {
    const raw = await authedRaw<Record<string, unknown>>('/me/organization');
    const orgObj =
      raw && typeof raw === 'object'
        ? ((raw.organization ?? raw) as Record<string, unknown>)
        : null;
    const id = orgObj ? String(orgObj.id ?? orgObj._id ?? '') : '';
    if (id) {
      const record = raw as Record<string, unknown>;
      return {
        organizationId: id,
        organizationName: String(orgObj?.name ?? 'Mi organización'),
        orgType: String(orgObj?.orgType ?? orgObj?.org_type ?? 'veterinary'),
        role: normalizeAllyRole(record.role ?? record.roleInOrg ?? record.role_in_org),
        preview: false,
      };
    }
  } catch {
    // El endpoint /me/organization aún no existe en el backend.
  }
  return null;
}

// Contexto para que un ADMINISTRADOR abra el portal de un aliado por su id. No hay
// datos de ejemplo: el nombre/tipo salen del aliado real (getAlly), con una pista
// del listado del panel como respaldo para poder pintar el marco aunque ese dato
// tarde. Cada sección se llena con ?organizationId= y muestra su propio error si
// el backend aún no lo expone.
export async function getOrganizationForAdmin(
  orgId: string,
  hint?: { name?: string; orgType?: string },
): Promise<AllyContext> {
  let organizationName = hint?.name ?? 'Aliado';
  let orgType = hint?.orgType ?? 'veterinary';
  try {
    const ally = await getAlly(orgId);
    if (ally) {
      organizationName = ally.name;
      orgType = ally.orgType;
    }
  } catch {
    // Usamos la pista del listado; el marco del portal se pinta igual.
  }
  return {
    organizationId: orgId,
    organizationName,
    orgType,
    role: 'owner',
    preview: false,
    adminOrgId: orgId,
  };
}

// Edición de la ficha del aliado por su propio responsable (scopeada a SU
// organización). Backend: PATCH /me/organization (spec en pendientes-isabel.md,
// 11.3). En vista previa no se llama; se refleja en pantalla.
export type MyOrgInput = {
  name: string;
  // Siglas de la organización (ej. "CAETO"). Cadena vacía = borrar (el backend la
  // convierte a null). Lista abierta pero corta (máx 20, validada en backend).
  acronym?: string;
  slogan?: string;
  description?: string;
  // Promoción/oferta del aliado (texto libre hasta 500). Se muestra en su ficha.
  promo?: string;
  schedule?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  // Redes sociales del aliado (URL). Cadena vacía = borrar (backend => null).
  facebookUrl?: string;
  instagramUrl?: string;
  logoBase64?: string;
  coverBase64?: string;
};

export async function updateMyOrganization(input: MyOrgInput, orgId?: string): Promise<void> {
  await authedRaw(`/me/organization${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// Equipo (veterinarios) del propio aliado. Backend: /me/organization/team
// (spec en pendientes-isabel.md, 11.1). Lectura tolerante a la forma.
// Rol dentro del equipo del aliado (role_in_org en BD). Se muestra como etiqueta
// en "Mi equipo" del portal.
export type TeamRole = 'admin' | 'veterinarian' | 'assistant';

export const teamRoleLabels: Record<TeamRole, string> = {
  admin: 'Responsable',
  veterinarian: 'Veterinario',
  assistant: 'Asistente',
};

// Lista CERRADA de puestos/títulos para los miembros del equipo (para equipos
// multidisciplinarios como un centro de terapia: entrenador, psicóloga, etc.).
// El aliado elige de esta lista (no texto libre); el backend valida contra la
// misma lista. DEBE coincidir con OrganizationController.TEAM_TITLES del backend.
export const teamTitleOptions = [
  'Veterinario/a',
  'Médico veterinario/a',
  'Asistente',
  'Recepción',
  'Entrenador/a',
  'Etólogo/a',
  'Psicólogo/a',
  'Terapeuta',
  'Rescatista',
  'Coordinador/a',
  'Estilista canino',
  'Voluntario/a',
  'Responsable',
];

// Normaliza el rol que manda el backend (admin|veterinarian|assistant, o los
// viejos owner|vet) a uno de los tres valores que pintamos.
function normalizeTeamRole(raw: unknown): TeamRole {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'admin' || value === 'owner') return 'admin';
  if (value === 'assistant') return 'assistant';
  return 'veterinarian';
}

export type TeamMember = {
  userId: string;
  name: string;
  email: string;
  role: TeamRole;
  title: string;
  // Puesto/título personalizado elegido de teamTitleOptions (ej. "Entrenador/a").
  // Vacío si no se ha asignado; en ese caso se muestra la etiqueta del rol.
  positionTitle?: string;
  photoUrl: string | null;
};

function mapTeamMember(raw: Record<string, unknown>): TeamMember {
  const user =
    raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : null;
  const src = user ?? raw;
  const photo = src.photoUrl ?? src.photo_url ?? src.avatarUrl ?? src.avatar_url;
  return {
    userId: String(raw.userId ?? raw.user_id ?? user?.id ?? raw.id ?? ''),
    name: String(src.name ?? 'Sin nombre'),
    email: String(src.email ?? ''),
    role: normalizeTeamRole(raw.role ?? raw.roleInOrg ?? raw.role_in_org),
    title: String(raw.title ?? ''),
    positionTitle: String(raw.positionTitle ?? raw.position_title ?? '') || undefined,
    photoUrl: typeof photo === 'string' && photo ? photo : null,
  };
}

export async function getMyOrgTeam(orgId?: string): Promise<TeamMember[]> {
  const data = await authedRaw<Record<string, unknown>[]>(
    `/me/organization/team${orgScope(orgId)}`,
  );
  return (data ?? []).map(mapTeamMember);
}

export async function addMyOrgTeamMember(
  email: string,
  positionTitle?: string,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/me/organization/team${orgScope(orgId)}`, {
    method: 'POST',
    body: JSON.stringify({ email, positionTitle: positionTitle || undefined }),
  });
}

// Actualiza el puesto/título de un miembro (Backend valida contra la lista). El
// backend identifica al miembro por su userId (como en el DELETE). Cadena vacía =
// quitar el título (vuelve a mostrarse la etiqueta del rol).
export async function updateMyOrgTeamMember(
  userId: string,
  positionTitle: string,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/me/organization/team/${userId}${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ positionTitle }),
  });
}

export async function removeMyOrgTeamMember(userId: string, orgId?: string): Promise<void> {
  await authedRaw(`/me/organization/team/${userId}${orgScope(orgId)}`, { method: 'DELETE' });
}

// Solicitud pública para unirse como aliado (Camino B): una veterinaria/refugio
// que descubre Dasha manda sus datos y un admin la aprueba. Backend:
// POST /organization-applications (spec en pendientes-isabel.md, sección 19i).
export type OrgApplicationInput = {
  name: string;
  orgType: string; // veterinary | shelter | ngo | educational
  address: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  // La persona de contacto NO es una columna de esta tabla: el formulario la
  // recoge y la dobla dentro de `description` antes de enviar (lo pidió Isabel).
  description: string;
  // El código postal SÍ es columna propia: va separado, nunca dentro de address.
  zipCode?: string;
  // Ubicación para que el aliado se pinte en el mapa. La obtenemos del centroide
  // de la colonia (por CP) + un pin que el usuario afina; NUNCA le pedimos que
  // escriba lat/lng. El backend la guarda al aprobar.
  lat?: number;
  lng?: number;
};

export async function submitOrganizationApplication(input: OrgApplicationInput): Promise<void> {
  await authedRaw('/organization-applications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function postVolunteerApplication(data: {
  idDocBase64: string;
  idSelfieBase64: string;
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
    // El backend ya devuelve el objeto `colony` completo (api_updates_miguel.md, 9),
    // por eso antes salía "Sin colonia": leíamos solo un campo plano.
    const colonyObj =
      raw.colony && typeof raw.colony === 'object'
        ? (raw.colony as Record<string, unknown>)
        : null;
    const lostPetObj =
      raw.lostPet && typeof raw.lostPet === 'object'
        ? (raw.lostPet as Record<string, unknown>)
        : null;
    // raw.address como ultimo respaldo: los animales de "Dar de alta" (ingreso
    // directo) no tienen coordenadas ni colonia, y el backend les pone
    // address = "Ingreso directo" para que no salga "Sin colonia".
    const coloniaName = String(
      colonyObj?.name ?? raw.colonia ?? raw.colonyName ?? raw.colony_name ?? raw.address ?? '',
    ).trim();
    return {
      id: String(raw.id ?? ''),
      lat: Number(raw.lat ?? 0),
      lng: Number(raw.lng ?? 0),
      colonia: coloniaName || 'Sin colonia',
      species: species === 'cat' || species === 'gato' ? 'gato' : 'perro',
      condition: conditionLabels[conditionRaw] ?? conditionRaw,
      severity: (urgencyToSeverity[urgencyRaw] ??
        (['baja', 'media', 'critica'].includes(urgencyRaw) ? urgencyRaw : 'media')) as Severity,
      photo: photo || '/placeholder-animal.svg',
      description: String(raw.description ?? ''),
      reportedAgo: timeAgo(String(raw.created_at ?? raw.createdAt ?? '')),
      status: statusLabels[statusRaw] ?? (statusRaw || 'Activo'),
      activeAssignmentId:
        (raw.activeAssignmentId ?? raw.active_assignment_id ?? null) as string | null,
      isLostPet: Boolean(raw.isLostPet ?? raw.is_lost_pet),
      lostPetId: lostPetObj ? String(lostPetObj.id ?? '') || undefined : undefined,
      lostPetFound: lostPetObj
        ? Boolean(lostPetObj.isFound ?? lostPetObj.is_found)
        : undefined,
    };
  });
}

// El dueño marca su mascota perdida como ENCONTRADA (Backend:
// PATCH /lost-pets/:id/found, valida que sea el dueño). No la borra: cierra el
// reporte y deja de aparecer en el mapa de perdidos.
export async function markLostPetFound(lostPetId: string): Promise<void> {
  await authedRaw(`/lost-pets/${lostPetId}/found`, { method: 'PATCH' });
}

type RawAnimal = {
  id: string;
  name: string;
  species: string;
  gender?: string | null;
  history?: string | null;
  story?: string | null;
  description?: string | null;
  status: string;
  diagnosis: string | null;
  treatment: string | null;
  estimatedCost?: string | number | null;
  totalCostNeeded?: string | number | null;
  totalRaised: string | null;
  // Cada foto puede traer un caption tipo "Día 1: ...", "Semana 2: ..." con el
  // que se arma la línea de tiempo de rehabilitación (dato real de Isabel).
  photos: { url: string; orderIndex: number; caption?: string | null; createdAt?: string }[] | null;
  // Reporte original (Isabel lo incluye para el álbum completo): sus fotos de calle
  // (ciudadano + voluntario) y los avistamientos (case_actions con foto en metadata).
  report?: {
    photos?: { url: string; orderIndex?: number; createdAt?: string }[] | null;
    caseActions?: { metadata?: unknown; createdAt?: string }[] | null;
  } | null;
  organization: { name?: string; address?: string } | null;
  // Respaldo a futuro: si el backend algún día expone case_actions anidadas, se
  // leen bajo cualquiera de estos nombres; si no vienen, se usan los captions.
  timeline?: unknown;
  caseActions?: unknown;
  case_actions?: unknown;
  timelineEvents?: unknown;
  // Cartilla médica (Isabel la expondrá; se lee tolerante).
  medicalRecord?: unknown;
  medical?: unknown;
  isSterilized?: boolean | null;
};

type RawAnimalPhoto = { url: string; orderIndex: number; caption?: string | null };

const animalStatusLabels: Record<string, AnimalStatus> = {
  in_treatment: 'En tratamiento',
  recovering: 'Recuperándose',
  looking_for_foster: 'Buscando hogar',
  looking_for_adoption: 'Buscando hogar',
  adopted: 'Adoptado',
  deceased: 'Fallecido',
};

// Texto legible cuando un evento del timeline no trae descripción propia.
const actionTypeLabels: Record<string, string> = {
  created: 'Reporte creado',
  sighting_added: 'Nuevo avistamiento',
  accepted: 'Un voluntario tomó el caso',
  on_the_way: 'Voluntario en camino',
  arrived: 'Llegó con el aliado',
  delivered: 'Entregado al aliado',
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

const medEntryTypeMap: Record<string, MedicalEntryType> = {
  vacuna: 'vacuna',
  vaccine: 'vacuna',
  vaccination: 'vacuna',
  desparasitacion: 'desparasitacion',
  deworming: 'desparasitacion',
  lab: 'desparasitacion',
  tratamiento: 'tratamiento',
  treatment: 'tratamiento',
  medication: 'tratamiento',
  cirugia: 'cirugia',
  surgery: 'cirugia',
  peso: 'peso',
  weight: 'peso',
  checkup: 'peso',
};

function normalizeMedType(value: string): MedicalEntryType {
  return medEntryTypeMap[value.toLowerCase()] ?? 'otro';
}

// Lee la cartilla médica tolerante a la forma del backend. Devuelve undefined si
// no hay datos (para no pintar una sección vacía).
function mapMedical(raw: RawAnimal): MedicalRecord | undefined {
  const source = raw.medicalRecord ?? raw.medical;
  const obj = source && typeof source === 'object' ? (source as Record<string, unknown>) : null;

  const rawEntries = obj
    ? Array.isArray(obj.entries)
      ? obj.entries
      : Array.isArray(obj.items)
        ? obj.items
        : []
    : [];

  const entries: MedicalEntry[] = (rawEntries as Record<string, unknown>[])
    .map((item, index) => ({
      id: String(item.id ?? item._id ?? index),
      type: normalizeMedType(String(item.type ?? 'otro')),
      title: String(item.title ?? item.name ?? ''),
      date: String(item.date ?? item.createdAt ?? item.created_at ?? ''),
      notes: item.notes
        ? String(item.notes)
        : item.description
          ? String(item.description)
          : undefined,
    }))
    .filter((entry) => entry.title);

  // Vacunas: Isabel las devuelve como la relación `vaccinations` DENTRO de
  // medicalRecord (no en `entries`); las sumamos como entradas tipo "vacuna" para
  // que la cartilla no salga vacía.
  const rawVaccines = obj && Array.isArray(obj.vaccinations) ? obj.vaccinations : [];
  const vaccineEntries: MedicalEntry[] = (rawVaccines as Record<string, unknown>[])
    .map((item, index) => ({
      id: String(item.id ?? item._id ?? `vac-${index}`),
      type: normalizeMedType('vacuna'),
      title: String(item.name ?? item.vaccineName ?? item.title ?? 'Vacuna'),
      date: String(
        item.date ?? item.appliedAt ?? item.applied_at ?? item.createdAt ?? item.created_at ?? '',
      ),
      notes: item.notes
        ? String(item.notes)
        : item.description
          ? String(item.description)
          : undefined,
    }))
    .filter((entry) => entry.title);

  const allEntries = [...vaccineEntries, ...entries];

  const sterilized = Boolean(
    (obj?.sterilized ?? obj?.isSterilized ?? obj?.esterilizado ?? raw.isSterilized) as unknown,
  );

  if (!obj && !raw.isSterilized) return undefined;
  return { sterilized, entries: allEntries };
}

// Saca la URL de foto de un avistamiento (case_action) leyendo su metadata, que
// puede traer la foto bajo photoUrl / photo_url / url.
function sightingPhotoUrl(caseAction: unknown): string | null {
  if (!caseAction || typeof caseAction !== 'object') return null;
  const meta = (caseAction as Record<string, unknown>).metadata;
  if (!meta || typeof meta !== 'object') return null;
  const obj = meta as Record<string, unknown>;
  const url = obj.photoUrl ?? obj.photo_url ?? obj.url;
  return typeof url === 'string' && url ? url : null;
}

function mapAnimal(raw: RawAnimal): Animal {
  const sortedPhotos = [...(raw.photos ?? [])].sort((a, b) => a.orderIndex - b.orderIndex);

  // Álbum COMPLETO del recorrido, para que ninguna foto se pierda: fotos del reporte
  // (calle + voluntario) -> avistamientos (case_actions con foto) -> fotos del animal
  // (aliado/rehab/momentos de adopción). Se DEDUPLICAN por URL (la 1a foto del
  // reporte se copia al animal al ingresar, así no sale dos veces).
  const report = raw.report && typeof raw.report === 'object' ? raw.report : null;
  const reportPhotos = Array.isArray(report?.photos)
    ? [...report!.photos]
        .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
        .map((p) => p.url)
    : [];
  const sightingUrls = Array.isArray(report?.caseActions)
    ? report!.caseActions.map(sightingPhotoUrl).filter((u): u is string => Boolean(u))
    : [];

  // Álbum con el "momento" de cada foto, deduplicado por URL. El orden es el
  // recorrido: calle -> avistamiento -> rehabilitación/momentos. photos es solo las
  // URLs en el mismo orden (para el carrusel).
  const isAdopted = raw.status === 'adopted';
  const album: { url: string; moment: string }[] = [];
  const seen = new Set<string>();
  const pushEntry = (url: string | null | undefined, moment: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    album.push({ url, moment });
  };
  reportPhotos.forEach((url) => pushEntry(url, 'En la calle'));
  sightingUrls.forEach((url) => pushEntry(url, 'Avistamiento'));
  sortedPhotos.forEach((photo) =>
    pushEntry(
      photo.url,
      (photo.caption && photo.caption.trim()) || (isAdopted ? 'Con su familia' : 'En rehabilitación'),
    ),
  );

  const photos = album.map((entry) => entry.url);

  return {
    id: String(raw.id),
    name: raw.name,
    species: raw.species === 'cat' || raw.species === 'gato' ? 'gato' : 'perro',
    size: 'Mediano',
    zone: raw.organization?.address ?? raw.organization?.name ?? 'Puebla',
    photos: photos.length > 0 ? photos : ['/placeholder-animal.svg'],
    album: album.length > 0 ? album : undefined,
    // La descripción pública del aliado se guarda en `story`; dejamos `description`
    // como respaldo por si viniera en ese campo.
    story: raw.history ?? raw.story ?? raw.description ?? '',
    // Sexo: el backend usa male/female/unknown; lo traducimos. unknown/ausente => sin dato.
    gender: raw.gender === 'female' ? 'hembra' : raw.gender === 'male' ? 'macho' : undefined,
    diagnosis: raw.diagnosis ?? raw.treatment ?? 'En valoración',
    vet: raw.organization?.name ?? 'Aliado Dasha',
    totalNeeded: Number(raw.estimatedCost ?? raw.totalCostNeeded ?? 0),
    totalRaised: Number(raw.totalRaised ?? 0),
    status: animalStatusLabels[raw.status] ?? 'En tratamiento',
    timeline: mapTimeline(raw, sortedPhotos),
    medical: mapMedical(raw),
  };
}

export async function getAnimals(): Promise<Animal[]> {
  const data = await requestRaw<RawAnimal[]>('/animals');
  return (data ?? []).map(mapAnimal);
}

// --- Álbum de adoptados (cierre del ciclo: la vida del perrito ya adoptado) ---
// Galería pública de finales felices; la familia adoptante sigue subiendo fotos
// y momentos a la ficha del MISMO animal (photos + case_actions).

// Adoptados públicos para la galería. GET /animals/adopted (o /animals?status=adopted).
// Si falla, se propaga el error (la pantalla muestra "no se pudo cargar"); vacío = estado vacío.
export async function getAdoptedAnimals(): Promise<Animal[]> {
  const data = await requestRaw<RawAnimal[]>('/animals/adopted');
  return (data ?? []).map(mapAnimal);
}

// Memorial "Los que recordamos": animales que fallecieron durante o después del
// rescate. Contrato de Isabel: GET /animals?status=deceased (no hay ruta estática).
export async function getDeceasedAnimals(): Promise<Animal[]> {
  const data = await requestRaw<RawAnimal[]>('/animals?status=deceased');
  return (data ?? []).map(mapAnimal);
}

// Los adoptados del usuario en sesión (para que la familia agregue momentos).
// Solo los animales que ESTE usuario adoptó. Ruta confirmada por Isabel:
// GET /me/adopted-animals (antes /me/adopted daba 404).
export async function getMyAdoptedAnimals(): Promise<Animal[]> {
  const data = await authedRaw<RawAnimal[]>('/me/adopted-animals');
  return (data ?? []).map(mapAnimal);
}

// Adopción directa del ciudadano ("me lo quedo"): quien YA tiene al animalito de
// un reporte se lo queda sin volverse voluntario ni pasar por un aliado. Backend:
// POST /reports/:id/adopt-directly { photoBase64, name? }. Marca el reporte como
// adopted, crea el AnimalProfile con adoptedByUserId = ciudadano en sesión y usa
// la foto (selfie con el animalito) como primera del álbum. Aparece en
// GET /me/adopted y permite agregar momentos.
export async function adoptDirectly(
  reportId: string,
  photoBase64: string,
  name?: string,
): Promise<void> {
  await authedRaw(`/reports/${reportId}/adopt-directly`, {
    method: 'POST',
    body: JSON.stringify({ photoBase64, name: name?.trim() || undefined }),
  });
}

// La familia agrega un momento (foto + descripción) a su perrito adoptado.
// POST /animals/:id/moments { photoBase64, caption }. Registra un case_action y
// suma la foto al álbum, para que crezca la historia post-adopción.
export async function addAdoptedMoment(
  animalId: string,
  photoBase64: string,
  caption: string,
): Promise<void> {
  await authedRaw(`/animals/${animalId}/moments`, {
    method: 'POST',
    body: JSON.stringify({ photoBase64, caption: caption.trim() || undefined }),
  });
}

// Animales que atiende el propio aliado. Backend: /me/organization/animals
// (spec en pendientes-isabel.md, 11.5). El cambio de estatus va a
// PATCH /me/organization/animals/:id { status } con el enum del backend.
export async function getMyOrgAnimals(orgId?: string): Promise<Animal[]> {
  const data = await authedRaw<RawAnimal[]>(`/me/organization/animals${orgScope(orgId)}`);
  return (data ?? []).map(mapAnimal);
}

export async function updateMyOrgAnimalStatus(
  id: string,
  status: string,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/me/organization/animals/${id}${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// El aliado edita el nombre provisional y los padecimientos/diagnóstico del
// animalito. Mismo PATCH /me/organization/animals/:id (acepta campos parciales).
// Nombre provisional y diagnóstico del expediente. Ruta del backend:
// PATCH /portal/animals/:animalId (guia_api_frontend_miguel.md, 3A). El backend
// valida que el usuario sea vet/admin de la org dueña del animal (el admin global
// puede cualquiera). Mantenemos orgScope por si el admin necesita acotar.
export async function updateMyOrgAnimalDetails(
  id: string,
  // totalCostNeeded: costo estimado de recuperacion (META de la barra). story:
  // descripcion PUBLICA. gender: sexo (male/female). El PATCH /portal/animals/:id
  // acepta y persiste estos campos junto con name/diagnosis.
  details: {
    name?: string;
    diagnosis?: string;
    totalCostNeeded?: number;
    story?: string;
    gender?: 'male' | 'female';
  },
  orgId?: string,
): Promise<void> {
  await authedRaw(`/portal/animals/${id}${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify(details),
  });
}

// El aliado sube una foto de progreso del animalito (se suma a la galería del
// caso). Ruta del backend: POST /portal/animals/:animalId/photos con
// { photosBase64: [ ... ] } (guia_api_frontend_miguel.md, 3B); el backend las
// sube a Cloudinary. Best-effort: la UI ya muestra la foto localmente.
export async function addMyOrgAnimalPhoto(
  animalId: string,
  photoBase64: string,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/portal/animals/${animalId}/photos${orgScope(orgId)}`, {
    method: 'POST',
    body: JSON.stringify({ photosBase64: [photoBase64] }),
  });
}

// Alta directa de un animal para adopción, SIN pasar por un rescate (un refugio
// que ya tiene perritos propios). Backend: POST /portal/animals/direct-intake,
// que crea un "reporte fantasma" (status closed) para respetar la FK reportId;
// nosotros solo mandamos los datos del animal (guia_api_frontend_miguel2.md, 3).
// Usamos las MISMAS convenciones que el reporte (dog/cat, small/medium/large,
// photosBase64). OJO: Isabel dio la ruta pero no el detalle exacto del body
// ("nombre, especie, etc."); si algún campo no cuadra, se ajusta el nombre aquí.
export type DirectIntakeInput = {
  name: string;
  species: 'dog' | 'cat';
  size: 'small' | 'medium' | 'large';
  color: string;
  // Sexo (opcional). male/female como en el enum del backend.
  gender?: 'male' | 'female';
  // Descripción PÚBLICA del animalito (lo que ve la gente en su ficha). Se manda
  // como `story` porque ese es el campo que el perfil público muestra.
  description?: string;
  photosBase64: string[];
};

export async function createDirectIntakeAnimal(
  input: DirectIntakeInput,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/portal/animals/direct-intake${orgScope(orgId)}`, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      species: input.species,
      size: input.size,
      // El backend guarda el color en la columna `color` (no `primaryColor`).
      color: input.color,
      gender: input.gender,
      // La descripción pública va a `story` (el campo que muestra la ficha pública).
      story: input.description?.trim() || undefined,
      photosBase64: input.photosBase64,
    }),
  });
}

// Cartilla médica del animal (esterilización + registros clínicos). El aliado la
// edita desde su portal. Backend: /me/organization/animals/:id/medical (spec en
// pendientes-isabel.md, cartilla médica). Se usa best-effort; si el endpoint aún
// no existe, la UI trabaja en local y no se bloquea.
export type MedicalEntryInput = {
  type: MedicalEntryType;
  title: string;
  date?: string;
  notes?: string;
};

export async function setMyOrgAnimalSterilized(
  id: string,
  sterilized: boolean,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/me/organization/animals/${id}${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sterilized }),
  });
}

export async function addMyOrgMedicalEntry(
  animalId: string,
  input: MedicalEntryInput,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/me/organization/animals/${animalId}/medical${orgScope(orgId)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function removeMyOrgMedicalEntry(
  animalId: string,
  entryId: string,
  orgId?: string,
): Promise<void> {
  await authedRaw(`/me/organization/animals/${animalId}/medical/${entryId}${orgScope(orgId)}`, {
    method: 'DELETE',
  });
}

// Donaciones/transferencias hacia los animales del aliado. El donante sube su
// comprobante y el aliado confirma que llegó. Backend: /me/organization/donations
// (spec en pendientes-isabel.md, 11.6). Lectura tolerante a la forma.
export type Donation = {
  id: string;
  donorName: string;
  // Teléfono del donante, para que el aliado lo contacte (Isabel lo incluye en
  // `user`). null si es anónimo o no lo dio.
  donorPhone: string | null;
  amount: number;
  // Descripción de lo donado cuando es en especie (croquetas, transporte…).
  itemsDescription: string | null;
  animalName: string;
  proofUrl: string | null;
  status: 'pending' | 'approved';
  createdAgo: string;
};

function mapDonation(raw: Record<string, unknown>): Donation {
  // El donante viene en `user` (Isabel) o `donor` (nombre viejo).
  const donor =
    (raw.user && typeof raw.user === 'object' ? (raw.user as Record<string, unknown>) : null) ??
    (raw.donor && typeof raw.donor === 'object' ? (raw.donor as Record<string, unknown>) : null);
  const animal =
    raw.animal && typeof raw.animal === 'object' ? (raw.animal as Record<string, unknown>) : null;
  const statusStr = String(raw.status ?? '');
  const approved =
    raw.received === true || raw.isApproved === true || statusStr === 'approved' || statusStr === 'received';
  // El comprobante viene en `donationProof` (objeto {url} o string) o en los
  // nombres viejos. Antes salía "Comprobante adjunto" no visible por no leerlo.
  const proofRaw = raw.donationProof ?? raw.proofUrl ?? raw.proof_url ?? raw.receiptUrl ?? raw.receipt_url;
  let proof = '';
  if (typeof proofRaw === 'string') {
    proof = proofRaw;
  } else if (proofRaw && typeof proofRaw === 'object') {
    const obj = proofRaw as Record<string, unknown>;
    const val = obj.proofUrl ?? obj.url ?? obj.imageUrl;
    if (typeof val === 'string') proof = val;
  }
  const items = String(raw.itemsDescription ?? raw.items_description ?? raw.description ?? '').trim();
  const phone = donor ? String(donor.phone ?? donor.whatsapp ?? '').trim() : '';
  return {
    id: String(raw.id ?? ''),
    donorName: String(donor?.name ?? raw.donorName ?? 'Anónimo') || 'Anónimo',
    donorPhone: phone || null,
    amount: Number(raw.amount ?? 0),
    itemsDescription: items || null,
    animalName: String(animal?.name ?? raw.animalName ?? ''),
    proofUrl: proof || null,
    status: approved ? 'approved' : 'pending',
    createdAgo: timeAgo(String(raw.createdAt ?? raw.created_at ?? '')),
  };
}

export async function getMyOrgDonations(orgId?: string): Promise<Donation[]> {
  const data = await authedRaw<Record<string, unknown>[]>(
    `/me/organization/donations${orgScope(orgId)}`,
  );
  return (data ?? []).map(mapDonation);
}

export async function approveMyOrgDonation(id: string, orgId?: string): Promise<void> {
  await authedRaw(`/me/organization/donations/${id}${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ received: true }),
  });
}

// Donación de un ciudadano a un animal. Dasha NO procesa pagos: el donante
// transfiere por fuera y sube su comprobante; la donación queda pendiente hasta
// que el aliado la confirme. Backend: POST /animals/:id/donations
// (spec en pendientes-isabel.md, 11.6).
export type CreateDonationInput = {
  type: 'money' | 'items';
  amount?: number;
  itemsDescription?: string;
  proofBase64?: string;
};

export async function createDonation(
  animalId: string,
  input: CreateDonationInput,
): Promise<void> {
  await authedRaw(`/animals/${animalId}/donations`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Solicitud de adopción de un animal "Buscando hogar". El interesado llena una
// ficha y el aliado la revisa/contacta. El proceso final (requisitos, cuota de
// recuperación, entrega) lo define cada refugio, no Dasha. Backend:
// POST /animals/:id/adoption-requests (spec en pendientes-isabel.md, sección de
// adopción). El aliado las verá en su portal (getMyOrgAdoptionRequests).
export type HousingType = 'casa_patio' | 'casa_sin_patio' | 'departamento';

export const housingOptions: { value: HousingType; label: string }[] = [
  { value: 'casa_patio', label: 'Casa con patio' },
  { value: 'casa_sin_patio', label: 'Casa sin patio' },
  { value: 'departamento', label: 'Departamento' },
];

export type AdoptionRequestInput = {
  applicantName: string;
  whatsapp: string;
  housingType: HousingType;
  hasHadPets: boolean;
  otherPets: string;
  reason: string;
};

export async function createAdoptionRequest(
  animalId: string,
  input: AdoptionRequestInput,
): Promise<void> {
  await authedRaw(`/animals/${animalId}/adopt`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Solicitudes de adopción que le llegan al aliado (las de sus animales). Las
// revisa y contacta al interesado; puede marcarlas aceptada/rechazada. Backend:
// /me/organization/adoption-requests (spec en pendientes-isabel.md, adopción).
const housingLabels: Record<string, string> = {
  casa_patio: 'Casa con patio',
  casa_sin_patio: 'Casa sin patio',
  departamento: 'Departamento',
};

export type AdoptionStatus = 'pending' | 'accepted' | 'rejected';

export type AdoptionRequest = {
  id: string;
  applicantName: string;
  whatsapp: string;
  animalName: string;
  housingLabel: string;
  hasHadPets: boolean;
  otherPets: string;
  reason: string;
  status: AdoptionStatus;
  createdAgo: string;
};

function mapAdoptionRequest(raw: Record<string, unknown>): AdoptionRequest {
  const applicant =
    raw.applicant && typeof raw.applicant === 'object'
      ? (raw.applicant as Record<string, unknown>)
      : null;
  const animal =
    raw.animal && typeof raw.animal === 'object' ? (raw.animal as Record<string, unknown>) : null;
  const statusStr = String(raw.status ?? 'pending');
  const status: AdoptionStatus =
    statusStr === 'accepted' || statusStr === 'approved'
      ? 'accepted'
      : statusStr === 'rejected'
        ? 'rejected'
        : 'pending';
  const housingRaw = String(raw.housingType ?? raw.housing_type ?? '');
  return {
    id: String(raw.id ?? raw._id ?? ''),
    applicantName: String(applicant?.name ?? raw.applicantName ?? raw.name ?? 'Interesado'),
    whatsapp: String(raw.whatsapp ?? raw.phone ?? applicant?.phone ?? ''),
    animalName: String(animal?.name ?? raw.animalName ?? ''),
    housingLabel: housingLabels[housingRaw] ?? housingRaw,
    hasHadPets: Boolean(raw.hasHadPets ?? raw.has_had_pets),
    otherPets: String(raw.otherPets ?? raw.other_pets ?? ''),
    reason: String(raw.reason ?? raw.motivation ?? ''),
    status,
    createdAgo: timeAgo(String(raw.createdAt ?? raw.created_at ?? '')),
  };
}

export async function getMyOrgAdoptionRequests(orgId?: string): Promise<AdoptionRequest[]> {
  const data = await authedRaw<Record<string, unknown>[]>(
    `/me/organization/adoption-requests${orgScope(orgId)}`,
  );
  return (data ?? []).map(mapAdoptionRequest);
}

export async function updateMyOrgAdoptionRequest(
  id: string,
  status: 'accepted' | 'rejected',
  orgId?: string,
): Promise<void> {
  // El backend espera 'approved'/'rejected'. Internamente la UI usa 'accepted'
  // para la etiqueta "Aceptada", así que traducimos solo al momento de enviar.
  const backendStatus = status === 'accepted' ? 'approved' : 'rejected';
  await authedRaw(`/me/organization/adoption-requests/${id}${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: backendStatus }),
  });
}

// Seguir / dejar de seguir un animal para recibir avisos de su avance. Backend:
// POST/DELETE /animals/:id/follow (spec en pendientes-isabel.md, sección 13).
export async function followAnimal(animalId: string): Promise<void> {
  await authedRaw(`/animals/${animalId}/follow`, { method: 'POST' });
}

export async function unfollowAnimal(animalId: string): Promise<void> {
  await authedRaw(`/animals/${animalId}/follow`, { method: 'DELETE' });
}

// Seguir / dejar de seguir un REPORTE de calle para recibir push cuando cambie
// de estado (voluntario en camino / rescatado). Backend: POST/DELETE
// /reports/:id/follow (guia_api_frontend_miguel2.md, 6).
export async function followReport(reportId: string): Promise<void> {
  await authedRaw(`/reports/${reportId}/follow`, { method: 'POST' });
}

export async function unfollowReport(reportId: string): Promise<void> {
  await authedRaw(`/reports/${reportId}/follow`, { method: 'DELETE' });
}

// Tipo de recurso que ofrece un aliado en un reporte (contrato de Isabel).
export type OfferResourceType =
  | 'money'
  | 'food'
  | 'transport'
  | 'foster'
  | 'medical_service'
  | 'supplies'
  | 'other';

export type ReportOfferInput = {
  title: string;
  description: string;
  resourceType: OfferResourceType;
};

// Un aliado ofrece ayuda en un reporte del mapa ("si lo traen, cubrimos la
// consulta"). El backend detecta solo la organización del usuario en sesión y
// enlaza la oferta al reporte y a la clínica. POST /reports/:id/offer
// (guia_api_frontend_miguel2.md respuestas, 3).
export async function postReportOffer(
  reportId: string,
  input: ReportOfferInput,
): Promise<void> {
  await authedRaw(`/reports/${reportId}/offer`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title.trim(),
      description: input.description.trim(),
      resourceType: input.resourceType,
    }),
  });
}

// Comunidad: eventos públicos y foro. Lectura tolerante a los nombres de campo.
// Sin datos de ejemplo: si el endpoint no existe o falla, la pantalla muestra su
// estado vacío (no inventa eventos ni publicaciones). Enciende cuando Isabel los
// exponga (spec en pendientes-isabel.md, sección de Comunidad).
function nestedCount(raw: Record<string, unknown>, key: string): number | undefined {
  const count = raw._count;
  if (count && typeof count === 'object') {
    const value = (count as Record<string, unknown>)[key];
    if (value !== undefined && value !== null) return Number(value);
  }
  return undefined;
}

function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} d`;
}

// Valores = enums oficiales del backend en inglés; etiqueta que se muestra en la
// tarjeta del evento en español. Debe coincidir con adminApi.eventCategoryLabels.
const eventCategoryPublicLabels: Record<string, string> = {
  sterilization: 'Esterilización',
  vaccination: 'Vacunación',
  grooming: 'Estética',
  donation: 'Colecta',
  adoption: 'Adopción',
  talk: 'Charla',
  other: 'Evento',
};

function formatEventWhen(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function mapEvent(raw: Record<string, unknown>): CommunityEvent {
  const category = String(raw.category ?? '');
  const org =
    raw.organization && typeof raw.organization === 'object'
      ? (raw.organization as Record<string, unknown>)
      : null;
  const image = String(raw.imageUrl ?? raw.image_url ?? raw.image ?? '');
  // La dirección (string) es lo que se muestra; `location` en BD es un punto
  // geográfico (objeto), así que va después para no imprimir "[object Object]".
  const place =
    String(raw.address ?? '') ||
    (typeof raw.location === 'string' ? raw.location : '') ||
    String(raw.place ?? org?.name ?? '');
  return {
    id: String(raw.id ?? raw._id ?? ''),
    title: String(raw.title ?? raw.name ?? 'Evento'),
    type: eventCategoryPublicLabels[category] ?? (category || 'Evento'),
    date: formatEventWhen(String(raw.eventDate ?? raw.event_date ?? raw.date ?? '')),
    place,
    image: image || '/placeholder-animal.svg',
    description: String(raw.description ?? ''),
    interested: Number(raw.interestedCount ?? raw.interested ?? nestedCount(raw, 'interested') ?? 0),
    isInterested: Boolean(raw.isInterested ?? raw.is_interested ?? false),
    organizationId: String(
      raw.organizationId ?? raw.organization_id ?? org?.id ?? org?._id ?? '',
    ) || undefined,
    // Crudos para editar desde el portal (el backend los regresa en /events).
    categorySlug: category || undefined,
    eventDateIso: String(raw.eventDate ?? raw.event_date ?? '') || undefined,
    endDateIso: String(raw.endDate ?? raw.end_date ?? '') || undefined,
    addressRaw: String(raw.address ?? '') || undefined,
  };
}

export async function getEvents(): Promise<CommunityEvent[]> {
  const data = await requestRaw<Record<string, unknown>[]>('/events');
  return Array.isArray(data) ? data.map(mapEvent) : [];
}

export async function rsvpEvent(id: string): Promise<void> {
  await authedRaw(`/events/${id}/interested`, { method: 'POST' });
}

// Publicación de un evento por parte de un ALIADO (desde su portal). Backend:
// POST /organizations/:id/events; el usuario debe ser admin de esa organización.
// El evento queda activo de inmediato (sin aprobación global). `GET /events` ya
// lo filtra por fecha de fin y lo devuelve ordenado por el más próximo.
export type OrgEventInput = {
  title: string;
  description: string;
  category: string;
  eventDate: string; // ISO
  endDate?: string; // ISO opcional (evento de varios días / con hora de fin)
  address: string;
  lat?: number;
  lng?: number;
  imageBase64?: string;
};

export async function createOrgEvent(orgId: string, input: OrgEventInput): Promise<void> {
  await authedRaw(`/organizations/${orgId}/events`, {
    method: 'POST',
    body: JSON.stringify({
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      eventDate: input.eventDate,
      endDate: input.endDate || undefined,
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      imageBase64: input.imageBase64 || undefined,
    }),
  });
}

// Editar un evento ya publicado (Backend: PATCH /organizations/:id/events/:eventId).
// Manda todos los campos del formulario; el backend solo cambia la ubicacion si van
// lat/lng. Solo el admin de la org puede editar.
export async function updateOrgEvent(
  orgId: string,
  eventId: string,
  input: OrgEventInput,
): Promise<void> {
  await authedRaw(`/organizations/${orgId}/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      eventDate: input.eventDate,
      endDate: input.endDate || undefined,
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      imageBase64: input.imageBase64 || undefined,
    }),
  });
}

// Cancelar/quitar un evento (Backend: DELETE /organizations/:id/events/:eventId,
// borrado suave isActive=false). Solo el admin de la org.
export async function deleteOrgEvent(orgId: string, eventId: string): Promise<void> {
  await authedRaw(`/organizations/${orgId}/events/${eventId}`, { method: 'DELETE' });
}

const forumRoleLabels: Record<string, string> = {
  citizen: 'Vecino',
  volunteer: 'Voluntario',
  admin: 'Administrador',
  owner: 'Aliado',
  vet: 'Veterinario',
};

// Primera imagen de una publicación. Toleramos varios nombres de campo y el
// arreglo `images` (contrato nuevo del backend, que guarda String[]).
function firstForumImage(raw: Record<string, unknown>): string | undefined {
  const single = raw.imageUrl ?? raw.image_url ?? raw.image;
  if (typeof single === 'string' && single) return single;
  const list = raw.images;
  if (Array.isArray(list)) {
    const found = list.find((item) => typeof item === 'string' && item);
    if (typeof found === 'string') return found;
  }
  return undefined;
}

function mapForumReply(raw: Record<string, unknown>): ForumReply {
  const user =
    raw.author && typeof raw.author === 'object'
      ? (raw.author as Record<string, unknown>)
      : raw.user && typeof raw.user === 'object'
        ? (raw.user as Record<string, unknown>)
        : null;
  const roleRaw = String(user?.role ?? raw.role ?? '');
  return {
    id: String(raw.id ?? raw._id ?? ''),
    author: String(user?.name ?? raw.authorName ?? 'Anónimo') || 'Anónimo',
    role: forumRoleLabels[roleRaw] ?? (roleRaw || 'Vecino'),
    timeAgo: relativeTime(String(raw.createdAt ?? raw.created_at ?? '')),
    text: String(raw.content ?? raw.text ?? raw.body ?? ''),
  };
}

// Extrae las respuestas embebidas en una publicación, si el backend las incluye.
function embeddedReplies(raw: Record<string, unknown>): ForumReply[] | undefined {
  const list = raw.replies ?? raw.comments;
  if (!Array.isArray(list)) return undefined;
  return list
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(mapForumReply);
}

function mapForumPost(raw: Record<string, unknown>): ForumPost {
  const user =
    raw.author && typeof raw.author === 'object'
      ? (raw.author as Record<string, unknown>)
      : raw.user && typeof raw.user === 'object'
        ? (raw.user as Record<string, unknown>)
        : null;
  const roleRaw = String(user?.role ?? raw.role ?? '');
  const replies = embeddedReplies(raw);
  return {
    id: String(raw.id ?? raw._id ?? ''),
    author: String(user?.name ?? raw.authorName ?? 'Anónimo') || 'Anónimo',
    role: forumRoleLabels[roleRaw] ?? (roleRaw || 'Vecino'),
    timeAgo: relativeTime(String(raw.createdAt ?? raw.created_at ?? '')),
    text: String(raw.content ?? raw.text ?? raw.body ?? ''),
    image: firstForumImage(raw),
    likes: Number(raw.likes ?? raw.likesCount ?? nestedCount(raw, 'likes') ?? 0),
    comments: Number(
      raw.comments ?? raw.commentsCount ?? replies?.length ?? nestedCount(raw, 'replies') ?? 0,
    ),
    replies,
    hasReported: Boolean(raw.hasReported ?? raw.has_reported ?? false),
    likedByMe: Boolean(
      raw.likedByMe ?? raw.liked_by_me ?? raw.hasLiked ?? raw.has_liked ?? raw.isLiked ?? raw.liked,
    ),
  };
}

export async function getForumPosts(): Promise<ForumPost[]> {
  const data = await requestRaw<Record<string, unknown>[]>('/forum/posts');
  return Array.isArray(data) ? data.map(mapForumPost) : [];
}

// Lista las respuestas de una publicación. Tolerante: si el backend aún no expone
// el GET, devuelve [] para no romper la UI (las respuestas embebidas en el post
// siguen mostrándose). GET /forum/posts/:id/replies.
export async function getForumReplies(postId: string): Promise<ForumReply[]> {
  try {
    const data = await requestRaw<Record<string, unknown>[]>(`/forum/posts/${postId}/replies`);
    return Array.isArray(data) ? data.map(mapForumReply) : [];
  } catch {
    return [];
  }
}

// Publica una respuesta a una publicación. POST /forum/posts/:id/replies.
// Enviamos content (campo principal del backend) y text de espejo.
export async function createForumReply(postId: string, text: string): Promise<ForumReply | null> {
  const raw = await authedRaw<Record<string, unknown> | null>(`/forum/posts/${postId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content: text, text }),
  });
  return raw && typeof raw === 'object' ? mapForumReply(raw as Record<string, unknown>) : null;
}

// Crear publicación. El backend espera `content` + `category` y sube la imagen a
// Cloudinary desde `imageBase64` (guia_api_frontend_miguel.md, 1A). Recibimos el
// texto como `text` desde la UI y lo mandamos como `content`.
export async function createForumPost(input: {
  text: string;
  imageBase64?: string;
  category?: string;
}): Promise<void> {
  const body: Record<string, unknown> = {
    content: input.text,
    category: input.category ?? 'general',
  };
  if (input.imageBase64) body.imageBase64 = input.imageBase64;
  await authedRaw('/forum/posts', { method: 'POST', body: JSON.stringify(body) });
}

export async function likeForumPost(id: string): Promise<void> {
  await authedRaw(`/forum/posts/${id}/like`, { method: 'POST' });
}

// Reporta una publicación. reason = categoría; details = texto libre (obligatorio
// cuando la categoría es "Otro"). POST /forum/posts/:id/report.
export async function reportForumPost(
  id: string,
  reason: string,
  details?: string,
): Promise<void> {
  const clean = details?.trim();
  await authedRaw(`/forum/posts/${id}/report`, {
    method: 'POST',
    body: JSON.stringify(clean ? { reason, details: clean } : { reason }),
  });
}

// Reporta un COMENTARIO del foro. Mismo contrato que el de publicación.
// POST /forum/replies/:id/report (mensaje_final_miguel.md, 14).
export async function reportForumReply(
  id: string,
  reason: string,
  details?: string,
): Promise<void> {
  const clean = details?.trim();
  await authedRaw(`/forum/replies/${id}/report`, {
    method: 'POST',
    body: JSON.stringify(clean ? { reason, details: clean } : { reason }),
  });
}

// Reporta un REPORTE de calle falso o inapropiado (foto de internet, broma).
// POST /reports/:id/report (mensaje_final_miguel.md, 19).
export async function reportStreetReport(
  id: string,
  reason: string,
  details?: string,
): Promise<void> {
  const clean = details?.trim();
  await authedRaw(`/reports/${id}/report`, {
    method: 'POST',
    body: JSON.stringify(clean ? { reason, details: clean } : { reason }),
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
  promo?: string | null;
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
    promo: raw.promo ?? null,
  }));
}

// Detalle público de un aliado. Backend: GET /allies/:id, que además de los
// campos base trae los anidados slogan, coverUrl, team (con bio), animals y
// paymentInfo. Mapeo tolerante a la forma (camelCase o snake_case).
function allyStr(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function mapAllyMember(raw: Record<string, unknown>): AllyMember {
  const userVal = raw.user;
  const user = userVal && typeof userVal === 'object' ? (userVal as Record<string, unknown>) : raw;
  const photo = raw.photoUrl ?? raw.photo_url ?? user.photoUrl ?? user.photo_url ?? user.avatarUrl;
  const bio = allyStr(raw.bio ?? user.bio);
  // Título a mostrar: el puesto personalizado si lo hay; si no, la etiqueta del
  // rol (Responsable/Veterinario/Asistente); y por compatibilidad, un `title` viejo.
  const position = allyStr(raw.positionTitle ?? raw.position_title);
  const roleLabel = teamRoleLabels[normalizeTeamRole(raw.roleInOrg ?? raw.role_in_org ?? raw.role)];
  return {
    name: allyStr(user.name ?? raw.name) || 'Sin nombre',
    title: position || allyStr(raw.title ?? user.title) || roleLabel,
    photoUrl: typeof photo === 'string' && photo ? photo : null,
    bio: bio || undefined,
  };
}

function mapAllyAnimalLite(raw: Record<string, unknown>): AllyAnimal {
  const photos = raw.photos;
  let photo = allyStr(raw.photo);
  if (!photo && Array.isArray(photos) && photos.length > 0) {
    const first = photos[0];
    photo = typeof first === 'string' ? first : allyStr((first as Record<string, unknown>)?.url);
  }
  return {
    id: allyStr(raw.id ?? raw._id),
    name: allyStr(raw.name) || 'Sin nombre',
    photo: photo || '/placeholder-animal.svg',
    // Traducimos el slug del backend (in_treatment, looking_for_adoption…) a
    // español; antes salía el estado en inglés en el perfil público del aliado.
    status:
      animalStatusLabels[String(raw.status ?? '')] ??
      (allyStr(raw.statusLabel ?? raw.status) || 'En tratamiento'),
  };
}

function mapAllyPaymentInfo(raw: unknown): AllyPaymentInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const bank = allyStr(p.bank ?? p.bankName ?? p.bank_name);
  const accountHolder = allyStr(p.accountHolder ?? p.account_holder ?? p.holder ?? p.titular);
  const clabe = allyStr(p.clabe ?? p.CLABE ?? p.accountNumber ?? p.account_number ?? p.account);
  if (!bank && !accountHolder && !clabe) return null;
  return {
    bank: bank || undefined,
    accountHolder: accountHolder || undefined,
    clabe: clabe || undefined,
  };
}

export async function getAlly(id: string): Promise<Ally | null> {
  const body = await requestRaw<Record<string, unknown> | null>(`/allies/${id}`);
  if (!body || typeof body !== 'object') return null;
  // Tolerante a que venga directo o dentro de { data }.
  const raw =
    'data' in body && body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body;
  const orgTypeRaw = allyStr(raw.orgType ?? raw.type);
  const teamRaw = Array.isArray(raw.team) ? raw.team : [];
  const animalsRaw = Array.isArray(raw.animals) ? raw.animals : [];
  return {
    id: allyStr(raw.id ?? raw._id),
    name: allyStr(raw.name),
    acronym: allyStr(raw.acronym) || undefined,
    description: allyStr(raw.description),
    logoUrl: allyStr(raw.logoUrl ?? raw.logo_url) || null,
    address: allyStr(raw.address),
    phone: allyStr(raw.phone) || null,
    whatsapp: allyStr(raw.whatsapp) || null,
    website: allyStr(raw.website) || null,
    facebookUrl: allyStr(raw.facebookUrl ?? raw.facebook_url) || null,
    instagramUrl: allyStr(raw.instagramUrl ?? raw.instagram_url) || null,
    orgType: allyTypes.includes(orgTypeRaw as AllyType) ? (orgTypeRaw as AllyType) : 'ngo',
    isVerified: Boolean(raw.isVerified ?? raw.is_verified),
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? 0),
    schedule: allyStr(raw.schedule) || undefined,
    slogan: allyStr(raw.slogan) || undefined,
    promo: allyStr(raw.promo) || null,
    coverUrl: allyStr(raw.coverUrl ?? raw.cover_url) || null,
    team: teamRaw.map((member) => mapAllyMember(member as Record<string, unknown>)),
    animals: animalsRaw.map((animal) => mapAllyAnimalLite(animal as Record<string, unknown>)),
    paymentInfo: mapAllyPaymentInfo(raw.paymentInfo ?? raw.payment_info),
  };
}

// Perfil del portal con estadísticas del dashboard. Isabel: GET
// /organizations/portal/profile — en la raíz trae `stats` con los contadores.
// Soporta ?organizationId= para que un admin vea el portal de un aliado.
export type PortalStats = {
  teamMembers: number;
  rescuedAnimals: number;
  totalDonations: number;
};

export async function getPortalStats(orgId?: string): Promise<PortalStats | null> {
  try {
    const raw = await authedRaw<Record<string, unknown>>(
      `/organizations/portal/profile${orgScope(orgId)}`,
    );
    const s =
      raw && typeof raw.stats === 'object' ? (raw.stats as Record<string, unknown>) : null;
    if (!s) return null;
    return {
      teamMembers: Number(s.teamMembers ?? 0) || 0,
      rescuedAnimals: Number(s.rescuedAnimals ?? 0) || 0,
      totalDonations: Number(s.totalDonations ?? 0) || 0,
    };
  } catch {
    return null;
  }
}

// --- Traslado en vivo tipo Uber (rescue_assignments) ---
// Un voluntario traslada al animal hacia el aliado; el ciudadano que reportó, el
// aliado destino y el admin ven su posición en vivo. Spec de Isabel (sockets).
export type RescueStatus = 'accepted' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';

export const rescueStatusLabels: Record<RescueStatus, string> = {
  accepted: 'Caso aceptado',
  on_the_way: 'En camino',
  arrived: 'Llegó al destino',
  completed: 'Traslado completado',
  cancelled: 'Cancelado',
};

export type LatLng = { lat: number; lng: number };

export type RescueAssignment = {
  id: string;
  status: RescueStatus;
  statusLabel: string;
  volunteer: { id: string; name: string; photoUrl: string | null } | null;
  reportId: string;
  animal: { id: string; name: string } | null;
  origin: LatLng | null;
  destination: { lat: number; lng: number; organizationName: string } | null;
  currentLocation: { lat: number; lng: number; updatedAt: string } | null;
};

const rescueStatuses: RescueStatus[] = [
  'accepted',
  'on_the_way',
  'arrived',
  'completed',
  'cancelled',
];

function mapLatLng(value: unknown): LatLng | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  const lat = Number(p.lat ?? p.latitude);
  const lng = Number(p.lng ?? p.lon ?? p.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function mapRescueAssignment(raw: Record<string, unknown>): RescueAssignment {
  const statusRaw = allyStr(raw.status);
  const status = (rescueStatuses.includes(statusRaw as RescueStatus)
    ? statusRaw
    : 'accepted') as RescueStatus;
  const vol =
    raw.volunteer && typeof raw.volunteer === 'object'
      ? (raw.volunteer as Record<string, unknown>)
      : null;
  const report =
    raw.report && typeof raw.report === 'object'
      ? (raw.report as Record<string, unknown>)
      : null;
  const animal =
    raw.animal && typeof raw.animal === 'object' ? (raw.animal as Record<string, unknown>) : null;
  const dest =
    raw.destination && typeof raw.destination === 'object'
      ? (raw.destination as Record<string, unknown>)
      : null;
  const destLL = mapLatLng(dest);
  const destOrg =
    dest && dest.organization && typeof dest.organization === 'object'
      ? (dest.organization as Record<string, unknown>)
      : null;
  const cur =
    raw.currentLocation && typeof raw.currentLocation === 'object'
      ? (raw.currentLocation as Record<string, unknown>)
      : null;
  const curLL = mapLatLng(cur);

  return {
    id: allyStr(raw.id ?? raw._id),
    status,
    statusLabel: rescueStatusLabels[status] ?? status,
    volunteer: vol
      ? {
          id: allyStr(vol.id),
          name: allyStr(vol.name) || 'Voluntario',
          photoUrl: typeof vol.photoUrl === 'string' && vol.photoUrl ? vol.photoUrl : null,
        }
      : null,
    reportId: report ? allyStr(report.id) : allyStr(raw.reportId ?? raw.report_id),
    animal: animal ? { id: allyStr(animal.id), name: allyStr(animal.name) } : null,
    origin: mapLatLng(raw.origin),
    destination: destLL
      ? {
          lat: destLL.lat,
          lng: destLL.lng,
          organizationName: destOrg ? allyStr(destOrg.name) : '',
        }
      : null,
    currentLocation: curLL
      ? { lat: curLL.lat, lng: curLL.lng, updatedAt: allyStr(cur?.updatedAt ?? cur?.updated_at) }
      : null,
  };
}

// Estado + ubicación del traslado para pintar el mapa en vivo. GET /rescue-assignments/:id
export async function getRescueAssignment(id: string): Promise<RescueAssignment | null> {
  const body = await requestRaw<Record<string, unknown> | null>(`/rescue-assignments/${id}`);
  if (!body || typeof body !== 'object') return null;
  const raw =
    'data' in body && body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body;
  return mapRescueAssignment(raw);
}

// El voluntario avanza el estado del traslado. PATCH /rescue-assignments/:id
// { status, destinationOrgId? }. Isabel (30 jul) confirmó que el aliado destino
// se inyecta EN ESTE PATCH junto con el cambio de estatus (al marcar "voy en
// camino"): así el reporte aparece en "rescates entrantes" de esa clínica y el
// GET del assignment devuelve `destination` para el mapa en vivo.
export async function updateRescueAssignmentStatus(
  id: string,
  status: RescueStatus,
  destinationOrgId?: string,
): Promise<void> {
  await authedRaw(`/rescue-assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(destinationOrgId ? { status, destinationOrgId } : { status }),
  });
}

// Motivos estructurados de cancelación (contrato de Isabel, mensaje_final 17):
// PATCH /rescue-assignments/:id { status:'cancelled', cancelledReason }. Con
// 'not_found' el backend CIERRA el reporte en cascada; 'duplicate' lo marca
// duplicado. Sin motivo (el voluntario ya no puede ir) el reporte se LIBERA a
// `active` para que otro lo tome.
export type CancelReason = 'not_found' | 'duplicate';

export async function cancelRescueAssignment(
  id: string,
  reason?: CancelReason,
): Promise<void> {
  await authedRaw(`/rescue-assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(
      reason ? { status: 'cancelled', cancelledReason: reason } : { status: 'cancelled' },
    ),
  });
}

// El voluntario comparte su GPS cada pocos segundos. POST /rescue-assignments/:id/location
export async function postRescueLocation(id: string, location: LatLng): Promise<void> {
  await authedRaw(`/rescue-assignments/${id}/location`, {
    method: 'POST',
    body: JSON.stringify(location),
  });
}

// Foto que el voluntario toma como evidencia del traslado: al recoger al
// animalito ('pickup') y al entregarlo con el aliado ('delivery'). Alimenta la
// línea de tiempo del caso. POST /rescue-assignments/:id/photos
// Es tolerante a fallos a propósito: si la subida falla, el avance de estado no
// se bloquea (la evidencia es un extra, no un requisito para mover el rescate).
export type RescuePhotoKind = 'pickup' | 'delivery';

export async function addRescuePhoto(
  id: string,
  kind: RescuePhotoKind,
  photoBase64: string,
  note?: string,
): Promise<void> {
  await authedRaw(`/rescue-assignments/${id}/photos`, {
    method: 'POST',
    body: JSON.stringify({ kind, photoBase64, note: note?.trim() || undefined }),
  });
}

// --- Modo Activo del voluntario (disponibilidad + radio) ---
// El voluntario aprobado se pone "Disponible" con un radio (2/5/10 km) y así el
// backend le manda push de emergencias cercanas y le lista casos por atender.

export type VolunteerAvailability = { active: boolean; radiusKm: number };

// Radios permitidos (km). Un valor fuera de la lista cae al más cercano válido.
export const availabilityRadiusOptions = [2, 5, 10];

// Lee la disponibilidad actual. GET /me/availability -> { active, radiusKm }.
// Tolerante: si el backend aún no lo expone, arranca en inactivo/5 km (estado
// neutral, no datos inventados) para no romper el panel.
export async function getVolunteerAvailability(): Promise<VolunteerAvailability> {
  try {
    const raw = await authedRaw<Record<string, unknown>>('/me/availability');
    const radius = Number(
      raw?.searchRadiusKm ?? raw?.search_radius_km ?? raw?.radiusKm ?? raw?.radius_km ?? raw?.radius,
    );
    return {
      active: Boolean(raw?.isAvailable ?? raw?.active ?? raw?.isActive ?? raw?.available),
      radiusKm: availabilityRadiusOptions.includes(radius) ? radius : 5,
    };
  } catch {
    return { active: false, radiusKm: 5 };
  }
}

// Actualiza disponibilidad + radio (+ ubicación al activar, para el filtro por
// cercanía). PATCH /me/availability. NO es tolerante a propósito: si falla, el
// panel muestra el error para que se note (y para que Isabel lo detecte).
// El backend espera isAvailable + searchRadiusKm + coordenadas: PostGIS busca
// voluntarios cerca de un reporte urgente y les dispara el push, así que al
// activar las coordenadas son OBLIGATORIAS. Mandamos isAvailable como campo
// principal (active de espejo), el radio como searchRadiusKm (radiusKm de espejo)
// y las coordenadas bajo lat/lng y latitude/longitude para no depender del alias.
export async function setVolunteerAvailability(data: {
  active: boolean;
  radiusKm: number;
  lat?: number;
  lng?: number;
}): Promise<void> {
  const hasCoords = typeof data.lat === 'number' && typeof data.lng === 'number';
  // Sin coordenadas, activar devuelve 400 (el backend las exige). Cortamos aquí
  // con un mensaje claro en vez de mandar una petición que sabemos que fallará.
  if (data.active && !hasCoords) {
    throw new Error('Necesitamos tu ubicación para activar el Modo Activo.');
  }
  const body: Record<string, unknown> = {
    isAvailable: data.active,
    active: data.active,
    searchRadiusKm: data.radiusKm,
    radiusKm: data.radiusKm,
  };
  if (hasCoords) {
    body.lat = data.lat;
    body.lng = data.lng;
    body.latitude = data.lat;
    body.longitude = data.lng;
  }
  await authedRaw('/me/availability', { method: 'PATCH', body: JSON.stringify(body) });
}

// Traslados del propio voluntario (para saber cuáles seguir).
// GET /users/rescue-assignments (ojo: es /users/, no /me/).
export async function getMyRescueAssignments(status?: RescueStatus): Promise<RescueAssignment[]> {
  const query = status ? `?status=${status}` : '';
  const data = await authedRaw<Record<string, unknown>[]>(`/users/rescue-assignments${query}`);
  return (data ?? []).map(mapRescueAssignment);
}

// El voluntario acepta un reporte y se vuelve el conductor del traslado.
// POST /reports/:id/accept (sin body). Devuelve la asignación creada.
// El backend la devuelve directa ({ id, status, ... }; authedRaw ya desenvuelve
// .data). Buscamos el nodo de la asignación de forma robusta por si el contrato
// la anida (assignment / report.assignment): si el id sale vacío NO redirigimos
// al rescate en vivo, el usuario re-clica y el 2º intento da 403.
// Aceptar un reporte crea la asignación (status 'accepted'). El aliado DESTINO ya
// NO va aquí: Isabel (30 jul) confirmó que `destinationOrgId` se manda en el
// PATCH /rescue-assignments/:id al marcar "voy en camino" (ver
// updateRescueAssignmentStatus).
export async function acceptReport(reportId: string): Promise<RescueAssignment | null> {
  const raw = await authedRaw<Record<string, unknown> | null>(`/reports/${reportId}/accept`, {
    method: 'POST',
  });
  const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  const top = asRecord(raw);
  if (!top) return null;
  const nested = asRecord(top.assignment) ?? asRecord(asRecord(top.report)?.assignment);
  const node = top.id || top._id ? top : (nested ?? top);
  const assignment = mapRescueAssignment(node);
  return assignment.id ? assignment : null;
}

// Suma un avistamiento a un reporte existente en vez de crear un duplicado.
// POST /reports/:id/sighting (incrementa seen_count / last_seen_at en el backend).
// Contrato del backend (api_updates_miguel.md, 10):
// { lat, lng, description, photoBase64 }. Mandar dónde y cuándo se vio es el punto
// del avistamiento: antes iba sin datos y el reporte no se enriquecía. La foto va
// como `photoBase64` (string, singular) — el backend la sube a Cloudinary y la
// devuelve en `sightings[].photoUrl` de GET /reports/:id (contrato de Isabel,
// 30 jul); antes la mandábamos como `photosBase64: []` y por eso no se guardaba,
// dejando el carrusel de duplicados con una sola foto.
export async function addSighting(
  reportId: string,
  sighting: { lat: number; lng: number; description?: string; photoBase64?: string },
): Promise<void> {
  const body: Record<string, unknown> = {
    lat: sighting.lat,
    lng: sighting.lng,
  };
  const description = sighting.description?.trim();
  if (description) body.description = description;
  if (sighting.photoBase64) body.photoBase64 = sighting.photoBase64;
  await authedRaw(`/reports/${reportId}/sighting`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// --- Intake del aliado (cierre del flujo: reporte -> rehabilitación) ---
// El aliado destino ve los rescates que un voluntario le lleva en camino y, cuando
// llega el animalito, confirma la recepción ("Ingresar") para abrir su ficha.

export type IncomingRescue = {
  reportId: string;
  assignmentId: string | null;
  status: RescueStatus;
  statusLabel: string;
  species: 'perro' | 'gato';
  condition: string;
  description: string;
  colonia: string;
  photos: string[];
  volunteer: { name: string; photoUrl: string | null } | null;
  reportedAgo: string;
};

// Fotos tolerantes: pueden venir como ['url'], [{url}] o un solo 'photo'.
function collectPhotos(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string'
          ? item
          : item && typeof item === 'object'
            ? allyStr((item as Record<string, unknown>).url)
            : '',
      )
      .filter((url): url is string => Boolean(url));
  }
  if (typeof value === 'string' && value) return [value];
  return [];
}

function mapIncomingRescue(raw: Record<string, unknown>): IncomingRescue {
  // El backend puede anidar el reporte bajo `report` o mandarlo plano.
  const report =
    raw.report && typeof raw.report === 'object' ? (raw.report as Record<string, unknown>) : raw;

  const statusRaw = allyStr(raw.status ?? report.status);
  const status = (rescueStatuses.includes(statusRaw as RescueStatus)
    ? statusRaw
    : 'on_the_way') as RescueStatus;

  const volRaw =
    raw.volunteer && typeof raw.volunteer === 'object'
      ? (raw.volunteer as Record<string, unknown>)
      : report.volunteer && typeof report.volunteer === 'object'
        ? (report.volunteer as Record<string, unknown>)
        : null;
  const volPhoto = volRaw ? (volRaw.photoUrl ?? volRaw.photo_url ?? volRaw.avatarUrl) : null;

  const photos = collectPhotos(raw.photos ?? report.photos ?? report.photo);
  const speciesRaw = allyStr(report.species);
  const conditionRaw = allyStr(report.condition);
  const created = allyStr(
    report.created_at ?? report.createdAt ?? raw.created_at ?? raw.createdAt,
  );

  return {
    reportId: allyStr(report.id ?? raw.reportId ?? raw.report_id ?? raw.id),
    assignmentId:
      allyStr(
        raw.assignmentId ??
          raw.assignment_id ??
          report.activeAssignmentId ??
          report.active_assignment_id,
      ) || null,
    status,
    statusLabel: rescueStatusLabels[status] ?? status,
    species: speciesRaw === 'cat' ? 'gato' : 'perro',
    condition: conditionLabels[conditionRaw] ?? conditionRaw,
    description: allyStr(report.description),
    colonia: allyStr(report.colonia) || 'Sin colonia',
    photos: photos.length > 0 ? photos : ['/placeholder-animal.svg'],
    volunteer: volRaw
      ? {
          name: allyStr(volRaw.name) || 'Voluntario',
          photoUrl: typeof volPhoto === 'string' && volPhoto ? volPhoto : null,
        }
      : null,
    reportedAgo: created ? timeAgo(created) : '',
  };
}

// Rescates que un voluntario lleva EN CAMINO hacia esta organización.
// GET /organizations/portal/incoming-rescues (token del aliado).
export async function getIncomingRescues(orgId?: string): Promise<IncomingRescue[]> {
  const data = await authedRaw<Record<string, unknown>[]>(
    `/organizations/portal/incoming-rescues${orgScope(orgId)}`,
  );
  return (data ?? []).map(mapIncomingRescue);
}

// Datos que el aliado captura al recibir al animalito (formulario de recepción).
// Todos opcionales: si no se llenan, el intake funciona igual que antes.
export type ReceptionInfo = {
  // Estado al llegar, con el vocabulario de condiciones (stable | injured | critical).
  conditionOnArrival?: string;
  receivedBy?: string;
  notes?: string;
};

// El aliado confirma la recepción: el reporte pasa a rehabilitación y se abre su
// ficha. POST /me/organization/reports/:id/intake { conditionOnArrival?, receivedBy?, notes? }
export async function intakeReport(
  reportId: string,
  reception?: ReceptionInfo,
  orgId?: string,
): Promise<void> {
  const payload: Record<string, string> = {};
  if (reception?.conditionOnArrival) payload.conditionOnArrival = reception.conditionOnArrival;
  if (reception?.receivedBy?.trim()) payload.receivedBy = reception.receivedBy.trim();
  if (reception?.notes?.trim()) payload.notes = reception.notes.trim();
  await authedRaw(`/me/organization/reports/${reportId}/intake${orgScope(orgId)}`, {
    method: 'POST',
    body: Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined,
  });
}

// --- Tablero de necesidades de aliados (recursos de patrocinadores) ---
// Los aliados publican necesidades (alimento, transporte, hogar temporal, etc.) y
// cualquier usuario con sesión las cubre. Tipos alineados con `resources` de BD.txt.

const needTypeValues: NeedType[] = [
  'food',
  'transport',
  'foster',
  'medical_service',
  'supplies',
  'other',
];
const needStatusValues: NeedStatus[] = ['open', 'covered', 'delivered'];

function mapNeed(raw: Record<string, unknown>): Need {
  const org =
    raw.organization && typeof raw.organization === 'object'
      ? (raw.organization as Record<string, unknown>)
      : null;
  const animal =
    raw.animal && typeof raw.animal === 'object' ? (raw.animal as Record<string, unknown>) : null;
  // Quién se comprometió a cubrir la necesidad. Isabel devuelve la relación
  // `accepter` (+ el campo `acceptedBy`); toleramos también el nombre viejo.
  const accepter =
    (raw.accepter && typeof raw.accepter === 'object'
      ? (raw.accepter as Record<string, unknown>)
      : null) ??
    (raw.coveredBy && typeof raw.coveredBy === 'object'
      ? (raw.coveredBy as Record<string, unknown>)
      : null);
  const coveredByName = accepter ? allyStr(accepter.name) : allyStr(raw.coveredByName) || null;
  // El teléfono solo viene en las rutas del portal (Isabel: `coveredBy.phone`).
  const coveredByPhone = accepter
    ? allyStr(accepter.phone ?? accepter.telefono) || null
    : allyStr(raw.coveredByPhone) || null;
  const isAccepted = Boolean(accepter || raw.acceptedBy || raw.accepted_by || coveredByName);
  const typeRaw = allyStr(raw.type ?? raw.resourceType ?? raw.resource_type);
  let statusRaw = allyStr(raw.status);
  if (statusRaw === 'fulfilled') statusRaw = 'covered';
  // Si el backend registró que alguien la aceptó pero el status sigue en "open"
  // (o vacío), la mostramos como cubierta para que se refleje y persista.
  if (isAccepted && (statusRaw === '' || statusRaw === 'open')) statusRaw = 'covered';
  const targetNum = Number(raw.targetAmount ?? raw.target_amount ?? 0);
  const coveredNum = Number(raw.coveredAmount ?? raw.covered_amount ?? 0);
  const created = allyStr(raw.createdAt ?? raw.created_at);
  const unit = allyStr(raw.unit).trim().toLowerCase() || null;
  // Texto de cantidad: "20 kg" (targetAmount + unit) o el viejo campo quantity
  // (datos antiguos que guardaban la cantidad dentro de la descripción).
  const quantityText = targetNum > 0 && unit ? `${targetNum} ${unit}` : allyStr(raw.quantity);
  // Aporte pendiente de confirmar (Isabel: pendingOffer = { id, amount, user }).
  const pendingRaw =
    raw.pendingOffer && typeof raw.pendingOffer === 'object'
      ? (raw.pendingOffer as Record<string, unknown>)
      : null;
  const pendingUser =
    pendingRaw && pendingRaw.user && typeof pendingRaw.user === 'object'
      ? (pendingRaw.user as Record<string, unknown>)
      : null;
  const pendingOffer = pendingRaw
    ? {
        contributionId: allyStr(pendingRaw.id),
        name: pendingUser ? allyStr(pendingUser.name) : '',
        phone: (pendingUser ? allyStr(pendingUser.phone) : '') || null,
        amount: Number(pendingRaw.amount) || 0,
      }
    : null;
  return {
    id: allyStr(raw.id ?? raw._id),
    type: needTypeValues.includes(typeRaw as NeedType) ? (typeRaw as NeedType) : 'other',
    title: allyStr(raw.title),
    description: allyStr(raw.description),
    quantity: quantityText,
    unit,
    organizationName: org ? allyStr(org.name) : allyStr(raw.organizationName),
    organizationId: org ? allyStr(org.id) : allyStr(raw.organizationId ?? raw.organization_id),
    animalName: animal ? allyStr(animal.name) : allyStr(raw.animalName) || null,
    status: needStatusValues.includes(statusRaw as NeedStatus) ? (statusRaw as NeedStatus) : 'open',
    coveredByName,
    coveredByPhone,
    targetAmount: Number.isFinite(targetNum) && targetNum > 0 ? targetNum : null,
    coveredAmount: Number.isFinite(coveredNum) && coveredNum > 0 ? coveredNum : 0,
    pendingOffer,
    createdAgo: created ? timeAgo(created) : '',
  };
}

// Tablero público global de necesidades: reúne las necesidades abiertas de todos
// los aliados en un solo lugar. GET /needs (agregado). Aún no está desplegado
// (queda en el documento de Isabel); mientras tanto devuelve lista vacía para que
// la pantalla muestre su estado vacío, nunca datos inventados.
export async function getActiveNeeds(): Promise<Need[]> {
  try {
    const body = await requestRaw<unknown>('/needs');
    const list = Array.isArray(body)
      ? (body as unknown[])
      : body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).data)
        ? ((body as Record<string, unknown>).data as unknown[])
        : null;
    if (!list) return [];
    return list.map((item) => mapNeed(item as Record<string, unknown>));
  } catch {
    return [];
  }
}

// Un usuario con sesión se compromete a cubrir una necesidad. POST /needs/:id/cover.
// Isabel acepta `amount` para aportes PARCIALES (suma a coveredAmount y, si se
// alcanza targetAmount, marca la necesidad como cubierta). Sin `amount` se cubre
// completa. El backend notifica al aliado con el contacto del usuario.
export async function coverNeed(id: string, amount?: number, message?: string): Promise<void> {
  const body: Record<string, unknown> = {};
  if (typeof amount === 'number' && amount > 0) body.amount = amount;
  if (message) body.message = message;
  await authedRaw(`/needs/${id}/cover`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// El aliado confirma un aporte pendiente (recién ahí suma a lo reunido y, si llega a
// la meta, la necesidad queda cubierta). POST /needs/contributions/:id/confirm.
export async function confirmNeedContribution(contributionId: string): Promise<void> {
  await authedRaw(`/needs/contributions/${contributionId}/confirm`, { method: 'POST' });
}

// El aliado rechaza un aporte pendiente (no suma nada; la necesidad sigue abierta).
export async function rejectNeedContribution(contributionId: string): Promise<void> {
  await authedRaw(`/needs/contributions/${contributionId}/reject`, { method: 'POST' });
}

// Necesidades del portal CON el teléfono de quien se comprometió (Isabel:
// GET /organizations/portal/needs). Es para el botón de WhatsApp del aliado; el
// teléfono NO se expone en las rutas públicas. Soporta ?organizationId= (admin).
export async function getPortalNeeds(orgId?: string): Promise<Need[]> {
  const data = await authedRaw<Record<string, unknown>[]>(
    `/organizations/portal/needs${orgScope(orgId)}`,
  );
  return (data ?? []).map(mapNeed);
}

// Reabrir una necesidad que alguien reservó pero nunca cumplió: vuelve de
// 'fulfilled' a 'active'. Isabel: PATCH /organizations/portal/needs/:id/reopen (sin body).
export async function reopenNeed(needId: string, orgId?: string): Promise<void> {
  await authedRaw(`/organizations/portal/needs/${needId}/reopen${orgScope(orgId)}`, {
    method: 'PATCH',
  });
}

// Necesidades de una organización. Isabel las expone en /organizations/:id/needs
// (separadas de los recursos), tanto en el perfil público como para que el propio
// aliado las gestione desde su portal (con su organizationId).
export async function getOrganizationNeeds(orgId: string): Promise<Need[]> {
  if (!orgId) return [];
  const data = await requestRaw<Record<string, unknown>[]>(`/organizations/${orgId}/needs`);
  return (data ?? []).map(mapNeed);
}

// El backend acepta la necesidad con la llave `category` (no `type`) y NO tiene
// columna de cantidad: la cantidad se concatena al inicio de la descripción
// (ej. "10 kg - Croquetas"). El selector del formulario solo ofrece las
// categorías que el backend confirmó para necesidades (food | transport | foster).
export type NeedCategory = Extract<NeedType, 'food' | 'transport' | 'foster'>;

export type CreateNeedInput = {
  category: NeedCategory;
  title: string;
  description?: string;
  // Cantidad estructurada: número + unidad de lista cerrada (needUnitOptions). La
  // cantidad se manda al backend como targetAmount; ya no se pega en la descripción.
  quantityValue?: number;
  unit?: string;
  animalId?: string;
};

// El aliado crea una necesidad para su organización. POST /organizations/:id/needs
export async function createNeed(orgId: string, input: CreateNeedInput): Promise<void> {
  const description = input.description?.trim();
  const body: Record<string, unknown> = {
    category: input.category,
    title: input.title.trim(),
  };
  if (description) body.description = description;
  if (typeof input.quantityValue === 'number' && input.quantityValue > 0) {
    body.targetAmount = input.quantityValue;
  }
  if (input.unit) body.unit = input.unit;
  if (input.animalId) body.animalId = input.animalId;
  await authedRaw(`/organizations/${orgId}/needs`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// El aliado marca una necesidad como entregada o la cancela.
// PATCH /organizations/:id/needs/:needId { status } (queda en el documento de Isabel).
export async function updateNeedStatus(
  orgId: string,
  id: string,
  status: 'delivered' | 'cancelled',
): Promise<void> {
  await authedRaw(`/organizations/${orgId}/needs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

function mapContribution(raw: Record<string, unknown>): Contribution {
  const org =
    raw.organization && typeof raw.organization === 'object'
      ? (raw.organization as Record<string, unknown>)
      : null;
  const typeRaw = allyStr(raw.type ?? raw.resourceType ?? raw.resource_type);
  let statusRaw = allyStr(raw.status); if (statusRaw === 'fulfilled') statusRaw = 'covered';
  const created = allyStr(raw.createdAt ?? raw.created_at);
  return {
    id: allyStr(raw.id ?? raw._id),
    type: needTypeValues.includes(typeRaw as NeedType) ? (typeRaw as NeedType) : 'other',
    title: allyStr(raw.title),
    organizationName: org ? allyStr(org.name) : allyStr(raw.organizationName),
    status: statusRaw === 'delivered' ? 'delivered' : 'covered',
    createdAgo: created ? timeAgo(created) : '',
  };
}

// Aportes del usuario (necesidades que ha cubierto) para "Mis aportes" del perfil.
// GET /me/contributions (queda en el documento de Isabel). Si no está o falla,
// devuelve lista vacía y la sección se oculta, sin ejemplos inventados.
export async function getMyContributions(): Promise<Contribution[]> {
  try {
    const raw = await authedRaw<unknown>('/me/contributions');
    // El backend responde { needs, donations }. Tomamos las necesidades cubiertas,
    // que es lo que muestra "Mis aportes"; toleramos también un arreglo plano por
    // si el contrato cambia.
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).needs)
        ? ((raw as Record<string, unknown>).needs as unknown[])
        : [];
    return list.map((item) => mapContribution(item as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function deleteMyOrgAnimalPhoto(animalId: string, url: string, orgId?: string): Promise<void> {
  const queryParam = orgId ? '&' : '?';
  await authedRaw(`/portal/animals/${animalId}/photos${orgScope(orgId)}${queryParam}url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
    body: JSON.stringify({ url }),
  });
}

export async function reorderMyOrgAnimalPhotos(animalId: string, urls: string[], orgId?: string): Promise<void> {
  await authedRaw(`/portal/animals/${animalId}/photos/reorder${orgScope(orgId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ urls }),
  });
}



