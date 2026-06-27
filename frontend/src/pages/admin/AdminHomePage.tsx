import { useEffect, useMemo, useState } from 'react';
import { Flag, Search, Building2, BadgeCheck, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import {
  getAdminReports,
  getAdminOrganizations,
  getAdminUsers,
  getAdminVolunteers,
  type AdminReport,
  type AdminOrg,
  type AdminUser,
  type AdminVolunteer,
} from '../../lib/adminApi';
import { getLostPets } from '../../lib/api';

type BarItem = { label: string; value: number; color: string };

function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cobalto/10 text-cobalto">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-display text-2xl font-bold text-cobalto">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function BarList({ items }: { items: BarItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-neutral-600">{item.label}</span>
            <span className="flex-shrink-0 font-medium text-neutral-700">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 font-display text-base font-bold text-cobalto">{title}</h2>
      {empty ? (
        <p className="py-6 text-center text-sm text-neutral-400">Sin datos todavía</p>
      ) : (
        children
      )}
    </div>
  );
}

function urgencyKey(value: string): string {
  const v = value.toLowerCase();
  if (v === 'critical' || v === 'critica') return 'critical';
  if (v === 'high' || v === 'alta') return 'high';
  if (v === 'medium' || v === 'media') return 'medium';
  if (v === 'low' || v === 'baja') return 'low';
  return 'other';
}

export function AdminHomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [volunteers, setVolunteers] = useState<AdminVolunteer[] | null>(null);
  const [lostCount, setLostCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getAdminReports(),
      getAdminOrganizations(),
      getAdminUsers(),
      getAdminVolunteers(),
      getLostPets(),
    ]).then((results) => {
      if (!active) return;
      const [r, o, u, v, l] = results;
      setReports(r.status === 'fulfilled' ? r.value : []);
      setOrgs(o.status === 'fulfilled' ? o.value : []);
      setUsers(u.status === 'fulfilled' ? u.value : []);
      setVolunteers(v.status === 'fulfilled' ? v.value : []);
      setLostCount(l.status === 'fulfilled' ? l.value.length : 0);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const data = useMemo(() => {
    const rep = reports ?? [];
    const count = (predicate: (report: AdminReport) => boolean) => rep.filter(predicate).length;

    const urgency: BarItem[] = [
      { label: 'Crítica', value: count((r) => urgencyKey(r.urgency) === 'critical'), color: '#dc2626' },
      { label: 'Alta', value: count((r) => urgencyKey(r.urgency) === 'high'), color: '#f2780b' },
      { label: 'Media', value: count((r) => urgencyKey(r.urgency) === 'medium'), color: '#eab308' },
      { label: 'Baja', value: count((r) => urgencyKey(r.urgency) === 'low'), color: '#16a34a' },
    ];

    const status: BarItem[] = [
      { label: 'Activos', value: count((r) => r.status === 'active'), color: '#2563eb' },
      { label: 'Voluntario en camino', value: count((r) => r.status === 'in_progress'), color: '#f2780b' },
      { label: 'Rescatados', value: count((r) => r.status === 'rescued'), color: '#16a34a' },
    ];

    const species: BarItem[] = [
      { label: 'Perros', value: count((r) => r.species === 'perro'), color: '#1C4E80' },
      { label: 'Gatos', value: count((r) => r.species === 'gato'), color: '#6B2C91' },
    ];

    const colonyMap = new Map<string, number>();
    rep.forEach((report) => {
      const key = report.colonia || 'Sin colonia';
      colonyMap.set(key, (colonyMap.get(key) ?? 0) + 1);
    });
    const colonias: BarItem[] = [...colonyMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, color: '#1C4E80' }));

    return { total: rep.length, urgency, status, species, colonias };
  }, [reports]);

  const volunteersCount = (users ?? []).filter((u) => u.role === 'volunteer').length;
  const pendingCount = (volunteers ?? []).filter((v) => v.status === 'pending').length;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cobalto">
        Hola{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">Un vistazo general de Dasha.</p>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard icon={Flag} value={data.total} label="Reportes" />
            <StatCard icon={Search} value={lostCount ?? 0} label="Mascotas perdidas" />
            <StatCard icon={Building2} value={(orgs ?? []).length} label="Aliados" />
            <StatCard icon={BadgeCheck} value={volunteersCount} label="Voluntarios" />
            <StatCard icon={Users} value={(users ?? []).length} label="Usuarios" />
          </div>

          {pendingCount > 0 && (
            <div className="mt-3 rounded-2xl border border-naranja/20 bg-naranja/5 px-4 py-3 text-sm text-neutral-700">
              Tienes <span className="font-semibold text-naranja">{pendingCount}</span>{' '}
              {pendingCount === 1 ? 'solicitud de voluntario pendiente' : 'solicitudes de voluntario pendientes'}.
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ChartCard title="Reportes por urgencia" empty={data.total === 0}>
              <BarList items={data.urgency} />
            </ChartCard>
            <ChartCard title="Reportes por estado" empty={data.total === 0}>
              <BarList items={data.status} />
            </ChartCard>
            <ChartCard title="Reportes por especie" empty={data.total === 0}>
              <BarList items={data.species} />
            </ChartCard>
            <ChartCard title="Colonias con más reportes" empty={data.colonias.length === 0}>
              <BarList items={data.colonias} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
