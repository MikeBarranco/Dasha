import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  PawPrint,
  HandCoins,
  Users,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Trophy,
  Home,
  Building2,
} from 'lucide-react';
import { getImpactStats, type ImpactStats } from '../lib/api';

type MetricCard = {
  key: string;
  icon: typeof PawPrint;
  label: string;
  value: number | null;
  format?: (value: number) => string;
  accent: string;
};

const number = (value: number) => value.toLocaleString('es-MX');

export function ImpactoPage() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = () =>
    getImpactStats()
      .then((data) => {
        setStats(data);
        setError(false);
      })
      .catch(() => {
        setError(true);
        setStats(null);
      })
      .finally(() => setLoading(false));

  const load = () => {
    setLoading(true);
    void fetchStats();
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const cards: MetricCard[] = stats
    ? [
        {
          key: 'rescates',
          icon: HeartHandshake,
          label: 'Rescates logrados',
          value: stats.rescatesLogrados,
          accent: 'text-cobalto',
        },
        {
          key: 'adopciones',
          icon: PawPrint,
          label: 'Animales adoptados',
          value: stats.adopciones,
          accent: 'text-purpura',
        },
        {
          key: 'enAdopcion',
          icon: Home,
          label: 'Buscando hogar ahora',
          value: stats.animalesEnAdopcion,
          accent: 'text-info',
        },
        {
          key: 'donaciones',
          icon: HandCoins,
          label: 'Donaciones verificadas',
          value: stats.donacionesVerificadas,
          accent: 'text-exito',
        },
        {
          key: 'voluntarios',
          icon: Users,
          label: 'Voluntarios activos',
          value: stats.voluntariosActivos,
          accent: 'text-naranja',
        },
        {
          key: 'aliados',
          icon: Building2,
          label: 'Aliados registrados',
          value: stats.aliadosRegistrados,
          accent: 'text-cobalto',
        },
        {
          key: 'reportes',
          icon: FileText,
          label: 'Reportes recibidos',
          value: stats.reportesTotales,
          accent: 'text-cobalto',
        },
        {
          key: 'tiempo',
          icon: Clock,
          label: 'Tiempo prom. reporte a rescate',
          value: stats.tiempoPromedioHoras,
          format: (value: number) =>
            value < 1 ? `${Math.round(value * 60)} min` : `${value.toFixed(1)} h`,
          accent: 'text-info',
        },
      ].filter((card) => card.value !== null)
    : [];

  const hasMonthly = (stats?.porMes.length ?? 0) > 0;
  const hasRanking = (stats?.rankingColonias.length ?? 0) > 0;
  const monthlyMax = hasMonthly
    ? Math.max(1, ...stats!.porMes.flatMap((m) => [m.reportes, m.rescates]))
    : 1;
  const isEmpty = !loading && !error && cards.length === 0 && !hasMonthly && !hasRanking;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-cobalto">
        <BarChart3 className="h-6 w-6" /> Nuestro impacto
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Lo que la comunidad de Dasha ha logrado, en números reales. Cada reporte y cada rescate
        cuenta.
      </p>

      {loading && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
          <AlertCircle className="h-7 w-7 text-alerta" />
          <p className="mt-2 font-semibold text-neutral-700">No pudimos cargar las estadísticas</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            Vuelve a intentarlo en un momento.
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-2 font-semibold text-neutral-700">Aún no hay estadísticas</p>
          <p className="mt-1 text-sm text-neutral-500">
            En cuanto la comunidad sume rescates, aquí verás el impacto.
          </p>
        </div>
      )}

      {!loading && !error && cards.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.key} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <Icon className={`h-6 w-6 ${card.accent}`} />
                <p className="mt-2 font-display text-2xl font-bold text-neutral-800">
                  {card.format ? card.format(card.value as number) : number(card.value as number)}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-neutral-500">{card.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && hasMonthly && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-cobalto">Reportes y rescates por mes</h2>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-end gap-3 overflow-x-auto pb-1">
              {stats!.porMes.map((m) => (
                <div key={m.month} className="flex min-w-[44px] flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-32 items-end gap-1">
                    <div
                      className="w-3 rounded-t bg-cobalto/70"
                      style={{ height: `${(m.reportes / monthlyMax) * 100}%` }}
                      title={`${m.reportes} reportes`}
                    />
                    <div
                      className="w-3 rounded-t bg-naranja"
                      style={{ height: `${(m.rescates / monthlyMax) * 100}%` }}
                      title={`${m.rescates} rescates`}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-500">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-cobalto/70" /> Reportes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-naranja" /> Rescates
              </span>
            </div>
          </div>
        </section>
      )}

      {!loading && !error && hasRanking && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-cobalto">
            <Trophy className="h-4 w-4 text-naranja" /> La colonia más perrona
          </h2>
          <div className="space-y-2">
            {stats!.rankingColonias.slice(0, 3).map((colonia, index) => (
              <div
                key={colonia.name}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                    index === 0
                      ? 'bg-naranja/15 text-naranja'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
                  {colonia.name}
                </span>
                <span className="text-sm font-semibold text-cobalto">
                  {number(colonia.count)} rescates
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && !isEmpty && (
        <p className="mt-8 text-center text-xs text-neutral-400">
          Contribuimos a los Objetivos de Desarrollo Sostenible 3, 11, 15 y 17.{' '}
          <Link to="/mapa" className="font-semibold text-cobalto">
            Suma tu reporte
          </Link>
          .
        </p>
      )}
    </div>
  );
}
