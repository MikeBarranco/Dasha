import { useEffect, useRef, useState } from 'react';
import { getRescueAssignment, type RescueAssignment, type RescueStatus } from './api';
import { connectRescueRoom, type RescueLivePosition } from './rescueSocket';

export type RescueLiveState = {
  // undefined = cargando; null = no encontrada; objeto = asignación.
  assignment: RescueAssignment | null | undefined;
  position: RescueLivePosition | null;
  status: RescueStatus | null;
  connected: boolean;
  // true cuando la posición viene de la simulación (no de un GPS real).
  simulated: boolean;
};

// Si en unos segundos no llega GPS real y hay ruta, animamos al voluntario para
// que el demo siempre muestre movimiento; en cuanto llega GPS real, lo usamos.
const SIM_FALLBACK_MS = 3500;
const SIM_DURATION_MS = 40000;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function useRescueLive(assignmentId: string | undefined): RescueLiveState {
  const [assignment, setAssignment] = useState<RescueAssignment | null | undefined>(
    assignmentId ? undefined : null,
  );
  const [position, setPosition] = useState<RescueLivePosition | null>(null);
  const [status, setStatus] = useState<RescueStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [simulated, setSimulated] = useState(false);

  const gotRealPositionRef = useRef(false);

  useEffect(() => {
    if (!assignmentId) return;
    let active = true;
    let disconnect: (() => void) | undefined;
    let simTimer: number | undefined;
    let simRaf: number | undefined;

    getRescueAssignment(assignmentId)
      .then((data) => {
        if (!active) return;
        setAssignment(data);
        if (!data) return;
        setStatus(data.status);
        if (data.currentLocation) {
          setPosition({
            lat: data.currentLocation.lat,
            lng: data.currentLocation.lng,
            updatedAt: data.currentLocation.updatedAt,
          });
          gotRealPositionRef.current = true;
        } else if (data.origin) {
          setPosition({ lat: data.origin.lat, lng: data.origin.lng });
        }

        disconnect = connectRescueRoom(assignmentId, {
          onConnectChange: (isConnected) => {
            if (active) setConnected(isConnected);
          },
          onLocation: (pos) => {
            if (!active) return;
            gotRealPositionRef.current = true;
            setSimulated(false);
            setPosition(pos);
          },
          onStatus: (nextStatus) => {
            if (active) setStatus(nextStatus);
          },
        });

        // Respaldo para el demo: si no hay GPS real y sí hay origen y destino.
        if (data.origin && data.destination) {
          const origin = data.origin;
          const destination = data.destination;
          simTimer = window.setTimeout(() => {
            if (!active || gotRealPositionRef.current) return;
            setSimulated(true);
            const start = performance.now();
            const tick = (now: number) => {
              if (!active || gotRealPositionRef.current) return;
              const t = Math.min((now - start) / SIM_DURATION_MS, 1);
              setPosition({
                lat: lerp(origin.lat, destination.lat, t),
                lng: lerp(origin.lng, destination.lng, t),
              });
              if (t < 1) simRaf = requestAnimationFrame(tick);
            };
            simRaf = requestAnimationFrame(tick);
          }, SIM_FALLBACK_MS);
        }
      })
      .catch(() => {
        if (active) setAssignment(null);
      });

    return () => {
      active = false;
      disconnect?.();
      if (simTimer) clearTimeout(simTimer);
      if (simRaf) cancelAnimationFrame(simRaf);
    };
  }, [assignmentId]);

  return { assignment, position, status, connected, simulated };
}
