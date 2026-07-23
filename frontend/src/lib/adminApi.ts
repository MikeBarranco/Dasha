import { API_URL, getStoredUser, handleUnauthorized, SESSION_EXPIRED_MESSAGE } from './api';

// Cliente para los endpoints protegidos /admin/*. Es tolerante a la forma de la
// respuesta: acepta tanto { status, data } como el dato directo, porque el
// contrato exacto de Isabel aun no esta documentado a nivel de campos.
async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!getStoredUser()) throw new Error('Inicia sesión como administrador');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | { status?: string; message?: string; error?: string; data?: unknown }
    | unknown[]
    | null;

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  if (!response.ok || (body && !Array.isArray(body) && body.status === 'error')) {
    // El backend a veces manda el detalle en `message` y otras en `error`.
    // Priorizamos ese mensaje real: así vemos la causa exacta en vez de un texto
    // genérico que la esconde. Solo si no viene mensaje usamos un respaldo.
    const message =
      body && !Array.isArray(body) ? (body.message ?? body.error) : undefined;
    if (message) throw new Error(message);
    if (response.status === 403) throw new Error('Tu cuenta no tiene permisos de administrador');
    throw new Error(`Ocurrió un error con el servidor (${response.status})`);
  }

  if (body && !Array.isArray(body) && 'data' in body) return body.data as T;
  return body as T;
}

type Raw = Record<string, unknown>;

function pick(raw: Raw, keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
}

function asString(value: unknown, fallback = ''): string {
  return value === undefined || value === null ? fallback : String(value);
}

const conditionLabels: Record<string, string> = {
  injured: 'Herido',
  malnourished: 'Desnutrido',
  sick: 'Enfermo',
  stable: 'Estable',
  lost: 'Perdido',
  aggressive: 'Agresivo',
};

const urgencyLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export const reportStatusOptions: { value: string; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'in_progress', label: 'Voluntario en camino' },
  { value: 'rescued', label: 'Rescatado' },
];

export function timeAgo(iso: string): string {
  if (!iso) return 'hace un momento';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export type AdminReport = {
  id: string;
  species: 'perro' | 'gato';
  condition: string;
  urgency: string;
  urgencyLabel: string;
  status: string;
  description: string;
  colonia: string;
  photo: string;
  createdAgo: string;
  reporter: string | null;
};

function mapAdminReport(raw: Raw): AdminReport {
  const speciesRaw = asString(pick(raw, ['species']));
  const conditionRaw = asString(pick(raw, ['condition']));
  const urgencyRaw = asString(pick(raw, ['urgency', 'severity']));
  const reporterRaw = pick(raw, ['reporterName', 'reporter', 'user']);
  const reporter =
    reporterRaw && typeof reporterRaw === 'object'
      ? asString((reporterRaw as Raw).name) || null
      : reporterRaw
        ? asString(reporterRaw)
        : null;

  const photos = mapPhotos(pick(raw, ['photos']));

  return {
    id: asString(pick(raw, ['id', '_id'])),
    species: speciesRaw === 'cat' || speciesRaw === 'gato' ? 'gato' : 'perro',
    condition: conditionLabels[conditionRaw] ?? conditionRaw ?? '',
    urgency: urgencyRaw,
    urgencyLabel: urgencyLabels[urgencyRaw] ?? urgencyRaw ?? '',
    status: asString(pick(raw, ['status']), 'active'),
    description: asString(pick(raw, ['description'])),
    colonia: asString(pick(raw, ['colonia', 'neighborhood', 'colony']), 'Sin colonia'),
    photo:
      photos[0] || asString(pick(raw, ['photo', 'photoUrl', 'photo_url'])) || '/placeholder-animal.svg',
    createdAgo: timeAgo(asString(pick(raw, ['createdAt', 'created_at']))),
    reporter,
  };
}

export async function getAdminReports(): Promise<AdminReport[]> {
  const data = await adminFetch<Raw[]>('/admin/reports');
  return (data ?? []).map(mapAdminReport);
}

export async function updateAdminReportStatus(id: string, status: string): Promise<void> {
  await adminFetch(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteAdminReport(id: string): Promise<void> {
  await adminFetch(`/admin/reports/${id}`, { method: 'DELETE' });
}

const animalStatusLabels: Record<string, string> = {
  in_treatment: 'En tratamiento',
  recovering: 'Recuperándose',
  looking_for_foster: 'Busca hogar temporal',
  looking_for_adoption: 'Busca adopción',
};

export const animalStatusOptions: { value: string; label: string }[] = [
  { value: 'in_treatment', label: 'En tratamiento' },
  { value: 'recovering', label: 'Recuperándose' },
  { value: 'looking_for_foster', label: 'Busca hogar temporal' },
  { value: 'looking_for_adoption', label: 'Busca adopción' },
];

export type AdminAnimal = {
  id: string;
  name: string;
  species: 'perro' | 'gato';
  status: string;
  statusLabel: string;
  history: string;
  diagnosis: string;
  treatment: string;
  estimatedCost: number;
  organizationId: string | null;
  organizationName: string | null;
  photos: string[];
};

function mapPhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return asString((item as Raw).url);
      return '';
    })
    .filter(Boolean);
}

