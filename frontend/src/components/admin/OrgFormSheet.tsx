import { useState } from 'react';
import { motion } from 'motion/react';
import { X, ImagePlus, BadgeCheck } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useLockBodyScroll } from '../../lib/useLockBodyScroll';
import {
  createAdminOrganization,
  updateAdminOrganization,
  fileToBase64,
  orgTypeOptions,
  type AdminOrg,
  type AdminOrgInput,
} from '../../lib/adminApi';

type OrgFormSheetProps = {
  org: AdminOrg | null;
  onClose: () => void;
  onSaved: () => void;
};

export function OrgFormSheet({ org, onClose, onSaved }: OrgFormSheetProps) {
  useLockBodyScroll();
  const editing = Boolean(org);

  const [name, setName] = useState(org?.name ?? '');
  const [orgType, setOrgType] = useState(org?.orgType ?? orgTypeOptions[0].value);
  const [isVerified, setIsVerified] = useState(org?.isVerified ?? false);
  const [description, setDescription] = useState(org?.description ?? '');
  const [address, setAddress] = useState(org?.address ?? '');
  const [phone, setPhone] = useState(org?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(org?.whatsapp ?? '');
  const [website, setWebsite] = useState(org?.website ?? '');
  const [schedule, setSchedule] = useState(org?.schedule ?? '');
  const [lat, setLat] = useState(org?.lat ? String(org.lat) : '');
  const [lng, setLng] = useState(org?.lng ? String(org.lng) : '');
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickLogo = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setLogo(await fileToBase64(files[0]));
    } catch {
      setError('No se pudo leer la imagen.');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);

    const input: AdminOrgInput = {
      name: name.trim(),
      orgType,
      isVerified,
      description: description.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      website: website.trim() || undefined,
      schedule: schedule.trim() || undefined,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      ...(logo ? { logoBase64: logo } : {}),
    };

    try {
      if (org) await updateAdminOrganization(org.id, input);
      else await createAdminOrganization(input);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
      setSaving(false);
    }
  };

  const logoPreview = logo ?? org?.logoUrl ?? null;

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
            {editing ? 'Editar aliado' : 'Nuevo aliado'}
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
          <div className="flex items-center gap-3">
            <label className="flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => pickLogo(event.target.files)}
              />
            </label>
            <p className="text-sm text-neutral-500">Logo del aliado</p>
          </div>

          <Field label="Nombre">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className={inputClass}
              placeholder="Ej. Veterinaria San Roque"
            />
          </Field>

          <Field label="Tipo">
            <select
              value={orgType}
              onChange={(event) => setOrgType(event.target.value)}
              className={inputClass}
            >
              {orgTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="button"
            onClick={() => setIsVerified((value) => !value)}
            className={cn(
              'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors',
              isVerified
                ? 'border-cobalto/40 bg-cobalto/5 text-cobalto'
                : 'border-neutral-200 text-neutral-600',
            )}
          >
            <span className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4" />
              Aliado verificado
            </span>
            <span
              className={cn(
                'flex h-5 w-9 items-center rounded-full p-0.5 transition-colors',
                isVerified ? 'bg-cobalto' : 'bg-neutral-300',
              )}
            >
              <span
                className={cn(
                  'h-4 w-4 rounded-full bg-white transition-transform',
                  isVerified && 'translate-x-4',
                )}
              />
            </span>
          </button>

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={400}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Qué hace el aliado"
            />
          </Field>

          <Field label="Dirección">
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={160}
              className={inputClass}
              placeholder="Calle, número, colonia"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={20}
                className={inputClass}
                placeholder="10 dígitos"
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                maxLength={20}
                className={inputClass}
                placeholder="10 dígitos"
              />
            </Field>
          </div>

          <Field label="Sitio web">
            <input
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              maxLength={160}
              className={inputClass}
              placeholder="https://"
            />
          </Field>

          <Field label="Horario">
            <input
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              maxLength={120}
              className={inputClass}
              placeholder="Ej. Lun a Vie 9:00 a 18:00"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud">
              <input
                value={lat}
                onChange={(event) => setLat(event.target.value)}
                inputMode="decimal"
                className={inputClass}
                placeholder="19.04"
              />
            </Field>
            <Field label="Longitud">
              <input
                value={lng}
                onChange={(event) => setLng(event.target.value)}
                inputMode="decimal"
                className={inputClass}
                placeholder="-98.20"
              />
            </Field>
          </div>

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
