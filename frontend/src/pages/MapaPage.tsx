import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { PageHeader } from '../components/ui/PageHeader';
import { ReportDetail } from '../components/map/ReportDetail';
import { mockReports, type Report } from '../data/mockReports';
import { getReports, getStats, type Stats } from '../lib/api';

const MapView = lazy(() =>
  import('../components/map/MapView').then((module) => ({ default: module.MapView })),
);

export function MapaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

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
    return () => {
      active = false;
    };
  }, []);

  const reportId = searchParams.get('reporte');
  const selectedReport = reportId
    ? ((reports ?? []).find((report) => report.id === reportId) ?? null)
    : null;

  const openReport = (report: Report) => {
    setSearchParams({ reporte: report.id });
  };

  const closeReport = () => {
    setSearchParams({});
  };

  const statCards = [
    { label: 'Reportes activos', value: stats ? stats.reportesActivos : '—' },
    { label: 'Rescates logrados', value: stats ? stats.rescatesLogrados : '—' },
    { label: 'Voluntarios', value: stats ? stats.voluntarios : '—' },
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
            <p className="font-display text-2xl font-bold text-cobalto">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 h-[60vh] min-h-[420px] overflow-hidden rounded-3xl border border-neutral-200">
        {reports === null ? (
          <div className="h-full w-full animate-pulse bg-neutral-100" />
        ) : (
          <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-100" />}>
            <MapView reports={reports} onSelectReport={openReport} />
          </Suspense>
        )}
      </div>

      <AnimatePresence>
        {selectedReport && <ReportDetail report={selectedReport} onClose={closeReport} />}
      </AnimatePresence>
    </div>
  );
}
