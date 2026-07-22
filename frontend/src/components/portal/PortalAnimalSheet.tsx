import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Stethoscope, Check, Plus, Trash2, ImagePlus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import {
  updateMyOrgAnimalStatus,
  updateMyOrgAnimalDetails,
  addMyOrgAnimalPhoto,
  setMyOrgAnimalSterilized,
  addMyOrgMedicalEntry,
  removeMyOrgMedicalEntry,
} from '../../lib/api';
import { compressImage } from '../../lib/image';
import type { Animal, AnimalStatus, MedicalEntry, MedicalEntryType } from '../../data/mockAnimals';

const PLACEHOLDER = '/placeholder-animal.svg';

const statusOptions: AnimalStatus[] = ['En tratamiento', 'Recuperándose', 'Buscando hogar'];

// Etiqueta de nuestro modelo -> enum que espera el backend.
const statusToSlug: Record<AnimalStatus, string> = {
  'En tratamiento': 'in_treatment',
  Recuperándose: 'recovering',
  'Buscando hogar': 'looking_for_adoption',
};

const medTypeLabel: Record<MedicalEntryType, string> = {
  vacuna: 'Vacuna',
  desparasitacion: 'Desparasitación',
  tratamiento: 'Tratamiento',
  cirugia: 'Cirugía',
  peso: 'Peso',
  otro: 'Otro',
};

const medTypeOptions = (Object.keys(medTypeLabel) as MedicalEntryType[]).map((value) => ({
  value,
  label: medTypeLabel[value],
}));

const medInput =
  'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30';

type PortalAnimalSheetProps = {
  animal: Animal;
  preview: boolean;
  // Cuando un admin ve el portal de un aliado, acota las escrituras a esa org.
  orgId?: string;
  onClose: () => void;
  // Refleja en la lista los cambios hechos aquí (estatus, nombre, fotos…).
  onUpdated: (id: string, patch: Partial<Animal>) => void;
};

