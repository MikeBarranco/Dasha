import { useEffect, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LocateFixed, MapPinOff, Loader2 } from 'lucide-react';

const PUEBLA_CENTER: [number, number] = [-98.2, 19.04];

// Cuánto se puede mover el pin respecto a la ubicación real del usuario. Es un
// ajuste FINO para afinar la posición (no para reportar desde otro lugar). Se
// deja como constante para poder subirlo fácil si el GPS resulta muy impreciso.
const MAX_ADJUST_METERS = 50;

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

type GeoStatus = 'loading' | 'ready' | 'denied';

type LocationPickerProps = {
  onChange?: (lat: number, lng: number) => void;
  // Avisa a la pantalla si ya tenemos una ubicación válida (para no dejar
  // publicar sin ella).
  onStatusChange?: (ready: boolean) => void;
};

function metersPerDegLng(lat: number): number {
  return 111320 * Math.cos((lat * Math.PI) / 180);
}

function distanceMeters(lng0: number, lat0: number, lng: number, lat: number): number {
  const dx = (lng - lng0) * metersPerDegLng(lat0);
  const dy = (lat - lat0) * 111320;
  return Math.sqrt(dx * dx + dy * dy);
}

// Polígono aproximado de un círculo de radio en metros, para dibujar la zona
// permitida alrededor de la ubicación real.
function circlePolygon(lng: number, lat: number, radiusMeters: number, points = 48) {
  const coords: [number, number][] = [];
  const perLng = metersPerDegLng(lat);
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * 2 * Math.PI;
    coords.push([
      lng + (Math.cos(angle) * radiusMeters) / perLng,
      lat + (Math.sin(angle) * radiusMeters) / 111320,
    ]);
  }
  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

export function LocationPicker({ onChange, onStatusChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const originRef = useRef<[number, number] | null>(null);

  const onChangeRef = useRef(onChange);
  const onStatusRef = useRef(onStatusChange);
  const [status, setStatus] = useState<GeoStatus>('loading');

  useEffect(() => {
    onChangeRef.current = onChange;
    onStatusRef.current = onStatusChange;
  }, [onChange, onStatusChange]);

  // Coloca la zona permitida y el pin arrastrable en la ubicación real.
  const placeAt = (map: maplibregl.Map, lng: number, lat: number) => {
    originRef.current = [lng, lat];
    const area = circlePolygon(lng, lat, MAX_ADJUST_METERS);

    const source = map.getSource('allowed-area') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(area);
    } else {
      map.addSource('allowed-area', { type: 'geojson', data: area });
      map.addLayer({
        id: 'allowed-area-fill',
        type: 'fill',
        source: 'allowed-area',
        paint: { 'fill-color': '#1C4E80', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'allowed-area-line',
        type: 'line',
        source: 'allowed-area',
        paint: { 'line-color': '#1C4E80', 'line-width': 1.5, 'line-opacity': 0.5 },
      });
    }

    if (!markerRef.current) {
      const marker = new maplibregl.Marker({ draggable: true, color: '#F2780B' })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on('drag', () => {
        const origin = originRef.current;
        if (!origin) return;
        const ll = marker.getLngLat();
        const dist = distanceMeters(origin[0], origin[1], ll.lng, ll.lat);
        if (dist > MAX_ADJUST_METERS) {
          const factor = MAX_ADJUST_METERS / dist;
          const clampedLng = origin[0] + (ll.lng - origin[0]) * factor;
          const clampedLat = origin[1] + (ll.lat - origin[1]) * factor;
          marker.setLngLat([clampedLng, clampedLat]);
          onChangeRef.current?.(clampedLat, clampedLng);
        } else {
          onChangeRef.current?.(ll.lat, ll.lng);
        }
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    map.flyTo({ center: [lng, lat], zoom: 18 });
    onChangeRef.current?.(lat, lng);
  };

  const locate = () => {
    const map = mapRef.current;
    if (!map) return;
    if (!navigator.geolocation) {
      setStatus('denied');
      onStatusRef.current?.(false);
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        placeAt(map, position.coords.longitude, position.coords.latitude);
        setStatus('ready');
        onStatusRef.current?.(true);
      },
      () => {
        setStatus('denied');
        onStatusRef.current?.(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: baseStyle,
      center: PUEBLA_CENTER,
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => locate());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      originRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recenter = () => {
    const map = mapRef.current;
    const origin = originRef.current;
    if (map && origin) map.flyTo({ center: origin, zoom: 18 });
    else locate();
  };

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-neutral-200">
      <div ref={containerRef} className="h-full w-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-neutral-500">
          <Loader2 className="h-6 w-6 animate-spin text-cobalto" />
          <p className="text-sm font-medium">Obteniendo tu ubicación…</p>
        </div>
      )}

      {status === 'denied' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/90 px-6 text-center text-neutral-600">
          <MapPinOff className="h-8 w-8 text-alerta" />
          <p className="text-sm font-medium text-neutral-700">Necesitamos tu ubicación</p>
          <p className="max-w-xs text-xs text-neutral-500">
            El reporte debe hacerse desde el lugar del animalito. Activa el permiso de ubicación de
            tu navegador y vuelve a intentar.
          </p>
          <button
            type="button"
            onClick={locate}
            className="mt-1 rounded-full bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-center">
            <p className="rounded-full bg-white/90 px-3 py-1.5 text-center text-xs font-medium text-neutral-600 shadow">
              Arrastra el pin para afinar el lugar exacto
            </p>
          </div>
          <button
            type="button"
            onClick={recenter}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-cobalto shadow"
          >
            <LocateFixed className="h-4 w-4" /> Centrar
          </button>
        </>
      )}
    </div>
  );
}
