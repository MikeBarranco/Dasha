import { useState } from 'react';

export function OAuthButtons() {
  const [info, setInfo] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setInfo(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        Continuar con Google
      </button>
      <button
        type="button"
        onClick={() => setInfo(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        Continuar con Facebook
      </button>
      {info && (
        <p className="text-center text-xs text-neutral-400">
          El acceso con redes sociales estará disponible pronto.
        </p>
      )}
    </div>
  );
}
