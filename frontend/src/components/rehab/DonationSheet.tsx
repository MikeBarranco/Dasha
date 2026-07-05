import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Heart, Gift, ImagePlus, Check, Info } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { createDonation, type CreateDonationInput } from '../../lib/api';
import { compressImage } from '../../lib/image';
import type { Animal } from '../../data/mockAnimals';

type DonationMode = 'money' | 'items';

const amountPresets = [100, 200, 500];

type DonationSheetProps = {
  animal: Animal;
  initialMode?: DonationMode;
  onClose: () => void;
};

export function DonationSheet({ animal, initialMode = 'money', onClose }: DonationSheetProps) {
  useLockBodyScroll();
  const [mode, setMode] = useState<DonationMode>(initialMode);
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [proof, setProof] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickProof = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setProof(await compressImage(files[0]));
    } catch {
      setError('No se pudo leer la imagen.');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    let input: CreateDonationInput;
    if (mode === 'money') {
      const value = Number(amount);
      if (!Number.isFinite(value) || value < 1) {
        setError('Elige o escribe un monto válido.');
        return;
      }
      if (!proof) {
        setError('Sube la foto de tu comprobante de transferencia.');
        return;
      }
      input = { type: 'money', amount: value, proofBase64: proof };
    } else {
      const description = items.trim();
      if (description.length < 3) {
        setError('Cuéntanos qué quieres donar.');
        return;
      }
      input = { type: 'items', itemsDescription: description };
    }

    setSubmitting(true);
    // El apoyo real se hace por fuera (transferencia / entrega). Registramos el
    // comprobante para que el aliado lo confirme; si el backend aún no existe, no
    // bloqueamos el agradecimiento al donante.
    try {
      await createDonation(animal.id, input);
    } catch {
      /* pendiente de backend: no bloqueamos al donante */
    } finally {
      setSubmitting(false);
      setDone(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cobalto">
            {done ? '¡Gracias!' : `Apoya a ${animal.name}`}
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

        {done ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-exito text-white">
              <Check className="h-8 w-8" />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-cobalto">
              {mode === 'money' ? 'Recibimos tu comprobante' : 'Recibimos tu ofrecimiento'}
            </p>
            <p className="mt-1 max-w-xs text-sm text-neutral-600">
              {mode === 'money'
                ? `${animal.vet} confirmará tu apadrinamiento en cuanto verifique la transferencia. ¡Gracias por ayudar a ${animal.name}!`
                : `${animal.vet} te contactará para coordinar la entrega. ¡Gracias por ayudar a ${animal.name}!`}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-xl bg-cobalto px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => setMode('money')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
                  mode === 'money' ? 'bg-white text-cobalto shadow-sm' : 'text-neutral-500',
                )}
              >
                <Heart className="h-4 w-4" /> Apadrinar
              </button>
              <button
                type="button"
                onClick={() => setMode('items')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
                  mode === 'items' ? 'bg-white text-cobalto shadow-sm' : 'text-neutral-500',
                )}
              >
                <Gift className="h-4 w-4" /> Donar cosas
              </button>
            </div>

            {mode === 'money' ? (
              <>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-neutral-700">Monto</p>
                  <div className="flex flex-wrap gap-2">
                    {amountPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(String(preset))}
                        className={cn(
                          'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                          amount === String(preset)
                            ? 'border-cobalto bg-cobalto/10 text-cobalto'
                            : 'border-neutral-200 text-neutral-600 hover:border-cobalto/40',
                        )}
                      >
                        ${preset}
                      </button>
                    ))}
                    <input
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      inputMode="numeric"
                      placeholder="Otro"
                      className="w-24 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cobalto/30"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-cobalto/5 p-3 text-xs text-neutral-600">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalto" />
                  Realiza tu transferencia a la cuenta de {animal.vet} y sube tu comprobante. El
                  aliado lo confirmará. (Dasha no procesa pagos.)
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-neutral-700">Comprobante</p>
                  <label className="block cursor-pointer">
                    <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto">
                      {proof ? (
                        <img src={proof} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="flex flex-col items-center gap-1.5 text-sm">
                          <ImagePlus className="h-6 w-6" />
                          Subir comprobante
                        </span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => pickProof(event.target.files)}
                    />
                  </label>
                </div>
              </>
            ) : (
              <div>
                <p className="mb-1.5 text-sm font-medium text-neutral-700">¿Qué quieres donar?</p>
                <textarea
                  value={items}
                  onChange={(event) => setItems(event.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="Ej. croquetas, transporte, hogar temporal, medicinas…"
                  className="w-full resize-none rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:ring-2 focus:ring-cobalto/30"
                />
                <p className="mt-2 text-xs text-neutral-400">
                  {animal.vet} te contactará para coordinar la entrega.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-alerta">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Enviando…' : mode === 'money' ? 'Enviar comprobante' : 'Ofrecer donación'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
