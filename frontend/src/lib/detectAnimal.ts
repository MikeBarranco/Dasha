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

export async function detectAnimal(
  image: HTMLImageElement | HTMLCanvasElement,
): Promise<AnimalDetection> {
  try {
    const model = await getModel();
    const predictions = await model.detect(image);
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
