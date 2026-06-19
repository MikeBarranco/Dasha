import { GoogleIcon, FacebookIcon } from '../ui/BrandIcons';

export function OAuthButtons() {
  const handleOAuthLogin = (provider: 'google' | 'facebook') => {
    // Usar la URL base de la API, o el dominio actual en producción
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => handleOAuthLogin('google')}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98]"
      >
        <GoogleIcon className="h-5 w-5" />
        Continuar con Google
      </button>
      <button
        type="button"
        onClick={() => handleOAuthLogin('facebook')}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1877F2] py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <FacebookIcon className="h-5 w-5" />
        Continuar con Facebook
      </button>
    </div>
  );
}
