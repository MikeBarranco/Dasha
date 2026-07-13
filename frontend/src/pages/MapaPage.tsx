import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { CountUp } from '../components/ui/CountUp';
import { ReportDetail } from '../components/map/ReportDetail';
import { LostPetDetail } from '../components/map/LostPetDetail';
import { MapListPanel } from '../components/map/MapListPanel';
import { AllyListPanel } from '../components/map/AllyListPanel';
import { LostPetListPanel } from '../components/map/LostPetListPanel';
import { MapFilters } from '../components/map/MapFilters';
import {
  applyReportFilters,
  emptyFilters,
  type ReportFilters,
} from '../lib/reportFilters';
import { MapModeSwitch } from '../components/map/MapModeSwitch';
import { AllyFilters } from '../components/map/AllyFilters';
import { type Report } from '../data/mockReports';
import { type Ally, type AllyType } from '../data/mockAllies';
import { type LostPet } from '../data/mockLostPets';
import { type MapMode } from '../lib/mapMode';
import { getReports, getStats, getAllies, getLostPets, type Stats } from '../lib/api';

const MapView = lazy(() =>
  import('../components/map/MapView').then((module) => ({ default: module.MapView })),
);

export function MapaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => Boolean(searchParams.get('aliado')));
  const [visibleReports, setVisibleReports] = useState<Report[]>([]);
  const [focusReport, setFocusReport] = useState<Report | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [allies, setAllies] = useState<Ally[]>([]);
  const [mapMode, setMapMode] = useState<MapMode>(() =>
    searchParams.get('aliado') ? 'aliados' : 'calle',
  );
  const [allyTypes, setAllyTypes] = useState<AllyType[]>([]);
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [visibleAllies, setVisibleAllies] = useState<Ally[]>([]);
  const [visibleLostPets, setVisibleLostPets] = useState<LostPet[]>([]);
  const [listFocusAlly, setListFocusAlly] = useState<Ally | null>(null);
  const [focusLostPet, setFocusLostPet] = useState<LostPet | null>(null);
  const [detailLostPet, setDetailLostPet] = useState<LostPet | null>(null);
  const [reportsError, setReportsError] = useState(false);

  const filteredReports = useMemo(
    () => (reports ? applyReportFilters(reports, filters) : null),
    [reports, filters],
  );

  // Sin datos de ejemplo: si la API falla, se muestran estados vacíos/errores
  // reales (nunca reportes o aliados inventados) para que se note si algo no responde.
  const fetchAll = (isActive: () => boolean) => {
    getReports()
      .then((data) => {
        if (isActive()) setReports(data);
      })
      .catch(() => {
        if (isActive()) {
          setReports([]);
          setReportsError(true);
        }
      });
    getStats()
      .then((data) => {
        if (isActive()) setStats(data);
      })
      .catch(() => {});
    getAllies()
      .then((data) => {
        if (isActive()) setAllies(data);
      })
      .catch(() => {
        if (isActive()) setAllies([]);
      });
    getLostPets()
      .then((data) => {
        if (isActive()) setLostPets(data);
      })
      .catch(() => {
        if (isActive()) setLostPets([]);
      });
  };

  useEffect(() => {
    let active = true;
    fetchAll(() => active);
    return () => {
      active = false;
    };
  }, []);

  const retryLoad = () => {
    setReportsError(false);
    fetchAll(() => true);
  };

  const reportId = searchParams.get('reporte');
  const selectedReport = reportId
    ? ((reports ?? []).find((report) => report.id === reportId) ?? null)
    : null;

  const aliadoId = searchParams.get('aliado');
  const urlFocusAlly = useMemo(
    () => (aliadoId ? (allies.find((ally) => ally.id === aliadoId) ?? null) : null),
    [aliadoId, allies],
  );
  const focusAlly = listFocusAlly ?? urlFocusAlly;

  const changeMode = (next: MapMode) => {
    setMapMode(next);
    // En Aliados y Perdidos la lista de la zona se muestra sola; en Calle se abre
    // al tocar una colonia.
    setPanelOpen(next === 'aliados' || next === 'perdidos');
    setListFocusAlly(null);
    setFocusLostPet(null);
    if (next !== 'aliados' && aliadoId) setSearchParams({});
  };

  const handleSelectAlly = (ally: Ally) => {
    navigate(`/aliados?aliado=${ally.id}`);
  };

  const openReport = (report: Report) => {
    setSearchParams({ reporte: report.id });
  };

  const closeReport = () => {
    setSearchParams({});
  };

  const selectFromList = (report: Report) => {
    openReport(report);
    setFocusReport(report);
  };

  const selectAllyFromList = (ally: Ally) => {
    setListFocusAlly(ally);
  };

  const selectLostFromList = (pet: LostPet) => {
    // Vuela a la mascota y abre el globo (mismo flujo que tocar el pin). La
    // tarjeta se abre con "Ver más". Solo un estado activo a la vez => cierre limpio.
    setFocusLostPet(pet);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setResetSignal((value) => value + 1);
  };

  const renderPanel = () => {
    if (mapMode === 'aliados') {
      return (
        <AllyListPanel allies={visibleAllies} onSelect={selectAllyFromList} onClose={closePanel} />
      );
    }
    if (mapMode === 'perdidos') {
      return (
        <LostPetListPanel pets={visibleLostPets} onSelect={selectLostFromList} onClose={closePanel} />
      );
    }
    return <MapListPanel reports={visibleReports} onSelect={selectFromList} onClose={closePanel} />;
  };

  const headerByMode: Record<MapMode, { title: string; subtitle: string }> = {
    calle: {
      title: 'Mapa de rescates',
      subtitle:
        'Visualiza los animales que necesitan ayuda en Puebla, por colonia y por urgencia.',
    },
    aliados: {
      title: 'Aliados en el mapa',
      subtitle: 'Veterinarias, refugios y asociaciones que apoyan el rescate en Puebla.',
    },
    perdidos: {
      title: 'Mascotas perdidas',
      subtitle: 'Zonas de búsqueda activas. Ayuda a reunir a las mascotas con su familia.',
    },
  };
  const header = headerByMode[mapMode];

  // Los contadores corresponden al modo activo y se derivan de los datos reales
  // que alimentan el mapa (no de un total global), para que siempre coincidan
  // con lo que se ve en pantalla.
  const statCards = useMemo<{ label: string; value: number | null }[]>(() => {
    if (mapMode === 'perdidos') {
      return [
        { label: 'Mascotas perdidas', value: lostPets.length },
        { label: 'Perros', value: lostPets.filter((pet) => pet.species === 'perro').length },
        { label: 'Gatos', value: lostPets.filter((pet) => pet.species === 'gato').length },
      ];
    }
    if (mapMode === 'aliados') {
      return [
        { label: 'Aliados', value: allies.length },
        {
          label: 'Veterinarias',
          value: allies.filter((ally) => ally.orgType === 'veterinary').length,
        },
        { label: 'Refugios', value: allies.filter((ally) => ally.orgType === 'shelter').length },
      ];
    }
    return [
      { label: 'Reportes activos', value: reports?.length ?? null },
      { label: 'Rescates logrados', value: stats?.rescatesLogrados ?? null },
      { label: 'Voluntarios', value: stats?.voluntarios ?? null },
    ];
  }, [mapMode, lostPets, allies, reports, stats]);

  return (
    <div>
      <PageHeader title={header.title} subtitle={header.subtitle} />

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.07, ease: 'easeOut' }}
            className="rounded-2xl border border-neutral-200 bg-white p-4"
          >
            <p className="font-display text-2xl font-bold text-cobalto">
              {stat.value === null ? '—' : <CountUp value={stat.value} />}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {reportsError && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-alerta/20 bg-alerta/5 px-4 py-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-alerta" />
          <p className="min-w-0 flex-1 text-sm text-neutral-700">
            No pudimos cargar los reportes. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            type="button"
            onClick={retryLoad}
            className="flex items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      )}

      <div className="relative z-30 mt-4 flex items-start justify-between gap-3">
        <MapModeSwitch mode={mapMode} onChange={changeMode} />
        {mapMode === 'calle' && reports !== null && (
          <MapFilters
            filters={filters}
            onChange={setFilters}
            total={reports.length}
            shown={filteredReports?.length ?? 0}
          />
        )}
        {mapMode === 'aliados' && <AllyFilters activeTypes={allyTypes} onChange={setAllyTypes} />}
      </div>

      <div className="relative isolate mt-4 flex h-[60vh] min-h-[420px] overflow-hidden rounded-3xl border border-neutral-200">
        <div className="relative h-full flex-1">
          {filteredReports === null ? (
            <div className="h-full w-full animate-pulse bg-neutral-100" />
          ) : (
            <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-100" />}>
              <MapView
                reports={filteredReports}
                allies={allies}
                lostPets={lostPets}
                mode={mapMode}
                activeAllyTypes={allyTypes}
                onSelectReport={openReport}
                onSelectAlly={handleSelectAlly}
                onSelectLostPet={setDetailLostPet}
                onOpenList={() => setPanelOpen(true)}
                onVisibleReportsChange={setVisibleReports}
                onVisibleAlliesChange={setVisibleAllies}
                onVisibleLostPetsChange={setVisibleLostPets}
                focusReport={focusReport}
                focusAlly={focusAlly}
                focusLostPet={focusLostPet}
                resetSignal={resetSignal}
              />
            </Suspense>
          )}
        </div>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              key="map-list-desktop"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="hidden h-full w-80 flex-shrink-0 border-l border-neutral-200 bg-white md:block"
            >
              {renderPanel()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key="map-list-mobile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mt-3 h-[55vh] overflow-hidden rounded-2xl border border-neutral-200 bg-white md:hidden"
          >
            {renderPanel()}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReport && <ReportDetail report={selectedReport} onClose={closeReport} />}
      </AnimatePresence>

      <AnimatePresence>
        {detailLostPet && (
          <LostPetDetail pet={detailLostPet} onClose={() => setDetailLostPet(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
