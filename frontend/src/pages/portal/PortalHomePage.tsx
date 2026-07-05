import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PawPrint,
  Users,
  HeartHandshake,
  BadgeCheck,
  ExternalLink,
  Clock,
  MapPin,
  Pencil,
} from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { getAllies } from '../../lib/api';
import { mockAllies, allyTypeLabels, type Ally } from '../../data/mockAllies';
import { useAllyPortal } from '../../lib/useAllyPortal';

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof PawPrint;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <Icon className="h-5 w-5 text-cobalto" />
      <p className="mt-2 font-display text-2xl font-bold text-neutral-800">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export function PortalHomePage() {
  const ctx = useAllyPortal();
  const [ally, setAlly] = useState<Ally | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getAllies()
      .then((data) => {
        const list = data.length > 0 ? data : mockAllies;
        const found =
          list.find((item) => item.id === ctx.organizationId) ??
          mockAllies.find((item) => item.id === ctx.organizationId) ??
          null;
        if (active) setAlly(found);
      })
      .catch(() => {
        if (active) setAlly(mockAllies.find((item) => item.id === ctx.organizationId) ?? null);
      });
    return () => {
      active = false;
    };
  }, [ctx.organizationId]);

  if (ally === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!ally) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold text-neutral-700">No encontramos tu organización</p>
        <p className="mt-1 text-sm text-neutral-500">Contacta a un administrador de Dasha.</p>
      </div>
    );
  }

  const team = ally.team ?? [];
  const animals = ally.animals ?? [];

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-3">
        <img
          src={ally.logoUrl ?? '/placeholder-logo.svg'}
          alt=""
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = '/placeholder-logo.svg';
          }}
          className="h-14 w-14 flex-shrink-0 rounded-2xl border border-neutral-100 object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate font-display text-xl font-bold text-cobalto">{ally.name}</h1>
            {ally.isVerified && <BadgeCheck className="h-4 w-4 flex-shrink-0 text-info" />}
          </div>
          <p className="text-xs text-neutral-500">{allyTypeLabels[ally.orgType]}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatCard icon={PawPrint} value={animals.length} label="Perritos" />
        <StatCard icon={Users} value={team.length} label="Equipo" />
        <StatCard icon={HeartHandshake} value="—" label="Donaciones" />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-cobalto">Mi perfil</h2>
          <Link
            to={`/aliados/${ally.id}`}
            className="flex items-center gap-1 text-xs font-medium text-cobalto hover:underline"
          >
            Ver perfil público <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        {ally.slogan && <p className="mt-2 text-sm font-medium text-naranja">{ally.slogan}</p>}
        <div className="mt-2 space-y-1.5 text-sm text-neutral-600">
          {ally.schedule && (
            <p className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalto" />
              {ally.schedule}
            </p>
          )}
          {ally.address && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-cobalto" />
              {ally.address}
            </p>
          )}
        </div>
        <Link
          to="/portal/perfil"
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <Pencil className="h-4 w-4" /> Editar perfil
        </Link>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-cobalto">Mi equipo</h2>
          <Link
            to="/portal/equipo"
            className="text-xs font-medium text-cobalto hover:underline"
          >
            Gestionar
          </Link>
        </div>
        {team.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">Aún no tienes veterinarios en tu equipo.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {team.map((member) => (
              <li key={member.name} className="flex items-center gap-3">
                <Avatar
                  name={member.name}
                  src={member.photoUrl ?? undefined}
                  className="h-10 w-10 text-sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">{member.name}</p>
                  <p className="truncate text-xs text-cobalto">{member.title}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-base font-bold text-cobalto">Mis perritos</h2>
        {animals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-10 text-center">
            <p className="text-sm text-neutral-500">Aún no tienes perritos asignados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {animals.map((animal) => (
              <div
                key={animal.id}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
              >
                <div className="h-24 w-full overflow-hidden bg-neutral-100">
                  <img
                    src={animal.photo}
                    alt={animal.name}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/placeholder-animal.svg';
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium text-neutral-800">{animal.name}</p>
                  <p className="flex items-center gap-1 text-xs text-neutral-500">
                    <PawPrint className="h-3 w-3 flex-shrink-0 text-cobalto" />
                    {animal.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-cobalto">
          <HeartHandshake className="h-4 w-4" /> Donaciones y transferencias
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Aquí verás los comprobantes de donación de tus perritos y podrás aprobarlos cuando
          confirmes que llegó la transferencia.
        </p>
        <p className="mt-2 text-xs text-neutral-400">Disponible próximamente.</p>
      </section>
    </div>
  );
}
