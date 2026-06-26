import { useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, LocateFixed } from 'lucide-react';

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

type LocationPickerProps = {
  onChange?: (lat: number, lng: number) => void;
};

export function LocationPicker({ onChange }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: baseStyle,
      center: PUEBLA_CENTER,
      zoom: 14,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('move', () => {
      const center = map.getCenter();
      onChangeRef.current?.(center.lat, center.lng);
    });
    
    // Initial call
    onChangeRef.current?.(PUEBLA_CENTER[1], PUEBLA_CENTER[0]);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // Remove onChange dependency so map doesn't recreate on pan

  const handleUseMyLocation = () => {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 16,
        });
      },
      (error) => {
        console.error('Error getting location', error);
        alert('No se pudo obtener tu ubicación. Verifica los permisos de tu navegador o si tu dispositivo tiene el GPS activo.');
      }
    );
  };

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-neutral-200">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <MapPin className="h-9 w-9 fill-naranja text-naranja drop-shadow" />
      </div>
      <button
        type="button"
        onClick={handleUseMyLocation}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-cobalto shadow"
      >
        <LocateFixed className="h-4 w-4" /> Mi ubicación
      </button>
    </div>
  );
}
