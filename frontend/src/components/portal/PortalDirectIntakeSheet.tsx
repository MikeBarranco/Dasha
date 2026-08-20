import { useState } from 'react';
import { motion } from 'motion/react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { createDirectIntakeAnimal } from '../../lib/api';
import { compressImage } from '../../lib/image';

// Alta directa de un animal para adopción (refugio con perritos propios), sin
// pasar por un rescate. Mismas convenciones que el reporte (dog/cat, tamaños).
const speciesOptions = [
  { value: 'dog', label: 'Perro' },
  { value: 'cat', label: 'Gato' },
] as const;

const sizeOptions = [
  { value: 'small', label: 'Chico' },
  { value: 'medium', label: 'Mediano' },
  { value: 'large', label: 'Grande' },
] as const;

const colorOptions = [
  'Negro',
  'Blanco',
  'Café',
  'Dorado',
  'Gris',
  'Beige',
  'Naranja',
  'Atigrado',
  'Manchado',
  'Bicolor',
];

type DirectIntakeSheetProps = {
  // Cuando un admin ve el portal de un aliado, acota el alta a esa organización.
  orgId?: string;
  onClose: () => void;
  onCreated: () => void;
};

export function PortalDirectIntakeSheet({ orgId, onClose, onCreated }: DirectIntakeSheetProps) {
  useLockBodyScroll();

  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [color, setColor] = useState('');
  const [description, setDescription] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0 || addingPhoto) return;
    setAddingPhoto(true);
    setError(null);
    try {
      const dataUrl = await compressImage(files[0]);
      setPhotos((current) => [...current, dataUrl]);
    } catch {
      setError('No se pudo procesar la imagen.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const canSave = photos.length > 0 && name.trim().length >= 2 && !saving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) {
      setError('Agrega al menos una foto y el nombre del animalito.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createDirectIntakeAnimal(
        {
          name: name.trim(),
          species,
          size,
          color: color || 'No especificado',
          gender: gender || undefined,
          description: description.trim() || undefined,
          photosBase64: photos,
        },
        orgId,
      );
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de alta. Intenta de nuevo.');
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
        onClick={saving ? undefined : onClose}
      />

      <motion.div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-cobalto">Dar de alta un animal</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <p className="text-sm text-neutral-500">
            Para un animalito que ya tienes listo para adopción, sin pasar por un rescate.
          </p>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Fotos</span>
            <div className="flex flex-wrap gap-2">
              {photos.map((url, index) => (
                <div key={index} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white shadow-md transition-colors hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto">
                {addingPhoto ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={addingPhoto}
                  onChange={(event) => pickPhoto(event.target.files)}
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Nombre</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              className={inputClass}
              placeholder="Ej. Canela"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Especie</span>
            <div className="flex gap-2">
              {speciesOptions.map((option) => (
                <Chip
                  key={option.value}
                  active={species === option.value}
                  onClick={() => setSpecies(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Sexo (opcional)</span>
            <div className="flex gap-2">
              <Chip active={gender === 'male'} onClick={() => setGender(gender === 'male' ? '' : 'male')}>
                Macho
              </Chip>
              <Chip
                active={gender === 'female'}
                onClick={() => setGender(gender === 'female' ? '' : 'female')}
              >
                Hembra
              </Chip>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Tamaño</span>
            <div className="flex gap-2">
              {sizeOptions.map((option) => (
                <Chip
                  key={option.value}
                  active={size === option.value}
                  onClick={() => setSize(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Color</span>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((option) => (
                <Chip key={option} active={color === option} onClick={() => setColor(option)}>
                  {option}
                </Chip>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">
              Descripción pública
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Su carácter, su historia, qué busca en un hogar…"
            />
            <span className="mt-1 block text-xs text-neutral-400">
              Es lo que verá la gente en la ficha del animalito.
            </span>
          </label>

          {error && <p className="text-sm text-alerta">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-neutral-200 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Dando de alta…' : 'Dar de alta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30';

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
        'rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-cobalto bg-cobalto/5 text-cobalto'
          : 'border-neutral-200 text-neutral-600 hover:border-cobalto/40',
      )}
    >
      {children}
    </button>
  );
}
