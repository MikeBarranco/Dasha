import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, ImagePlus } from 'lucide-react';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import {
  createAdminEvent,
  updateAdminEvent,
  getAdminOrganizations,
  eventCategoryOptions,
  type AdminEvent,
  type AdminEventInput,
  type AdminOrg,
} from '../../lib/adminApi';
import { compressImage } from '../../lib/image';

type EventFormSheetProps = {
  event: AdminEvent | null;
  onClose: () => void;
  onSaved: () => void;
};

// datetime-local trabaja en hora LOCAL con formato "YYYY-MM-DDTHH:mm"; el backend
// guarda ISO (UTC). Estas dos funciones convierten de ida y vuelta sin perder la
// hora que ve el usuario.
function isoToLocalInput(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function localInputToIso(local: string): string {
  if (!local) return '';
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function EventFormSheet({ event, onClose, onSaved }: EventFormSheetProps) {
  useLockBodyScroll();
  const editing = Boolean(event);

  const [title, setTitle] = useState(event?.title ?? '');
  const [category, setCategory] = useState(event?.category || eventCategoryOptions[0].value);
  const [description, setDescription] = useState(event?.description ?? '');
  const [eventDate, setEventDate] = useState(isoToLocalInput(event?.eventDate ?? ''));
  const [endDate, setEndDate] = useState(isoToLocalInput(event?.endDate ?? ''));
  const [location, setLocation] = useState(event?.location ?? '');
  const [address, setAddress] = useState(event?.address ?? '');
  const [maxParticipants, setMaxParticipants] = useState(
    event?.maxParticipants != null ? String(event.maxParticipants) : '',
  );
  const [organizationId, setOrganizationId] = useState(event?.organizationId ?? '');
  const [image, setImage] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminOrganizations()
      .then((data) => {
        if (active) setOrgs(data);
      })
      .catch(() => {
        if (active) setOrgs([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const pickImage = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setImage(await compressImage(files[0]));
    } catch {
      setError('No se pudo leer la imagen.');
    }
  };

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();

    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }
    const cleanDescription = description.trim();
    if (cleanDescription.length < 10) {
      setError('La descripción debe tener al menos 10 caracteres.');
      return;
    }
    if (!eventDate) {
      setError('Indica la fecha y hora del evento.');
      return;
    }
    if (endDate && new Date(endDate).getTime() < new Date(eventDate).getTime()) {
      setError('La fecha de término no puede ser anterior a la de inicio.');
      return;
    }
    const cleanLocation = location.trim();
    if (!cleanLocation) {
      setError('Indica el lugar del evento.');
      return;
    }
    const cleanAddress = address.trim();
    if (!cleanAddress) {
      setError('Indica la dirección del evento.');
      return;
    }
    let maxNumber: number | undefined;
    if (maxParticipants.trim()) {
      maxNumber = Number(maxParticipants);
      if (!Number.isInteger(maxNumber) || maxNumber < 1) {
        setError('El cupo máximo debe ser un número entero mayor a 0.');
        return;
      }
    }
    if (!organizationId) {
      setError('Selecciona el aliado organizador.');
      return;
    }
    if (!editing && !image) {
      setError('Agrega una imagen para el evento.');
      return;
    }

    setSaving(true);
    setError(null);

    const input: AdminEventInput = {
      title: cleanTitle,
      description: cleanDescription,
      category,
      eventDate: localInputToIso(eventDate),
      endDate: endDate ? localInputToIso(endDate) : undefined,
      location: cleanLocation,
      address: cleanAddress,
      maxParticipants: maxNumber,
      organizationId,
      ...(image ? { imageBase64: image } : {}),
    };

    try {
      if (event) await updateAdminEvent(event.id, input);
      else await createAdminEvent(input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
      setSaving(false);
    }
  };

  const imagePreview = image ?? event?.imageUrl ?? null;
  const noOrgs = orgs !== null && orgs.length === 0;

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
            {editing ? 'Editar evento' : 'Nuevo evento'}
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
          <label className="block cursor-pointer">
            <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1.5 text-sm">
                  <ImagePlus className="h-6 w-6" />
                  Imagen del evento
                </span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(inputEvent) => pickImage(inputEvent.target.files)}
            />
          </label>

          <Field label="Título">
            <input
              value={title}
              onChange={(inputEvent) => setTitle(inputEvent.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="Ej. Jornada de esterilización gratuita"
            />
          </Field>

          <Field label="Categoría">
            <select
              value={category}
              onChange={(inputEvent) => setCategory(inputEvent.target.value)}
              className={inputClass}
            >
              {eventCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(inputEvent) => setDescription(inputEvent.target.value)}
              maxLength={600}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="De qué trata el evento, requisitos, qué llevar…"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Inicio">
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(inputEvent) => setEventDate(inputEvent.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Término (opcional)">
              <input
                type="datetime-local"
                value={endDate}
                min={eventDate || undefined}
                onChange={(inputEvent) => setEndDate(inputEvent.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Lugar">
            <input
              value={location}
              onChange={(inputEvent) => setLocation(inputEvent.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="Ej. Parque Juárez"
            />
          </Field>

          <Field label="Dirección">
            <input
              value={address}
              onChange={(inputEvent) => setAddress(inputEvent.target.value)}
              maxLength={160}
              className={inputClass}
              placeholder="Calle, número, colonia"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Cupo máximo (opcional)">
              <input
                value={maxParticipants}
                onChange={(inputEvent) =>
                  setMaxParticipants(inputEvent.target.value.replace(/\D/g, '').slice(0, 6))
                }
                inputMode="numeric"
                className={inputClass}
                placeholder="Sin límite"
              />
            </Field>
            <Field label="Aliado organizador">
              <select
                value={organizationId}
                onChange={(inputEvent) => setOrganizationId(inputEvent.target.value)}
                className={inputClass}
                disabled={orgs === null || noOrgs}
              >
                <option value="">
                  {orgs === null ? 'Cargando aliados…' : 'Selecciona un aliado'}
                </option>
                {(orgs ?? []).map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name || 'Sin nombre'}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {noOrgs && (
            <p className="text-sm text-alerta">
              Primero registra un aliado en la sección “Aliados” para poder asignar el evento.
            </p>
          )}

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
