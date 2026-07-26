import { useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Picker de ubicación para el registro de un ALIADO. A diferencia del de reportes
// (que fuerza el GPS del usuario y limita el pin a 50 m), este se centra en el
// centroide de la colonia elegida por CP y deja arrastrar el pin libremente para
// afinar la dirección exacta del negocio. Nunca se piden lat/lng a mano.

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

type OrgLocationPickerProps = {
  // Centroide de la colonia elegida. Al cambiar, recentra el mapa y el pin.
  center: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
};

export function OrgLocationPicker({ center, onChange }: OrgLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Inicializa el mapa una sola vez.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: baseStyle,
      center: center ? [center.lng, center.lat] : PUEBLA_CENTER,
      zoom: center ? 16 : 11,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambia la colonia (nuevo centroide), recentra y coloca el pin ahí.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    const lngLat: [number, number] = [center.lng, center.lat];

    const place = () => {
      map.flyTo({ center: lngLat, zoom: 16 });
      if (!markerRef.current) {
        const marker = new maplibregl.Marker({ draggable: true, color: '#F2780B' })
          .setLngLat(lngLat)
          .addTo(map);
        marker.on('dragend', () => {
          const ll = marker.getLngLat();
          onChangeRef.current(ll.lat, ll.lng);
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLngLat(lngLat);
      }
      onChangeRef.current(center.lat, center.lng);
    };

    if (map.isStyleLoaded()) place();
    else map.once('load', place);
  }, [center]);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-neutral-200">
      <div ref={containerRef} className="h-full w-full" />
      {!center && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/85 px-6 text-center">
          <p className="text-sm text-neutral-500">
            Escribe tu código postal y elige tu colonia para ubicarte en el mapa.
          </p>
        </div>
      )}
      {center && (
        <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
          <p className="rounded-full bg-white/90 px-3 py-1.5 text-center text-xs font-medium text-neutral-600 shadow">
            Arrastra el pin hasta la puerta de tu negocio
          </p>
        </div>
      )}
    </div>
  );
}
