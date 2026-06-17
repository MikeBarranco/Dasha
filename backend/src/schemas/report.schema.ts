import { z } from 'zod';
import { Species, Size, Condition, Urgency, ReportStatus } from '@prisma/client';

export const createReportSchema = z.object({
  body: z.object({
    userId: z.string().uuid().optional(), // Ya no es obligatorio en el body, se tomará del JWT
    species: z.nativeEnum(Species),
    primaryColor: z.string().min(3),
    secondaryColor: z.string().optional(),
    size: z.nativeEnum(Size),
    condition: z.nativeEnum(Condition),
    urgency: z.nativeEnum(Urgency),
    description: z.string().optional(),
    
    // Coordenadas para PostGIS
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    
    // Foto subida desde el Frontend en formato Base64
    photoBase64: z.string().min(1, { message: 'Se requiere al menos una foto del animal' })
  })
});

// Schema para parsear los query params en la búsqueda de reportes cercanos
export const getNearbyReportsSchema = z.object({
  query: z.object({
    lat: z.string().transform((val) => parseFloat(val)),
    lng: z.string().transform((val) => parseFloat(val)),
    radius_km: z.string().optional().transform((val) => (val ? parseFloat(val) : 5)), // Por defecto 5km
    species: z.nativeEnum(Species).optional(),
    status: z.nativeEnum(ReportStatus).optional().default('active')
  })
});
