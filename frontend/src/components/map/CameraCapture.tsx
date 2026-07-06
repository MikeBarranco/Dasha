import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, SwitchCamera } from 'lucide-react';

type CameraCaptureProps = {
  // Devuelve la foto capturada como File (para comprimir/enviar) y como dataURL
  // (para previsualizar al instante).
  onCapture: (file: File, dataUrl: string) => void;
};

type CamStatus = 'loading' | 'ready' | 'error';

// Captura en vivo desde la cámara del dispositivo. A propósito NO usa un <input
// type="file">: así no se puede subir desde la galería (ni en celular, ni en
// laptop, ni en tablet); el reporte se toma en el momento.
export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CamStatus>('loading');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    let active = true;

    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (active) setStatus('error');
        return;
      }
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
        setStatus('ready');
      } catch {
        if (active) setStatus('error');
      }
    };

    start();

    return () => {
      active = false;
      stop();
    };
  }, [facing]);

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
    <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900">
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
      />

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
            Activa el permiso de cámara de tu navegador. El reporte se toma en el momento, por eso
            no se puede subir desde la galería.
          </p>
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
