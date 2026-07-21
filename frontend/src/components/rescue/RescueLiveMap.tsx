import { useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RescueAssignment } from '../../lib/api';
import type { RescueLivePosition } from '../../lib/rescueSocket';

const PUEBLA_CENTER: [number, number] = [-98.2, 19.04];

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

// Un punto solo sirve si sus dos coordenadas son números reales. Si el backend
// manda null, texto vacío o un dato a medias (pasa con una asignación recién
// creada), maplibre lanza una excepción al dibujar el marcador y se cae toda la
// pantalla. Aquí lo descartamos antes de llegar a eso.
function validPoint(
  point: { lat: number; lng: number } | null | undefined,
): { lat: number; lng: number } | null {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function lineFeature(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [a.lng, a.lat],
        [b.lng, b.lat],
      ],
    },
    properties: {},
  };
}

type Props = {
  assignment: RescueAssignment;
  position: RescueLivePosition | null;
};

export function RescueLiveMap({ assignment, position }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const volunteerRef = useRef<maplibregl.Marker | null>(null);

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

      if (origin) {
        new maplibregl.Marker({ color: '#9CA3AF' })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map);
        bounds.extend([origin.lng, origin.lat]);
      }
      if (destination) {
        new maplibregl.Marker({ color: '#1C4E80' })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);
        bounds.extend([destination.lng, destination.lat]);
      }
      if (origin && destination) {
        map.addSource('rescue-route', {
          type: 'geojson',
          data: lineFeature(origin, destination),
        });
        map.addLayer({
          id: 'rescue-route-line',
          type: 'line',
          source: 'rescue-route',
          layout: { 'line-cap': 'round' },
          paint: {
            'line-color': '#F2780B',
            'line-width': 3,
            'line-dasharray': [2, 2],
            'line-opacity': 0.7,
          },
        });
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

  // Mueve el marcador del voluntario conforme llega su posición.
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
  }, [position]);

  return <div ref={containerRef} className="h-full w-full" />;
}
