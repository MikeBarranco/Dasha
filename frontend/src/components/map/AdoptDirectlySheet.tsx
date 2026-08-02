import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { X, RotateCcw, Heart, PawPrint } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { compressImage } from '../../lib/image';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { adoptDirectly } from '../../lib/api';

type AdoptDirectlySheetProps = {
  reportId: string;
  // 'perro' | 'gato' del reporte, solo para el texto.
  speciesLabel: string;
  onClose: () => void;
  // Se llama al adoptar con éxito, para que el detalle del reporte se cierre.
  onAdopted: () => void;
};

// Adopción directa desde un reporte ("me lo quedo"): un ciudadano que ya tiene al
// animalito consigo le da un hogar sin volverse voluntario ni pasar por un
// aliado. Le pedimos una foto con él (prueba ligera + primera foto de su álbum) y
// un nombre opcional; queda a nombre de su cuenta y puede seguir subiendo momentos.
export function AdoptDirectlySheet({
  reportId,
  speciesLabel,
  onClose,
  onAdopted,
}: AdoptDirectlySheetProps) {
  useLockBodyScroll();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const animal = speciesLabel === 'gato' ? 'gatito' : 'perrito';
  const busy = saving || processing;

  const handleCapture = async (file: File, dataUrl: string) => {
    setPreview(dataUrl);
    setProcessing(true);
    setError(null);
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

  const confirm = async () => {
    if (!photoBase64 || busy) return;
    setSaving(true);
    setError(null);
    try {
      await adoptDirectly(reportId, photoBase64, name);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo completar la adopción. Intenta de nuevo.',
      );
      setSaving(false);
    }
  };

  const goToAdopted = () => {
    onAdopted();
    navigate('/adoptados');
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
        {done ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-exito/10 text-exito">
              <Heart className="h-8 w-8" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold text-cobalto">
              ¡Bienvenido a la familia!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              {name.trim() ? `${name.trim()} ya` : 'Tu nuevo compañero ya'} es parte de tu familia.
              Sigue compartiendo sus momentos desde Mis adoptados para inspirar a más personas a
              adoptar.
            </p>
            <button
              type="button"
              onClick={goToAdopted}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90"
            >
              <PawPrint className="h-5 w-5" /> Ver mis adoptados
            </button>
            <button
              type="button"
              onClick={onAdopted}
              className="mt-2 w-full rounded-xl border border-neutral-200 py-3 font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-cobalto">Darle un hogar</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Si este {animal} ya está contigo, tómate una foto con él. Quedará bajo tu cuenta y
                  podrás seguir subiendo sus momentos.
                </p>
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
                    alt="Foto contigo y el animalito"
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
                <CameraCapture onCapture={handleCapture} frame="face" initialFacing="user" />
              )}

              <label className="mt-4 block">
                <span className="text-xs font-medium text-neutral-500">
                  ¿Cómo se llama? (opcional)
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  placeholder="Ej. Canela"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-base text-neutral-800 outline-none transition-colors focus:border-cobalto"
                />
              </label>

              {error && <p className="mt-3 text-sm text-alerta">{error}</p>}
            </div>

            <div className="border-t border-neutral-100 p-4">
              <button
                type="button"
                onClick={confirm}
                disabled={busy || !photoBase64}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Heart className="h-5 w-5" />
                {saving
                  ? 'Registrando…'
                  : processing
                    ? 'Procesando foto…'
                    : 'Quiero adoptarlo'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
