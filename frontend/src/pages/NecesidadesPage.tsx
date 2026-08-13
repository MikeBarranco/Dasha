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

const formatMoney = (value: number) => `$${value.toLocaleString('es-MX')}`;

export function NecesidadesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [coveringId, setCoveringId] = useState<string | null>(null);
  // Para necesidades con meta económica: qué tarjeta tiene abierto el input de
  // monto y su valor actual.
  const [amountFor, setAmountFor] = useState<string | null>(null);
  const [amountValue, setAmountValue] = useState('');

  useEffect(() => {
    let active = true;
    getActiveNeeds().then((data) => {
      if (!active) return;
      setNeeds(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const cover = async (need: Need, amount?: number) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const myName = user.name ? user.name.split(' ')[0] : 'Ti';
    setCoveringId(need.id);
    try {
      await coverNeed(need.id, amount);
      setNeeds(
        (list) =>
          list?.map((item) => {
            if (item.id !== need.id) return item;
            // Aporte parcial (hay meta): sube lo reunido; si llega a la meta,
            // queda cubierta. Sin monto: se cubre completa de una vez.
            if (amount && item.targetAmount) {
              const nowCovered = item.coveredAmount + amount;
              const done = nowCovered >= item.targetAmount;
              return {
                ...item,
                coveredAmount: nowCovered,
                status: done ? 'covered' : item.status,
                coveredByName: done ? myName : item.coveredByName,
              };
            }
            return { ...item, status: 'covered', coveredByName: myName };
          }) ?? list,
      );
      setAmountFor(null);
      setAmountValue('');
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

                {need.targetAmount && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
                      <span>
                        {formatMoney(need.coveredAmount)} de {formatMoney(need.targetAmount)}
                      </span>
                      <span>
                        {Math.min(100, Math.round((need.coveredAmount / need.targetAmount) * 100))}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-cobalto transition-all"
                        style={{
                          width: `${Math.min(100, (need.coveredAmount / need.targetAmount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  {covered ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-exito">
                      <CheckCircle2 className="h-4 w-4" />
                      Cubierto por {need.coveredByName ?? 'un patrocinador'}
                    </p>
                  ) : need.targetAmount ? (
                    amountFor === need.id ? (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                            $
                          </span>
                          <input
                            value={amountValue}
                            onChange={(event) =>
                              setAmountValue(event.target.value.replace(/\D/g, '').slice(0, 7))
                            }
                            inputMode="numeric"
                            autoFocus
                            placeholder="Monto"
                            className="w-full rounded-xl border border-neutral-200 py-2.5 pl-7 pr-3 text-sm outline-none focus:ring-2 focus:ring-cobalto/30"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => cover(need, Number(amountValue))}
                          disabled={coveringId === need.id || Number(amountValue) <= 0}
                          className="flex-shrink-0 rounded-xl bg-cobalto px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                          {coveringId === need.id ? 'Enviando…' : 'Aportar'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            navigate('/login');
                            return;
                          }
                          const remaining = Math.max(0, (need.targetAmount ?? 0) - need.coveredAmount);
                          setAmountValue(remaining > 0 ? String(remaining) : '');
                          setAmountFor(need.id);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-cobalto py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <HeartHandshake className="h-4 w-4" />
                        Quiero apoyar
                      </button>
                    )
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
