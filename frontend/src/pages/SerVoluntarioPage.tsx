import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, HeartHandshake } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../lib/cn';
import { useAuth } from '../lib/useAuth';
import { useVolunteerStatus } from '../lib/useVolunteerStatus';

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

export function SerVoluntarioPage() {
  const navigate = useNavigate();
  const { user: account } = useAuth();
  const { apply } = useVolunteerStatus();
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [ayuda, setAyuda] = useState<string[]>([]);
  const [dispo, setDispo] = useState<string[]>([]);
  const [motivation, setMotivation] = useState('');
  const [accept, setAccept] = useState(false);
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
  const canSubmit = phoneValid && zone.trim().length > 1 && ayuda.length > 0 && accept;

  const toggle = (list: string[], setList: (value: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    apply();
    setDone(true);
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

        <label className="flex items-start gap-3 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={accept}
            onChange={(event) => setAccept(event.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-cobalto"
          />
          Acepto que Dasha valide mi identidad para la seguridad de la comunidad.
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <HeartHandshake className="h-5 w-5" />
          Enviar solicitud
        </button>
      </form>
    </div>
  );
}
