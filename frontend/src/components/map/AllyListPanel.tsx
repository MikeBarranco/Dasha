import { X, ChevronRight, BadgeCheck } from 'lucide-react';
import { allyTypeLabels, type Ally } from '../../data/mockAllies';

type AllyListPanelProps = {
  allies: Ally[];
  onSelect: (ally: Ally) => void;
  onClose: () => void;
};

export function AllyListPanel({ allies, onSelect, onClose }: AllyListPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 p-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-cobalto">Aliados en esta zona</h3>
          <p className="text-xs text-neutral-500">
            {allies.length} {allies.length === 1 ? 'aliado' : 'aliados'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Ver todo el mapa"
          className="flex-shrink-0 rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {allies.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">
            No hay aliados en esta zona. Aleja o mueve el mapa para ver más.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {allies.map((ally) => (
              <li key={ally.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ally)}
                  className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-neutral-50"
                >
                  <img
                    src={ally.logoUrl ?? '/placeholder-logo.svg'}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = '/placeholder-logo.svg';
                    }}
                    className="h-12 w-12 flex-shrink-0 rounded-lg border border-neutral-100 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-medium text-neutral-700">
                      <span className="truncate">{ally.name}</span>
                      {ally.isVerified && (
                        <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0 text-info" />
                      )}
                    </p>
                    <p className="truncate text-xs text-neutral-400">
                      {allyTypeLabels[ally.orgType]}
                      {ally.address ? ` · ${ally.address}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
