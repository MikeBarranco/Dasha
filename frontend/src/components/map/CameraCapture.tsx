import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, SwitchCamera } from 'lucide-react';

type CameraCaptureProps = {
  // Devuelve la foto capturada como File (para comprimir/enviar) y como dataURL
  // (para previsualizar al instante).
  onCapture: (file: File, dataUrl: string) => void;
  // Marco-guía opcional para encuadrar: 'card' (identificación) o 'face' (selfie).
  frame?: 'card' | 'face';
  initialFacing?: 'environment' | 'user';
  // Si true, ocupa el alto del contenedor (para usarlo en un modal); si no, alto fijo.
  fill?: boolean;
};

type CamStatus = 'loading' | 'ready' | 'error';

// Captura en vivo desde la cámara del dispositivo. A propósito NO usa un <input
// type="file">: así no se puede subir desde la galería (ni en celular, ni en
// laptop, ni en tablet); la foto se toma en el momento.
export function CameraCapture({
  onCapture,
  frame,
  initialFacing = 'environment',
  fill = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>('loading');
  const [facing, setFacing] = useState<'environment' | 'user'>(initialFacing);
  // Se incrementa al tocar "Reintentar" para volver a pedir el permiso de cámara.
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let watchdog: number | undefined;

    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) setStatus('error');
        return;
      }
      // Red de seguridad: la PRIMERA vez, el permiso de la cámara se puede quedar
      // encolado detrás del permiso de ubicación que pide el mapa, y el spinner de
      // "Abriendo la cámara…" se cuelga sin salida. Si en unos segundos no quedó
      // lista, mostramos "Reintentar" en vez de dejar el spinner colgado. Si el
      // permiso llega después, el bloque de abajo la marca lista y se corrige solo.
      watchdog = window.setTimeout(() => {
        if (active && !streamRef.current) setStatus('error');
      }, 12000);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        if (active) setStatus('ready');
      } catch {
        if (active) setStatus('error');
      } finally {
        if (watchdog) window.clearTimeout(watchdog);
      }
    };

    start();

    return () => {
      active = false;
      if (watchdog) window.clearTimeout(watchdog);
      stop();
    };
  }, [facing, retry]);

  const retryCamera = () => {
    setStatus('loading');
    setRetry((value) => value + 1);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || status !== 'ready' || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `reporte-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file, dataUrl);
      },
      'image/jpeg',
      0.9,
    );
  };

  return (
    <div
      className={
        (fill ? 'h-full' : 'h-64') +
        ' relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900'
      }
    >
      <video
        ref={videoRef}
        playsInline
        muted
        // Con la cámara frontal espejamos SOLO la vista previa (se siente natural,
        // como un espejo: mover a la derecha va a la derecha). La captura se hace
        // desde el frame crudo del video, sin espejo, así el texto de la ID queda
        // legible en la foto guardada.
        className={
          'h-full w-full object-cover' + (facing === 'user' ? ' -scale-x-100' : '')
        }
      />

      {status === 'ready' && frame && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
          {frame === 'card' ? (
            <div className="aspect-[1.586] w-full max-w-xs rounded-xl border-2 border-dashed border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          ) : (
            <div className="h-56 w-44 rounded-[50%] border-2 border-dashed border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          )}
          <p className="rounded-full bg-black/50 px-3 py-1 text-center text-xs text-white">
            {frame === 'card'
              ? 'Encuadra tu identificación dentro del marco'
              : 'Coloca tu rostro dentro del marco'}
          </p>
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-900 text-neutral-300">
          <Camera className="h-8 w-8 animate-pulse" />
          <p className="text-sm font-medium">Abriendo la cámara…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-900 px-6 text-center text-neutral-300">
          <CameraOff className="h-8 w-8 text-alerta" />
          <p className="text-sm font-medium text-white">No pudimos abrir la cámara</p>
          <p className="max-w-xs text-xs text-neutral-400">
            Toca el candado (o la cámara) en la barra de direcciones de tu navegador, permite el
            acceso y vuelve a intentar. El reporte se toma en el momento, por eso no se puede subir
            desde la galería.
          </p>
          <button
            type="button"
            onClick={retryCamera}
            className="mt-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition-opacity hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <button
            type="button"
            onClick={() => setFacing((current) => (current === 'environment' ? 'user' : 'environment'))}
            aria-label="Cambiar cámara"
            className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={capture}
            aria-label="Tomar foto"
            className="absolute bottom-4 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white/80 bg-white/30 backdrop-blur-sm transition-transform active:scale-95"
          >
            <span className="h-11 w-11 rounded-full bg-white" />
          </button>
        </>
      )}
    </div>
  );
}
