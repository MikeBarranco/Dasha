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
    
    // Foto subida desde el Frontend (flujo legacy)
    photoBase64: z.string().optional(),
    
    // Fotos ya subidas por el frontend con la firma (nuevo flujo)
    photos: z.array(z.object({
      url: z.string().url(),
      publicId: z.string()
    })).optional()
  }).refine(data => data.photoBase64 || (data.photos && data.photos.length > 0), {
    message: 'Se requiere al menos una foto del animal',
    path: ['photos']
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

// Schema para actualizar el status de un reporte
export const updateReportStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ReportStatus)
  }),
  params: z.object({
    id: z.string().uuid()
  })
});
