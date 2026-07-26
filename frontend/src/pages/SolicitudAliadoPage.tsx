import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Check, LogIn, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../lib/useAuth';
import {
  submitOrganizationApplication,
  getColoniesByCp,
  type OrgApplicationInput,
  type Colonia,
} from '../lib/api';
import { orgTypeOptions } from '../lib/adminApi';
import { onlyDigits } from '../lib/validation';
import { OrgLocationPicker } from '../components/map/OrgLocationPicker';

const inputClass =
  'w-full rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-700 outline-none transition-colors focus:border-cobalto';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

export function SolicitudAliadoPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [orgType, setOrgType] = useState(orgTypeOptions[0].value);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState(user?.name ?? '');

  // Ubicación: CP -> colonias (con centroide) -> pin arrastrable. Nunca pedimos
  // lat/lng a mano ni un link de mapas.
  const [zipCode, setZipCode] = useState('');
  const [colonies, setColonies] = useState<Colonia[]>([]);
  const [colonyName, setColonyName] = useState('');
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Último CP buscado, para ignorar respuestas viejas si el usuario lo cambió.
  const lastCpRef = useRef('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Cambia el CP: solo dígitos (máx 5). Al completar 5, busca sus colonias; al
  // bajar de 5, limpia la colonia elegida. La búsqueda va aquí (event handler) y
  // no en un efecto, para no llamar setState dentro del cuerpo de un efecto.
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

  // Al elegir una colonia, centra el mapa/pin en su centroide.
  const pickColony = (value: string) => {
    setColonyName(value);
    const colony = colonies.find((item) => item.name === value);
    if (colony && Number.isFinite(colony.lat) && Number.isFinite(colony.lng)) {
      setCoords({ lat: colony.lat, lng: colony.lng });
    }
  };

  // Sin sesión no se puede postular (la solicitud queda ligada a la cuenta que
  // luego será responsable del aliado).
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <PageHeader title="Únete como aliado" />
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cobalto/10 text-cobalto">
            <Store className="h-6 w-6" />
          </span>
          <p className="mt-3 font-semibold text-neutral-800">Primero inicia sesión</p>
          <p className="mt-1 text-sm text-neutral-500">
            Necesitas una cuenta para postular tu veterinaria o refugio. Con esa cuenta
            administrarás tu aliado cuando te aprueben.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <LogIn className="h-4 w-4" /> Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <PageHeader title="Solicitud enviada" />
        <div className="mt-6 rounded-2xl border border-exito/20 bg-exito/5 p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-exito/10 text-exito">
            <Check className="h-6 w-6" />
          </span>
          <p className="mt-3 font-semibold text-neutral-800">¡Gracias por querer sumarte!</p>
          <p className="mt-1 text-sm text-neutral-500">
            Un administrador de Dasha revisará tu solicitud. Cuando la aprueben, con tu cuenta
            entrarás a tu portal de aliado para configurar tu perfil.
          </p>
          <button
            type="button"
            onClick={() => navigate('/aliados')}
            className="mt-4 rounded-xl bg-cobalto px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Volver a aliados
          </button>
        </div>
      </div>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    const cleanContact = contactName.trim();
    const cleanDescription = description.trim();

    if (cleanName.length < 2) {
      setError('Escribe el nombre del aliado.');
      return;
    }
    if (cleanAddress.length < 4) {
      setError('Escribe la dirección.');
      return;
    }
    if (phone.length !== 10) {
      setError('El teléfono debe tener 10 dígitos.');
      return;
    }
    if (whatsapp && whatsapp.length !== 10) {
      setError('El WhatsApp debe tener 10 dígitos.');
      return;
    }
    if (website && !/^https?:\/\/.+\..+/.test(website.trim())) {
      setError('El sitio web debe empezar con http:// o https://');
      return;
    }
    if (cleanDescription.length < 10) {
      setError('Cuéntanos un poco más sobre tu aliado (mínimo 10 caracteres).');
      return;
    }
    if (cleanContact.length < 2) {
      setError('Escribe el nombre de la persona de contacto.');
      return;
    }
    if (!coords) {
      setError('Elige tu colonia por código postal y ajusta el pin en el mapa.');
      return;
    }

    setSaving(true);
    setError(null);

    const input: OrgApplicationInput = {
      name: cleanName,
      orgType,
      address: cleanAddress,
      phone,
      whatsapp: whatsapp || undefined,
      website: website.trim() || undefined,
      description: cleanDescription,
      contactName: cleanContact,
      zipCode: zipCode || undefined,
      lat: coords.lat,
      lng: coords.lng,
    };

    try {
      await submitOrganizationApplication(input);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar. Intenta de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <PageHeader title="Únete como aliado" />
      <p className="mt-2 text-sm text-neutral-500">
        ¿Tienes una veterinaria, refugio o asociación? Postúlate para ser aliado de Dasha y ayudar a
        rescatar y rehabilitar animalitos.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Nombre del aliado">
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

        <Field label="Dirección">
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            maxLength={160}
            className={inputClass}
            placeholder="Calle y número"
          />
        </Field>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-700">Ubicación en el mapa</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Escribe tu código postal, elige tu colonia y arrastra el pin hasta tu negocio. Así
            aparecerás bien ubicado en el mapa.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Código postal">
              <input
                value={zipCode}
                onChange={(event) => handleZip(event.target.value)}
                inputMode="numeric"
                maxLength={5}
                className={inputClass}
                placeholder="72000"
              />
            </Field>
            <Field label="Colonia">
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
                      : 'Elige tu colonia'}
                </option>
                {colonies.map((colony) => (
                  <option key={colony.name} value={colony.name}>
                    {colony.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {zipCode.length === 5 && !loadingColonies && colonies.length === 0 && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-alerta">
              No encontramos colonias para ese código postal. Revísalo.
            </p>
          )}
          {loadingColonies && (
            <p className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando colonias…
            </p>
          )}

          <OrgLocationPicker center={coords} onChange={(lat, lng) => setCoords({ lat, lng })} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input
              value={phone}
              onChange={(event) => setPhone(onlyDigits(event.target.value))}
              inputMode="numeric"
              className={inputClass}
              placeholder="10 dígitos"
            />
          </Field>
          <Field label="WhatsApp" hint="Opcional">
            <input
              value={whatsapp}
              onChange={(event) => setWhatsapp(onlyDigits(event.target.value))}
              inputMode="numeric"
              className={inputClass}
              placeholder="10 dígitos"
            />
          </Field>
        </div>

        <Field label="Sitio web" hint="Opcional">
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            maxLength={160}
            className={inputClass}
            placeholder="https://"
          />
        </Field>

        <Field label="Cuéntanos sobre tu aliado">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={400}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="Qué hacen, horarios, cómo pueden ayudar…"
          />
        </Field>

        <Field label="Persona de contacto">
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            maxLength={80}
            className={inputClass}
            placeholder="Nombre de quien administra el aliado"
          />
        </Field>

        {error && <p className="text-sm text-alerta">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  );
}
