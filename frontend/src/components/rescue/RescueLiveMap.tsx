import { useCallback, useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, LineString } from 'geojson';
import type { RescueAssignment } from '../../lib/api';
import type { RescueLivePosition } from '../../lib/rescueSocket';

const PUEBLA_CENTER: [number, number] = [-98.2, 19.04];

// Tiempo mínimo entre llamadas a OSRM. El voluntario emite su posición muy
// seguido; recalcular la ruta en cada ping saturaría el servidor público y no
// aporta (las calles no cambian entre metro y metro). Con esto se recalcula a lo
// mucho cada 4 s, aplicando siempre la posición más reciente.
const OSRM_MIN_INTERVAL = 4000;

const baseStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap, © CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
};

type LatLng = { lat: number; lng: number };

// Un punto solo sirve si sus dos coordenadas son números reales. Si el backend
// manda null, texto vacío o un dato a medias (pasa con una asignación recién
// creada), maplibre lanza una excepción al dibujar el marcador y se cae toda la
// pantalla. Aquí lo descartamos antes de llegar a eso.
function validPoint(point: LatLng | null | undefined): LatLng | null {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// Feature con la geometría dada (la ruta de calles o la línea recta de respaldo).
function toRouteFeature(geometry: LineString): Feature {
  return { type: 'Feature', geometry, properties: {} };
}

// Línea recta punto a punto: se muestra al instante y sirve de respaldo si OSRM
// no responde (sin conexión, límite del servidor, etc.).
function straightLine(a: LatLng, b: LatLng): Feature {
  return toRouteFeature({
    type: 'LineString',
    coordinates: [
      [a.lng, a.lat],
      [b.lng, b.lat],
    ],
  });
}

// Ruta real por calles entre dos puntos usando el servidor público de OSRM
// (gratis, sin API key). Devuelve la geometría GeoJSON o null si algo falla; el
// llamador conserva lo que ya tenía dibujado (la línea recta) como respaldo.
async function fetchOsrmRoute(
  from: LatLng,
  to: LatLng,
  signal: AbortSignal,
): Promise<LineString | null> {
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { routes?: { geometry?: LineString }[] };
    const geometry = data.routes?.[0]?.geometry;
    if (geometry && geometry.type === 'LineString' && Array.isArray(geometry.coordinates)) {
      return geometry;
    }
    return null;
  } catch {
    // Incluye el AbortError al cancelar una petición vieja: se ignora en silencio.
    return null;
  }
}

function setRouteData(map: maplibregl.Map, feature: Feature): void {
  const source = map.getSource('rescue-route') as maplibregl.GeoJSONSource | undefined;
  if (source) source.setData(feature);
}

type Props = {
  assignment: RescueAssignment;
  position: RescueLivePosition | null;
};

export function RescueLiveMap({ assignment, position }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const volunteerRef = useRef<maplibregl.Marker | null>(null);

  // Estado del cálculo de ruta (todo en refs: no dispara renders ni cae en la
  // regla de set-state-in-effect del compilador).
  const destinationRef = useRef<LatLng | null>(null);
  const pendingFromRef = useRef<LatLng | null>(null);
  const lastFetchRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reqIdRef = useRef(0);

  // Lanza el fetch a OSRM desde el último origen deseado hasta el destino y, si
  // la respuesta sigue siendo la más reciente, actualiza la ruta del mapa.
  const runRoute = useCallback(() => {
    pendingTimerRef.current = null;
    const map = mapRef.current;
    const from = pendingFromRef.current;
    const dest = destinationRef.current;
    if (!map || !from || !dest) return;
    lastFetchRef.current = Date.now();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++reqIdRef.current;
    void fetchOsrmRoute(from, dest, controller.signal).then((geometry) => {
      // Solo aplica si es la petición más nueva y el mapa sigue vivo.
      if (geometry && reqId === reqIdRef.current && mapRef.current) {
        setRouteData(mapRef.current, toRouteFeature(geometry));
      }
    });
  }, []);

  // Pide recalcular la ruta desde `from`, respetando el intervalo mínimo entre
  // llamadas a OSRM (si llega antes, agenda una sola con la posición más nueva).
  const requestRoute = useCallback(
    (from: LatLng | null) => {
      if (!from || !mapRef.current || !destinationRef.current) return;
      pendingFromRef.current = from;
      const elapsed = Date.now() - lastFetchRef.current;
      if (elapsed >= OSRM_MIN_INTERVAL) {
        runRoute();
      } else if (!pendingTimerRef.current) {
        pendingTimerRef.current = setTimeout(runRoute, OSRM_MIN_INTERVAL - elapsed);
      }
    },
    [runRoute],
  );

  // Mapa + marcadores estáticos (origen y destino) una sola vez.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: baseStyle,
      center: PUEBLA_CENTER,
      zoom: 13,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      const bounds = new maplibregl.LngLatBounds();
      const origin = validPoint(assignment.origin);
      const destination = validPoint(assignment.destination);
      destinationRef.current = destination;

      if (origin) {
        new maplibregl.Marker({ color: '#9CA3AF' }).setLngLat([origin.lng, origin.lat]).addTo(map);
        bounds.extend([origin.lng, origin.lat]);
      }
      if (destination) {
        new maplibregl.Marker({ color: '#1C4E80' })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);
        bounds.extend([destination.lng, destination.lat]);
      }
      if (origin && destination) {
        // Se dibuja la línea recta al instante y en seguida se pide a OSRM la
        // ruta por calles, que reemplaza los datos de esta misma fuente.
        map.addSource('rescue-route', {
          type: 'geojson',
          data: straightLine(origin, destination),
        });
        map.addLayer({
          id: 'rescue-route-line',
          type: 'line',
          source: 'rescue-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#F2780B',
            'line-width': 4,
            'line-opacity': 0.85,
          },
        });
        requestRoute(origin);
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      volunteerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpieza del cálculo de ruta al desmontar: cancela el timer y el fetch en vuelo.
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // Mueve el marcador del voluntario y recalcula la ruta desde su posición actual
  // hasta el destino (la línea se va acortando conforme avanza, estilo Uber).
  useEffect(() => {
    const map = mapRef.current;
    const point = validPoint(position);
    if (!map || !point) return;
    if (!volunteerRef.current) {
      volunteerRef.current = new maplibregl.Marker({ color: '#F2780B' })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
    } else {
      volunteerRef.current.setLngLat([point.lng, point.lat]);
    }
    requestRoute(point);
  }, [position, requestRoute]);

  return <div ref={containerRef} className="h-full w-full" />;
}
