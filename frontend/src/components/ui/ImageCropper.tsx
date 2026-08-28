import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

// Recortador de imagen cuadrado, autocontenido (sin librerias externas). El aliado
// arrastra la foto y ajusta el zoom con el deslizador; al confirmar se dibuja la
// zona visible en un canvas y se exporta como JPEG. Pensado para que la foto de
// portada del perrito se vea bien encuadrada.

// Lado del recuadro de recorte en pixeles de pantalla (fijo para que la matematica
// de arrastre/zoom sea exacta; cabe en celulares angostos).
const V = 260;
// Lado de la imagen exportada (buena calidad y peso ligero).
const OUT = 900;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type ImageCropperProps = {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

export function ImageCropper({ src, onCancel, onConfirm }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [dims, setDims] = useState({ iw: 0, ih: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Geometria derivada: escala "cover" al zoom actual y tamano mostrado de la imagen.
  const baseScale = dims.iw && dims.ih ? V / Math.min(dims.iw, dims.ih) : 1;
  const scale = baseScale * zoom;
  const dispW = dims.iw * scale;
  const dispH = dims.ih * scale;

  const loaded = dims.iw > 0;

  // Cambia el zoom y reacota el desplazamiento para que la imagen siga cubriendo
  // el recuadro (sin huecos) al alejar.
  const changeZoom = (nextZoom: number) => {
    setZoom(nextZoom);
    const bs = dims.iw && dims.ih ? V / Math.min(dims.iw, dims.ih) : 1;
    const nextW = dims.iw * bs * nextZoom;
    const nextH = dims.ih * bs * nextZoom;
    setOffset((current) => ({
      x: clamp(current.x, V - nextW, 0),
      y: clamp(current.y, V - nextH, 0),
    }));
  };

  const onImgLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const iw = el.naturalWidth;
    const ih = el.naturalHeight;
    setDims({ iw, ih });
    const bs = V / Math.min(iw, ih);
    // Centrada al cargar (zoom 1).
    setZoom(1);
    setOffset({ x: (V - iw * bs) / 2, y: (V - ih * bs) / 2 });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!loaded) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const start = dragRef.current;
    if (!start) return;
    setOffset({
      x: clamp(start.ox + (event.clientX - start.px), V - dispW, 0),
      y: clamp(start.oy + (event.clientY - start.py), V - dispH, 0),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const confirm = () => {
    const el = imgRef.current;
    if (!el || !loaded) return;
    const sw = V / scale;
    const sh = V / scale;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(el, sx, sy, sw, sh, 0, 0, OUT, OUT);
    onConfirm(canvas.toDataURL('image/jpeg', 0.82));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <h3 className="mb-1 font-display text-base font-bold text-cobalto">Recorta la foto</h3>
        <p className="mb-3 text-xs text-neutral-500">
          Arrastra para encuadrar y usa el deslizador para acercar.
        </p>

        <div
          className="relative mx-auto touch-none overflow-hidden rounded-xl bg-neutral-900"
          style={{ width: V, height: V }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onImgLoad}
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{ left: offset.x, top: offset.y, width: dispW, height: dispH, maxWidth: 'none' }}
          />
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => changeZoom(Number(event.target.value))}
          disabled={!loaded}
          aria-label="Zoom"
          className="mt-4 w-full accent-cobalto"
        />

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!loaded}
            className="flex-1 rounded-xl bg-cobalto py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Usar foto
          </button>
        </div>
      </motion.div>
    </div>
  );
}
