import { API_URL, getToken } from './api';

// Cliente para los endpoints protegidos /admin/*. Es tolerante a la forma de la
// respuesta: acepta tanto { status, data } como el dato directo, porque el
// contrato exacto de Isabel aun no esta documentado a nivel de campos.
async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('Inicia sesión como administrador');

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | { status?: string; message?: string; data?: unknown }
    | unknown[]
    | null;

  if (!response.ok || (body && !Array.isArray(body) && body.status === 'error')) {
    const message =
      body && !Array.isArray(body) ? body.message : undefined;
    if (response.status === 403) throw new Error('Tu cuenta no tiene permisos de administrador');
    throw new Error(message ?? 'Ocurrió un error con el servidor');
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

  return {
    id: asString(pick(raw, ['id', '_id'])),
    species: speciesRaw === 'cat' || speciesRaw === 'gato' ? 'gato' : 'perro',
    condition: conditionLabels[conditionRaw] ?? conditionRaw ?? '',
    urgency: urgencyRaw,
    urgencyLabel: urgencyLabels[urgencyRaw] ?? urgencyRaw ?? '',
    status: asString(pick(raw, ['status']), 'active'),
    description: asString(pick(raw, ['description'])),
    colonia: asString(pick(raw, ['colonia', 'neighborhood', 'colony']), 'Sin colonia'),
    photo: asString(pick(raw, ['photo', 'photoUrl', 'photo_url']), '/placeholder-animal.svg'),
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
  story: string;
  diagnosis: string;
  treatment: string;
  totalCostNeeded: number;
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
    story: asString(pick(raw, ['story'])),
    diagnosis: asString(pick(raw, ['diagnosis'])),
    treatment: asString(pick(raw, ['treatment'])),
    totalCostNeeded: Number(pick(raw, ['totalCostNeeded', 'total_cost_needed']) ?? 0),
    organizationId: orgObj ? asString(orgObj.id) || null : (asString(pick(raw, ['organizationId'])) || null),
    organizationName: orgObj ? asString(orgObj.name) || null : null,
    photos: mapPhotos(pick(raw, ['photos'])),
  };
}

export type AdminAnimalInput = {
  name: string;
  species: 'dog' | 'cat';
  status: string;
  story?: string;
  diagnosis?: string;
  treatment?: string;
  totalCostNeeded?: number;
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
  ineFront: string | null;
  ineBack: string | null;
  selfie: string | null;
  requestedAgo: string;
};

function mapVolunteer(raw: Raw): AdminVolunteer {
  const userObj = pick(raw, ['user']);
  const user = userObj && typeof userObj === 'object' ? (userObj as Raw) : raw;
  const statusRaw = asString(pick(raw, ['status']), 'pending');
  const fosterCapacityRaw = pick(raw, ['fosterCapacity', 'foster_capacity']);

  return {
    id: asString(pick(raw, ['id', '_id'])),
    name: asString(pick(user, ['name']), 'Sin nombre'),
    email: asString(pick(user, ['email'])),
    phone: asString(pick(raw, ['phone']) ?? pick(user, ['phone'])),
    status: statusRaw,
    statusLabel: volunteerStatusLabels[statusRaw] ?? statusRaw,
    isFoster: Boolean(pick(raw, ['isFoster', 'is_foster'])),
    fosterCapacity: fosterCapacityRaw !== undefined ? Number(fosterCapacityRaw) : null,
    ineFront: asString(pick(raw, ['ineFrontUrl', 'ine_front_url', 'ineFront'])) || null,
    ineBack: asString(pick(raw, ['ineBackUrl', 'ine_back_url', 'ineBack'])) || null,
    selfie: asString(pick(raw, ['selfieUrl', 'selfie_url', 'selfie'])) || null,
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
