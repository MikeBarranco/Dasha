import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { hasError: boolean };

// Red de seguridad de toda la aplicación. Si una pantalla truena al dibujarse,
// React desmonta el árbol completo y el usuario se queda viendo una página en
// blanco, sin saber qué pasó ni cómo salir. Con esto, en vez del vacío ve un
// mensaje claro y dos salidas: reintentar o volver al mapa.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Queda en consola para poder diagnosticarlo después.
    console.error('Error no controlado en la interfaz', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-alerta/10 text-alerta">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold text-cobalto">
          Algo se rompió en esta pantalla
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
          No pudimos mostrarte esta sección. Puedes intentarlo otra vez o volver al mapa; lo que
          hiciste antes no se perdió.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
          <button
            type="button"
            onClick={() => window.location.assign('/mapa')}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <Home className="h-4 w-4" /> Ir al mapa
          </button>
        </div>
      </div>
    );
  }
}
