import { useState } from 'react';
import { motion } from 'motion/react';
import { X, ImagePlus } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import {
  createAdminAnimal,
  updateAdminAnimal,
  animalStatusOptions,
  type AdminAnimal,
  type AdminAnimalInput,
} from '../../lib/adminApi';
import { compressImage } from '../../lib/image';

type OrgOption = { id: string; name: string };

type AnimalFormSheetProps = {
  animal: AdminAnimal | null;
  organizations: OrgOption[];
  onClose: () => void;
  onSaved: () => void;
};

export function AnimalFormSheet({ animal, organizations, onClose, onSaved }: AnimalFormSheetProps) {
  useLockBodyScroll();
  const editing = Boolean(animal);

  const [name, setName] = useState(animal?.name ?? '');
  const [species, setSpecies] = useState<'dog' | 'cat'>(animal?.species === 'gato' ? 'cat' : 'dog');
  const [status, setStatus] = useState(animal?.status ?? animalStatusOptions[0].value);
  const [organizationId, setOrganizationId] = useState(animal?.organizationId ?? '');
  const [diagnosis, setDiagnosis] = useState(animal?.diagnosis ?? '');
  const [treatment, setTreatment] = useState(animal?.treatment ?? '');
  const [history, setHistory] = useState(animal?.history ?? '');
  const [cost, setCost] = useState(animal?.estimatedCost ? String(animal.estimatedCost) : '');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const encoded = await Promise.all(Array.from(files).map((file) => compressImage(file)));
      setNewPhotos((current) => [...current, ...encoded]);
    } catch {
      setError('No se pudo leer alguna imagen.');
    }
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos((current) => current.filter((_, i) => i !== index));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);

    const input: AdminAnimalInput = {
      name: name.trim(),
      species,
      status,
      history: history.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      treatment: treatment.trim() || undefined,
      estimatedCost: cost ? Number(cost) : undefined,
      organizationId: organizationId || null,
      ...(newPhotos.length > 0 ? { photosBase64: newPhotos } : {}),
    };

    try {
      if (animal) await updateAdminAnimal(animal.id, input);
      else await createAdminAnimal(input);
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
            {editing ? 'Editar animal' : 'Nuevo animal'}
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
          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-700">Fotos</p>
            {editing && animal && animal.photos.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {animal.photos.map((photo) => (
                  <img
                    key={photo}
                    src={photo}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover opacity-70"
                  />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {newPhotos.map((photo, index) => (
                <div key={index} className="relative">
                  <img src={photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewPhoto(index)}
                    aria-label="Quitar foto"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-alerta text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto">
                <ImagePlus className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => addPhotos(event.target.files)}
                />
              </label>
            </div>
            {editing && (
              <p className="mt-1.5 text-xs text-neutral-400">
                Las fotos nuevas se agregan a las actuales.
              </p>
            )}
          </div>

          <Field label="Nombre">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              className={inputClass}
              placeholder="Nombre del animal"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Especie">
              <select
                value={species}
                onChange={(event) => setSpecies(event.target.value as 'dog' | 'cat')}
                className={inputClass}
              >
                <option value="dog">Perro</option>
                <option value="cat">Gato</option>
              </select>
            </Field>
            <Field label="Estado">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className={inputClass}
              >
                {animalStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Organización">
            <select
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
              className={inputClass}
            >
              <option value="">Sin organización</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Diagnóstico">
            <input
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="Ej. Fractura en pata trasera"
            />
          </Field>

          <Field label="Tratamiento">
            <input
              value={treatment}
              onChange={(event) => setTreatment(event.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="Ej. Cirugía y reposo"
            />
          </Field>

          <Field label="Historia">
            <textarea
              value={history}
              onChange={(event) => setHistory(event.target.value)}
              maxLength={600}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Cuenta la historia del animal"
            />
          </Field>

          <Field label="Costo estimado (MXN)">
            <input
              value={cost}
              onChange={(event) => setCost(event.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              className={inputClass}
              placeholder="0"
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
