import { useState } from 'react';
import { GoogleIcon, FacebookIcon, InstagramIcon } from '../ui/BrandIcons';

export function OAuthButtons() {
  const [info, setInfo] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setInfo(true)}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 active:scale-[0.98]"
      >
        <GoogleIcon className="h-5 w-5" />
        Continuar con Google
      </button>
      <button
        type="button"
        onClick={() => setInfo(true)}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#1877F2] py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <FacebookIcon className="h-5 w-5" />
        Continuar con Facebook
      </button>
      <button
        type="button"
        onClick={() => setInfo(true)}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5] py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
      >
        <InstagramIcon className="h-5 w-5" />
        Continuar con Instagram
      </button>
      {info && (
        <p className="text-center text-xs text-neutral-400">
          El acceso con redes sociales estará disponible pronto.
        </p>
      )}
    </div>
  );
}
