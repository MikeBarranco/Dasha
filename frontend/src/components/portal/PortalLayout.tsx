import { useEffect, useState } from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { Store, ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import { getMyOrganization, type AllyContext } from '../../lib/api';

export function PortalLayout() {
  const { user } = useAuth();
  // undefined = cargando; null = no es aliado; objeto = contexto de aliado.
  const [context, setContext] = useState<AllyContext | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getMyOrganization()
      .then((ctx) => {
        if (active) setContext(ctx);
      })
      .catch(() => {
        if (active) setContext(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  if (context === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lino">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-cobalto" />
      </div>
    );
  }

  // Copiar el link no basta: si no eres aliado, te regresa a la app. La seguridad
  // real la impone el backend (cada /me/organization/* valida rol y organización).
  if (context === null) return <Navigate to="/mapa" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-lino">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto text-white">
              <Store className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base font-bold leading-tight text-cobalto">
                Portal de aliado
              </p>
              <p className="truncate text-xs text-neutral-400">{context.organizationName}</p>
            </div>
          </div>
          <Link
            to="/mapa"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver a la app</span>
          </Link>
        </div>
      </header>

      {context.preview && (
        <div className="border-b border-naranja/20 bg-naranja/5">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2 text-xs text-naranja md:px-6">
            <Eye className="h-3.5 w-3.5 flex-shrink-0" />
            Vista previa con datos de ejemplo. Se conectará a la organización real cuando el backend
            lo exponga.
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <Outlet context={context} />
      </main>
    </div>
  );
}
