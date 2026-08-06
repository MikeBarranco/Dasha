import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HeartHandshake, AlertCircle, Check, Receipt, X, MessageCircle, Gift } from 'lucide-react';
import { getMyOrgDonations, approveMyOrgDonation, type Donation } from '../../lib/api';
import { mockAllies as allies } from '../../data/mockAllies';
import { useAllyPortal } from '../../lib/useAllyPortal';
import { whatsappUrl } from '../../lib/whatsapp';

function money(amount: number): string {
  return `$${amount.toLocaleString('es-MX')}`;
}

// Datos de ejemplo para la vista previa (sin backend).
function previewDonations(orgId: string): Donation[] {
  const ally = allies.find((item) => item.id === orgId);
  const animals = ally?.animals ?? [];
  const nameOf = (index: number) => animals[index]?.name ?? 'un perrito';
  return [
    {
      id: 'd1',
      donorName: 'María López',
      donorPhone: '2211234567',
      amount: 500,
      itemsDescription: null,
      animalName: nameOf(0),
      proofUrl: null,
      status: 'pending',
      createdAgo: 'hace 2 h',
    },
    {
      id: 'd2',
      donorName: 'Carlos Ruiz',
      donorPhone: '2229876543',
      amount: 0,
      itemsDescription: '20 kg de croquetas para cachorro',
      animalName: nameOf(1),
      proofUrl: null,
      status: 'pending',
      createdAgo: 'ayer',
    },
    {
      id: 'd3',
      donorName: 'Anónimo',
      donorPhone: null,
      amount: 1000,
      itemsDescription: null,
      animalName: nameOf(0),
      proofUrl: null,
      status: 'approved',
      createdAgo: 'hace 3 d',
    },
  ];
}

export function PortalDonacionesPage() {
  const ctx = useAllyPortal();
  const [donations, setDonations] = useState<Donation[] | null>(() =>
    ctx.preview ? previewDonations(ctx.organizationId) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [viewProof, setViewProof] = useState<string | null>(null);

  useEffect(() => {
    if (ctx.preview) return;
    let active = true;
    getMyOrgDonations(ctx.adminOrgId)
      .then((data) => {
        if (!active) return;
        setDonations(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las donaciones');
        setDonations([]);
      });
    return () => {
      active = false;
    };
  }, [ctx.preview, ctx.adminOrgId]);

  const approve = async (id: string) => {
    if (ctx.preview) {
      setDonations((current) =>
        current
          ? current.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
          : current,
      );
      return;
    }
    setApprovingId(id);
    try {
      await approveMyOrgDonation(id, ctx.adminOrgId);
      setDonations((current) =>
        current
          ? current.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
          : current,
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : '';
      alert(detail ? `No se pudo confirmar: ${detail}` : 'No se pudo confirmar la donación.');
    } finally {
      setApprovingId(null);
    }
  };

  const list = donations
    ? [...donations].sort((a, b) => Number(a.status === 'approved') - Number(b.status === 'approved'))
    : donations;
  const raised = (donations ?? [])
    .filter((item) => item.status === 'approved')
    .reduce((sum, item) => sum + item.amount, 0);
  const pending = (donations ?? []).filter((item) => item.status === 'pending').length;

  return (
    <div>
      <h1 className="font-display text-xl font-bold text-cobalto">Donaciones y transferencias</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Confirma los comprobantes de donación de tus perritos cuando verifiques que llegó la
        transferencia.
      </p>

      {donations !== null && donations.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="font-display text-2xl font-bold text-exito">{money(raised)}</p>
            <p className="text-xs text-neutral-500">Confirmado</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="font-display text-2xl font-bold text-naranja">{pending}</p>
            <p className="text-xs text-neutral-500">Por confirmar</p>
          </div>
        </div>
      )}

      <div className="mt-5">
        {donations === null && (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">No se pudieron cargar las donaciones</p>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          </div>
        )}

        {donations !== null && !error && donations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <HeartHandshake className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 font-semibold text-neutral-700">Aún no hay donaciones</p>
            <p className="mt-1 text-sm text-neutral-500">
              Cuando alguien apoye a tus perritos, su comprobante aparecerá aquí.
            </p>
          </div>
        )}

        {list !== null && list.length > 0 && (
          <ul className="space-y-3">
            {list.map((donation) => {
              const waHref = donation.donorPhone
                ? whatsappUrl(
                    donation.donorPhone,
                    `Hola, te contacto desde Dasha porque apoyaste a ${donation.animalName || 'un animalito'}. ¿Coordinamos?`,
                  )
                : null;
              return (
              <li
                key={donation.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-neutral-800">
                      {donation.amount > 0 ? (
                        money(donation.amount)
                      ) : (
                        <>
                          <Gift className="h-4 w-4 flex-shrink-0 text-cobalto" />
                          {donation.itemsDescription ?? 'Donación en especie'}
                        </>
                      )}
                      <span className="text-sm font-normal text-neutral-500">
                        · {donation.donorName}
                      </span>
                    </p>
                    <p className="text-xs text-neutral-500">
                      Para {donation.animalName} · {donation.createdAgo}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      donation.status === 'approved'
                        ? 'bg-exito/10 text-exito'
                        : 'bg-naranja/10 text-naranja'
                    }`}
                  >
                    {donation.status === 'approved' ? 'Confirmada' : 'Pendiente'}
                  </span>
                </div>

                {donation.donorPhone && (
                  <p className="mt-2 text-xs text-neutral-500">Tel. {donation.donorPhone}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-xl bg-exito px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      <MessageCircle className="h-4 w-4" /> Contactar
                    </a>
                  )}

                  {donation.proofUrl ? (
                    <button
                      type="button"
                      onClick={() => setViewProof(donation.proofUrl)}
                      className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      <Receipt className="h-4 w-4" /> Ver comprobante
                    </button>
                  ) : (
                    donation.amount > 0 && (
                      <span className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
                        <Receipt className="h-3.5 w-3.5" /> Sin comprobante
                      </span>
                    )
                  )}

                  {donation.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => approve(donation.id)}
                      disabled={approvingId === donation.id}
                      className="flex items-center gap-1.5 rounded-xl bg-exito px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {approvingId === donation.id ? 'Confirmando…' : 'Confirmar que llegó'}
                    </button>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {ctx.preview && donations !== null && donations.length > 0 && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          En vista previa los cambios no se guardan de verdad.
        </p>
      )}

      <AnimatePresence>
        {viewProof && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewProof(null)}
          >
            <img
              src={viewProof}
              alt="Comprobante"
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-xl object-contain"
            />
            <button
              type="button"
              onClick={() => setViewProof(null)}
              aria-label="Cerrar"
              className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
