import { motion } from 'motion/react';
import { X } from 'lucide-react';

type LightboxProps = {
  src: string;
  alt?: string;
  onClose: () => void;
};

// Foto a pantalla completa: se cierra tocando fuera o la X. Reutilizable en las
// galerías (adoptados, eventos, reportes) para poder ver las imágenes en grande.
// z alto (80) para quedar por encima de las hojas modales (z-70).
export function Lightbox({ src, alt = '', onClose }: LightboxProps) {
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = '/placeholder-animal.svg';
        }}
        className="max-h-full max-w-full rounded-xl object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar foto"
        className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-neutral-800 shadow"
      >
        <X className="h-5 w-5" />
      </button>
    </motion.div>
  );
}
