function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-2xl font-bold text-cobalto">Dasha</p>

      <h1 className="mt-6 max-w-2xl font-display text-4xl font-bold text-cobalto sm:text-5xl">
        Convertimos la empatia en rescates
      </h1>

      <p className="mt-4 max-w-xl text-lg text-neutral-600">
        Plataforma de coordinacion de rescate animal. Esta es la base del proyecto; pronto veras el
        mapa, los reportes y la comunidad.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button type="button" className="rounded-lg bg-cobalto px-6 py-3 font-medium text-white">
          Explorar el mapa
        </button>
        <button type="button" className="rounded-lg bg-naranja px-6 py-3 font-semibold text-white">
          Reportar emergencia
        </button>
      </div>

      <p className="mt-12 text-sm text-neutral-500">FEPRO 2026 · En construccion</p>
    </main>
  );
}

export default App;
