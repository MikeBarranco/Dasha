import { useEffect, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, LocateFixed, Loader2, X, HeartHandshake, Check } from 'lucide-react';
import { type Report, type Severity } from '../../data/mockReports';
import { type Ally, type AllyType, allyTypeLabels } from '../../data/mockAllies';
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

const allyColors: Record<AllyType, string> = {
  veterinary: '#1C4E80',
  shelter: '#6B2C91',
  ngo: '#0E7490',
  educational: '#15803D',
};

const allyFilterTypes: { value: AllyType; label: string }[] = [
  { value: 'veterinary', label: 'Veterinarias' },
  { value: 'shelter', label: 'Refugios' },
  { value: 'ngo', label: 'Asociaciones' },
  { value: 'educational', label: 'Educativos' },
];

function createAllyElement(type: AllyType): HTMLDivElement {
  const element = document.createElement('div');
  element.style.width = '22px';
  element.style.height = '22px';
  element.style.borderRadius = '7px';
  element.style.backgroundColor = allyColors[type] ?? allyColors.ngo;
  element.style.border = '2px solid #ffffff';
  element.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.25)';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.style.cursor = 'pointer';
  element.innerHTML =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  return element;
}

function escapeHTML(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === '&') return '&amp;';
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return '&quot;';
  });
}

function buildAllyPopup(ally: Ally, onMore: () => void): HTMLDivElement {
  const node = document.createElement('div');
  const meta = ally.phone
    ? `${allyTypeLabels[ally.orgType] ?? 'Aliado'} · ${escapeHTML(ally.phone)}`
    : (allyTypeLabels[ally.orgType] ?? 'Aliado');
  node.innerHTML =
    `<div class="dasha-popup-name">${escapeHTML(ally.name)}</div>` +
    `<div class="dasha-popup-count">${meta}</div>` +
    '<button type="button" class="dasha-popup-more">Ver más</button>';
  node.querySelector('button')?.addEventListener('click', onMore);
  return node;
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
  allies?: Ally[];
  onSelectReport: (report: Report) => void;
  onSelectAlly?: (ally: Ally) => void;
  onOpenList?: () => void;
  onVisibleReportsChange?: (reports: Report[]) => void;
  focusReport?: Report | null;
  focusAlly?: Ally | null;
  resetSignal?: number;
};

