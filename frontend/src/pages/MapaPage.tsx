import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { PageHeader } from '../components/ui/PageHeader';
import { CountUp } from '../components/ui/CountUp';
import { ReportDetail } from '../components/map/ReportDetail';
import { MapListPanel } from '../components/map/MapListPanel';
import { MapFilters } from '../components/map/MapFilters';
import {
  applyReportFilters,
  emptyFilters,
  type ReportFilters,
} from '../lib/reportFilters';
import { mockReports, type Report } from '../data/mockReports';
import { mockAllies, type Ally } from '../data/mockAllies';
import { getReports, getStats, getAllies, type Stats } from '../lib/api';

const MapView = lazy(() =>
  import('../components/map/MapView').then((module) => ({ default: module.MapView })),
);

export function MapaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [visibleReports, setVisibleReports] = useState<Report[]>([]);
  const [focusReport, setFocusReport] = useState<Report | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [allies, setAllies] = useState<Ally[]>([]);

  const filteredReports = useMemo(
    () => (reports ? applyReportFilters(reports, filters) : null),
    [reports, filters],
  );

  useEffect(() => {
    let active = true;
    getReports()
      .then((data) => {
        if (active) setReports(data);
      })
      .catch(() => {
        if (active) setReports(mockReports);
      });
    getStats()
      .then((data) => {
        if (active) setStats(data);
      })
      .catch(() => {});
    getAllies()
      .then((data) => {
        if (active) setAllies(data.length > 0 ? data : mockAllies);
      })
      .catch(() => {
        if (active) setAllies(mockAllies);
      });
    return () => {
      active = false;
    };
  }, []);

  const reportId = searchParams.get('reporte');
  const selectedReport = reportId
    ? ((reports ?? []).find((report) => report.id === reportId) ?? null)
    : null;

  const aliadoId = searchParams.get('aliado');
  const focusAlly = useMemo(
    () => (aliadoId ? (allies.find((ally) => ally.id === aliadoId) ?? null) : null),
    [aliadoId, allies],
  );

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

  const closePanel = () => {
    setPanelOpen(false);
    setResetSignal((value) => value + 1);
  };

  const statCards = [
    { label: 'Reportes activos', value: stats?.reportesActivos ?? null },
    { label: 'Rescates logrados', value: stats?.rescatesLogrados ?? null },
    { label: 'Voluntarios', value: stats?.voluntarios ?? null },
  ];

  return (
    <div>
      <PageHeader
        title="Mapa de rescates"
        subtitle="Visualiza los animales que necesitan ayuda en Puebla, por colonia y por urgencia."
      />

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

      {reports !== null && (
        <MapFilters
          filters={filters}
          onChange={setFilters}
          total={reports.length}
          shown={filteredReports?.length ?? 0}
        />
      )}

      <div className="relative isolate mt-4 flex h-[60vh] min-h-[420px] overflow-hidden rounded-3xl border border-neutral-200">
        <div className="relative h-full flex-1">
          {filteredReports === null ? (
            <div className="h-full w-full animate-pulse bg-neutral-100" />
          ) : (
            <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-100" />}>
              <MapView
                reports={filteredReports}
                allies={allies}
                onSelectReport={openReport}
                onSelectAlly={handleSelectAlly}
                onOpenList={() => setPanelOpen(true)}
                onVisibleReportsChange={setVisibleReports}
                focusReport={focusReport}
                focusAlly={focusAlly}
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
              <MapListPanel reports={visibleReports} onSelect={selectFromList} onClose={closePanel} />
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
            <MapListPanel reports={visibleReports} onSelect={selectFromList} onClose={closePanel} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReport && <ReportDetail report={selectedReport} onClose={closeReport} />}
      </AnimatePresence>
    </div>
  );
}
