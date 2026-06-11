import { useEffect, useRef } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mockReports, type Report, type Severity } from '../../data/mockReports';

const PUEBLA_CENTER: [number, number] = [-98.2, 19.04];
const PIN_MIN_ZOOM = 13.5;

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

function severityColor(severity: Severity): string {
  if (severity === 'critica') return '#DC2626';
  if (severity === 'media') return '#F2780B';
  return '#2563EB';
}

function extendBounds(bounds: maplibregl.LngLatBounds, coords: unknown): void {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === 'number') {
    bounds.extend([coords[0] as number, coords[1] as number]);
    return;
  }
  for (const part of coords) extendBounds(bounds, part);
}

type MapViewProps = {
  onSelectReport: (report: Report) => void;
};

export function MapView({ onSelectReport }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelectReport);

  useEffect(() => {
    onSelectRef.current = onSelectReport;
  }, [onSelectReport]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const counts = new Map<string, number>();
    for (const report of mockReports) {
      counts.set(report.colonia, (counts.get(report.colonia) ?? 0) + 1);
    }

    const map = new maplibregl.Map({
      container,
      style: baseStyle,
      center: PUEBLA_CENTER,
      zoom: 11,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
    const markers: maplibregl.Marker[] = [];
    let statesApplied = false;

    map.on('load', () => {
      map.addSource('colonias', {
        type: 'geojson',
        data: '/data/colonias-puebla.geojson',
        promoteId: 'name',
      });

      map.addLayer({
        id: 'colonias-fill',
        type: 'fill',
        source: 'colonias',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'count'], 0],
            1,
            '#86EFAC',
            2,
            '#FDE047',
            3,
            '#FB923C',
            4,
            '#EF4444',
          ],
          'fill-opacity': [
            'case',
            ['>', ['coalesce', ['feature-state', 'count'], 0], 0],
            0.5,
            0.04,
          ],
        },
      });

      map.addLayer({
        id: 'colonias-line',
        type: 'line',
        source: 'colonias',
        paint: { 'line-color': '#1C4E80', 'line-width': 0.6, 'line-opacity': 0.3 },
      });

      map.addLayer({
        id: 'colonias-hover',
        type: 'line',
        source: 'colonias',
        paint: { 'line-color': '#1C4E80', 'line-width': 2 },
        filter: ['==', ['get', 'name'], ''],
      });

      map.on('mousemove', 'colonias-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const name = String(e.features[0].properties?.name ?? '');
        const count = counts.get(name) ?? 0;
        map.getCanvas().style.cursor = 'pointer';
        map.setFilter('colonias-hover', ['==', ['get', 'name'], name]);
        const text = count > 0 ? `${name} · ${count} reporte${count === 1 ? '' : 's'}` : name;
        popup.setLngLat(e.lngLat).setText(text).addTo(map);
      });

      map.on('mouseleave', 'colonias-fill', () => {
        map.getCanvas().style.cursor = '';
        map.setFilter('colonias-hover', ['==', ['get', 'name'], '']);
        popup.remove();
      });

      map.on('click', 'colonias-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const geometry = e.features[0].geometry;
        if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return;
        const bounds = new maplibregl.LngLatBounds();
        extendBounds(bounds, geometry.coordinates);
        map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
      });

      for (const report of mockReports) {
        const element = document.createElement('div');
        element.style.width = '44px';
        element.style.height = '44px';
        element.style.borderRadius = '9999px';
        element.style.border = `3px solid ${severityColor(report.severity)}`;
        element.style.backgroundImage = `url(${report.photo})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
        element.style.cursor = 'pointer';
        element.style.display = 'none';

        element.addEventListener('click', (event) => {
          event.stopPropagation();
          onSelectRef.current(report);
        });
        const marker = new maplibregl.Marker({ element })
          .setLngLat([report.lng, report.lat])
          .addTo(map);
        markers.push(marker);
      }

      const updatePinVisibility = () => {
        const show = map.getZoom() >= PIN_MIN_ZOOM;
        for (const marker of markers) {
          marker.getElement().style.display = show ? 'block' : 'none';
        }
      };
      map.on('zoom', updatePinVisibility);
      updatePinVisibility();
    });

    map.on('sourcedata', () => {
      if (statesApplied || !map.getSource('colonias') || !map.isSourceLoaded('colonias')) return;
      counts.forEach((count, name) => {
        map.setFeatureState({ source: 'colonias', id: name }, { count });
      });
      statesApplied = true;
    });

    return () => {
      for (const marker of markers) marker.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
