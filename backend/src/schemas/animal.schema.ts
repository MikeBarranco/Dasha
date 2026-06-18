import { z } from 'zod';

export const createAnimalSchema = z.object({
  body: z.object({
    reportId: z.string().uuid(),
    organizationId: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    species: z.enum(['dog', 'cat']),
    breed: z.string().max(100).optional(),
    ageEstimation: z.string().max(50).optional(),
    weightKg: z.number().positive().optional(),
    color: z.string().max(100).optional(),
    gender: z.enum(['male', 'female', 'unknown']).optional(),
    isNeutered: z.boolean().optional(),
    microchipId: z.string().max(50).optional(),
    story: z.string().optional(),
    status: z.enum([
      'in_treatment',
      'recovering',
      'looking_for_foster',
      'in_foster',
      'looking_for_adoption',
      'adopted',
      'deceased'
    ]),
    totalCostNeeded: z.number().min(0).optional().default(0),
    isPublic: z.boolean().optional().default(true),
    photosBase64: z.array(z.string()).optional() // Array de imágenes en base64
  })
});

export const addMedicalRecordSchema = z.object({
  body: z.object({
    recordType: z.enum([
      'checkup',
      'surgery',
      'vaccination',
      'medication',
      'lab',
      'imaging',
      'other'
    ]),
    description: z.string().min(1),
    diagnosis: z.string().optional(),
    prescription: z.string().optional(),
    cost: z.number().min(0).optional().default(0),
    photosBase64: z.array(z.string()).optional()
  })
});
