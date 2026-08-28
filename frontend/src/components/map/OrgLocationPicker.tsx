import { useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Picker de ubicación para el registro/edición de un ALIADO. A diferencia del de
// reportes (que fuerza el GPS y limita el pin a 50 m), este se centra en la
// colonia elegida por CP, DIBUJA su polígono (igual que el mapa de calle) y deja
// arrastrar el pin libremente para afinar la dirección del negocio. Nunca se
// piden lat/lng a mano.

const PUEBLA_CENTER: [number, number] = [-98.2, 19.04];

const baseStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      // OpenStreetMap estandar (sin API key). Cambiado desde CARTO porque CARTO
      // empezo a exigir llave y las teselas salian con la marca "API key required".
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
};

type ColoniaFeature = {
  type: 'Feature';
  properties: { name?: string } | null;
  geometry: { type: string; coordinates: unknown };
};

type ColoniaCollection = { features: ColoniaFeature[] };

// Normaliza para comparar nombres de colonia entre el backend y el geojson local
// (sin acentos, sin mayúsculas, sin espacios de sobra).
function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Extiende un bounds recorriendo coordenadas anidadas (Polygon o MultiPolygon).
function extendBounds(bounds: maplibregl.LngLatBounds, coords: unknown): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    bounds.extend([coords[0] as number, coords[1] as number]);
    return;
  }
  for (const child of coords) extendBounds(bounds, child);
}

type OrgLocationPickerProps = {
  // Centroide de la colonia elegida. Al cambiar, recentra el mapa y el pin.
  center: { lat: number; lng: number } | null;
  // Nombre de la colonia (para dibujar su polígono desde el geojson local).
  colonyName?: string;
  onChange: (lat: number, lng: number) => void;
};

export function OrgLocationPicker({ center, colonyName, onChange }: OrgLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const geoRef = useRef<ColoniaCollection | null>(null);
  // Últimos valores aplicados: evitan el BUCLE (el efecto llamaba onChange, el
  // padre hacía setState y volvía a entrar) y el re-encuadre al arrastrar el pin.
  const lastCenterKeyRef = useRef('');
  const lastColonyRef = useRef('');
  const hasColoniaRef = useRef(false);

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
      zoom: center ? 15 : 11,
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

  // Carga el geojson de colonias una sola vez (para dibujar el polígono).
  useEffect(() => {
    let active = true;
    fetch('/data/colonias-puebla.geojson')
      .then((response) => response.json())
      .then((data: ColoniaCollection) => {
        if (active) geoRef.current = data;
      })
      .catch(() => {
        // Sin geojson no dibujamos el polígono; el mapa sigue funcionando.
      });
    return () => {
      active = false;
    };
  }, []);

  // Cuando cambia la colonia (nuevo centroide o nombre): recentra, dibuja el
  // polígono y coloca el pin. NO llama onChange (el padre ya tiene el centroide al
  // elegir la colonia); así se rompe el bucle que trababa el mapa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    const centerKey = `${center.lat},${center.lng}`;
    const colony = colonyName ?? '';
    const centerChanged = centerKey !== lastCenterKeyRef.current;
    const colonyChanged = colony !== lastColonyRef.current;
    if (!centerChanged && !colonyChanged) return;
    lastCenterKeyRef.current = centerKey;
    lastColonyRef.current = colony;

    const lngLat: [number, number] = [center.lng, center.lat];

    // Dibuja (o limpia) el polígono de la colonia desde el geojson local.
    const drawColonia = () => {
      hasColoniaRef.current = false;
      if (map.getLayer('org-colonia-fill')) map.removeLayer('org-colonia-fill');
      if (map.getLayer('org-colonia-line')) map.removeLayer('org-colonia-line');
      if (map.getSource('org-colonia')) map.removeSource('org-colonia');

      const collection = geoRef.current;
      if (!colony || !collection) return;
      const target = normalizeName(colony);
      const feature = collection.features.find(
        (item) => normalizeName(String(item.properties?.name ?? '')) === target,
      );
      if (!feature) return;

      map.addSource(
        'org-colonia',
        { type: 'geojson', data: feature } as unknown as Parameters<maplibregl.Map['addSource']>[1],
      );
      map.addLayer({
        id: 'org-colonia-fill',
        type: 'fill',
        source: 'org-colonia',
        paint: { 'fill-color': '#1C4E80', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'org-colonia-line',
        type: 'line',
        source: 'org-colonia',
        paint: { 'line-color': '#1C4E80', 'line-width': 2 },
      });

      const bounds = new maplibregl.LngLatBounds();
      extendBounds(bounds, feature.geometry.coordinates);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 30, maxZoom: 16, duration: 600 });
        hasColoniaRef.current = true;
      }
    };

    const apply = () => {
      if (colonyChanged) drawColonia();
      // Si no se dibujó polígono (colonia no encontrada en el geojson), centramos
      // en el centroide.
      if (!hasColoniaRef.current) map.flyTo({ center: lngLat, zoom: 16, duration: 600 });

      if (!markerRef.current) {
        const marker = new maplibregl.Marker({ draggable: true, color: '#F2780B' })
          .setLngLat(lngLat)
          .addTo(map);
        marker.on('dragend', () => {
          const ll = marker.getLngLat();
          // Marcamos este punto como "ya aplicado" para que el setState del padre
          // no vuelva a re-encuadrar el mapa (evita el salto al soltar el pin).
          lastCenterKeyRef.current = `${ll.lat},${ll.lng}`;
          onChangeRef.current(ll.lat, ll.lng);
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLngLat(lngLat);
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [center, colonyName]);

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
