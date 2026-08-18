import { X, ChevronRight } from 'lucide-react';
import { type LostPet, daysLost, lostColor } from '../../data/mockLostPets';

type LostPetListPanelProps = {
  pets: LostPet[];
  onSelect: (pet: LostPet) => void;
  onClose: () => void;
};

export function LostPetListPanel({ pets, onSelect, onClose }: LostPetListPanelProps) {
  const sorted = [...pets].sort((a, b) => daysLost(b.lostAt) - daysLost(a.lostAt));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 p-4">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-cobalto">Perdidos en esta zona</h3>
          <p className="text-xs text-neutral-500">
            {pets.length} {pets.length === 1 ? 'mascota' : 'mascotas'}
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
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">
            No hay mascotas perdidas en esta zona. Aleja o mueve el mapa para ver más.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {sorted.map((pet) => {
              const days = daysLost(pet.lostAt);
              return (
                <li key={pet.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(pet)}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-neutral-50"
                  >
                    <img
                      src={pet.photo}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = '/placeholder-animal.svg';
                      }}
                      className="h-12 w-12 flex-shrink-0 rounded-lg border-2 object-cover"
                      style={{ borderColor: lostColor(pet.lostAt) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-700">{pet.petName}</p>
                      <p className="truncate text-xs text-neutral-400">
                        {pet.species === 'perro' ? 'Perro' : 'Gato'} · perdido hace {days}{' '}
                        {days === 1 ? 'día' : 'días'}
                      </p>
                      {/* Colonia del reporte (truncate para no desbordar la tarjeta) */}
                      <p className="truncate text-xs text-neutral-400">
                        {pet.colonyName || 'Sin colonia'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