export function MapView({
  reports,
  allies = [],
  onSelectReport,
  onSelectAlly,
  onOpenList,
  onVisibleReportsChange,
  focusReport,
  focusAlly,
  resetSignal,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const reportsRef = useRef(reports);
  const onSelectRef = useRef(onSelectReport);
  const onOpenListRef = useRef(onOpenList);
  const onVisibleRef = useRef(onVisibleReportsChange);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const coloniaIndexRef = useRef<Map<string, { id: number; coords: unknown }>>(new Map());
  const coloniaFeaturesRef = useRef<Array<{ id: number; name: string }>>([]);
  const applyCountsRef = useRef<(() => void) | null>(null);
  const geoErrorTimer = useRef<number | null>(null);
  const selectColoniaRef = useRef<
    ((id: number, name: string, at: maplibregl.LngLat) => void) | null
  >(null);
  const [coloniaNames, setColoniaNames] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const userLocationRef = useRef<[number, number] | null>(null);
  const countsRef = useRef<Map<string, number>>(new Map());
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const appliedFeatureIdsRef = useRef<number[]>([]);
  const countsDirtyRef = useRef(true);
  const renderMarkersRef = useRef<(() => void) | null>(null);
  const emitVisibleRef = useRef<(() => void) | null>(null);
  const alliesRef = useRef(allies);
  const allyMarkersRef = useRef<maplibregl.Marker[]>([]);
  const renderAllyMarkersRef = useRef<(() => void) | null>(null);
  const onSelectAllyRef = useRef(onSelectAlly);
  const [activeAllyTypes, setActiveAllyTypes] = useState<AllyType[]>([]);
  const activeAllyTypesRef = useRef<AllyType[]>(activeAllyTypes);
  const [allyFilterOpen, setAllyFilterOpen] = useState(false);
  const allyPopupRef = useRef<maplibregl.Popup | null>(null);
  const focusAllyRef = useRef<Ally | null>(focusAlly ?? null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onSelectAllyRef.current = onSelectAlly;
  }, [onSelectAlly]);

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
          features?: Array<{
            id?: number;
            properties?: { name?: string };
            geometry?: { coordinates?: unknown };
          }>;
        }) => {
          if (cancelled) return;
          const index = new Map<string, { id: number; coords: unknown }>();
          const features: Array<{ id: number; name: string }> = [];
          for (const feature of geojson.features ?? []) {
            const name = String(feature.properties?.name ?? '');
            if (!name) continue;
            const id = feature.id ?? 0;
            features.push({ id, name });
            if (!index.has(name)) index.set(name, { id, coords: feature.geometry?.coordinates });
          }
          coloniaIndexRef.current = index;
          coloniaFeaturesRef.current = features;
          setColoniaNames([...index.keys()].sort((a, b) => a.localeCompare(b, 'es')));
          countsDirtyRef.current = true;
          applyCountsRef.current?.();
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

    const applyCounts = () => {
      if (
        !countsDirtyRef.current ||
        !map.getSource('colonias') ||
        !map.isSourceLoaded('colonias') ||
        coloniaFeaturesRef.current.length === 0
      ) {
        return;
      }
      for (const id of appliedFeatureIdsRef.current) {
        map.removeFeatureState({ source: 'colonias', id }, 'count');
      }
      const applied: number[] = [];
      for (const feature of coloniaFeaturesRef.current) {
        const count = countsRef.current.get(feature.name) ?? 0;
        if (count > 0) {
          map.setFeatureState({ source: 'colonias', id: feature.id }, { count });
          applied.push(feature.id);
        }
      }
      appliedFeatureIdsRef.current = applied;
      countsDirtyRef.current = false;
    };
    applyCountsRef.current = applyCounts;

    map.on('load', () => {
      map.addSource('colonias', {
        type: 'geojson',
        data: '/data/colonias-puebla.geojson',
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

      let hoveredId: number | null = null;

      const selectColonia = (id: number, name: string, at: maplibregl.LngLat) => {
        if (id !== hoveredId) {
          if (hoveredId !== null) {
            map.setFeatureState({ source: 'colonias', id: hoveredId }, { hover: false });
          }
          hoveredId = id;
          map.setFeatureState({ source: 'colonias', id }, { hover: true });
          popup.setHTML(popupHTML(name, countsRef.current.get(name) ?? 0));
          popup.addTo(map);
        }
        popup.setLngLat(at);
      };
      selectColoniaRef.current = selectColonia;

      map.on('mousemove', 'colonias-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        if (feature.id === undefined) return;
        const name = String(feature.properties?.name ?? '');
        map.getCanvas().style.cursor = 'pointer';
        selectColonia(Number(feature.id), name, e.lngLat);
      });

      map.on('mouseleave', 'colonias-fill', () => {
        map.getCanvas().style.cursor = '';
        if (hoveredId !== null) {
          map.setFeatureState({ source: 'colonias', id: hoveredId }, { hover: false });
          hoveredId = null;
        }
        popup.remove();
      });

      map.on('click', 'colonias-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const geometry = feature.geometry;
        if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return;
        const name = String(feature.properties?.name ?? '');
        const bounds = new maplibregl.LngLatBounds();
        extendBounds(bounds, geometry.coordinates);
        map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
        if (feature.id !== undefined) selectColonia(Number(feature.id), name, bounds.getCenter());
        onOpenListRef.current?.();
      });

      const updatePinVisibility = () => {
        const show = map.getZoom() >= PIN_MIN_ZOOM;
        for (const marker of markersRef.current) {
          marker.getElement().style.display = show ? 'block' : 'none';
        }
      };

      const renderMarkers = () => {
        for (const marker of markersRef.current) marker.remove();
        markersRef.current = [];
        for (const report of reportsRef.current) {
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
          markersRef.current.push(marker);
        }
        updatePinVisibility();
      };
      renderMarkersRef.current = renderMarkers;

      map.on('zoom', updatePinVisibility);
      renderMarkers();

      const allyPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 16,
        className: 'dasha-popup',
      });
      allyPopupRef.current = allyPopup;

      const renderAllyMarkers = () => {
        for (const marker of allyMarkersRef.current) marker.remove();
        allyMarkersRef.current = [];
        const active = activeAllyTypesRef.current;
        const focusId = focusAllyRef.current?.id;
        for (const ally of alliesRef.current) {
          if (!active.includes(ally.orgType) && ally.id !== focusId) continue;
          const element = createAllyElement(ally.orgType);
          element.addEventListener('click', (event) => {
            event.stopPropagation();
            allyPopup
              .setLngLat([ally.lng, ally.lat])
              .setDOMContent(buildAllyPopup(ally, () => onSelectAllyRef.current?.(ally)))
              .addTo(map);
          });
          const marker = new maplibregl.Marker({ element })
            .setLngLat([ally.lng, ally.lat])
            .addTo(map);
          allyMarkersRef.current.push(marker);
        }
        updatePinVisibility();
      };
      renderAllyMarkersRef.current = renderAllyMarkers;
      renderAllyMarkers();

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
      emitVisibleRef.current = emitVisible;
      map.on('moveend', emitVisible);
      emitVisible();

      setMapReady(true);
    });

    map.on('sourcedata', applyCounts);

    return () => {
      resizeObserver.disconnect();
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      for (const marker of allyMarkersRef.current) marker.remove();
      allyMarkersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (geoErrorTimer.current) window.clearTimeout(geoErrorTimer.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    reportsRef.current = reports;
    const counts = new Map<string, number>();
    for (const report of reports) {
      counts.set(report.colonia, (counts.get(report.colonia) ?? 0) + 1);
    }
    countsRef.current = counts;
    countsDirtyRef.current = true;
    if (!mapReady) return;
    applyCountsRef.current?.();
    renderMarkersRef.current?.();
    emitVisibleRef.current?.();
  }, [reports, mapReady]);

  useEffect(() => {
    alliesRef.current = allies;
    if (!mapReady) return;
    renderAllyMarkersRef.current?.();
  }, [allies, mapReady]);

  useEffect(() => {
    activeAllyTypesRef.current = activeAllyTypes;
    if (!mapReady) return;
    renderAllyMarkersRef.current?.();
  }, [activeAllyTypes, mapReady]);

  useEffect(() => {
    focusAllyRef.current = focusAlly ?? null;
    if (!focusAlly || !mapReady) return;
    renderAllyMarkersRef.current?.();
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [focusAlly.lng, focusAlly.lat], zoom: 16, duration: 900 });
    allyPopupRef.current
      ?.setLngLat([focusAlly.lng, focusAlly.lat])
      .setDOMContent(buildAllyPopup(focusAlly, () => onSelectAllyRef.current?.(focusAlly)))
      .addTo(map);
  }, [focusAlly, mapReady]);

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
    const entry = coloniaIndexRef.current.get(name);
    if (!map || !entry) return;
    const bounds = new maplibregl.LngLatBounds();
    extendBounds(bounds, entry.coords);
    if (bounds.isEmpty()) return;
    map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
    selectColoniaRef.current?.(entry.id, name, bounds.getCenter());
    onOpenListRef.current?.();
    setQuery('');
  };

  const toggleAllyType = (type: AllyType) => {
    setActiveAllyTypes((prev) =>
      prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type],
    );
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

      <div className="absolute left-3 top-16 z-10">
        <button
          type="button"
          onClick={() => setAllyFilterOpen((value) => !value)}
          className="flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-cobalto shadow-lg backdrop-blur transition-colors hover:bg-white"
        >
          <HeartHandshake className="h-4 w-4" />
          Aliados
          {activeAllyTypes.length > 0 && (
            <span className="ml-0.5 rounded-full bg-cobalto px-1.5 text-[10px] font-bold text-white">
              {activeAllyTypes.length}
            </span>
          )}
        </button>

        {allyFilterOpen && (
          <div className="mt-1 w-48 rounded-xl bg-white p-2 shadow-lg">
            <p className="px-2 py-1 text-[11px] text-neutral-400">Mostrar en el mapa</p>
            <ul className="space-y-0.5">
              {allyFilterTypes.map((option) => {
                const on = activeAllyTypes.includes(option.value);
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => toggleAllyType(option.value)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-[3px]"
                        style={{ backgroundColor: allyColors[option.value] }}
                      />
                      <span className="flex-1">{option.label}</span>
                      {on && <Check className="h-4 w-4 text-cobalto" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            {activeAllyTypes.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveAllyTypes([])}
                className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-50"
              >
                Ocultar todos
              </button>
            )}
          </div>
        )}
      </div>

      {geoError && (
        <div className="absolute left-3 right-3 top-28 z-10 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-red-600 shadow">
          {geoError}
        </div>
      )}

      <MapLegend />
    </div>
  );
}