function mapAdminAnimal(raw: Raw): AdminAnimal {
  const speciesRaw = asString(pick(raw, ['species']));
  const statusRaw = asString(pick(raw, ['status']), 'in_treatment');
  const org = pick(raw, ['organization']);
  const orgObj = org && typeof org === 'object' ? (org as Raw) : null;

  return {
    id: asString(pick(raw, ['id', '_id'])),
    name: asString(pick(raw, ['name'])),
    species: speciesRaw === 'cat' || speciesRaw === 'gato' ? 'gato' : 'perro',
    status: statusRaw,
    statusLabel: animalStatusLabels[statusRaw] ?? statusRaw,
    history: asString(pick(raw, ['history', 'story'])),
    diagnosis: asString(pick(raw, ['diagnosis'])),
    treatment: asString(pick(raw, ['treatment'])),
    estimatedCost: Number(pick(raw, ['estimatedCost', 'totalCostNeeded', 'total_cost_needed']) ?? 0),
    organizationId: orgObj ? asString(orgObj.id) || null : (asString(pick(raw, ['organizationId'])) || null),
    organizationName: orgObj ? asString(orgObj.name) || null : null,
    photos: mapPhotos(pick(raw, ['photos'])),
  };
}

export type AdminAnimalInput = {
  name: string;
  species: 'dog' | 'cat';
  status: string;
  history?: string;
  diagnosis?: string;
  treatment?: string;
  estimatedCost?: number;
  organizationId?: string | null;
  photosBase64?: string[];
};

export async function getAdminAnimals(): Promise<AdminAnimal[]> {
  const data = await adminFetch<Raw[]>('/admin/animals');
  return (data ?? []).map(mapAdminAnimal);
}

