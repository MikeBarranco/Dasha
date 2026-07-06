// Costura de la IA que reconoce si en la foto hay un perro o un gato. Hoy usa
// TensorFlow.js + COCO-SSD (modelo pre-entrenado, corre en el navegador, sin
// backend ni costo). Si más adelante hay un modelo propio (Moni/Sumayra) o un
// endpoint, se cambia SOLO el cuerpo de detectAnimal sin tocar la pantalla.
//
// El modelo se carga LAZY (import dinámico) para no pesar en el resto de la app:
// TF.js solo se descarga la primera vez que se llama a detectAnimal, en la
// pantalla de reporte.

export type AnimalDetection = {
  species: 'perro' | 'gato' | null;
  detected: boolean;
};

type CocoModel = {
  detect: (
    input: HTMLImageElement | HTMLCanvasElement,
  ) => Promise<{ class: string; score: number }[]>;
};

let modelPromise: Promise<CocoModel> | null = null;

async function getModel(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      // lite_mobilenet_v2 es la variante más ligera; suficiente para distinguir
      // perro/gato.
      return (await cocoSsd.load({ base: 'lite_mobilenet_v2' })) as unknown as CocoModel;
    })();
  }
  return modelPromise;
}

// Precarga el modelo en segundo plano (idealmente al entrar a la pantalla de
// reporte) y hace un "warmup": una inferencia en un lienzo pequeño para compilar
// todo, de modo que la PRIMERA detección real ya no congele la interfaz.
let warmed = false;
export async function preloadAnimalModel(): Promise<void> {
  try {
    const model = await getModel();
    if (!warmed) {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      await model.detect(canvas);
      warmed = true;
    }
  } catch {
    // Sin red o sin soporte: la detección simplemente no estará disponible.
  }
}

// Reduce la imagen antes de analizarla: COCO-SSD no necesita alta resolución y
// una imagen grande hace la inferencia más pesada (bloquea más el hilo).
function toDetectionInput(
  image: HTMLImageElement | HTMLCanvasElement,
): HTMLImageElement | HTMLCanvasElement {
  const sourceW = (image as HTMLImageElement).naturalWidth || image.width;
  const sourceH = (image as HTMLImageElement).naturalHeight || image.height;
  if (!sourceW || !sourceH) return image;
  const max = 640;
  const scale = Math.min(1, max / Math.max(sourceW, sourceH));
  if (scale === 1) return image;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sourceW * scale);
  canvas.height = Math.round(sourceH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return image;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function detectAnimal(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<AnimalDetection> {
  try {
    const model = await getModel();
    const predictions = await model.detect(toDetectionInput(image));
    const animals = predictions
      .filter((item) => (item.class === 'dog' || item.class === 'cat') && item.score >= 0.5)
      .sort((a, b) => b.score - a.score);

    const top = animals[0];
    if (!top) return { species: null, detected: false };
    return { species: top.class === 'cat' ? 'gato' : 'perro', detected: true };
  } catch {
    // Si el modelo no carga (sin red, etc.), no bloqueamos el reporte: el usuario
    // elige la especie a mano.
    return { species: null, detected: false };
  }
}
