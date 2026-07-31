// Editor de horario estructurado para el aliado: por cada día, Abierto/Cerrado y
// hora de apertura/cierre. En vez de texto libre, produce un string uniforme que
// se guarda en el mismo campo `schedule` (sin tocar el backend) y se muestra tal
// cual en el perfil público.
//
// Formato canónico (solo los días abiertos, separados por " · "):
//   "Lun 09:00–18:00 · Mar 09:00–18:00 · Sáb 10:00–14:00"
//
// Es un componente CONTROLADO: no guarda estado propio (deriva las filas de
// `value` en cada render), así nunca se desincroniza ni entra en bucle.

type Day = { label: string };

const DAYS: Day[] = [
  { label: 'Lun' },
  { label: 'Mar' },
  { label: 'Mié' },
  { label: 'Jue' },
  { label: 'Vie' },
  { label: 'Sáb' },
  { label: 'Dom' },
];

type Row = { label: string; open: boolean; from: string; to: string };

function parse(value: string): Row[] {
  const tokens = (value ?? '')
    .split('·')
    .map((token) => token.trim())
    .filter(Boolean);
  return DAYS.map((day) => {
    const token = tokens.find((item) => item.startsWith(`${day.label} `));
    const times = token?.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
    if (times) {
      return { label: day.label, open: true, from: times[1], to: times[2] };
    }
    return { label: day.label, open: false, from: '09:00', to: '18:00' };
  });
}

function serialize(rows: Row[]): string {
  return rows
    .filter((row) => row.open && row.from && row.to)
    .map((row) => `${row.label} ${row.from}–${row.to}`)
    .join(' · ');
}

type ScheduleEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const rows = parse(value);
  const anyOpen = rows.some((row) => row.open);
  // Si había un horario en texto libre (de antes) que no cuadra con el formato,
  // lo mostramos para que el aliado no lo pierda mientras arma el nuevo.
  const legacyText = !anyOpen && value.trim() ? value.trim() : '';

  const update = (index: number, patch: Partial<Row>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(serialize(next));
  };

  return (
    <div className="space-y-1.5">
      {rows.map((row, index) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="w-9 flex-shrink-0 text-sm font-medium text-neutral-600">{row.label}</span>
          <button
            type="button"
            onClick={() => update(index, { open: !row.open })}
            className={
              'w-20 flex-shrink-0 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ' +
              (row.open
                ? 'border-cobalto bg-cobalto/5 text-cobalto'
                : 'border-neutral-200 text-neutral-400 hover:border-neutral-300')
            }
          >
            {row.open ? 'Abierto' : 'Cerrado'}
          </button>
          {row.open ? (
            <div className="flex flex-1 items-center gap-1.5">
              <input
                type="time"
                value={row.from}
                onChange={(event) => update(index, { from: event.target.value })}
                className="w-full min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
              />
              <span className="flex-shrink-0 text-xs text-neutral-400">a</span>
              <input
                type="time"
                value={row.to}
                onChange={(event) => update(index, { to: event.target.value })}
                className="w-full min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
              />
            </div>
          ) : (
            <span className="flex-1 text-xs text-neutral-400">Sin atención</span>
          )}
        </div>
      ))}
      {legacyText && (
        <p className="pt-1 text-xs text-neutral-400">
          Horario anterior: “{legacyText}”. Ajusta los días de arriba para actualizarlo.
        </p>
      )}
    </div>
  );
}
