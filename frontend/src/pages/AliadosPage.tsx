import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  MapPin,
  BadgeCheck,
  ChevronRight,
  HeartHandshake,
  ArrowRight,
  Store,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState } from '../components/ui/ErrorState';
import { cn } from '../lib/cn';
import { getAllies } from '../lib/api';
import { allyTypeLabels, type Ally, type AllyType } from '../data/mockAllies';

const filters: { value: AllyType | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'veterinary', label: 'Veterinarias' },
  { value: 'shelter', label: 'Refugios' },
  { value: 'ngo', label: 'Asociaciones' },
];

function AllyCard({ ally, onOpen }: { ally: Ally; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full w-full flex-col rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors hover:border-cobalto/40 hover:bg-neutral-50"
    >
      <div className="flex items-start gap-3">
        <img
          src={ally.logoUrl ?? '/placeholder-logo.svg'}
          alt=""
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = '/placeholder-logo.svg';
          }}
          className="h-14 w-14 flex-shrink-0 rounded-xl border border-neutral-100 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-base font-bold text-cobalto">{ally.name}</h3>
            {ally.isVerified && <BadgeCheck className="h-4 w-4 flex-shrink-0 text-info" />}
          </div>
          <span className="mt-0.5 inline-block rounded-full bg-cobalto/10 px-2 py-0.5 text-[11px] font-medium text-cobalto">
            {allyTypeLabels[ally.orgType]}
          </span>
        </div>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-neutral-300" />
      </div>

      {ally.description && (
        <p className="mt-3 line-clamp-2 text-sm text-neutral-600">{ally.description}</p>
      )}

      {ally.address && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-neutral-400" />
          <span className="line-clamp-1">{ally.address}</span>
        </p>
      )}

      <span className="mt-3 text-xs font-medium text-cobalto">Ver perfil</span>
    </button>
  );
}

export function AliadosPage() {
  const [allies, setAllies] = useState<Ally[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<AllyType | 'todos'>('todos');
  const navigate = useNavigate();

  // Sin datos de ejemplo: si la API falla se muestra un error real, no aliados
  // inventados.
  const loadAllies = (isActive: () => boolean) => {
    getAllies()
      .then((data) => {
        if (isActive()) setAllies(data);
      })
      .catch(() => {
        if (isActive()) {
          setAllies([]);
          setError(true);
        }
      });
  };

  useEffect(() => {
    let active = true;
    loadAllies(() => active);
    return () => {
      active = false;
    };
  }, []);

  const retryLoad = () => {
    setError(false);
    setAllies(null);
    loadAllies(() => true);
  };

  const filtered = useMemo(
    () => (allies ?? []).filter((ally) => filter === 'todos' || ally.orgType === filter),
    [allies, filter],
  );

  const openAlly = (ally: Ally) => navigate(`/aliados/${ally.id}`);

  return (
    <div>
      <PageHeader
        title="Aliados"
        subtitle="Veterinarias, refugios y asociaciones que ayudan a los animalitos en Puebla."
      />

      {/* CTA para que negocios se registren como aliado: va arriba para que se vea
          primero (antes estaba hasta el final de la lista). */}
      <Link
        to="/ser-aliado"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-naranja/30 bg-naranja/5 p-4 transition-colors hover:bg-naranja/10"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-naranja text-white">
          <Store className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-naranja">
            ¿Tienes una veterinaria o refugio?
          </p>
          <p className="text-xs text-neutral-500">Únete como aliado de Dasha y ayúdanos a rescatar.</p>
        </div>
        <ArrowRight className="h-5 w-5 flex-shrink-0 text-naranja" />
      </Link>

      <Link
        to="/necesidades"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-cobalto/20 bg-cobalto/5 p-4 transition-colors hover:bg-cobalto/10"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto text-white">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-cobalto">Necesidades de los aliados</p>
          <p className="text-xs text-neutral-500">
            Cubre apoyos concretos: alimento, transporte, hogar temporal…
          </p>
        </div>
        <ArrowRight className="h-5 w-5 flex-shrink-0 text-cobalto" />
      </Link>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              filter === option.value
                ? 'border-cobalto bg-cobalto text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {allies === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="No pudimos cargar los aliados" onRetry={retryLoad} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 py-12 text-center">
          <p className="text-sm text-neutral-500">No hay aliados de este tipo todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((ally, index) => (
            <motion.div
              key={ally.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
            >
              <AllyCard ally={ally} onOpen={() => openAlly(ally)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
