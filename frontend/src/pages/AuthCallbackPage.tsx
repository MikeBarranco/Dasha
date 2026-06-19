import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setSession } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      // Si no hay token, hubo un error
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    // Guardar token temporalmente para autorizar la siguiente petición
    localStorage.setItem('dasha-token', token);

    // Obtener los datos del usuario usando el nuevo token
    fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error HTTP');
        return res.json();
      })
      .then((user) => {
        if (user && user.id) {
          // Guardar el perfil completo y notificar a la app
          setSession(user, token);
          window.dispatchEvent(new Event('dasha-auth-change'));
          // Redirigir al inicio o mapa
          navigate('/', { replace: true });
        } else {
          throw new Error('Fallo al obtener perfil del usuario');
        }
      })
      .catch((err) => {
        console.error('Error completando OAuth:', err);
        localStorage.removeItem('dasha-token');
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
