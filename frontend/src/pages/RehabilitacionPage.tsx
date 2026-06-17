import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { AnimalDetail } from '../components/rehab/AnimalDetail';
import { mockAnimals, type Animal, type AnimalSize, type AnimalStatus } from '../data/mockAnimals';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

const sizeOptions: AnimalSize[] = ['Chico', 'Mediano', 'Grande'];
const statusOptions: AnimalStatus[] = ['Buscando hogar', 'En tratamiento', 'Recuperándose'];

type FilterSelectProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
};

function FilterSelect({ value, onChange, children }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
    >
      {children}
    </select>
  );
}

export function RehabilitacionPage() {
  const [selected, setSelected] = useState<Animal | null>(null);
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('todos');
  const [size, setSize] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [zone, setZone] = useState('todas');

  const zones = useMemo(
    () =>
      [...new Set(mockAnimals.map((animal) => animal.zone))].sort((a, b) => a.localeCompare(b, 'es')),
    [],
  );

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    return mockAnimals
      .filter((animal) => species === 'todos' || animal.species === species)
      .filter((animal) => size === 'todos' || animal.size === size)
      .filter((animal) => status === 'todos' || animal.status === status)
      .filter((animal) => zone === 'todas' || animal.zone === zone)
      .filter((animal) => normalize(animal.name).includes(query))
      .sort((a, b) => a.totalRaised / a.totalNeeded - b.totalRaised / b.totalNeeded);
  }, [search, species, size, status, zone]);

  const hasFilters =
    search !== '' ||
    species !== 'todos' ||
    size !== 'todos' ||
    status !== 'todos' ||
    zone !== 'todas';

  const clearFilters = () => {
    setSearch('');
    setSpecies('todos');
    setSize('todos');
    setStatus('todos');
    setZone('todas');
  };

  return (
    <div>
      <PageHeader
        title="En rehabilitación"
        subtitle="Conoce a los animales rescatados y apadrina su recuperación."
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-cobalto/30">
          <Search className="h-4 w-4 flex-shrink-0 text-neutral-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterSelect value={species} onChange={(event) => setSpecies(event.target.value)}>
            <option value="todos">Especie: todas</option>
            <option value="perro">Perro</option>
            <option value="gato">Gato</option>
          </FilterSelect>

          <FilterSelect value={size} onChange={(event) => setSize(event.target.value)}>
            <option value="todos">Tamaño: todos</option>
            {sizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="todos">Estado: todos</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'Buscando hogar' ? 'Listos para adoptar' : option}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={zone} onChange={(event) => setZone(event.target.value)}>
            <option value="todas">Zona: todas</option>
            {zones.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </FilterSelect>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl px-3 py-2 text-sm font-medium text-cobalto hover:bg-neutral-100"
            >
              Limpiar
            </button>
          )}
        </div>

        <p className="text-xs text-neutral-400">
          {filtered.length} {filtered.length === 1 ? 'animalito' : 'animalitos'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 py-12 text-center">
          <p className="text-sm text-neutral-500">No encontramos animalitos con esos filtros.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-sm font-medium text-cobalto hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((animal, index) => (
            <motion.button
              key={animal.id}
              type="button"
              onClick={() => setSelected(animal)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition-shadow hover:shadow-md"
            >
              <div className="relative">
                <img
                  src={animal.photos[animal.photos.length - 1]}
                  alt={animal.name}
                  className="h-52 w-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
                  Conóceme
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-cobalto">{animal.name}</h3>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                    {animal.species === 'perro' ? 'Perro' : 'Gato'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {animal.status} · {animal.zone}
                </p>
                <div className="mt-3">
                  <ProgressBar raised={animal.totalRaised} needed={animal.totalNeeded} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && <AnimalDetail animal={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
