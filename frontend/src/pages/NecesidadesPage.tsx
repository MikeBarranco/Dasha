import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartHandshake,
  Bone,
  Truck,
  Home,
  Stethoscope,
  Package,
  CheckCircle2,
  MapPin,
  Clock,
  Info,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../lib/useAuth';
import { getActiveNeeds, coverNeed } from '../lib/api';
import { needTypeLabels, type Need, type NeedType } from '../data/needs';

const typeIcon: Record<NeedType, typeof Bone> = {
  food: Bone,
  transport: Truck,
  foster: Home,
  medical_service: Stethoscope,
  supplies: Package,
  other: HeartHandshake,
};

export function NecesidadesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [coveringId, setCoveringId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getActiveNeeds().then((result) => {
      if (!active) return;
      setNeeds(result.needs);
      setDemo(result.demo);
    });
    return () => {
      active = false;
    };
  }, []);

  const cover = async (need: Need) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const myName = user.name ? user.name.split(' ')[0] : 'Ti';
    const markCovered = () =>
      setNeeds(
        (list) =>
          list?.map((item) =>
            item.id === need.id ? { ...item, status: 'covered', coveredByName: myName } : item,
          ) ?? list,
      );

    if (demo) {
      markCovered();
      return;
    }
    setCoveringId(need.id);
    try {
      await coverNeed(need.id);
      markCovered();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo registrar tu apoyo. Intenta de nuevo.');
    } finally {
      setCoveringId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Necesidades"
        subtitle="Los refugios y aliados piden apoyo concreto (alimento, transporte, hogar temporal). Cubre una necesidad y ayuda directo."
      />

      {demo && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-cobalto/20 bg-cobalto/5 px-4 py-3 text-sm text-neutral-600">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalto" />
          <span>
            Vista de demostración con ejemplos. Se conectará a las necesidades reales de los aliados
            cuando el backend esté listo.
          </span>
        </div>
      )}

      {needs === null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-44 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {needs !== null && needs.length === 0 && (
        <EmptyState
          image="/illustrations/vacio-reportes.webp"
          title="No hay necesidades activas"
          message="Cuando un aliado publique una necesidad de apoyo, aparecerá aquí."
        />
      )}

      {needs !== null && needs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {needs.map((need) => {
            const Icon = typeIcon[need.type];
            const covered = need.status !== 'open';
            return (
              <article
                key={need.id}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cobalto/10 text-cobalto">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
                        {needTypeLabels[need.type]}
                      </span>
                      {need.quantity && (
                        <span className="text-xs font-medium text-neutral-500">{need.quantity}</span>
                      )}
                    </div>
                    <h3 className="mt-1 font-display text-base font-bold text-neutral-800">
                      {need.title}
                    </h3>
                  </div>
                </div>

                {need.description && (
                  <p className="mt-2 text-sm text-neutral-600">{need.description}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-cobalto" />
                    {need.organizationName}
                    {need.animalName ? ` · ${need.animalName}` : ''}
                  </span>
                  {need.createdAgo && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      {need.createdAgo}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  {covered ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-exito">
                      <CheckCircle2 className="h-4 w-4" />
                      Cubierto por {need.coveredByName ?? 'un patrocinador'}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => cover(need)}
                      disabled={coveringId === need.id}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <HeartHandshake className="h-4 w-4" />
                      {coveringId === need.id ? 'Registrando…' : 'Quiero cubrir esto'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
