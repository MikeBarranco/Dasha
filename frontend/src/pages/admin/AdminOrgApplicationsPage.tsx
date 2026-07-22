import { useEffect, useState } from 'react';
import { Check, X, AlertCircle, RefreshCw, Building2, Phone, Globe } from 'lucide-react';
import { cn } from '../../lib/cn';
import {
  getOrganizationApplications,
  updateOrganizationApplication,
  type OrgApplication,
} from '../../lib/adminApi';

const statusStyles: Record<string, string> = {
  pending: 'bg-naranja/10 text-naranja',
  approved: 'bg-exito/10 text-exito',
  rejected: 'bg-alerta/10 text-alerta',
};

const filters: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'all', label: 'Todas' },
];

function ApplicationCard({
  application,
  onDecision,
}: {
  application: OrgApplication;
  onDecision: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState<null | 'approved' | 'rejected'>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const approve = async () => {
    setSaving('approved');
    try {
      await onDecision(application.id, 'approved');
    } catch {
      setSaving(null);
      alert('No se pudo aprobar la solicitud. Intenta de nuevo.');
    }
  };

  const confirmReject = async () => {
    setSaving('rejected');
    try {
      await onDecision(application.id, 'rejected', reason.trim() || undefined);
    } catch {
      setSaving(null);
      alert('No se pudo rechazar la solicitud. Intenta de nuevo.');
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-neutral-800">
            <Building2 className="h-4 w-4 flex-shrink-0 text-cobalto" />
            <span className="truncate">{application.name}</span>
          </p>
          <p className="text-xs text-neutral-500">{application.orgTypeLabel}</p>
        </div>
        <span
          className={cn(
            'flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusStyles[application.status] ?? 'bg-neutral-100 text-neutral-500',
          )}
        >
          {application.statusLabel}
        </span>
      </div>

      <div className="mt-2 space-y-0.5 text-xs text-neutral-500">
        {application.address && (
          <p>
            <span className="font-medium text-neutral-600">Dirección:</span> {application.address}
          </p>
        )}
        {application.contactName && (
          <p>
            <span className="font-medium text-neutral-600">Contacto:</span> {application.contactName}
            {application.contactEmail ? ` · ${application.contactEmail}` : ''}
          </p>
        )}
        {application.phone && (
          <p className="flex items-center gap-1">
            <Phone className="h-3 w-3" /> {application.phone}
            {application.whatsapp ? ` · WhatsApp ${application.whatsapp}` : ''}
          </p>
        )}
        {application.website && (
          <p className="flex items-center gap-1">
            <Globe className="h-3 w-3" /> {application.website}
          </p>
        )}
      </div>

      {application.description && (
        <p className="mt-2 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
          {application.description}
        </p>
      )}

      {application.status === 'pending' ? (
        rejecting ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Motivo del rechazo (se le mostrará al solicitante)"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejecting(false)}
                disabled={saving !== null}
                className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={saving !== null}
                className="flex-1 rounded-xl bg-alerta py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving === 'rejected' ? 'Rechazando…' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={saving !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-alerta transition-colors hover:bg-alerta/5 disabled:opacity-60"
            >
              <X className="h-4 w-4" /> Rechazar
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={saving !== null}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-exito py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving === 'approved' ? 'Aprobando…' : 'Aprobar'}
            </button>
          </div>
        )
      ) : (
        <p className="mt-3 text-xs text-neutral-400">{application.requestedAgo}</p>
      )}
    </div>
  );
}

export function AdminOrgApplicationsPage() {
  const [applications, setApplications] = useState<OrgApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('pending');

  const fetchApplications = (reset: boolean) => {
    if (reset) {
      setApplications(null);
      setError(null);
    }
    getOrganizationApplications()
      .then((data) => {
        setApplications(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes');
        setApplications([]);
      });
  };

  useEffect(() => {
    let active = true;
    getOrganizationApplications()
      .then((data) => {
        if (!active) return;
        setApplications(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes');
        setApplications([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDecision = async (
    id: string,
    status: 'approved' | 'rejected',
    reason?: string,
  ) => {
    await updateOrganizationApplication(id, status, reason);
    setApplications((list) =>
      list
        ? list.map((application) =>
            application.id === id
              ? {
                  ...application,
                  status,
                  statusLabel: status === 'approved' ? 'Aprobada' : 'Rechazada',
                }
              : application,
          )
        : list,
    );
  };

  const shown =
    applications && filter !== 'all'
      ? applications.filter((application) => application.status === filter)
      : applications;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-cobalto">Solicitudes de aliado</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Veterinarias y refugios que quieren unirse. Al aprobar, se crea el aliado y el solicitante
        queda como responsable.
      </p>

      <div className="mt-4">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30 sm:hidden"
        >
          {filters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="hidden gap-2 sm:flex">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                'flex-shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                filter === option.value
                  ? 'border-cobalto bg-cobalto text-white'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-cobalto/40',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {applications === null && (
        <div className="mt-6 space-y-3">
          {[0, 1].map((index) => (
            <div key={index} className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-alerta" />
          <p className="mt-3 font-semibold text-neutral-700">No se pudieron cargar las solicitudes</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => fetchApplications(true)}
            className="mt-4 flex items-center gap-2 rounded-xl bg-cobalto px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      )}

      {shown !== null && !error && shown.length === 0 && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
          <p className="font-semibold text-neutral-700">Sin solicitudes</p>
          <p className="mt-1 max-w-xs text-sm text-neutral-500">
            No hay solicitudes en este estado por ahora.
          </p>
        </div>
      )}

      {shown !== null && shown.length > 0 && (
        <div className="mt-6 space-y-3">
          {shown.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              onDecision={handleDecision}
            />
          ))}
        </div>
      )}
    </div>
  );
}
