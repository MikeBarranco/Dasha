import { motion } from 'motion/react';
import { mapModes, type MapMode } from '../../lib/mapMode';
import { cn } from '../../lib/cn';

type MapModeSwitchProps = {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
};

export function MapModeSwitch({ mode, onChange }: MapModeSwitchProps) {
  return (
    <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-100 p-1">
      {mapModes.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4"
          >
            {active && (
              <motion.span
                layoutId="map-mode-pill"
                className="absolute inset-0 -z-0 rounded-full bg-white shadow-sm"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className={cn('relative z-10', active ? 'text-cobalto' : 'text-neutral-500')}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
