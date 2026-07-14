import { useState } from 'react';
import { motion } from 'motion/react';
import { X, RotateCcw, Check } from 'lucide-react';
import { CameraCapture } from '../map/CameraCapture';
import { compressImage } from '../../lib/image';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import type { RescuePhotoKind } from '../../lib/api';

type RescuePhotoSheetProps = {
  kind: RescuePhotoKind;
  // true mientras se guarda el avance del rescate (bloquea la hoja).
  saving: boolean;
  // photoBase64 = null significa que el voluntario decidió omitir la foto.
  onConfirm: (photoBase64: string | null, note: string) => void;
  onClose: () => void;
};

const copy: Record<RescuePhotoKind, { title: string; hint: string }> = {
  pickup: {
    title: 'Foto de recogida',
    hint: 'Toma una foto del animalito al recogerlo. Queda como evidencia en la historia del caso.',
  },
  delivery: {
    title: 'Foto de entrega',
    hint: 'Toma una foto al entregar al animalito con el aliado. Cierra la historia del traslado.',
  },
};

// Antes de que el voluntario avance el rescate (salir en camino / entregar), le
// pedimos una foto como evidencia. Se puede omitir para no bloquear el traslado.
export function RescuePhotoSheet({ kind, saving, onConfirm, onClose }: RescuePhotoSheetProps) {
  useLockBodyScroll();
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const texts = copy[kind];
  const busy = saving || processing;

  const handleCapture = async (file: File, dataUrl: string) => {
    setPreview(dataUrl);
    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      setPhotoBase64(compressed);
    } catch {
      // Si la compresión falla, usamos el dataURL directo como respaldo.
      setPhotoBase64(dataUrl);
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    setPreview(null);
    setPhotoBase64(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={busy ? undefined : onClose}
      />

      <motion.div
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-cobalto">{texts.title}</h2>
            <p className="mt-0.5 text-xs text-neutral-500">{texts.hint}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className="flex-shrink-0 rounded-full bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Foto tomada"
                className="h-64 w-full rounded-2xl border border-neutral-200 object-cover"
              />
              <button
                type="button"
                onClick={retake}
                disabled={busy}
                className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Tomar otra
              </button>
            </div>
          ) : (
            <CameraCapture onCapture={handleCapture} />
          )}

          <label className="mt-4 block">
            <span className="text-xs font-medium text-neutral-500">Nota (opcional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Algo importante del momento…"
              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none transition-colors focus:border-cobalto"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 border-t border-neutral-100 p-4">
          <button
            type="button"
            onClick={() => onConfirm(null, note)}
            disabled={busy}
            className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={() => onConfirm(photoBase64, note)}
            disabled={busy || !photoBase64}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-cobalto py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Guardando…' : processing ? 'Procesando…' : 'Usar esta foto'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
