import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Stethoscope, Check, Plus, Trash2, ImagePlus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import {
  updateMyOrgAnimalStatus,
  updateMyOrgAnimalDetails,
  addMyOrgAnimalPhoto,
  deleteMyOrgAnimalPhoto,
  reorderMyOrgAnimalPhotos,
  setMyOrgAnimalSterilized,
  addMyOrgMedicalEntry,
  removeMyOrgMedicalEntry,
} from '../../lib/api';
import { compressImage } from '../../lib/image';
import type { Animal, AnimalStatus, MedicalEntry, MedicalEntryType } from '../../data/mockAnimals';

const PLACEHOLDER = '/placeholder-animal.svg';

const statusOptions: AnimalStatus[] = [
  'En tratamiento',
  'Recuperándose',
  'Buscando hogar',
  'Fallecido',
];

// Etiqueta de nuestro modelo -> enum que espera el backend. "Adoptado" no está en
// statusOptions a propósito: ese estado lo fija el flujo de adopción, no se elige
// a mano desde el expediente. "Fallecido" sí es manual (el aliado lo marca) y es
// un estado final.
const statusToSlug: Record<AnimalStatus, string> = {
  'En tratamiento': 'in_treatment',
  Recuperándose: 'recovering',
  'Buscando hogar': 'looking_for_adoption',
  Adoptado: 'adopted',
  Fallecido: 'deceased',
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

  // Datos del caso editables: nombre, descripción pública, sexo, padecimientos y costo.
  const [name, setName] = useState(animal.name);
  // Descripción PÚBLICA (lo que ve la gente), distinta del diagnóstico médico.
  const [story, setStory] = useState(animal.story ?? '');
  // Sexo en el formato del backend (male/female); '' = sin especificar.
  const [gender, setGender] = useState<'male' | 'female' | ''>(
    animal.gender === 'macho' ? 'male' : animal.gender === 'hembra' ? 'female' : '',
  );
  const [diagnosis, setDiagnosis] = useState(animal.diagnosis);
  // Costo estimado de recuperacion (meta de la barra de apadrinamiento). Se guarda
  // como string para el input y se sanea a un entero >= 0 al usarlo (evita NaN y
  // valores negativos si el usuario escribe algo raro).
  const [cost, setCost] = useState(animal.totalNeeded ? String(animal.totalNeeded) : '');
  const costNum = Math.max(0, Math.round(Number(cost) || 0));
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const currentGender = animal.gender === 'macho' ? 'male' : animal.gender === 'hembra' ? 'female' : '';
  const detailsChanged =
    name.trim() !== animal.name ||
    story.trim() !== (animal.story ?? '').trim() ||
    gender !== currentGender ||
    diagnosis.trim() !== animal.diagnosis ||
    costNum !== (animal.totalNeeded ?? 0);

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
    const cleanStory = story.trim();
    setSavingDetails(true);
    try {
      if (!preview) {
        await updateMyOrgAnimalDetails(
          animal.id,
          {
            name: cleanName,
            diagnosis: cleanDiagnosis,
            totalCostNeeded: costNum,
            story: cleanStory,
            gender: gender || undefined,
          },
          orgId,
        );
      }
      onUpdated(animal.id, {
        name: cleanName,
        diagnosis: cleanDiagnosis,
        totalNeeded: costNum,
        story: cleanStory,
        gender: gender === 'male' ? 'macho' : gender === 'female' ? 'hembra' : undefined,
      });
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
        addMyOrgAnimalPhoto(animal.id, dataUrl, orgId).catch(() => {});
      }
    } catch {
      setDetailsError('No se pudo procesar la imagen.');
    } finally {
      setAddingPhoto(false);
    }
  };

  const removePhoto = async (index: number) => {
    const urlToRemove = photos[index];
    const next = photos.filter((_, i) => i !== index);
    setPhotos(next);
    if (heroIndex >= next.length) setHeroIndex(Math.max(0, next.length - 1));
    onUpdated(animal.id, { photos: next });
    if (!preview) {
      deleteMyOrgAnimalPhoto(animal.id, urlToRemove, orgId).catch(() => {});
    }
  };

  const movePhoto = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;
    const next = [...photos];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setPhotos(next);
    if (heroIndex === index) setHeroIndex(newIndex);
    else if (heroIndex === newIndex) setHeroIndex(index);
    onUpdated(animal.id, { photos: next });
    if (!preview) {
      reorderMyOrgAnimalPhotos(animal.id, next, orgId).catch(() => {});
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
              <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
                {photos.map((url, index) => (
                  <div key={index} className="group relative h-20 w-20 shrink-0">
                    <button
                      type="button"
                      onClick={() => setHeroIndex(index)}
                      className={cn(
                        'h-full w-full overflow-hidden rounded-lg border-2 transition-all',
                        index === heroIndex ? 'border-coral shadow-md' : 'border-transparent'
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
                    
                    {/* Controles siempre visibles (mejor para móviles) */}
                    <div className="absolute -bottom-2 -left-2 -right-2 flex justify-between px-1">
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); movePhoto(index, -1); }}
                        disabled={index === 0}
                        className="rounded-full bg-white shadow-md border border-neutral-200 p-1 text-neutral-600 hover:text-coral disabled:opacity-0 transition-opacity"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                        className="rounded-full bg-red-500 shadow-md p-1 text-white hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); movePhoto(index, 1); }}
                        disabled={index === photos.length - 1}
                        className="rounded-full bg-white shadow-md border border-neutral-200 p-1 text-neutral-600 hover:text-coral disabled:opacity-0 transition-opacity"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
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
            {/* Sexo (opcional) */}
            <div>
              <span className="mb-1 block text-xs font-medium text-neutral-600">Sexo</span>
              <div className="flex gap-2">
                {[
                  { value: 'male' as const, label: 'Macho' },
                  { value: 'female' as const, label: 'Hembra' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setGender((current) => (current === option.value ? '' : option.value));
                      setDetailsSaved(false);
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                      gender === option.value
                        ? 'border-cobalto bg-cobalto/5 text-cobalto'
                        : 'border-neutral-200 text-neutral-600 hover:border-cobalto/40',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Descripción PÚBLICA (lo que ve la gente), separada del diagnóstico médico. */}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Descripción pública
              </span>
              <textarea
                value={story}
                onChange={(event) => {
                  setStory(event.target.value);
                  setDetailsSaved(false);
                }}
                maxLength={300}
                rows={2}
                className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
                placeholder="Su carácter, su historia, qué busca en un hogar…"
              />
              <span className="mt-1 block text-[11px] text-neutral-400">
                Es lo que ve la gente en la ficha del animalito.
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Padecimientos / diagnóstico (médico)
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
            {/* Costo estimado: meta de la barra de apadrinamiento. inputMode numeric
                para teclado de números en celular; solo dejamos dígitos para que el
                usuario no pueda meter letras ni signos y romper la barra. */}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">
                Costo estimado de recuperación (opcional)
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 focus-within:ring-2 focus-within:ring-cobalto/30">
                <span className="text-sm text-neutral-400">$</span>
                <input
                  value={cost}
                  onChange={(event) => {
                    // Solo dígitos, máx 7 (hasta 9,999,999) para no desbordar.
                    setCost(event.target.value.replace(/\D/g, '').slice(0, 7));
                    setDetailsSaved(false);
                  }}
                  inputMode="numeric"
                  className="w-full bg-transparent py-2 text-sm text-neutral-700 outline-none"
                  placeholder="Ej. 1500"
                />
                <span className="text-xs text-neutral-400">MXN</span>
              </div>
              <span className="mt-1 block text-[11px] text-neutral-400">
                Es la meta para la barra de apadrinamiento. Déjalo en blanco si aún no la sabes.
              </span>
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

            {status === 'Fallecido' && changed && (
              <p className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-600">
                Marcarás a {name || 'este animalito'} como fallecido. Es un estado final: dejará de
                aparecer en la lista de rehabilitación. Lo recordaremos con cariño.
              </p>
            )}

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
