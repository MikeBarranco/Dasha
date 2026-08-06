import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ImagePlus, Check, PawPrint, AlertCircle } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { compressImage } from '../../lib/image';
import { addAdoptedMoment } from '../../lib/api';
import { ShareButton } from '../ui/ShareButton';
import { Lightbox } from '../ui/Lightbox';
import type { Animal } from '../../data/mockAnimals';

type AdoptadoSheetProps = {
  animal: Animal;
  // true si es un adoptado del propio usuario: puede sumar momentos.
  editable: boolean;
  onClose: () => void;
  onAdded: () => void;
};

export function AdoptadoSheet({ animal, editable, onClose, onAdded }: AdoptadoSheetProps) {
  useLockBodyScroll();
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Foto abierta a pantalla completa (para verla en grande).
  const [lightbox, setLightbox] = useState<string | null>(null);

  const pickPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImage(file);
      setPhotoBase64(compressed);
      setPreview(compressed);
    } catch {
      setError('No se pudo procesar la imagen.');
    }
  };

  const submit = async () => {
    if (!photoBase64 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await addAdoptedMoment(animal.id, photoBase64, caption);
      setAdding(false);
      setPreview(null);
      setPhotoBase64(null);
      setCaption('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el momento.');
    } finally {
      setSaving(false);
    }
  };

  const timeline = animal.timeline ?? [];

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
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-cobalto">
              <PawPrint className="h-5 w-5" /> {animal.name}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-purpura">Adoptado · final feliz</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <ShareButton
              title={`${animal.name} — un final feliz en Dasha`}
              text={`Conoce a ${animal.name}, un rescatado que encontró hogar. 🐾`}
              url={`/adoptados?animal=${animal.id}`}
            />
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              aria-label="Cerrar"
              className="rounded-full bg-neutral-100 p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2">
            {animal.photos.map((photo, index) => (
              <button
                key={`${photo}-${index}`}
                type="button"
                onClick={() => setLightbox(photo)}
                className="overflow-hidden rounded-xl"
              >
                <img
                  src={photo}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/placeholder-animal.svg';
                  }}
                  className="aspect-square w-full object-cover transition-transform hover:scale-105"
                />
              </button>
            ))}
          </div>

          {animal.story && (
            <p className="mt-4 text-sm leading-relaxed text-neutral-600">{animal.story}</p>
          )}

          {timeline.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-cobalto">Su historia</p>
              <ol className="space-y-3">
                {timeline.map((event, index) => (
                  <li key={`${index}-${event.title}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-purpura" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{event.title}</p>
                      {event.when && <p className="text-xs text-neutral-400">{event.when}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {editable && adding && (
            <div className="mt-5 rounded-2xl border border-neutral-200 p-3">
              {preview ? (
                <img
                  src={preview}
                  alt="Momento nuevo"
                  className="h-48 w-full rounded-xl object-cover"
                />
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 transition-colors hover:bg-neutral-50">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-sm font-medium">Elige una foto</span>
                  <input type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
                </label>
              )}
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={2}
                maxLength={200}
                placeholder="Cuenta qué momento es (su primer baño, su cumple…)"
                className="mt-3 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-base text-neutral-800 outline-none transition-colors focus:border-cobalto"
              />
              {error && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-alerta">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {editable && (
          <div className="border-t border-neutral-100 p-4">
            {adding ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setPreview(null);
                    setPhotoBase64(null);
                    setError(null);
                  }}
                  disabled={saving}
                  className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || !photoBase64}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purpura py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" />
                  {saving ? 'Guardando…' : 'Publicar momento'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-purpura py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <ImagePlus className="h-4 w-4" /> Agregar un momento
              </button>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {lightbox && (
          <Lightbox src={lightbox} alt={animal.name} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
