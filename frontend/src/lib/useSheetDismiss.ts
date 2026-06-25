import { useRef } from 'react';
import { useDragControls, type PanInfo } from 'motion/react';

// Cierre por deslizamiento para las hojas (bottom sheets), estilo iOS.
// Permite arrastrar para cerrar desde cualquier parte de la hoja, pero solo
// cuando el contenido esta hasta arriba y el dedo va hacia abajo; en cualquier
// otro caso deja hacer scroll normal. Funciona con dedo (celular) y mouse.
export function useSheetDismiss(onClose: () => void) {
  const dragControls = useDragControls();
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const decided = useRef(false);

  const onPointerDown = (event: React.PointerEvent) => {
    decided.current = false;
    startY.current = event.clientY;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (decided.current) return;
    const deltaY = event.clientY - startY.current;
    const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0;
    if (atTop && deltaY > 6) {
      decided.current = true;
      dragControls.start(event);
    } else if (Math.abs(deltaY) > 6) {
      decided.current = true;
    }
  };

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  return { dragControls, scrollRef, onPointerDown, onPointerMove, onDragEnd };
}
