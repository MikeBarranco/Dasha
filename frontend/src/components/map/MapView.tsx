import { useEffect, useRef, useState } from 'react';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, LocateFixed, Loader2, X } from 'lucide-react';
import { type Report, type Severity } from '../../data/mockReports';
import { type Ally, type AllyType, allyTypeLabels } from '../../data/mockAllies';
import { type LostPet, daysLost, lostColor } from '../../data/mockLostPets';
import { type MapMode } from '../../lib/mapMode';
import { getColoniesByCp, type Colonia } from '../../lib/api';
import { whatsappUrl } from '../../lib/whatsapp';
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

function createAllyElement(ally: Ally): HTMLDivElement {
  const element = document.createElement('div');
  element.style.width = '40px';
  element.style.height = '40px';
  element.style.borderRadius = '9999px';
  element.style.border = `3px solid ${allyColors[ally.orgType] ?? allyColors.ngo}`;
  element.style.backgroundColor = '#ffffff';
  element.style.backgroundImage = `url(${ally.logoUrl ?? '/placeholder-logo.svg'})`;
  element.style.backgroundSize = 'cover';
  element.style.backgroundPosition = 'center';
  element.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
  element.style.cursor = 'pointer';
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

function createLostPetElement(pet: LostPet): HTMLDivElement {
  const element = document.createElement('div');
  element.style.width = '40px';
  element.style.height = '40px';
  element.style.borderRadius = '9999px';
  element.style.border = `3px solid ${lostColor(pet.lostAt)}`;
  element.style.backgroundColor = '#ffffff';
  element.style.backgroundImage = `url(${pet.photo})`;
  element.style.backgroundSize = 'cover';
  element.style.backgroundPosition = 'center';
  element.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
  element.style.cursor = 'pointer';
  return element;
}

function buildLostPopup(pet: LostPet, onMore: () => void): HTMLDivElement {
  const node = document.createElement('div');
  const days = daysLost(pet.lostAt);
  const species = pet.species === 'perro' ? 'Perro' : 'Gato';
  const waUrl = whatsappUrl(
    pet.contactPhone,
    `Hola, vi el reporte de ${pet.petName} en Dasha. ¿Puedo ayudar?`,
  );
  node.innerHTML =
    `<div class="dasha-popup-name">${escapeHTML(pet.petName)}</div>` +
    `<div class="dasha-popup-count">${species} · perdido hace ${days} día${days === 1 ? '' : 's'}</div>` +
    (waUrl
      ? `<a href="${waUrl}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:6px;padding:6px 10px;border-radius:8px;background:#16a34a;color:#fff;font-size:12px;font-weight:600;text-decoration:none;">Contactar por WhatsApp</a>`
      : '') +
    '<button type="button" class="dasha-popup-more">Ver más</button>';
  node.querySelector('button')?.addEventListener('click', onMore);
  return node;
}

type CircleFeature = {
  type: 'Feature';
  properties: { color: string };
  geometry: { type: 'Polygon'; coordinates: number[][][] };
};

function circleFeature(lng: number, lat: number, radiusKm: number, color: string): CircleFeature {
  const ring: number[][] = [];
  const points = 64;
  const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const dy = radiusKm / 110.574;
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * 2 * Math.PI;
    ring.push([lng + dx * Math.cos(angle), lat + dy * Math.sin(angle)]);
  }
  ring.push(ring[0]);
  return { type: 'Feature', properties: { color }, geometry: { type: 'Polygon', coordinates: [ring] } };
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
  lostPets?: LostPet[];
  mode?: MapMode;
  activeAllyTypes?: AllyType[];
  onSelectReport: (report: Report) => void;
  onSelectAlly?: (ally: Ally) => void;
  onSelectLostPet?: (pet: LostPet) => void;
  onOpenList?: () => void;
  onVisibleReportsChange?: (reports: Report[]) => void;
  onVisibleAlliesChange?: (allies: Ally[]) => void;
  onVisibleLostPetsChange?: (pets: LostPet[]) => void;
  focusReport?: Report | null;
  focusAlly?: Ally | null;
  focusLostPet?: LostPet | null;
  resetSignal?: number;
};

