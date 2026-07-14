import { useState } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle2 } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import type { IncomingRescue, ReceptionInfo } from '../../lib/api';

type ReceptionSheetProps = {
  rescue: IncomingRescue;
  defaultReceivedBy: string;
  saving: boolean;
  onConfirm: (reception: ReceptionInfo) => void;
  onClose: () => void;
};

const arrivalOptions: { value: string; label: string }[] = [
  { value: 'stable', label: 'Estable' },
  { value: 'injured', label: 'Lastimado' },
  { value: 'critical', label: 'Grave' },
];

// Al recibir al animalito, el aliado captura cómo llegó y quién lo recibe. Con
// esto el ingreso deja de ser "un solo tap" y queda registrado en el caso.
export function ReceptionSheet({
  rescue,
  defaultReceivedBy,
  saving,
  onConfirm,
  onClose,
}: ReceptionSheetProps) {
  useLockBodyScroll();
  const [condition, setCondition] = useState<string>('stable');
  const [receivedBy, setReceivedBy] = useState(defaultReceivedBy);
  const [notes, setNotes] = useState('');
  const animalLabel = rescue.species === 'gato' ? 'el gatito' : 'el perrito';

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={saving ? undefined : onClose}
      />

      <motion.div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-cobalto">Confirmar recepción</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Registras cómo llegó {animalLabel} y quién lo recibe. Después se abre su ficha de
              rehabilitación.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="flex-shrink-0 rounded-full bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-500">¿Cómo llegó?</p>
            <div className="flex gap-2">
              {arrivalOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCondition(option.value)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                    condition === option.value
                      ? 'border-cobalto bg-cobalto/5 text-cobalto'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-neutral-500">¿Quién lo recibe?</span>
            <input
              type="text"
              value={receivedBy}
              onChange={(event) => setReceivedBy(event.target.value)}
              maxLength={80}
              placeholder="Nombre de quien recibe"
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none transition-colors focus:border-cobalto"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-neutral-500">Notas (opcional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Observaciones al recibirlo…"
              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none transition-colors focus:border-cobalto"
            />
          </label>
        </div>

        <div className="border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={() => onConfirm({ conditionOnArrival: condition, receivedBy, notes })}
            disabled={saving}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-exito py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'Ingresando…' : 'Confirmar ingreso'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
