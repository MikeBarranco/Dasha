import { useEffect, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, LocateFixed, Loader2, X } from 'lucide-react';
import { type Report, type Severity } from '../../data/mockReports';
import { MapLegend } from './MapLegend';

const PUEBLA_CENTER: [number, number] = [-98.2, 19.04];
const PIN_MIN_ZOOM = 13.5;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function colorForCount(count: number): string {
  if (count >= 4) return '#EF4444';
  if (count === 3) return '#FB923C';
  if (count === 2) return '#FDE047';
  if (count === 1) return '#86EFAC';
  return '#CBD5E1';
}

function popupHTML(name: string, count: number): string {
  const label = count > 0 ? `${count} reporte${count === 1 ? '' : 's'}` : 'Sin reportes';
  return (
    '<div class="dasha-popup-row">' +
    `<span class="dasha-popup-dot" style="background:${colorForCount(count)}"></span>` +
    `<span class="dasha-popup-name">${name}</span>` +
    '</div>' +
    `<div class="dasha-popup-count">${label}</div>`
  );
}

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

function createUserDot(): HTMLDivElement {
  const element = document.createElement('div');
  element.style.width = '16px';
  element.style.height = '16px';
  element.style.borderRadius = '9999px';
  element.style.backgroundColor = '#2563EB';
  element.style.border = '3px solid #ffffff';
  element.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.35)';
  return element;
}

type MapViewProps = {
  reports: Report[];
  onSelectReport: (report: Report) => void;
  onOpenList?: () => void;
  onVisibleReportsChange?: (reports: Report[]) => void;
  focusReport?: Report | null;
  resetSignal?: number;
};

