import { useEffect, useRef } from 'react';

// Fondo de rejilla de figuras (inspirado en el ShapeGrid de React Bits).
// Dibuja una malla de hexágonos con contorno; una onda diagonal recorre la
// rejilla y, bajo el cursor, las figuras se rellenan con un brillo suave.

type ShapeGridProps = {
  className?: string;
  speed?: number;
  squareSize?: number;
  direction?: 'diagonal' | 'horizontal' | 'vertical';
  borderColor?: string;
  hoverFillColor?: string;
  shape?: 'hexagon' | 'square';
  hoverTrailAmount?: number;
};

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

export function ShapeGrid({
  className = '',
  speed = 0.1,
  squareSize = 40,
  direction = 'diagonal',
  borderColor = '#16497c',
  hoverFillColor = '#f2780b',
  shape = 'hexagon',
  hoverTrailAmount = 0,
}: ShapeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const border = hexToRgb(borderColor);
    const fill = hexToRgb(hoverFillColor);
    const mouse = { x: -9999, y: -9999 };
    const hoverRadius = squareSize * (2 + hoverTrailAmount * 1.5);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    window.addEventListener('pointermove', onMove);

    const drawShape = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      if (shape === 'square') {
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
      } else {
        for (let i = 0; i < 6; i += 1) {
          const angle = (Math.PI / 180) * (60 * i);
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
    };

    const render = (time: number) => {
      raf = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;

      const r = squareSize / 2;
      const isHex = shape === 'hexagon';
      const colStep = isHex ? r * 1.5 : squareSize;
      const rowStep = isHex ? Math.sqrt(3) * r : squareSize;
      const cols = Math.ceil(width / colStep) + 2;
      const rows = Math.ceil(height / rowStep) + 2;
      const t = time * 0.001 * speed;

      for (let c = 0; c < cols; c += 1) {
        for (let rIdx = 0; rIdx < rows; rIdx += 1) {
          const cx = c * colStep;
          const cy = rIdx * rowStep + (isHex && c % 2 ? rowStep / 2 : 0);

          let phase = c + rIdx;
          if (direction === 'horizontal') phase = c;
          else if (direction === 'vertical') phase = rIdx;
          const wave = 0.5 + 0.5 * Math.sin(t * 6 - phase * 0.5);
          const baseAlpha = 0.12 + 0.18 * wave;

          const dx = cx - mouse.x;
          const dy = cy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hover = Math.max(0, 1 - dist / hoverRadius);

          drawShape(cx, cy, r * 0.92);

          if (hover > 0) {
            ctx.fillStyle = `rgba(${fill[0]}, ${fill[1]}, ${fill[2]}, ${hover * 0.85})`;
            ctx.fill();
          }
          ctx.strokeStyle = `rgba(${border[0]}, ${border[1]}, ${border[2]}, ${baseAlpha + hover * 0.4})`;
          ctx.stroke();
        }
      }
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      if (canvas.parentElement === container) container.removeChild(canvas);
    };
  }, [speed, squareSize, direction, borderColor, hoverFillColor, shape, hoverTrailAmount]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
