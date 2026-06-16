import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PageHeader } from '../components/ui/PageHeader';
import { ReportDetail } from '../components/map/ReportDetail';
import type { Report } from '../data/mockReports';

const MapView = lazy(() =>
  import('../components/map/MapView').then((module) => ({ default: module.MapView })),
);

export function MapaPage() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeReports, setActiveReports] = useState<number>(0);

  const stats = [
    { label: 'Reportes activos', value: activeReports.toString() },
    { label: 'Rescates logrados', value: '342' },
    { label: 'Voluntarios', value: '57' },
  ];

  return (
    <div>
      <PageHeader
        title="Mapa de rescates"
        subtitle="Visualiza los animales que necesitan ayuda en Puebla, por colonia y por urgencia."
      />

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {stats.map((stat, index) => (
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
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-neutral-100" />}>
          <MapView onSelectReport={setSelectedReport} onReportsLoaded={setActiveReports} />
        </Suspense>
      </div>

      <AnimatePresence>
        {selectedReport && (
          <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
