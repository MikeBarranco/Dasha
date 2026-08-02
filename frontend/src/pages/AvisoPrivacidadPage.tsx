import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AvisoPrivacidadContent } from '../components/legal/LegalContent';

// Aviso de Privacidad de Dasha (proyecto académico sin fines de lucro), conforme
// a la Ley Federal de Protección de Datos Personales en Posesión de los
// Particulares (LFPDPPP), México. El texto vive en LegalContent para reutilizarlo
// también en la hoja del registro.
export function AvisoPrivacidadPage() {
  const navigate = useNavigate();
  // Volver a la pantalla anterior (registro, perfil, etc.); si se abrió directo
  // (pestaña nueva, deep link) no hay historial y caemos a la portada.
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-lino px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-cobalto"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <h1 className="mt-4 font-display text-2xl font-bold text-cobalto">Aviso de Privacidad</h1>
        <p className="mt-1 text-xs text-neutral-400">Última actualización: julio de 2026</p>

        <div className="mt-6">
          <AvisoPrivacidadContent />
        </div>
      </div>
    </div>
  );
}
