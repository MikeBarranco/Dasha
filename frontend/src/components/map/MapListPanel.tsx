import { X, ChevronRight } from 'lucide-react';
import type { Report, Severity } from '../../data/mockReports';

const severityOrder: Record<Severity, number> = { critica: 0, media: 1, baja: 2 };

const severityChip: Record<Severity, string> = {
  critica: 'bg-red-100 text-red-700',
  media: 'bg-orange-100 text-orange-700',
  baja: 'bg-blue-100 text-blue-700',
};

const severityLabel: Record<Severity, string> = {
  critica: 'Crítica',
  media: 'Media',
  baja: 'Baja',
};

type MapListPanelProps = {
  reports: Report[];
  onSelect: (report: Report) => void;
  onClose: () => void;
};

export function MapListPanel({ reports, onSelect, onClose }: MapListPanelProps) {
  const sorted = [...reports].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 p-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-cobalto">Reportes en esta zona</h3>
          <p className="text-xs text-neutral-500">
            {reports.length} {reports.length === 1 ? 'reporte' : 'reportes'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Ver todo el mapa"
          className="flex-shrink-0 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">
            No hay reportes en esta zona. Aleja o mueve el mapa para ver más.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {sorted.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => onSelect(report)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-neutral-50"
                >
                  <img
                    src={report.photo}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/placeholder-animal.svg';
                    }}
                    className="h-12 w-12 flex-shrink-0 rounded-lg bg-neutral-100 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-700">
                      {report.species === 'perro' ? 'Perro' : 'Gato'} · {report.condition}
                    </p>
                    <p className="truncate text-xs text-neutral-400">
                      {report.colonia} · {report.reportedAgo}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${severityChip[report.severity]}`}
                  >
                    {severityLabel[report.severity]}
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
