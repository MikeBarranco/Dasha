import { z } from 'zod';

export const updateAvailabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean(),
    searchRadiusKm: z.number().positive().max(50).optional().default(5),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional()
  }).refine(data => {
    // Si isAvailable es true, debe proveer lat y lng
    if (data.isAvailable) {
      return data.lat !== undefined && data.lng !== undefined;
    }
    return true;
  }, {
    message: "lat y lng son requeridos cuando isAvailable es true",
    path: ["lat"] // Señalar el error en lat
  })
});
