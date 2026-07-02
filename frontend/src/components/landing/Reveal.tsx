import type { ReactNode } from 'react';
import { motion } from 'motion/react';

// Envoltura reutilizable para que un bloque aparezca con un fundido suave
// cuando entra en pantalla al hacer scroll. Se anima una sola vez.
type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
