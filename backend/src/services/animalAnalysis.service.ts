import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializamos el cliente de Gemini usando la clave de la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface AnimalAnalysisResult {
  especie: 'perro' | 'gato' | 'otro' | string;
  color_predominante: string;
  tamano_estimado: 'pequeño' | 'mediano' | 'grande' | string;
  posible_herida: boolean;
  justificacion_medica: string;
}

/**
 * Recibe una URL de Cloudinary, descarga la imagen y la analiza con Gemini.
 * @param cloudinaryUrl URL pública de la imagen en Cloudinary.
 * @returns JSON con el análisis de la imagen.
 */
export async function analyzeAnimalPhoto(cloudinaryUrl: string): Promise<AnimalAnalysisResult> {
  try {
    if (!cloudinaryUrl) {
      throw new Error("La URL de Cloudinary no fue proporcionada.");
    }

    // 1. Descargar la imagen de la URL usando fetch (nativo en Node.js 18+)
    const imageResponse = await fetch(cloudinaryUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`No se pudo descargar la imagen. Status: ${imageResponse.statusText}`);
    }

    // 2. Convertir la imagen a ArrayBuffer y luego a Buffer
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extraemos el tipo MIME de los headers
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const imagePart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: mimeType
      }
    };

    // 3. Preparar el modelo de Gemini
    // Usamos gemini-flash-latest, ideal para tareas multimodales rápidas
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      // Forzamos al modelo a devolver un JSON válido
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    // 4. Prompt para Gemini
    const prompt = "Eres un veterinario experto. Analiza esta foto de un animal rescatado. Devuelve ÚNICAMENTE un objeto JSON válido con las claves: 'especie' (perro/gato/otro), 'color_predominante', 'tamano_estimado' (pequeño/mediano/grande), 'posible_herida' (booleano true/false si notas sangre, desnutrición severa o lesiones visibles) y 'justificacion_medica' (breve razón del booleano).";

    // 5. Llamar a la API de Gemini con reintentos (Retry Mechanism)
    let retries = 3;
    let responseText = "";

    while (retries > 0) {
      try {
        const result = await model.generateContent([prompt, imagePart]);
        responseText = result.response.text();
        break; // Si tiene éxito, salimos del bucle
      } catch (err: any) {
        // Si el error es por demanda (503) o demasiadas peticiones (429), reintentamos
        if (err.status === 503 || err.status === 429) {
          retries--;
          if (retries === 0) throw err; // Si se acaban los reintentos, lanzamos el error
          
          // Esperamos 2 segundos antes de volver a intentar (Backoff)
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Si es otro tipo de error (ej. clave inválida), no reintentamos
          throw err;
        }
      }
    }

    // 6. Parsear la respuesta JSON y retornarla
    const analysisData: AnimalAnalysisResult = JSON.parse(responseText);
    return analysisData;

  } catch (error) {
    console.error("Error al analizar la foto del animal con Gemini:", error);
    // Para no romper el frontend, en lugar de lanzar el error, devolvemos un objeto por defecto
    // Así el frontend simplemente deja los campos en blanco y el usuario los llena manualmente.
    return {
      especie: 'otro',
      color_predominante: '',
      tamano_estimado: '',
      posible_herida: false,
      justificacion_medica: ''
    };
  }
}