export function MapView({
  reports,
  allies = [],
  lostPets = [],
  mode = 'calle',
  activeAllyTypes = [],
  onSelectReport,
  onSelectAlly,
  onSelectLostPet,
  onOpenList,
  onVisibleReportsChange,
  onVisibleAlliesChange,
  onVisibleLostPetsChange,
  focusReport,
  focusAlly,
  focusLostPet,
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
  // Resultados de la búsqueda por CP, llaveados al CP consultado para no mostrar
  // datos viejos mientras se teclea otro código.
  const [cpResults, setCpResults] = useState<{ cp: string; list: Colonia[] } | null>(null);
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
  const onSelectLostPetRef = useRef(onSelectLostPet);
  const activeAllyTypesRef = useRef<AllyType[]>(activeAllyTypes);
  const allyPopupRef = useRef<maplibregl.Popup | null>(null);
  const lostPetsRef = useRef<LostPet[]>(lostPets);
  const lostMarkersRef = useRef<maplibregl.Marker[]>([]);
  const renderLostPetsRef = useRef<(() => void) | null>(null);
  const lostPopupRef = useRef<maplibregl.Popup | null>(null);
  const onVisibleAlliesRef = useRef(onVisibleAlliesChange);
  const onVisibleLostPetsRef = useRef(onVisibleLostPetsChange);
  const focusAllyRef = useRef<Ally | null>(focusAlly ?? null);
  const modeRef = useRef<MapMode>(mode);
  const applyModeRef = useRef<(() => void) | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onSelectAllyRef.current = onSelectAlly;
  }, [onSelectAlly]);

  useEffect(() => {
    onSelectLostPetRef.current = onSelectLostPet;
  }, [onSelectLostPet]);

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
    onVisibleAlliesRef.current = onVisibleAlliesChange;
  }, [onVisibleAlliesChange]);

  useEffect(() => {
    onVisibleLostPetsRef.current = onVisibleLostPetsChange;
  }, [onVisibleLostPetsChange]);

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

  // Búsqueda por código postal: al teclear 5 dígitos se consulta al backend
  // (las colonias de ese CP viven en la base, no en el geojson local). El
  // setState solo ocurre dentro de callbacks async para no disparar renders en
  // cascada.
  useEffect(() => {
    const trimmed = query.trim();
    if (!/^\d{5}$/.test(trimmed)) return;
    let active = true;
    const timer = window.setTimeout(() => {
      getColoniesByCp(trimmed)
        .then((data) => {
          if (active) setCpResults({ cp: trimmed, list: data });
        })
        .catch(() => {
          if (active) setCpResults({ cp: trimmed, list: [] });
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

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

      map.addSource('perdidos-zonas', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'perdidos-fill',
        type: 'fill',
        source: 'perdidos-zonas',
        layout: { visibility: 'none' },
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'perdidos-line',
        type: 'line',
        source: 'perdidos-zonas',
        layout: { visibility: 'none' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-opacity': 0.7,
          'line-dasharray': [2, 2],
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
        const show = modeRef.current === 'calle' && map.getZoom() >= PIN_MIN_ZOOM;
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
        const inAliados = modeRef.current === 'aliados';
        const active = activeAllyTypesRef.current;
        const showAll = active.length === 0;
        const focusId = focusAllyRef.current?.id;
        for (const ally of alliesRef.current) {
          const isFocus = ally.id === focusId;
          if (!inAliados && !isFocus) continue;
          if (inAliados && !showAll && !active.includes(ally.orgType) && !isFocus) continue;
          const element = createAllyElement(ally);
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

      const lostPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 16,
        className: 'dasha-popup',
      });
      lostPopupRef.current = lostPopup;

      const renderLostPets = () => {
        for (const marker of lostMarkersRef.current) marker.remove();
        lostMarkersRef.current = [];
        const inPerdidos = modeRef.current === 'perdidos';
        const source = map.getSource('perdidos-zonas') as maplibregl.GeoJSONSource | undefined;
        const features = inPerdidos
          ? lostPetsRef.current.map((pet) =>
              circleFeature(pet.lng, pet.lat, pet.searchRadiusKm, lostColor(pet.lostAt)),
            )
          : [];
        source?.setData({ type: 'FeatureCollection', features });
        if (inPerdidos) {
          for (const pet of lostPetsRef.current) {
            const element = createLostPetElement(pet);
            element.addEventListener('click', (event) => {
              event.stopPropagation();
              // Vuela a la mascota y abre el globo; "Ver más" abre la tarjeta.
              map.flyTo({ center: [pet.lng, pet.lat], zoom: 15, duration: 900 });
              lostPopup
                .setLngLat([pet.lng, pet.lat])
                .setDOMContent(
                  buildLostPopup(pet, () => {
                    lostPopup.remove();
                    onSelectLostPetRef.current?.(pet);
                  }),
                )
                .addTo(map);
            });
            const marker = new maplibregl.Marker({ element })
              .setLngLat([pet.lng, pet.lat])
              .addTo(map);
            lostMarkersRef.current.push(marker);
          }
        }
      };
      renderLostPetsRef.current = renderLostPets;

      const applyModeVisibility = () => {
        const calle = modeRef.current === 'calle';
        // Las divisiones de colonias (contorno) se ven en todos los modos;
        // el mapa de calor (relleno) y el hover solo en Calle.
        if (map.getLayer('colonias-line')) {
          map.setLayoutProperty('colonias-line', 'visibility', 'visible');
        }
        for (const layerId of ['colonias-fill', 'colonias-hover']) {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', calle ? 'visible' : 'none');
          }
        }
        const perdidosVisibility = modeRef.current === 'perdidos' ? 'visible' : 'none';
        for (const layerId of ['perdidos-fill', 'perdidos-line']) {
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', perdidosVisibility);
        }
        // Al cambiar de modo se cierran los globos para que no queden sueltos.
        popup.remove();
        allyPopup.remove();
        lostPopup.remove();
        updatePinVisibility();
        renderAllyMarkers();
        renderLostPets();
      };
      applyModeRef.current = applyModeVisibility;
      applyModeVisibility();

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
        const active = activeAllyTypesRef.current;
        const showAllAllies = active.length === 0;
        onVisibleAlliesRef.current?.(
          alliesRef.current.filter(
            (ally) =>
              (showAllAllies || active.includes(ally.orgType)) &&
              bounds.contains([ally.lng, ally.lat]),
          ),
        );
        onVisibleLostPetsRef.current?.(
          lostPetsRef.current.filter((pet) => bounds.contains([pet.lng, pet.lat])),
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
      for (const marker of lostMarkersRef.current) marker.remove();
      lostMarkersRef.current = [];
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
    emitVisibleRef.current?.();
  }, [allies, mapReady]);

  useEffect(() => {
    activeAllyTypesRef.current = activeAllyTypes;
    if (!mapReady) return;
    renderAllyMarkersRef.current?.();
    emitVisibleRef.current?.();
  }, [activeAllyTypes, mapReady]);

  useEffect(() => {
    modeRef.current = mode;
    if (!mapReady) return;
    applyModeRef.current?.();
    emitVisibleRef.current?.();
  }, [mode, mapReady]);

  useEffect(() => {
    lostPetsRef.current = lostPets;
    if (!mapReady) return;
    renderLostPetsRef.current?.();
    emitVisibleRef.current?.();
  }, [lostPets, mapReady]);

  useEffect(() => {
    if (!focusLostPet || !mapReady) return;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [focusLostPet.lng, focusLostPet.lat], zoom: 15, duration: 900 });
    lostPopupRef.current
      ?.setLngLat([focusLostPet.lng, focusLostPet.lat])
      .setDOMContent(
        buildLostPopup(focusLostPet, () => {
          lostPopupRef.current?.remove();
          onSelectLostPetRef.current?.(focusLostPet);
        }),
      )
      .addTo(map);
  }, [focusLostPet, mapReady]);

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

  // Busca la colonia del CP dentro del geojson local (comparando sin acentos ni
  // mayúsculas). Si está, vuela a su polígono y la resalta como el buscador por
  // nombre; si no, vuela a las coordenadas que da el backend.
  const handleSelectCpColonia = (colonia: Colonia) => {
    const map = mapRef.current;
    if (!map) return;
    const target = normalizeText(colonia.name);
    let matchedName: string | null = null;
    for (const name of coloniaIndexRef.current.keys()) {
      if (normalizeText(name) === target) {
        matchedName = name;
        break;
      }
    }
    if (matchedName) {
      handleSelectColonia(matchedName);
      return;
    }
    if (colonia.lat && colonia.lng) {
      map.flyTo({ center: [colonia.lng, colonia.lat], zoom: 15, duration: 800 });
      onOpenListRef.current?.();
      setQuery('');
    }
  };

  const isCpQuery = /^\d+$/.test(query.trim());
  const cpReady = cpResults !== null && cpResults.cp === query.trim();
  const suggestions =
    !isCpQuery && query.trim().length >= 2
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
                placeholder="Busca por colonia o código postal"
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

            {isCpQuery && query.trim().length === 5 && (
              <div className="absolute mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg">
                {!cpReady ? (
                  <p className="px-3 py-2 text-sm text-neutral-400">Buscando colonias...</p>
                ) : cpResults.list.length > 0 ? (
                  <ul className="max-h-60 overflow-y-auto py-1">
                    {cpResults.list.map((colonia, index) => (
                      <li key={`${colonia.name}-${index}`}>
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectCpColonia(colonia);
                            setSearchOpen(false);
                          }}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          <span className="truncate">{colonia.name}</span>
                          <span className="flex-shrink-0 text-xs text-neutral-400">
                            {colonia.postalCode}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-sm text-neutral-400">
                    No encontramos colonias con ese código postal.
                  </p>
                )}
              </div>
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

      {mode === 'perdidos' && lostPets.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-xl bg-white/95 px-4 py-2 text-center text-xs text-neutral-500 shadow">
          Por ahora no hay mascotas perdidas reportadas en el mapa.
        </div>
      )}

      {geoError && (
        <div className="absolute left-3 right-3 top-28 z-10 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-red-600 shadow">
          {geoError}
        </div>
      )}

      <MapLegend mode={mode} />
    </div>
  );
}
