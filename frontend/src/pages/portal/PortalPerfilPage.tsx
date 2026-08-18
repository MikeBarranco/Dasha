import { useEffect, useState } from 'react';
import { ImagePlus, Check } from 'lucide-react';
import { getAlly, updateMyOrganization, type MyOrgInput } from '../../lib/api';
import { mockAllies, type Ally } from '../../data/mockAllies';
import { compressImage } from '../../lib/image';
import { useAllyPortal } from '../../lib/useAllyPortal';
import { ScheduleEditor } from '../../components/portal/ScheduleEditor';

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

export function PortalPerfilPage() {
  const ctx = useAllyPortal();
  const [org, setOrg] = useState<Ally | null | undefined>(undefined);

  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [slogan, setSlogan] = useState('');
  const [description, setDescription] = useState('');
  const [promo, setPromo] = useState('');
  const [schedule, setSchedule] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Precargamos desde el DETALLE del aliado (getAlly = /allies/:id), no desde la
    // lista (getAllies = /allies): la lista no incluye coverUrl, schedule ni slogan,
    // por eso al re-editar el perfil salían vacíos aunque el público sí los mostraba.
    getAlly(ctx.organizationId)
      .then((real) => {
        if (!active) return;
        // El mock solo aplica en la vista previa (admin); un aliado real ve su
        // organización real, no una de ejemplo.
        const found =
          real ??
          (ctx.preview
            ? (mockAllies.find((item) => item.id === ctx.organizationId) ?? null)
            : null);
        setOrg(found);
        if (found) {
          setName(found.name ?? '');
          setAcronym(found.acronym ?? '');
          setSlogan(found.slogan ?? '');
          setDescription(found.description ?? '');
          setPromo(found.promo ?? '');
          setSchedule(found.schedule ?? '');
          setAddress(found.address ?? '');
          setPhone(found.phone ?? '');
          setWhatsapp(found.whatsapp ?? '');
          setWebsite(found.website ?? '');
        }
      })
      .catch(() => {
        if (active) setOrg(null);
      });
    return () => {
      active = false;
    };
  }, [ctx.organizationId, ctx.preview]);

  const pickImage = async (
    files: FileList | null,
    set: (value: string) => void,
    width: number,
  ) => {
    if (!files || files.length === 0) return;
    try {
      set(await compressImage(files[0], width));
    } catch {
      setError('No se pudo leer la imagen.');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);

    const input: MyOrgInput = {
      name: cleanName,
      // Se manda siempre (aunque vacío) para permitir borrar las siglas.
      acronym: acronym.trim(),
      slogan: slogan.trim() || undefined,
      description: description.trim() || undefined,
      promo: promo.trim() || undefined,
      schedule: schedule.trim() || undefined,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      website: website.trim() || undefined,
      ...(logo ? { logoBase64: logo } : {}),
      ...(cover ? { coverBase64: cover } : {}),
    };

    // En vista previa no hay backend: reflejamos los cambios en pantalla.
    if (ctx.preview) {
      setOrg((current) =>
        current
          ? {
              ...current,
              name: cleanName,
              acronym: input.acronym || undefined,
              slogan: input.slogan,
              description: input.description ?? '',
              promo: input.promo ?? null,
              schedule: input.schedule,
              address: input.address ?? '',
              phone: input.phone ?? null,
              whatsapp: input.whatsapp ?? null,
              website: input.website ?? null,
              logoUrl: logo ?? current.logoUrl,
              coverUrl: cover ?? current.coverUrl,
            }
          : current,
      );
      setSaving(false);
      setSaved(true);
      return;
    }

    try {
      await updateMyOrganization(input, ctx.adminOrgId);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (org === undefined) {
    return <div className="h-64 animate-pulse rounded-2xl bg-neutral-100" />;
  }

  if (!org) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold text-neutral-700">No encontramos tu organización</p>
      </div>
    );
  }

  const logoPreview = logo ?? org.logoUrl ?? null;
  const coverPreview = cover ?? org.coverUrl ?? null;

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-cobalto">Mi perfil</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Así te verán los ciudadanos en tu perfil público.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Portada</span>
          <label className="block cursor-pointer">
            <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cobalto via-cobalto to-purpura text-white/90">
                  <span className="flex items-center gap-2 text-sm">
                    <ImagePlus className="h-5 w-5" /> Agregar portada
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => pickImage(event.target.files, setCover, 1280)}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => pickImage(event.target.files, setLogo, 400)}
            />
          </label>
          <p className="text-sm text-neutral-500">Logo</p>
        </div>

        <Field label="Nombre">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className={inputClass}
            placeholder="Nombre completo de tu organización"
          />
        </Field>

        <Field label="Siglas (opcional)">
          <input
            value={acronym}
            onChange={(event) => setAcronym(event.target.value.slice(0, 20))}
            maxLength={20}
            className={inputClass}
            placeholder="Ej. CAETO"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Las siglas de tu organización. Se muestran junto al nombre completo.
          </p>
        </Field>

        <Field label="Eslogan">
          <input
            value={slogan}
            onChange={(event) => setSlogan(event.target.value)}
            maxLength={80}
            className={inputClass}
            placeholder="Una frase que te describa"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={400}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Qué hacen y cómo ayudan a los animalitos"
          />
        </Field>

        <Field label="Promoción u oferta (opcional)">
          <textarea
            value={promo}
            onChange={(event) => setPromo(event.target.value)}
            maxLength={500}
            rows={2}
            className={`${inputClass} resize-none`}
            placeholder="Ej. 50% de descuento en vacunas los martes"
          />
          <span className="mt-1 block text-xs text-neutral-400">
            Se muestra como una promoción destacada en tu perfil público.
          </span>
        </Field>

        <Field label="Horario">
          <ScheduleEditor value={schedule} onChange={setSchedule} />
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono">
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 15))}
              inputMode="numeric"
              className={inputClass}
              placeholder="10 dígitos"
            />
          </Field>
          <Field label="WhatsApp">
            <input
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value.replace(/\D/g, '').slice(0, 15))}
              inputMode="numeric"
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

        {error && <p className="text-sm text-alerta">{error}</p>}
        {saved && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-exito">
            <Check className="h-4 w-4" />
            Cambios guardados{ctx.preview ? ' (vista previa)' : ''}.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>

        {ctx.preview && (
          <p className="text-center text-xs text-neutral-400">
            En vista previa los cambios no se guardan de verdad; funcionará cuando el backend esté
            listo.
          </p>
        )}
      </form>
    </div>
  );
}
