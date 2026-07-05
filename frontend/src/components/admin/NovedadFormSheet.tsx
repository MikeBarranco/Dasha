import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import {
  createAdminNovedad,
  updateAdminNovedad,
  type AdminNovedad,
  type AdminNovedadInput,
} from '../../lib/adminApi';

type NovedadFormSheetProps = {
  novedad: AdminNovedad | null;
  onClose: () => void;
  onSaved: () => void;
};

// El input type="date" trabaja en "YYYY-MM-DD". Estas funciones convierten desde y
// hacia el ISO que guarda el backend, usando el mediodía para que el día no se
// recorra por la zona horaria.
function isoToDateInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function NovedadFormSheet({ novedad, onClose, onSaved }: NovedadFormSheetProps) {
  useLockBodyScroll();
  const editing = Boolean(novedad);

  const [version, setVersion] = useState(novedad?.version ?? '');
  const [title, setTitle] = useState(novedad?.title ?? '');
  const [date, setDate] = useState(isoToDateInput(novedad?.date ?? ''));
  const [changes, setChanges] = useState((novedad?.changes ?? []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();

    const cleanVersion = version.trim();
    if (!cleanVersion) {
      setError('Indica la versión (ej. v0.8).');
      return;
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }
    if (!date) {
      setError('Indica la fecha de la versión.');
      return;
    }
    const changeList = changes
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (changeList.length === 0) {
      setError('Agrega al menos una mejora (una por línea).');
      return;
    }

    setSaving(true);
    setError(null);

    const input: AdminNovedadInput = {
      version: cleanVersion,
      title: cleanTitle,
      date: dateInputToIso(date),
      changes: changeList,
    };

    try {
      if (novedad) await updateAdminNovedad(novedad.id, input);
      else await createAdminNovedad(input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cobalto">
            {editing ? 'Editar novedad' : 'Nueva novedad'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Versión">
              <input
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                maxLength={16}
                className={inputClass}
                placeholder="Ej. v0.8"
              />
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Título">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              className={inputClass}
              placeholder="Ej. Avisos y novedades desde el panel"
            />
          </Field>

          <Field label="Mejoras (una por línea)">
            <textarea
              value={changes}
              onChange={(event) => setChanges(event.target.value)}
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder={'Nueva sección de avisos en el panel.\nNovedades editables sin tocar código.'}
            />
          </Field>

          {error && <p className="text-sm text-alerta">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-neutral-200 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
