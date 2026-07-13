import { useEffect, useState } from 'react';
import { Plus, AlertCircle, CheckCircle2, X, HandHeart, Eye } from 'lucide-react';
import {
  getMyOrgNeeds,
  createNeed,
  updateNeedStatus,
  type CreateNeedInput,
} from '../../lib/api';
import { needTypeLabels, type Need, type NeedType } from '../../data/needs';
import { useAllyPortal } from '../../lib/useAllyPortal';

const typeOptions = Object.entries(needTypeLabels) as [NeedType, string][];

const statusMeta: Record<Need['status'], { label: string; className: string }> = {
  open: { label: 'Sin cubrir', className: 'bg-naranja/10 text-naranja' },
  covered: { label: 'Cubierta', className: 'bg-info/10 text-info' },
  delivered: { label: 'Entregada', className: 'bg-exito/10 text-exito' },
};

function previewNeeds(): Need[] {
  return [
    {
      id: 'preview-need-1',
      type: 'food',
      title: 'Croquetas para cachorros',
      description: 'Se nos está acabando el alimento de los rescatados.',
      quantity: '20 kg',
      organizationName: '',
      organizationId: '',
      animalName: null,
      status: 'open',
      coveredByName: null,
      createdAgo: 'hoy',
    },
    {
      id: 'preview-need-2',
      type: 'transport',
      title: 'Traslado a la veterinaria',
      description: 'Cita de rayos X el viernes.',
      quantity: '1 traslado',
      organizationName: '',
      organizationId: '',
      animalName: 'Canela',
      status: 'covered',
      coveredByName: 'Luis M.',
      createdAgo: 'ayer',
    },
  ];
}

export function PortalNecesidadesPage() {
  const ctx = useAllyPortal();
  const [needs, setNeeds] = useState<Need[] | null>(() => (ctx.preview ? previewNeeds() : null));
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<NeedType>('food');
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (ctx.preview) return;
    let active = true;
    getMyOrgNeeds()
      .then((data) => {
        if (!active) return;
        setNeeds(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las necesidades');
        setNeeds([]);
      });
    return () => {
      active = false;
    };
  }, [ctx.preview]);

  const resetForm = () => {
    setType('food');
    setTitle('');
    setQuantity('');
    setDescription('');
    setFormError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setFormError('Escribe un título claro (mínimo 3 caracteres).');
      return;
    }
    const input: CreateNeedInput = {
      type,
      title: cleanTitle,
      description: description.trim() || undefined,
      quantity: quantity.trim() || undefined,
    };

    if (ctx.preview) {
      const nueva: Need = {
        id: `preview-${Date.now()}`,
        type,
        title: cleanTitle,
        description: description.trim(),
        quantity: quantity.trim(),
        organizationName: '',
        organizationId: '',
        animalName: null,
        status: 'open',
        coveredByName: null,
        createdAgo: 'ahora',
      };
      setNeeds((list) => [nueva, ...(list ?? [])]);
      resetForm();
      setFormOpen(false);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await createNeed(input);
      const data = await getMyOrgNeeds();
      setNeeds(data);
      resetForm();
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo publicar la necesidad.');
    } finally {
      setSaving(false);
    }
  };

  const act = async (need: Need, status: 'delivered' | 'cancelled') => {
    if (ctx.preview) {
      setNeeds((list) =>
        status === 'cancelled'
          ? (list?.filter((item) => item.id !== need.id) ?? list)
          : (list?.map((item) => (item.id === need.id ? { ...item, status } : item)) ?? list),
      );
      return;
    }
    setActingId(need.id);
    try {
      await updateNeedStatus(need.id, status);
      setNeeds((list) =>
        status === 'cancelled'
          ? (list?.filter((item) => item.id !== need.id) ?? list)
          : (list?.map((item) => (item.id === need.id ? { ...item, status } : item)) ?? list),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar la necesidad.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-xl font-bold text-cobalto">
          <HandHeart className="h-5 w-5" /> Necesidades
        </h1>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="flex items-center gap-1.5 rounded-xl bg-cobalto px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nueva
        </button>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Publica apoyos concretos que necesitas (alimento, transporte, hogar temporal). Cualquier
        usuario podrá cubrirlos desde la app.
      </p>

      {formOpen && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Tipo</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as NeedType)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
            >
              {typeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">Título</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder="Ej. Croquetas para cachorros"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">
              Cantidad <span className="font-normal text-neutral-400">(opcional)</span>
            </span>
            <input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              maxLength={40}
              placeholder="Ej. 20 kg, 1 traslado"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">
              Descripción <span className="font-normal text-neutral-400">(opcional)</span>
            </span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={280}
              rows={2}
              placeholder="Detalles que ayuden al patrocinador"
              className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base text-neutral-700 outline-none focus:ring-2 focus:ring-cobalto/30"
            />
          </label>
          {formError && (
            <p className="flex items-center gap-2 text-sm text-alerta">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-cobalto py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Publicando…' : 'Publicar necesidad'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        {needs === null && (
          <div className="space-y-3">
            {[0, 1].map((index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-alerta/20 bg-alerta/5 px-6 py-10 text-center">
            <AlertCircle className="h-7 w-7 text-alerta" />
            <p className="mt-2 font-semibold text-neutral-700">No se pudieron cargar las necesidades</p>
            <p className="mt-1 max-w-xs text-sm text-neutral-500">{error}</p>
          </div>
        )}

        {needs !== null && !error && needs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-12 text-center">
            <HandHeart className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 font-semibold text-neutral-700">Aún no publicas necesidades</p>
            <p className="mt-1 text-sm text-neutral-500">
              Toca “Nueva” para pedir el primer apoyo concreto.
            </p>
          </div>
        )}

        {needs !== null && needs.length > 0 && (
          <div className="space-y-3">
            {needs.map((need) => (
              <article key={need.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cobalto/10 px-2.5 py-0.5 text-xs font-medium text-cobalto">
                        {needTypeLabels[need.type]}
                      </span>
                      {need.quantity && (
                        <span className="text-xs font-medium text-neutral-500">{need.quantity}</span>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-neutral-800">{need.title}</p>
                    {need.description && (
                      <p className="mt-0.5 text-sm text-neutral-600">{need.description}</p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta[need.status].className}`}
                  >
                    {statusMeta[need.status].label}
                  </span>
                </div>

                {need.status === 'covered' && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-info">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    La cubre {need.coveredByName ?? 'un patrocinador'}
                  </p>
                )}

                {need.status !== 'delivered' && (
                  <div className="mt-3 flex gap-2">
                    {need.status === 'covered' && (
                      <button
                        type="button"
                        onClick={() => act(need, 'delivered')}
                        disabled={actingId === need.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-exito py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Marcar entregada
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => act(need, 'cancelled')}
                      disabled={actingId === need.id}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      {ctx.preview && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <Eye className="h-3.5 w-3.5" />
          En vista previa los cambios no se guardan de verdad.
        </p>
      )}
    </div>
  );
}
