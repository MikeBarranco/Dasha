import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { avatarOptions } from '../../lib/avatars';
import { cn } from '../../lib/cn';

type AvatarPickerProps = {
  current: string;
  onSelect: (url: string) => void;
  onClose: () => void;
};

export function AvatarPicker({ current, onSelect, onClose }: AvatarPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-cobalto">Elige tu avatar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1 text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {avatarOptions.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => onSelect(url)}
              className={cn(
                'overflow-hidden rounded-full border-2 transition-colors',
                url === current ? 'border-cobalto' : 'border-transparent hover:border-neutral-200',
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
