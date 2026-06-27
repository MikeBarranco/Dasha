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
