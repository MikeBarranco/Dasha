import { io, type Socket } from 'socket.io-client';
import { API_URL, type RescueStatus } from './api';

// El socket se conecta a la RAÍZ del backend (sin /api/v1). Se puede sobreescribir
// con VITE_SOCKET_URL; si no, se deriva del origen de API_URL.
function resolveSocketUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL as string | undefined;
  if (explicit) return explicit;
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export type RescueLivePosition = { lat: number; lng: number; updatedAt?: string };

export type RescueLiveHandlers = {
  onLocation?: (position: RescueLivePosition) => void;
  onStatus?: (status: RescueStatus) => void;
  onConnectChange?: (connected: boolean) => void;
};

const RESCUE_STATUSES: RescueStatus[] = [
  'accepted',
  'on_the_way',
  'arrived',
  'completed',
  'cancelled',
];

// El GPS puede llegar directo {lat,lng} o anidado en {location} / {currentLocation}.
function parsePosition(payload: unknown): RescueLivePosition | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  let nested: Record<string, unknown> = p;
  if (p.location && typeof p.location === 'object') {
    nested = p.location as Record<string, unknown>;
  } else if (p.currentLocation && typeof p.currentLocation === 'object') {
    nested = p.currentLocation as Record<string, unknown>;
  }
  const lat = Number(nested.lat ?? nested.latitude);
  const lng = Number(nested.lng ?? nested.lon ?? nested.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const updatedAt = nested.updatedAt ?? nested.updated_at;
  return { lat, lng, updatedAt: typeof updatedAt === 'string' ? updatedAt : undefined };
}

function parseStatus(payload: unknown): RescueStatus | null {
  const raw =
    typeof payload === 'string'
      ? payload
      : payload && typeof payload === 'object'
        ? String((payload as Record<string, unknown>).status ?? '')
        : '';
  return RESCUE_STATUSES.includes(raw as RescueStatus) ? (raw as RescueStatus) : null;
}

// Conecta a la sala de un traslado y escucha ubicación/estado en vivo. Devuelve
// una función para desconectar (llamar al desmontar el componente).
export function connectRescueRoom(assignmentId: string, handlers: RescueLiveHandlers): () => void {
  const socket: Socket = io(resolveSocketUrl(), {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    socket.emit('join_rescue', assignmentId);
    handlers.onConnectChange?.(true);
  });
  socket.on('disconnect', () => handlers.onConnectChange?.(false));

  socket.on('location_updated', (payload: unknown) => {
    const position = parsePosition(payload);
    if (position) handlers.onLocation?.(position);
  });
  socket.on('rescue_status_changed', (payload: unknown) => {
    const status = parseStatus(payload);
    if (status) handlers.onStatus?.(status);
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