export function MapView({
  reports,
  onSelectReport,
  onOpenList,
  onVisibleReportsChange,
  focusReport,
  resetSignal,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const reportsRef = useRef(reports);
  const onSelectRef = useRef(onSelectReport);
  const onOpenListRef = useRef(onOpenList);
  const onVisibleRef = useRef(onVisibleReportsChange);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const coloniaIndexRef = useRef<Map<string, maplibregl.LngLatBounds>>(new Map());
  const geoErrorTimer = useRef<number | null>(null);
  const selectColoniaRef = useRef<((name: string, at: maplibregl.LngLat) => void) | null>(null);
  const [coloniaNames, setColoniaNames] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const userLocationRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelectReport;
  }, [onSelectReport]);

  useEffect(() => {
    onOpenListRef.current = onOpenList;
  }, [onOpenList]);

  useEffect(() => {
    onVisibleRef.current = onVisibleReportsChange;
  }, [onVisibleReportsChange]);

  useEffect(() => {
    if (focusReport) {
      mapRef.current?.flyTo({ center: [focusReport.lng, focusReport.lat], zoom: 15, duration: 800 });
    }
  }, [focusReport]);

  useEffect(() => {
    if (resetSignal && resetSignal > 0) {
      mapRef.current?.flyTo({ center: PUEBLA_CENTER, zoom: 11, duration: 800 });
    }
  }, [resetSignal]);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/colonias-puebla.geojson')
      .then((response) => response.json())
      .then(
        (geojson: {
          features?: Array<{ properties?: { name?: string }; geometry?: { coordinates?: unknown } }>;
        }) => {
          if (cancelled) return;
          const index = new Map<string, maplibregl.LngLatBounds>();
          for (const feature of geojson.features ?? []) {
            const name = String(feature.properties?.name ?? '');
            if (!name || index.has(name)) continue;
            const bounds = new maplibregl.LngLatBounds();
            extendBounds(bounds, feature.geometry?.coordinates);
            if (bounds.isEmpty()) continue;
            index.set(name, bounds);
          }
          coloniaIndexRef.current = index;
          setColoniaNames([...index.keys()].sort((a, b) => a.localeCompare(b, 'es')));
        },
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const reports = reportsRef.current;
    const counts = new Map<string, number>();
    for (const report of reports) {
      counts.set(report.colonia, (counts.get(report.colonia) ?? 0) + 1);
    }

    const map = new maplibregl.Map({
      container,
      style: baseStyle,
      center: PUEBLA_CENTER,
      zoom: 11,
      attributionControl: false,
      cooperativeGestures: true,
      locale: {
        'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
        'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + scroll para hacer zoom',
        'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + scroll para hacer zoom',
      },
    });
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: 'dasha-popup',
    });
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
        paint: {
          'line-color': '#1C4E80',
          'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 0],
          'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0],
        },
      });

      let hoveredName: string | null = null;

      const selectColonia = (name: string, at: maplibregl.LngLat) => {
        if (name !== hoveredName) {
          if (hoveredName !== null) {
            map.setFeatureState({ source: 'colonias', id: hoveredName }, { hover: false });
          }
          hoveredName = name;
          map.setFeatureState({ source: 'colonias', id: name }, { hover: true });
          popup.setHTML(popupHTML(name, counts.get(name) ?? 0));
          popup.addTo(map);
        }
        popup.setLngLat(at);
      };
      selectColoniaRef.current = selectColonia;

      map.on('mousemove', 'colonias-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const name = String(e.features[0].properties?.name ?? '');
        map.getCanvas().style.cursor = 'pointer';
        selectColonia(name, e.lngLat);
      });

      map.on('mouseleave', 'colonias-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredName !== null) {
          map.setFeatureState({ source: 'colonias', id: hoveredName }, { hover: false });
          hoveredName = null;
        }
        popup.remove();
      });

      map.on('click', 'colonias-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const geometry = e.features[0].geometry;
        if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return;
        const name = String(e.features[0].properties?.name ?? '');
        const bounds = new maplibregl.LngLatBounds();
        extendBounds(bounds, geometry.coordinates);
        map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
        if (name) selectColonia(name, bounds.getCenter());
        onOpenListRef.current?.();
      });

      for (const report of reports) {
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

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { longitude, latitude } = position.coords;
            userLocationRef.current = [longitude, latitude];
            userMarkerRef.current?.remove();
            userMarkerRef.current = new maplibregl.Marker({ element: createUserDot() })
              .setLngLat([longitude, latitude])
              .addTo(map);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 },
        );
      }

      const emitVisible = () => {
        const bounds = map.getBounds();
        onVisibleRef.current?.(
          reportsRef.current.filter((report) => bounds.contains([report.lng, report.lat])),
        );
      };
      map.on('moveend', emitVisible);
      emitVisible();
    });

    map.on('sourcedata', () => {
      if (statesApplied || !map.getSource('colonias') || !map.isSourceLoaded('colonias')) return;
      counts.forEach((count, name) => {
        map.setFeatureState({ source: 'colonias', id: name }, { count });
      });
      statesApplied = true;
    });

    return () => {
      resizeObserver.disconnect();
      for (const marker of markers) marker.remove();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (geoErrorTimer.current) window.clearTimeout(geoErrorTimer.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const showGeoError = (message: string) => {
    setGeoError(message);
    if (geoErrorTimer.current) window.clearTimeout(geoErrorTimer.current);
    geoErrorTimer.current = window.setTimeout(() => setGeoError(null), 4000);
  };

  const handleLocate = () => {
    const map = mapRef.current;
    if (!map) return;
    if (userLocationRef.current) {
      map.flyTo({ center: userLocationRef.current, zoom: 15, duration: 1000 });
      return;
    }
    if (!('geolocation' in navigator)) {
      showGeoError('Tu navegador no permite acceder a la ubicación.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { longitude, latitude } = position.coords;
        userLocationRef.current = [longitude, latitude];
        map.flyTo({ center: [longitude, latitude], zoom: 15, duration: 1000 });
        userMarkerRef.current?.remove();
        userMarkerRef.current = new maplibregl.Marker({ element: createUserDot() })
          .setLngLat([longitude, latitude])
          .addTo(map);
      },
      () => {
        setLocating(false);
        showGeoError('No pudimos obtener tu ubicación. Revisa los permisos.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleSelectColonia = (name: string) => {
    const map = mapRef.current;
    const bounds = coloniaIndexRef.current.get(name);
    if (!map || !bounds) return;
    map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
    selectColoniaRef.current?.(name, bounds.getCenter());
    onOpenListRef.current?.();
    setQuery('');
  };

  const suggestions =
    query.trim().length >= 2
      ? coloniaNames
          .filter((name) => normalizeText(name).includes(normalizeText(query)))
          .slice(0, 6)
      : [];

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute left-3 right-3 top-3 z-10 flex items-start justify-between gap-2">
        {searchOpen ? (
          <div className="relative flex-1">
            <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-lg backdrop-blur focus-within:ring-2 focus-within:ring-cobalto/30">
              <Search className="h-4 w-4 flex-shrink-0 text-neutral-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar colonia..."
                className="w-full bg-transparent text-base text-neutral-700 outline-none placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSearchOpen(false);
                }}
                aria-label="Cerrar búsqueda"
              >
                <X className="h-4 w-4 text-neutral-400" />
              </button>
            </div>

            {suggestions.length > 0 && (
              <ul className="absolute mt-1 max-h-60 w-full overflow-y-auto rounded-xl bg-white py-1 shadow-lg">
                {suggestions.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectColonia(name);
                        setSearchOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar colonia"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/95 text-neutral-500 shadow-lg backdrop-blur transition-colors hover:bg-white"
          >
            <Search className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleLocate}
          aria-label="Mi ubicación"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/95 text-cobalto shadow-lg backdrop-blur transition-colors hover:bg-white"
        >
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
        </button>
      </div>

      {geoError && (
        <div className="absolute left-3 right-3 top-16 z-10 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-red-600 shadow">
          {geoError}
        </div>
      )}

      <MapLegend />
    </div>
  );
}
