import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setSession, API_URL, type AuthUser } from '../lib/api';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Con la cookie HttpOnly el token ya no llega en la URL: el backend fija la
    // cookie en el redirect. Si algo falló, viene ?error. Si todo salió bien,
    // pedimos el perfil con la cookie (credentials) y lo guardamos.
    if (searchParams.get('error')) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    fetch(`${API_URL}/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Error HTTP');
        return res.json();
      })
      .then((body) => {
        const user = (body?.data ?? body) as AuthUser | null;
        if (user && user.id) {
          setSession(user);
          window.dispatchEvent(new Event('dasha-auth-change'));
          // Redirigir al mapa (la app); la portada "/" es para visitantes sin sesión
          navigate('/mapa', { replace: true });
        } else {
          throw new Error('Fallo al obtener perfil del usuario');
        }
      })
      .catch((err) => {
        console.error('Error completando OAuth:', err);
        navigate('/login?error=oauth_failed', { replace: true });
      });
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-[#fd7d14]" />
        <p className="text-sm font-medium text-neutral-600">Iniciando sesión segura...</p>
      </div>
    </div>
  );
}
