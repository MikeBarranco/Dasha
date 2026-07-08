import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, HeartHandshake, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';
import { useAuth } from '../lib/useAuth';
import { useVolunteerStatus } from '../lib/useVolunteerStatus';
import { postVolunteerApplication, updateMe } from '../lib/api';
import { compressImage } from '../lib/image';
import { CameraCapture } from '../components/map/CameraCapture';

const ayudaOptions = ['Rescate', 'Transporte', 'Hogar temporal', 'Difusión', 'Apoyo veterinario'];
const dispoOptions = ['Entre semana', 'Fines de semana', 'Mañanas', 'Tardes', 'Noches'];

const inputClass =
  'w-full rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-700 outline-none transition-colors focus:border-cobalto';

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
        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-cobalto bg-cobalto text-white'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
      )}
    >
      {children}
    </button>
  );
}

function CaptureField({
  label,
  hint,
  value,
  frame,
  facing,
  onChange,
}: {
  label: string;
  hint: string;
  value: string | null;
  frame?: 'card' | 'face';
  facing: 'environment' | 'user';
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleCapture = async (file: File) => {
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch {
      onChange(null);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-neutral-700">{label}</p>
      {value ? (
        <div className="relative">
          <img src={value} alt={label} className="h-32 w-full rounded-xl object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar foto"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-cobalto/40 hover:text-cobalto"
        >
          <Camera className="h-6 w-6" />
          <span className="text-xs">{hint}</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-white">{label}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="rounded-full bg-white/10 p-2 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 p-4">
            <CameraCapture
              fill
              frame={frame}
              initialFacing={facing}
              onCapture={(file) => handleCapture(file)}
            />
          </div>
          {busy && <p className="pb-4 text-center text-sm text-white/80">Procesando…</p>}
        </div>
      )}
    </div>
  );
}

export function SerVoluntarioPage() {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const { apply } = useVolunteerStatus();
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [ayuda, setAyuda] = useState<string[]>([]);
  const [dispo, setDispo] = useState<string[]>([]);
  const [motivation, setMotivation] = useState('');
  const [idDoc, setIdDoc] = useState<string | null>(null);
  const [idSelfie, setIdSelfie] = useState<string | null>(null);
  const [fosterCapacity, setFosterCapacity] = useState('');
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!account) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purpura/10">
          <HeartHandshake className="h-9 w-9 text-purpura" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-cobalto">Únete como voluntario</h1>
        <p className="mt-2 max-w-xs text-sm text-neutral-500">
          Crea tu cuenta para postularte y empezar a ayudar a los animalitos.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/registro')}
            className="rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-xl border border-neutral-200 py-3 font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Ya tengo cuenta
          </button>
        </div>
      </div>
    );
  }

  const phoneValid = /^\d{10}$/.test(phone.replace(/\s/g, ''));
  const isFoster = ayuda.includes('Hogar temporal');
  const docsReady = Boolean(idDoc && idSelfie);
  const canSubmit =
    phoneValid && zone.trim().length > 1 && ayuda.length > 0 && docsReady && accept;

  const toggle = (list: string[], setList: (value: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    if (!idDoc || !idSelfie) return;
    setSubmitting(true);
    setError(null);
    try {
      const cleanPhone = phone.replace(/\s/g, '');
      await postVolunteerApplication({
        idDocBase64: idDoc,
        idSelfieBase64: idSelfie,
        isFoster,
        ...(isFoster && fosterCapacity ? { fosterCapacity: Number(fosterCapacity) } : {}),
        phone: cleanPhone,
        zone: zone.trim(),
        availability: dispo.join(', '),
        helpType: ayuda.join(', '),
        motivation: motivation.trim(),
      });
      // También guarda el teléfono en el perfil del usuario.
      updateMe({ phone: cleanPhone }).catch(() => {});
      apply();
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo enviar la solicitud. Intenta de nuevo.',
      );
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-exito text-white">
          <Check className="h-10 w-10" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-cobalto">¡Solicitud enviada!</h2>
        <p className="mt-2 text-neutral-500">
          Gracias por querer ayudar. Validaremos tu identidad y te contactaremos pronto. Mientras,
          tu solicitud queda en revisión.
        </p>
        <button
          type="button"
          onClick={() => navigate('/perfil')}
          className="mt-8 rounded-xl bg-cobalto px-5 py-3 font-medium text-white"
        >
          Ir a mi perfil
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Conviértete en voluntario"
        subtitle="Responde reportes cercanos, rescata animalitos y gana medallas."
      />

      <div className="mb-5 rounded-2xl bg-gradient-to-br from-purpura to-cobalto p-4 text-sm text-white/90">
        Validamos la identidad de cada voluntario para mantener segura a la comunidad. Al aprobar tu
        solicitud, tu cuenta pasa de Ciudadano a Voluntario.
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Teléfono de contacto
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="10 dígitos"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Zona donde puedes ayudar
          </label>
          <input
            type="text"
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            placeholder="Colonia o municipio"
            className={inputClass}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">¿Cómo puedes ayudar?</p>
          <div className="flex flex-wrap gap-2">
            {ayudaOptions.map((option) => (
              <Chip
                key={option}
                active={ayuda.includes(option)}
                onClick={() => toggle(ayuda, setAyuda, option)}
              >
                {option}
              </Chip>
            ))}
          </div>
        </div>

        {isFoster && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              ¿A cuántos animales puedes dar hogar temporal?
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={fosterCapacity}
              onChange={(event) => setFosterCapacity(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Ej. 2"
              className={inputClass}
            />
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">Disponibilidad</p>
          <div className="flex flex-wrap gap-2">
            {dispoOptions.map((option) => (
              <Chip
                key={option}
                active={dispo.includes(option)}
                onClick={() => toggle(dispo, setDispo, option)}
              >
                {option}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            ¿Por qué quieres ser voluntario? (opcional)
          </label>
          <textarea
            value={motivation}
            onChange={(event) => setMotivation(event.target.value)}
            rows={3}
            placeholder="Cuéntanos un poco de ti"
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 p-4">
          <p className="text-sm font-semibold text-neutral-800">Verificación de identidad</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Toma las dos fotos con la cámara. Las usamos solo para validar tu identidad.
          </p>
          <div className="mt-3 space-y-3">
            <CaptureField
              label="Identificación oficial con foto"
              hint="Tomar foto"
              value={idDoc}
              frame="card"
              facing="environment"
              onChange={setIdDoc}
            />
            <CaptureField
              label="Selfie sujetando tu identificación"
              hint="Tomar selfie"
              value={idSelfie}
              facing="user"
              onChange={setIdSelfie}
            />
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={accept}
            onChange={(event) => setAccept(event.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-cobalto"
          />
          Acepto que Dasha valide mi identidad para la seguridad de la comunidad.
        </label>

        {error && <p className="text-sm text-alerta">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <HeartHandshake className="h-5 w-5" />
          {submitting ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  );
}
