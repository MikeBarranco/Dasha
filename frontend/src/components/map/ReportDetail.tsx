import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Navigation, Share2, Clock, MapPin, Maximize2 } from 'lucide-react';
import type { Report, Severity } from '../../data/mockReports';

const severityLabel: Record<Severity, string> = {
  critica: 'Urgencia crítica',
  media: 'Urgencia media',
  baja: 'Urgencia baja',
};

const severityClasses: Record<Severity, string> = {
  critica: 'bg-red-100 text-red-700',
  media: 'bg-orange-100 text-orange-700',
  baja: 'bg-blue-100 text-blue-700',
};

type ReportDetailProps = {
  report: Report;
  onClose: () => void;
};

export function ReportDetail({ report, onClose }: ReportDetailProps) {
  const [showPhoto, setShowPhoto] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPhoto(true)}
            className="block w-full"
            aria-label="Ver foto completa"
          >
            <img src={report.photo} alt={report.condition} className="h-56 w-full object-cover" />
          </button>
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${severityClasses[report.severity]}`}
          >
            {severityLabel[report.severity]}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-700 shadow"
          >
            <X className="h-5 w-5" />
          </button>
          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
            <Maximize2 className="h-3.5 w-3.5" /> Ver foto
          </span>
        </div>

        <div className="p-5">
          <h2 className="font-display text-xl font-bold text-cobalto">
            {report.species === 'perro' ? 'Perro' : 'Gato'} · {report.condition}
          </h2>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> Visto {report.reportedAgo}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {report.colonia}
            </span>
          </div>

          <p className="mt-3 text-sm text-neutral-600">{report.description}</p>

          <div className="mt-4 inline-flex rounded-lg bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
            Estado: {report.status}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-naranja py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Navigation className="h-5 w-5" /> Voy en camino
            </button>
            <button
              type="button"
              aria-label="Compartir"
              className="flex items-center justify-center rounded-xl border border-neutral-200 px-4 text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPhoto && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPhoto(false)}
          >
            <img
              src={report.photo}
              alt={report.condition}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setShowPhoto(false)}
              aria-label="Cerrar foto"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