export function PortalAnimalSheet({
  animal,
  preview,
  orgId,
  onClose,
  onUpdated,
}: PortalAnimalSheetProps) {
  useLockBodyScroll();
  const [status, setStatus] = useState<AnimalStatus>(animal.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeline = animal.timeline ?? [];
  const changed = status !== animal.status;

  // Datos del caso editables: nombre provisional y padecimientos.
  const [name, setName] = useState(animal.name);
  const [diagnosis, setDiagnosis] = useState(animal.diagnosis);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const detailsChanged = name.trim() !== animal.name || diagnosis.trim() !== animal.diagnosis;

  // Galería del caso: fotos del reporte, del voluntario y del aliado. El aliado
  // suma fotos de progreso. Filtramos el placeholder para saber si hay fotos reales.
  const [photos, setPhotos] = useState<string[]>(
    () => animal.photos.filter((url) => url !== PLACEHOLDER),
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const hero = photos[heroIndex] ?? PLACEHOLDER;

  const saveDetails = async () => {
    setDetailsError(null);
    const cleanName = name.trim();
    const cleanDiagnosis = diagnosis.trim();
    if (cleanName.length < 2) {
      setDetailsError('El nombre no puede quedar vacío.');
      return;
    }
    setSavingDetails(true);
    try {
      if (!preview) {
        await updateMyOrgAnimalDetails(
          animal.id,
          { name: cleanName, diagnosis: cleanDiagnosis },
          orgId,
        );
      }
      onUpdated(animal.id, { name: cleanName, diagnosis: cleanDiagnosis });
      setDetailsSaved(true);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'No se pudieron guardar los datos.');
    } finally {
      setSavingDetails(false);
    }
  };

  const pickPhoto = async (files: FileList | null) => {
    if (!files || files.length === 0 || addingPhoto) return;
    setAddingPhoto(true);
    setDetailsError(null);
    try {
      const dataUrl = await compressImage(files[0]);
      // La mostramos de una vez (la data URL sirve como src); la subida es best-effort.
      const next = [...photos, dataUrl];
      setPhotos(next);
      setHeroIndex(next.length - 1);
      onUpdated(animal.id, { photos: next });
      if (!preview) {
        addMyOrgAnimalPhoto(animal.id, dataUrl, '', orgId).catch(() => {});
      }
    } catch {
      setDetailsError('No se pudo procesar la imagen.');
    } finally {
      setAddingPhoto(false);
    }
  };

  // Cartilla médica editable.
  const [sterilized, setSterilized] = useState(animal.medical?.sterilized ?? false);
  const [entries, setEntries] = useState<MedicalEntry[]>(animal.medical?.entries ?? []);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<MedicalEntryType>('vacuna');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const changeSterilized = (value: boolean) => {
    setSterilized(value);
    if (!preview) setMyOrgAnimalSterilized(animal.id, value, orgId).catch(() => {});
  };

  const addEntry = () => {
    const title = newTitle.trim();
    if (!title) return;
    const entry: MedicalEntry = {
      id: `local-${Date.now()}`,
      type: newType,
      title,
      date: newDate.trim() || 'Hoy',
      notes: newNotes.trim() || undefined,
    };
    setEntries((current) => [entry, ...current]);
    setNewType('vacuna');
    setNewTitle('');
    setNewDate('');
    setNewNotes('');
    setAdding(false);
    if (!preview) {
      addMyOrgMedicalEntry(
        animal.id,
        {
          type: entry.type,
          title: entry.title,
          date: entry.date,
          notes: entry.notes,
        },
        orgId,
      ).catch(() => {});
    }
  };

  const removeEntry = (id: string) => {
    setEntries((current) => current.filter((item) => item.id !== id));
    if (!preview) removeMyOrgMedicalEntry(animal.id, id, orgId).catch(() => {});
  };

  const save = async () => {
    setError(null);
    if (preview) {
      onUpdated(animal.id, { status });
      setSaved(true);
      return;
    }
    setSaving(true);
    try {
      await updateMyOrgAnimalStatus(animal.id, statusToSlug[status], orgId);
      onUpdated(animal.id, { status });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar. Intenta de nuevo.');
    } finally {
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
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="relative">
          <img
            src={hero}
            alt={name}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = PLACEHOLDER;
            }}
            className="h-52 w-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-neutral-700 shadow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-bold text-cobalto">{name || 'Sin nombre'}</h2>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              {animal.species === 'perro' ? 'Perro' : 'Gato'}
            </span>
          </div>

          {/* Fotos del caso: reporte, voluntario y aliado; el aliado suma progreso. */}
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-cobalto">Fotos del caso</p>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-cobalto/30 px-2.5 py-1.5 text-xs font-medium text-cobalto transition-colors hover:bg-cobalto/5">
                {addingPhoto ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5" />
                )}
                {addingPhoto ? 'Subiendo…' : 'Agregar foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={addingPhoto}
                  onChange={(event) => pickPhoto(event.target.files)}
                />
              </label>
            </div>
            {photos.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-400">
                Aún no hay fotos. Agrega la primera para ir contando su historia.
              </p>
            ) : (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {photos.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setHeroIndex(index)}
                    className={cn(
                      'h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                      index === heroIndex ? 'border-cobalto' : 'border-transparent',
                    )}
                  >
                    <img
                      src={url}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = PLACEHOLDER;
                      }}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datos del caso: nombre provisional + padecimientos. */}
          <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-cobalto">
              <Stethoscope className="h-4 w-4" /> Datos del caso
            </p>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Nombre provisional
              </span>
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setDetailsSaved(false);
                }}
                maxLength={40}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                placeholder="Ej. Solovino"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Padecimientos / diagnóstico
              </span>
              <textarea
                value={diagnosis}
                onChange={(event) => {
                  setDiagnosis(event.target.value);
                  setDetailsSaved(false);
                }}
                maxLength={200}
                rows={2}
                className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                placeholder="Qué tiene y qué tratamiento lleva"
              />
            </label>
            {detailsError && <p className="text-xs text-alerta">{detailsError}</p>}
            {detailsSaved && !detailsChanged && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-exito">
                <Check className="h-3.5 w-3.5" /> Datos guardados{preview ? ' (vista previa)' : ''}.
              </p>
            )}
            {detailsChanged && (
              <button
                type="button"
                onClick={saveDetails}
                disabled={savingDetails}
                className="w-full rounded-lg bg-cobalto py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {savingDetails ? 'Guardando…' : 'Guardar datos'}
              </button>
            )}
          </div>

          {animal.story && <p className="mt-4 text-sm text-neutral-600">{animal.story}</p>}

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Estatus</label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as AnimalStatus);
                setSaved(false);
              }}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {error && <p className="mt-2 text-sm text-alerta">{error}</p>}
            {saved && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-exito">
                <Check className="h-4 w-4" /> Estatus actualizado{preview ? ' (vista previa)' : ''}.
              </p>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving || !changed}
              className="mt-3 w-full rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar estatus'}
            </button>
          </div>

          {timeline.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-cobalto">Seguimiento</p>
              <ol className="space-y-3">
                {timeline.map((event, index) => (
                  <li key={`${index}-${event.title}`} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-cobalto" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{event.title}</p>
                      {event.when && <p className="text-xs text-neutral-400">{event.when}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-6">
            <p className="text-sm font-semibold text-cobalto">Cartilla médica</p>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5">
              <span className="text-sm text-neutral-700">Esterilizado</span>
              <div className="flex gap-1.5">
                {[
                  { value: true, label: 'Sí' },
                  { value: false, label: 'No' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => changeSterilized(option.value)}
                    className={cn(
                      'rounded-lg px-3 py-1 text-sm font-medium transition-colors',
                      sterilized === option.value
                        ? 'bg-cobalto text-white'
                        : 'bg-neutral-100 text-neutral-500',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-xl border border-neutral-200 p-3"
                >
                  <span className="mt-0.5 flex-shrink-0 rounded-full bg-cobalto/10 px-2 py-0.5 text-[11px] font-medium text-cobalto">
                    {medTypeLabel[entry.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-800">{entry.title}</p>
                    {entry.date && <p className="text-xs text-neutral-400">{entry.date}</p>}
                    {entry.notes && <p className="mt-0.5 text-xs text-neutral-500">{entry.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    aria-label="Quitar registro"
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-alerta/5 hover:text-alerta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {entries.length === 0 && (
                <li className="rounded-xl border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-neutral-400">
                  Aún no hay registros en la cartilla.
                </li>
              )}
            </ul>

            {adding ? (
              <div className="mt-3 space-y-2 rounded-xl border border-neutral-200 p-3">
                <select
                  value={newType}
                  onChange={(event) => setNewType(event.target.value as MedicalEntryType)}
                  className={medInput}
                >
                  {medTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  maxLength={80}
                  placeholder="Ej. Vacuna antirrábica"
                  className={medInput}
                />
                <input
                  value={newDate}
                  onChange={(event) => setNewDate(event.target.value)}
                  maxLength={40}
                  placeholder="Fecha (ej. Hoy, 12 jul)"
                  className={medInput}
                />
                <textarea
                  value={newNotes}
                  onChange={(event) => setNewNotes(event.target.value)}
                  maxLength={160}
                  rows={2}
                  placeholder="Notas (opcional)"
                  className={cn(medInput, 'resize-none')}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={addEntry}
                    disabled={!newTitle.trim()}
                    className="flex-1 rounded-lg bg-cobalto py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-cobalto/40 py-2.5 text-sm font-medium text-cobalto transition-colors hover:bg-cobalto/5"
              >
                <Plus className="h-4 w-4" /> Agregar registro
              </button>
            )}

            {preview && (
              <p className="mt-2 text-center text-xs text-neutral-400">
                En vista previa los cambios no se guardan de verdad.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
