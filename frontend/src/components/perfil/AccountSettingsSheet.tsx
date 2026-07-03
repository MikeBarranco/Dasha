import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Loader2 } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { updateMe } from '../../lib/api';

type AccountSettingsSheetProps = {
  initialName: string;
  initialPhone: string;
  onSaved: (data: { name: string; phone: string }) => void;
  onClose: () => void;
};

// Hoja para editar los datos de la cuenta (nombre y teléfono) vía PATCH /me.
export function AccountSettingsSheet({
  initialName,
  initialPhone,
  onSaved,
  onClose,
}: AccountSettingsSheetProps) {
  useLockBodyScroll();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nombre: solo letras (con acentos/ñ), espacios y ' . - ; entre 2 y 50
  // caracteres. Se colapsan espacios repetidos para que "aaaa   bbbb" no pase.
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const nameCharsOk = /^[\p{L}\p{M}\s'.-]+$/u.test(cleanName);
  const nameValid = cleanName.length >= 2 && cleanName.length <= 50 && nameCharsOk;

  const digits = phone.replace(/\D/g, '');
  const phoneValid = digits.length === 0 || digits.length === 10;
  const canSave = nameValid && phoneValid && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await updateMe({ name: cleanName, phone: digits });
      onSaved({ name: cleanName, phone: digits });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
      setSaving(false);
    }
  };

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
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cobalto">Ajustes de la cuenta</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none focus:ring-2 focus:ring-cobalto/30"
            />
            {name.length > 0 && !nameValid && (
              <span className="mt-1 block text-xs text-alerta">
                Usa solo letras (2 a 50 caracteres).
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Teléfono</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="numeric"
              maxLength={15}
              placeholder="10 dígitos"
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none focus:ring-2 focus:ring-cobalto/30"
            />
            {!phoneValid && (
              <span className="mt-1 block text-xs text-alerta">
                El teléfono debe tener 10 dígitos.
              </span>
            )}
          </label>

          {error && <p className="text-sm text-alerta">{error}</p>}

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </motion.div>
    </div>
  );
}