export async function createAdminAnimal(input: AdminAnimalInput): Promise<void> {
  await adminFetch('/admin/animals', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateAdminAnimal(id: string, input: AdminAnimalInput): Promise<void> {
  await adminFetch(`/admin/animals/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteAdminAnimal(id: string): Promise<void> {
  await adminFetch(`/admin/animals/${id}`, { method: 'DELETE' });
}

const orgTypeLabels: Record<string, string> = {
  veterinary: 'Veterinaria',
  shelter: 'Refugio',
  ngo: 'Asociación',
  educational: 'Educativo',
};

export const orgTypeOptions: { value: string; label: string }[] = [
  { value: 'veterinary', label: 'Veterinaria' },
  { value: 'shelter', label: 'Refugio' },
  { value: 'ngo', label: 'Asociación' },
  { value: 'educational', label: 'Educativo' },
];

export type AdminOrg = {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  whatsapp: string;
  website: string;
  orgType: string;
  orgTypeLabel: string;
  isVerified: boolean;
  schedule: string;
  lat: number;
  lng: number;
};

function mapAdminOrg(raw: Raw): AdminOrg {
  const typeRaw = asString(pick(raw, ['orgType', 'type']), 'ngo');
  return {
    id: asString(pick(raw, ['id', '_id'])),
    name: asString(pick(raw, ['name'])),
    description: asString(pick(raw, ['description'])),
    logoUrl: asString(pick(raw, ['logoUrl', 'logo_url'])) || null,
    address: asString(pick(raw, ['address'])),
    phone: asString(pick(raw, ['phone'])),
    whatsapp: asString(pick(raw, ['whatsapp'])),
    website: asString(pick(raw, ['website'])),
    orgType: typeRaw,
    orgTypeLabel: orgTypeLabels[typeRaw] ?? typeRaw,
    isVerified: Boolean(pick(raw, ['isVerified', 'is_verified'])),
    schedule: asString(pick(raw, ['schedule'])),
    lat: Number(pick(raw, ['lat']) ?? 0),
    lng: Number(pick(raw, ['lng']) ?? 0),
  };
}

export type AdminOrgInput = {
  name: string;
  orgType: string;
  description?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  schedule?: string;
  isVerified?: boolean;
  lat?: number;
  lng?: number;
  logoBase64?: string;
};

export async function getAdminOrganizations(): Promise<AdminOrg[]> {
  const data = await adminFetch<Raw[]>('/admin/organizations');
  return (data ?? []).map(mapAdminOrg);
}

export async function createAdminOrganization(input: AdminOrgInput): Promise<void> {
  await adminFetch('/admin/organizations', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateAdminOrganization(id: string, input: AdminOrgInput): Promise<void> {
  await adminFetch(`/admin/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteAdminOrganization(id: string): Promise<void> {
  await adminFetch(`/admin/organizations/${id}`, { method: 'DELETE' });
}

// Equipo (veterinarios) de un aliado. Cada vet tiene su cuenta y el aliado lo
// vincula por correo. El endpoint lo hará Isabel (spec en pendientes-isabel.md,
// sección 11.1); el cliente ya está listo y es tolerante a la forma de respuesta.
// El backend usa role_in_org (admin|veterinarian|assistant en BD); el front venía
// usando owner|vet. Aceptamos ambos vocabularios para no romper al conectar.
const orgMemberRoleLabels: Record<string, string> = {
  owner: 'Responsable',
  admin: 'Responsable',
  vet: 'Veterinario',
  veterinarian: 'Veterinario',
  assistant: 'Asistente',
};

// Rol dentro de la organización que el admin puede asignar al vincular por correo.
export type OrgMemberRole = 'admin' | 'veterinarian';

export type AdminOrgMember = {
  userId: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  title: string;
  photoUrl: string | null;
  status: string;
};

function mapOrgMember(raw: Raw): AdminOrgMember {
  const roleRaw = asString(pick(raw, ['role']), 'vet');
  const userObj = pick(raw, ['user']);
  const nested = userObj && typeof userObj === 'object' ? (userObj as Raw) : null;
  const source = nested ?? raw;
  const userId =
    asString(pick(raw, ['userId', 'user_id'])) ||
    (nested ? asString(pick(nested, ['id'])) : '') ||
    asString(pick(raw, ['id', '_id']));
  return {
    userId,
    name: asString(pick(source, ['name']), 'Sin nombre'),
    email: asString(pick(source, ['email'])),
    role: roleRaw,
    roleLabel: orgMemberRoleLabels[roleRaw] ?? roleRaw,
    title: asString(pick(raw, ['title'])),
    photoUrl: asString(pick(source, ['photoUrl', 'photo_url', 'avatarUrl', 'avatar_url'])) || null,
    status: asString(pick(raw, ['status']), 'active'),
  };
}

export async function getAdminOrgTeam(orgId: string): Promise<AdminOrgMember[]> {
  const data = await adminFetch<Raw[]>(`/admin/organizations/${orgId}/team`);
  return (data ?? []).map(mapOrgMember);
}

export async function addAdminOrgTeamMember(
  orgId: string,
  email: string,
  roleInOrg: OrgMemberRole = 'veterinarian',
): Promise<void> {
  // El backend lee el campo `role` (Isabel alineó las variables role/userId al
  // front). Antes mandábamos `roleInOrg`, que el backend ignoraba y por eso el
  // responsable quedaba como veterinario. Valores: 'admin' (responsable) /
  // 'veterinarian'. Mandamos ambos nombres por si el contrato acepta cualquiera.
  await adminFetch(`/admin/organizations/${orgId}/team`, {
    method: 'POST',
    body: JSON.stringify({ email, role: roleInOrg, roleInOrg }),
  });
}

// Un miembro es el responsable si su rol es admin/owner (ambos vocabularios).
export function isOrgResponsable(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

export async function removeAdminOrgTeamMember(orgId: string, userId: string): Promise<void> {
  await adminFetch(`/admin/organizations/${orgId}/team/${userId}`, { method: 'DELETE' });
}

// Solicitudes públicas para unirse como aliado (Camino B). El admin las revisa y
// aprueba/rechaza; al aprobar, el backend crea la organización y deja al
// solicitante como responsable. Backend en pendientes-isabel.md, sección 19i.
export type OrgApplication = {
  id: string;
  name: string;
  orgType: string;
  orgTypeLabel: string;
  address: string;
  phone: string;
  whatsapp: string;
  website: string;
  description: string;
  contactName: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  statusLabel: string;
  requestedAgo: string;
};

const applicationStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

function mapOrgApplication(raw: Raw): OrgApplication {
  const typeRaw = asString(pick(raw, ['orgType', 'org_type', 'type']), 'ngo');
  const statusRaw = asString(pick(raw, ['status']), 'pending');
  const status =
    statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';
  const user = pick(raw, ['user', 'applicant']);
  const nested = user && typeof user === 'object' ? (user as Raw) : null;
  return {
    id: asString(pick(raw, ['id', '_id'])),
    name: asString(pick(raw, ['name'])),
    orgType: typeRaw,
    orgTypeLabel: orgTypeLabels[typeRaw] ?? typeRaw,
    address: asString(pick(raw, ['address'])),
    phone: asString(pick(raw, ['phone'])),
    whatsapp: asString(pick(raw, ['whatsapp'])),
    website: asString(pick(raw, ['website'])),
    description: asString(pick(raw, ['description'])),
    contactName: asString(pick(raw, ['contactName', 'contact_name']) ?? (nested ? pick(nested, ['name']) : '')),
    contactEmail: asString(pick(raw, ['contactEmail', 'contact_email']) ?? (nested ? pick(nested, ['email']) : '')),
    status,
    statusLabel: applicationStatusLabels[status] ?? status,
    requestedAgo: formatDate(asString(pick(raw, ['createdAt', 'created_at']))),
  };
}

export async function getOrganizationApplications(): Promise<OrgApplication[]> {
  const data = await adminFetch<Raw[]>('/admin/organization-applications');
  return (data ?? []).map(mapOrgApplication);
}

export async function updateOrganizationApplication(
  id: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
): Promise<void> {
  await adminFetch(`/admin/organization-applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(
      status === 'rejected' && rejectionReason ? { status, rejectionReason } : { status },
    ),
  });
}

const roleLabels: Record<string, string> = {
  citizen: 'Ciudadano',
  volunteer: 'Voluntario',
  admin: 'Administrador',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function countFrom(raw: Raw, directKeys: string[], nestedKey: string): number | null {
  const direct = pick(raw, directKeys);
  if (direct !== undefined) return Number(direct);
  const countObj = pick(raw, ['_count']);
  if (countObj && typeof countObj === 'object') {
    const value = (countObj as Raw)[nestedKey];
    if (value !== undefined) return Number(value);
  }
  return null;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  reportsCount: number | null;
  joined: string;
};

function mapAdminUser(raw: Raw): AdminUser {
  const roleRaw = asString(pick(raw, ['role']), 'citizen');
  return {
    id: asString(pick(raw, ['id', '_id'])),
    name: asString(pick(raw, ['name']), 'Sin nombre'),
    email: asString(pick(raw, ['email'])),
    role: roleRaw,
    roleLabel: roleLabels[roleRaw] ?? roleRaw,
    reportsCount: countFrom(raw, ['reportsCount', 'reports_count'], 'reports'),
    joined: formatDate(asString(pick(raw, ['createdAt', 'created_at']))),
  };
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const data = await adminFetch<Raw[]>('/admin/users');
  return (data ?? []).map(mapAdminUser);
}

export const roleOptions: { value: string; label: string }[] = [
  { value: 'citizen', label: 'Ciudadano' },
  { value: 'volunteer', label: 'Voluntario' },
  { value: 'admin', label: 'Administrador' },
];

export async function updateAdminUserRole(id: string, role: string): Promise<void> {
  await adminFetch(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function deleteAdminUser(id: string): Promise<void> {
  await adminFetch(`/admin/users/${id}`, { method: 'DELETE' });
}

export type AdminForumPost = {
  id: string;
  author: string;
  content: string;
  createdAgo: string;
  repliesCount: number | null;
};

function mapForumPost(raw: Raw): AdminForumPost {
  const authorObj = pick(raw, ['author', 'user']);
  const author =
    authorObj && typeof authorObj === 'object'
      ? asString((authorObj as Raw).name)
      : asString(pick(raw, ['authorName']));

  return {
    id: asString(pick(raw, ['id', '_id'])),
    author: author || 'Anónimo',
    content: asString(pick(raw, ['content', 'text', 'body', 'message'])),
    createdAgo: timeAgo(asString(pick(raw, ['createdAt', 'created_at']))),
    repliesCount: countFrom(raw, ['repliesCount', 'replies_count'], 'replies'),
  };
}

export async function getAdminForumPosts(): Promise<AdminForumPost[]> {
  const data = await adminFetch<Raw[]>('/admin/forum/posts');
  return (data ?? []).map(mapForumPost);
}

export async function deleteAdminForumPost(id: string): Promise<void> {
  await adminFetch(`/admin/forum/posts/${id}`, { method: 'DELETE' });
}

// Denuncias de publicaciones del foro. El usuario reporta con un motivo y el admin
// las revisa aquí (borra la publicación o descarta la denuncia). Backend:
// GET /admin/forum/reports (spec en pendientes-isabel.md, sección de Comunidad).
export type AdminForumReport = {
  id: string;
  reason: string;
  reporter: string;
  reportedAgo: string;
  postId: string;
  postAuthor: string;
  postContent: string;
};

function mapForumReport(raw: Raw): AdminForumReport {
  const postObj = pick(raw, ['post']);
  const post = postObj && typeof postObj === 'object' ? (postObj as Raw) : raw;
  const postAuthorObj = pick(post, ['author', 'user']);
  const postAuthor =
    postAuthorObj && typeof postAuthorObj === 'object'
      ? asString((postAuthorObj as Raw).name)
      : asString(pick(post, ['authorName']));
  const reporterObj = pick(raw, ['reporter', 'reportedBy', 'user']);
  const reporter =
    reporterObj && typeof reporterObj === 'object'
      ? asString((reporterObj as Raw).name)
      : asString(pick(raw, ['reporterName']));

  return {
    id: asString(pick(raw, ['id', '_id'])),
    reason: asString(pick(raw, ['reason', 'motivo', 'description'])),
    reporter: reporter || 'Anónimo',
    reportedAgo: timeAgo(asString(pick(raw, ['createdAt', 'created_at']))),
    postId: asString(pick(post, ['id', '_id'])),
    postAuthor: postAuthor || 'Anónimo',
    postContent: asString(pick(post, ['content', 'text', 'body', 'message'])),
  };
}

export async function getAdminForumReports(): Promise<AdminForumReport[]> {
  const data = await adminFetch<Raw[]>('/admin/forum/reports');
  return (data ?? []).map(mapForumReport);
}

export async function dismissAdminForumReport(id: string): Promise<void> {
  await adminFetch(`/admin/forum/reports/${id}`, { method: 'DELETE' });
}

// Categorías de eventos comunitarios. Son un conjunto FIJO (desplegable, no texto
// libre) para que no entren valores basura. El backend guarda `category` como
// string; enviamos el slug y mostramos la etiqueta. Si llega un valor viejo o
// desconocido, se muestra tal cual (fallback) para no romper la lista.
const eventCategoryLabels: Record<string, string> = {
  esterilizacion: 'Esterilización',
  vacunacion: 'Vacunación',
  adopcion: 'Adopción',
  donacion: 'Colecta / Donación',
  educacion: 'Educación',
  otro: 'Otro',
};

export const eventCategoryOptions: { value: string; label: string }[] = Object.entries(
  eventCategoryLabels,
).map(([value, label]) => ({ value, label }));

// Fecha con hora, legible en español (ej. "sáb 12 jul 2026, 9:00 a.m.").
function formatEventDate(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export type AdminEvent = {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  eventDate: string; // ISO crudo, para precargar el formulario al editar
  eventDateLabel: string;
  endDate: string; // ISO crudo o ''
  location: string;
  address: string;
  maxParticipants: number | null;
  imageUrl: string | null;
  organizationId: string;
  organizationName: string;
};

function mapAdminEvent(raw: Raw): AdminEvent {
  const category = asString(pick(raw, ['category']));
  const eventDate = asString(pick(raw, ['eventDate', 'event_date', 'startDate', 'start_date']));
  const endDate = asString(pick(raw, ['endDate', 'end_date']));
  const maxRaw = pick(raw, ['maxParticipants', 'max_participants']);
  const orgObj = pick(raw, ['organization', 'org']);
  const orgNested = orgObj && typeof orgObj === 'object' ? (orgObj as Raw) : null;

  return {
    id: asString(pick(raw, ['id', '_id'])),
    title: asString(pick(raw, ['title', 'name'])),
    description: asString(pick(raw, ['description'])),
    category,
    categoryLabel: eventCategoryLabels[category] ?? (category || 'Sin categoría'),
    eventDate,
    eventDateLabel: formatEventDate(eventDate),
    endDate,
    location: asString(pick(raw, ['location'])),
    address: asString(pick(raw, ['address'])),
    maxParticipants:
      maxRaw === undefined || maxRaw === null || maxRaw === '' ? null : Number(maxRaw),
    imageUrl: asString(pick(raw, ['imageUrl', 'image_url', 'image'])) || null,
    organizationId:
      asString(pick(raw, ['organizationId', 'organization_id'])) ||
      (orgNested ? asString(orgNested.id) : ''),
    organizationName: orgNested
      ? asString(orgNested.name)
      : asString(pick(raw, ['organizationName'])),
  };
}

export type AdminEventInput = {
  title: string;
  description: string;
  category: string;
  eventDate: string; // ISO
  endDate?: string; // ISO
  location: string;
  address: string;
  maxParticipants?: number;
  organizationId: string;
  imageBase64?: string;
};

export async function getAdminEvents(): Promise<AdminEvent[]> {
  const data = await adminFetch<Raw[]>('/admin/events');
  return (data ?? [])
    .map(mapAdminEvent)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

export async function createAdminEvent(input: AdminEventInput): Promise<void> {
  await adminFetch('/admin/events', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateAdminEvent(id: string, input: AdminEventInput): Promise<void> {
  await adminFetch(`/admin/events/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteAdminEvent(id: string): Promise<void> {
  await adminFetch(`/admin/events/${id}`, { method: 'DELETE' });
}

const volunteerStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export type AdminVolunteer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  statusLabel: string;
  isFoster: boolean;
  fosterCapacity: number | null;
  zone: string;
  availability: string;
  helpType: string;
  motivation: string;
  idDoc: string | null;
  idSelfie: string | null;
  requestedAgo: string;
};

function mapVolunteer(raw: Raw): AdminVolunteer {
  const userObj = pick(raw, ['user']);
  const user = userObj && typeof userObj === 'object' ? (userObj as Raw) : raw;
  const statusRaw = asString(pick(raw, ['status', 'volunteerStatus']), 'pending');
  const fosterCapacityRaw = pick(raw, ['fosterCapacity', 'foster_capacity']);
  const prefsObj = pick(raw, ['volunteerPrefs']);
  const prefs = prefsObj && typeof prefsObj === 'object' ? (prefsObj as Raw) : raw;

  return {
    id: asString(pick(raw, ['id', '_id'])),
    name: asString(pick(user, ['name']), 'Sin nombre'),
    email: asString(pick(user, ['email'])),
    phone: asString(pick(raw, ['phone']) ?? pick(user, ['phone'])),
    status: statusRaw,
    statusLabel: volunteerStatusLabels[statusRaw] ?? statusRaw,
    isFoster: Boolean(pick(raw, ['isFoster', 'is_foster'])),
    fosterCapacity: fosterCapacityRaw !== undefined ? Number(fosterCapacityRaw) : null,
    zone: asString(pick(prefs, ['zone'])),
    availability: asString(pick(prefs, ['availability'])),
    helpType: asString(pick(prefs, ['helpType'])),
    motivation: asString(pick(prefs, ['motivation'])),
    // Se ENVÍAN como idDocBase64/idSelfieBase64, pero el backend las DEVUELVE en
    // ineFrontUrl y selfieUrl (confirmado por Isabel). Se mapean desde ahí.
    idDoc: asString(pick(raw, ['ineFrontUrl', 'ine_front_url', 'ineFront'])) || null,
    idSelfie: asString(pick(raw, ['selfieUrl', 'selfie_url', 'selfie'])) || null,
    requestedAgo: timeAgo(asString(pick(raw, ['createdAt', 'created_at']))),
  };
}

export async function getAdminVolunteers(): Promise<AdminVolunteer[]> {
  const data = await adminFetch<Raw[]>('/admin/volunteers');
  return (data ?? []).map(mapVolunteer);
}

export async function updateVolunteerStatus(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  await adminFetch(`/admin/volunteers/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// AVISOS (notificaciones manuales). El admin escribe un aviso y elige a quién le
// llega; el backend crea la notificación para ese público y dispara el push (el
// service worker y las suscripciones VAPID ya existen en el frontend). Así Isabel
// puede probar el push de punta a punta. Spec del endpoint en pendientes-isabel.md
// (sección de Avisos): POST /admin/notifications { audience, title, body, link? };
// GET /admin/notifications devuelve el historial de avisos enviados (opcional).
const notificationAudienceLabels: Record<string, string> = {
  all: 'Todos',
  citizens: 'Ciudadanos',
  volunteers: 'Voluntarios',
  allies: 'Aliados',
};

export const notificationAudienceOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'citizens', label: 'Ciudadanos' },
  { value: 'volunteers', label: 'Voluntarios' },
  { value: 'allies', label: 'Aliados' },
];

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  audience: string;
  audienceLabel: string;
  link: string;
  sentCount: number | null;
  sentAgo: string;
};

function mapAdminNotification(raw: Raw): AdminNotification {
  const audienceRaw = asString(pick(raw, ['audience', 'target', 'segment']), 'all');
  const countRaw = pick(raw, ['sentCount', 'sent_count', 'recipients', 'delivered']);
  return {
    id: asString(pick(raw, ['id', '_id'])),
    title: asString(pick(raw, ['title'])),
    body: asString(pick(raw, ['body', 'message', 'description'])),
    audience: audienceRaw,
    audienceLabel: notificationAudienceLabels[audienceRaw] ?? audienceRaw,
    link: asString(pick(raw, ['link', 'url'])),
    sentCount: countRaw === undefined || countRaw === null ? null : Number(countRaw),
    sentAgo: timeAgo(asString(pick(raw, ['createdAt', 'created_at', 'sentAt', 'sent_at']))),
  };
}

export type AdminNotificationInput = {
  audience: string;
  title: string;
  body: string;
  link?: string;
};

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const data = await adminFetch<Raw[]>('/admin/notifications');
  return (data ?? []).map(mapAdminNotification);
}

export async function sendAdminNotification(input: AdminNotificationInput): Promise<void> {
  await adminFetch('/admin/notifications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Borra un aviso ya enviado: el backend elimina el registro del historial y lo
// quita de la campanita/buzón de todos los usuarios que lo recibieron.
// DELETE /admin/notifications/:id (id del registro del aviso).
export async function deleteAdminNotification(id: string): Promise<void> {
  await adminFetch(`/admin/notifications/${id}`, { method: 'DELETE' });
}

// NOVEDADES (changelog). Hoy la página pública de Novedades es estática
// (data/novedades.ts). Estas funciones permiten administrarlas DESDE EL PANEL sin
// tocar código. Spec para Isabel (pendientes-isabel.md, sección de Novedades):
// público GET /novedades (lista, más nueva primero); admin GET/POST/PATCH/DELETE
// /admin/novedades con body { version, title, date (ISO), changes: string[] }.
// El front lee tolerante y, mientras el endpoint no exista, la página pública usa
// la lista estática como respaldo (ver getNovedades en api.ts).
export type AdminNovedad = {
  id: string;
  version: string;
  title: string;
  date: string; // ISO/crudo, para precargar el input al editar
  dateLabel: string;
  changes: string[];
};

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter((item) => item.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function mapAdminNovedad(raw: Raw): AdminNovedad {
  const date = asString(pick(raw, ['date', 'releasedAt', 'released_at', 'createdAt', 'created_at']));
  return {
    id: asString(pick(raw, ['id', '_id'])),
    version: asString(pick(raw, ['version'])),
    title: asString(pick(raw, ['title'])),
    date,
    dateLabel: formatDate(date) || date,
    changes: asStringList(pick(raw, ['changes', 'items', 'notes'])),
  };
}

export type AdminNovedadInput = {
  version: string;
  title: string;
  date: string; // ISO
  changes: string[];
};

export async function getAdminNovedades(): Promise<AdminNovedad[]> {
  const data = await adminFetch<Raw[]>('/admin/novedades');
  return (data ?? [])
    .map(mapAdminNovedad)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createAdminNovedad(input: AdminNovedadInput): Promise<void> {
  await adminFetch('/admin/novedades', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateAdminNovedad(id: string, input: AdminNovedadInput): Promise<void> {
  await adminFetch(`/admin/novedades/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteAdminNovedad(id: string): Promise<void> {
  await adminFetch(`/admin/novedades/${id}`, { method: 'DELETE' });
}
