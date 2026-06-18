import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Severity } from '../../data/mockReports';
import { emptyFilters, filtersActive, type ReportFilters } from '../../lib/reportFilters';

const severityOptions: { value: Severity; label: string }[] = [
  { value: 'critica', label: 'Crítica' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

const conditionOptions = ['Herido', 'Desnutrido', 'Enfermo', 'Perdido'];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-cobalto bg-cobalto text-white'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

type MapFiltersProps = {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  total: number;
  shown: number;
};

export function MapFilters({ filters, onChange, total, shown }: MapFiltersProps) {
  const [open, setOpen] = useState(false);
  const active = filtersActive(filters);
  const activeCount =
    (filters.species ? 1 : 0) +
    (filters.severity ? 1 : 0) +
    (filters.condition ? 1 : 0) +
    (filters.hideAggressive ? 1 : 0);

  const toggle = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
          Filtros
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cobalto px-1.5 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>
        <span className="text-xs text-neutral-400">
          {shown} de {total}
        </span>
        {active && (
          <button
            type="button"
            onClick={() => onChange(emptyFilters)}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-cobalto transition-colors hover:text-cobalto/80"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mt-2 rounded-2xl border border-neutral-200 bg-white"
          >
            <div className="space-y-4 p-4">
              <Group label="Especie">
                <Chip active={filters.species === 'perro'} onClick={() => toggle('species', 'perro')}>
                  Perros
                </Chip>
                <Chip active={filters.species === 'gato'} onClick={() => toggle('species', 'gato')}>
                  Gatos
                </Chip>
              </Group>

              <Group label="Urgencia">
                {severityOptions.map((option) => (
                  <Chip
                    key={option.value}
                    active={filters.severity === option.value}
                    onClick={() => toggle('severity', option.value)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </Group>

              <Group label="Condición">
                {conditionOptions.map((option) => (
                  <Chip
                    key={option}
                    active={filters.condition === option}
                    onClick={() => toggle('condition', option)}
                  >
                    {option}
                  </Chip>
                ))}
              </Group>

              <Group label="Seguridad">
                <Chip
                  active={filters.hideAggressive}
                  onClick={() => onChange({ ...filters, hideAggressive: !filters.hideAggressive })}
                >
                  Ocultar agresivos
                </Chip>
              </Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
