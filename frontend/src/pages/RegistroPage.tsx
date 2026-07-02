import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Bone } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { PasswordInput } from '../components/auth/PasswordInput';
import { OAuthButtons } from '../components/auth/OAuthButtons';
import { cn } from '../lib/cn';
import { onlyLetters, isValidEmail, passwordRules, isStrongPassword } from '../lib/validation';

const inputClass =
  'w-full rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-700 outline-none transition-colors focus:border-cobalto';

function Field({ label, error, children }: { label: string; error: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function RegistroPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errors = {
    nombre:
      nombre.trim() === ''
        ? 'Escribe tu nombre'
        : !onlyLetters(nombre)
          ? 'Solo letras, sin números'
          : '',
    apellidos:
      apellidos.trim() === ''
        ? 'Escribe tus apellidos'
        : !onlyLetters(apellidos)
          ? 'Solo letras, sin números'
          : '',
    email: !isValidEmail(email) ? 'Correo no válido (debe llevar @)' : '',
    password: !isStrongPassword(password) ? 'La contraseña no cumple los requisitos' : '',
    confirm: confirm !== password || confirm === '' ? 'Las contraseñas no coinciden' : '',
  };

  const isValid = Object.values(errors).every((value) => value === '');

  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }));

  const showError = (field: keyof typeof errors) => (touched[field] ? errors[field] : '');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ nombre: true, apellidos: true, email: true, password: true, confirm: true });
    if (!isValid) return;
    setError(null);
    setLoading(true);
    try {
      await register(`${nombre.trim()} ${apellidos.trim()}`, email.trim(), password);
      navigate('/mapa');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lino px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/brand/logo-mark.png" alt="Dasha" className="h-16 w-16 rounded-full" />
          <h1 className="mt-3 font-display text-2xl font-bold text-cobalto">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-neutral-500">Únete a la comunidad que rescata en Puebla.</p>
        </div>

        <OAuthButtons />

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-400">o con tu correo</span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <Field label="Nombre" error={showError('nombre')}>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              onBlur={() => markTouched('nombre')}
              placeholder="Tu nombre"
              className={inputClass}
            />
          </Field>

          <Field label="Apellidos" error={showError('apellidos')}>
            <input
              value={apellidos}
              onChange={(event) => setApellidos(event.target.value)}
              onBlur={() => markTouched('apellidos')}
              placeholder="Tus apellidos"
              className={inputClass}
            />
          </Field>

          <Field label="Correo" error={showError('email')}>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => markTouched('email')}
              placeholder="tucorreo@ejemplo.com"
              className={inputClass}
            />
          </Field>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Contraseña</label>
            <PasswordInput
              value={password}
              onChange={setPassword}
              onBlur={() => markTouched('password')}
            />
            <ul className="mt-2 space-y-1">
              {passwordRules.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.id} className="flex items-center gap-2 text-xs">
                    <Bone
                      className={cn('h-3.5 w-3.5 flex-shrink-0', ok ? 'text-exito' : 'text-neutral-300')}
                    />
                    <span className={ok ? 'text-neutral-600' : 'text-neutral-400'}>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Field label="Confirmar contraseña" error={showError('confirm')}>
            <PasswordInput
              value={confirm}
              onChange={setConfirm}
              onBlur={() => markTouched('confirm')}
              placeholder="Repite la contraseña"
            />
          </Field>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-cobalto">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
