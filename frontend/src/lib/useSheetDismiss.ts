import { useRef } from 'react';
import { useDragControls, type PanInfo } from 'motion/react';

// Cierre por deslizamiento para las hojas (bottom sheets), estilo iOS.
// Permite arrastrar para cerrar desde cualquier parte de la hoja, pero solo
// cuando el contenido esta hasta arriba y el dedo va hacia abajo; en cualquier
// otro caso deja hacer scroll normal. Es un gesto TACTIL (celular): con mouse
// NO se arrastra la hoja (en escritorio se cierra con la X o clic afuera).
export function useSheetDismiss(onClose: () => void) {
  const dragControls = useDragControls();
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const decided = useRef(false);
  const allowDrag = useRef(false);

  const onPointerDown = (event: React.PointerEvent) => {
    decided.current = false;
    startY.current = event.clientY;
    // Solo habilitamos el arrastre con dedo/lapiz, no con mouse.
    allowDrag.current = event.pointerType !== 'mouse';
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (decided.current || !allowDrag.current) return;
    const deltaY = event.clientY - startY.current;
    const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0;
    if (atTop && deltaY > 6) {
      decided.current = true;
      dragControls.start(event);
    } else if (Math.abs(deltaY) > 6) {
      decided.current = true;
    }
  };

  // Tirador (grabber) de la parte superior: al tocarlo con el dedo iniciamos el
  // arrastre de una vez, sin importar el scroll. Es la forma confiable de cerrar en
  // celular cuando la hoja es larga (fotos, donacion, adopcion, cartilla...). Con
  // mouse no hace nada (en escritorio se cierra con la X o clic afuera).
  const onHandlePointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse') return;
    decided.current = true;
    dragControls.start(event);
  };

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  return { dragControls, scrollRef, onPointerDown, onPointerMove, onHandlePointerDown, onDragEnd };
}
