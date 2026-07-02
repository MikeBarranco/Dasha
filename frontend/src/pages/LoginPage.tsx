import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { PasswordInput } from '../components/auth/PasswordInput';
import { OAuthButtons } from '../components/auth/OAuthButtons';
import { SocialLinks } from '../components/ui/SocialLinks';
import { isValidEmail } from '../lib/validation';

const inputClass =
  'w-full rounded-xl border border-neutral-200 px-4 py-3 text-base text-neutral-700 outline-none transition-colors focus:border-cobalto';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = isValidEmail(email) && password.length > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/mapa');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lino px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src="/brand/logo-mark.png" alt="Dasha" className="h-16 w-16 rounded-full" />
          <h1 className="mt-3 font-display text-2xl font-bold text-cobalto">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-neutral-500">Inicia sesión para reportar y ayudar.</p>
        </div>

        <OAuthButtons />

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-400">o con tu correo</span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo"
            className={inputClass}
          />
          <PasswordInput value={password} onChange={setPassword} />

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-cobalto">
            Regístrate
          </Link>
        </p>
        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-neutral-400 hover:text-neutral-600">
            Volver al inicio
          </Link>
        </p>

        <div className="mt-8 border-t border-neutral-200 pt-6">
          <p className="mb-3 text-center text-xs text-neutral-400">Síguenos</p>
          <SocialLinks />
        </div>
      </div>
    </div>
  );
}
