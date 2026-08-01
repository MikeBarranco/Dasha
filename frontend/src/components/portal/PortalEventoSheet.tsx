import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, ImagePlus, Loader2, CalendarPlus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import { createOrgEvent, getColoniesByCp, type Colonia } from '../../lib/api';
import { eventCategoryOptions } from '../../lib/adminApi';
import { OrgLocationPicker } from '../map/OrgLocationPicker';
import { compressImage } from '../../lib/image';
import { onlyDigits } from '../../lib/validation';

type PortalEventoSheetProps = {
  // Id de la organización que publica (real o el que un admin está viendo).
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
};

// Valor mínimo para <input type="datetime-local">: el momento actual, en hora
// local, con el formato "YYYY-MM-DDTHH:mm" que exige el control. Evita publicar
// eventos en el pasado.
function nowLocalInput(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`;
}

// Convierte el valor local del control ("2026-08-15T18:00") a ISO en UTC para el
// backend. Cadena vacía => undefined.
function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function PortalEventoSheet({ organizationId, onClose, onCreated }: PortalEventoSheetProps) {
  useLockBodyScroll();

  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(eventCategoryOptions[0]?.value ?? 'otro');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [address, setAddress] = useState('');

  const [zipCode, setZipCode] = useState('');
  const [colonies, setColonies] = useState<Colonia[]>([]);
  const [colonyName, setColonyName] = useState('');
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const lastCpRef = useRef('');

  const [addingImage, setAddingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = nowLocalInput();

  const pickImage = async (files: FileList | null) => {
    if (!files || files.length === 0 || addingImage) return;
    setAddingImage(true);
    setError(null);
    try {
      const dataUrl = await compressImage(files[0]);
      setImage(dataUrl);
    } catch {
      setError('No se pudo procesar la imagen.');
    } finally {
      setAddingImage(false);
    }
  };

  // CP: solo dígitos (máx 5). Al completar 5, busca colonias; la búsqueda va en el
  // handler (no en un efecto) con guard anti-carrera, como en el registro de aliado.
  const handleZip = (raw: string) => {
    const cp = onlyDigits(raw, 5);
    setZipCode(cp);
    if (cp.length !== 5) {
      setColonies([]);
      setColonyName('');
      return;
    }
    lastCpRef.current = cp;
    setLoadingColonies(true);
    getColoniesByCp(cp)
      .then((list) => {
        if (lastCpRef.current === cp) setColonies(list);
      })
      .catch(() => {
        if (lastCpRef.current === cp) setColonies([]);
      })
      .finally(() => {
        if (lastCpRef.current === cp) setLoadingColonies(false);
      });
  };

  const pickColony = (value: string) => {
    setColonyName(value);
    const colony = colonies.find((item) => item.name === value);
    if (colony && Number.isFinite(colony.lat) && Number.isFinite(colony.lng)) {
      setCoords({ lat: colony.lat, lng: colony.lng });
    }
  };

  const endBeforeStart =
    Boolean(endDate) && Boolean(eventDate) && new Date(endDate) < new Date(eventDate);

  const canSave =
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    address.trim().length >= 3 &&
    Boolean(eventDate) &&
    !endBeforeStart &&
    !saving;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (endBeforeStart) {
      setError('La fecha de fin no puede ser antes del inicio.');
      return;
    }
    if (!canSave) {
      setError('Completa el título, la descripción, la dirección y la fecha del evento.');
      return;
    }
    const startIso = toIso(eventDate);
    if (!startIso) {
      setError('La fecha de inicio no es válida.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createOrgEvent(organizationId, {
        title: title.trim(),
        description: description.trim(),
        category,
        eventDate: startIso,
        endDate: toIso(endDate),
        address: address.trim(),
        lat: coords?.lat,
        lng: coords?.lng,
        imageBase64: image ?? undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar el evento. Intenta de nuevo.');
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
          <h2 className="font-display text-lg font-bold text-cobalto">Publicar un evento</h2>
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
            Comparte una jornada de esterilización, una carrera con causa, una colecta… Aparecerá
            en Comunidad y se quitará solo al pasar la fecha.
          </p>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">
              Imagen del evento
            </span>
            <div className="flex flex-wrap gap-2">
              {image && (
                <div className="relative h-24 w-full overflow-hidden rounded-xl">
                  <img src={image} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    aria-label="Quitar imagen"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {!image && (
                <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto">
                  {addingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-xs">Agregar una foto (opcional)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={addingImage}
                    onChange={(event) => pickImage(event.target.files)}
                  />
                </label>
              )}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Título</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              className={inputClass}
              placeholder="Ej. Jornada de esterilización gratuita"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Categoría</span>
            <div className="flex flex-wrap gap-2">
              {eventCategoryOptions.map((option) => (
                <Chip
                  key={option.value}
                  active={category === option.value}
                  onClick={() => setCategory(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Descripción</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1500}
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder="De qué trata, a quién va dirigido, costo, qué llevar…"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-neutral-700">
                Inicio
              </span>
              <input
                type="datetime-local"
                value={eventDate}
                min={minDate}
                onChange={(event) => setEventDate(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-neutral-700">
                Fin (opcional)
              </span>
              <input
                type="datetime-local"
                value={endDate}
                min={eventDate || minDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          {endBeforeStart && (
            <p className="text-xs text-alerta">La fecha de fin no puede ser antes del inicio.</p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Dirección</span>
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={255}
              className={inputClass}
              placeholder="Calle, número y colonia"
            />
          </label>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-sm font-medium text-neutral-700">Ubicación en el mapa (opcional)</p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Escribe el código postal, elige la colonia y arrastra el pin al lugar. Así la gente
              sabrá exactamente a dónde llegar.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Código postal
                </span>
                <input
                  value={zipCode}
                  onChange={(event) => handleZip(event.target.value)}
                  inputMode="numeric"
                  maxLength={5}
                  className={inputClass}
                  placeholder="72000"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-neutral-700">Colonia</span>
                <select
                  value={colonyName}
                  onChange={(event) => pickColony(event.target.value)}
                  disabled={colonies.length === 0}
                  className={`${inputClass} disabled:bg-neutral-50 disabled:text-neutral-400`}
                >
                  <option value="">
                    {loadingColonies
                      ? 'Buscando…'
                      : colonies.length === 0
                        ? 'Escribe el CP'
                        : 'Elige la colonia'}
                  </option>
                  {colonies.map((colony) => (
                    <option key={colony.name} value={colony.name}>
                      {colony.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {zipCode.length === 5 && !loadingColonies && colonies.length === 0 && (
              <p className="mt-2 text-xs text-alerta">
                No encontramos colonias para ese código postal. Revísalo.
              </p>
            )}
            {loadingColonies && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando colonias…
              </p>
            )}

            <div className="mt-3">
              <OrgLocationPicker
                center={coords}
                colonyName={colonyName}
                onChange={(lat, lng) => setCoords({ lat, lng })}
              />
            </div>
          </div>

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
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publicando…
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4" /> Publicar evento
                </>
              )}
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
