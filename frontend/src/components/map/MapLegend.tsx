import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const severityItems = [
  { label: 'Crítica', color: '#DC2626' },
  { label: 'Media', color: '#F2780B' },
  { label: 'Baja', color: '#2563EB' },
];

const allyItems = [
  { label: 'Veterinaria', color: '#1C4E80' },
  { label: 'Refugio', color: '#6B2C91' },
  { label: 'Asociación', color: '#0E7490' },
];

export function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-4 left-3 z-10 w-44 rounded-xl bg-white/95 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <span className="text-xs font-semibold text-cobalto">Simbología</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-neutral-400" />
        )}
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3">
          <div>
            <p className="mb-1 text-[11px] font-medium text-neutral-500">Reportes por colonia</p>
            <div
              className="h-2 w-full rounded-full"
              style={{
                background: 'linear-gradient(to right, #86EFAC, #FDE047, #FB923C, #EF4444)',
              }}
            />
            <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
              <span>Pocos</span>
              <span>Muchos</span>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium text-neutral-500">Urgencia del reporte</p>
            <ul className="space-y-1">
              {severityItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[11px] text-neutral-600">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full border-2 bg-white"
                    style={{ borderColor: item.color }}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium text-neutral-500">Aliados</p>
            <ul className="space-y-1">
              {allyItems.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-[11px] text-neutral-600">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-[3px] border-2 border-white"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
