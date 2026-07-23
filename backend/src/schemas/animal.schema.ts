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

export const donateToAnimalSchema = z.object({
  body: z.object({
    type: z.enum(['money', 'items']),
    amount: z.number().positive().optional(),
    amountDeclared: z.number().positive().optional(),
    proofBase64: z.string().optional(),
    items: z.string().optional(),
    itemsDescription: z.string().optional(),
    notes: z.string().optional(),
    isAnonymous: z.boolean().optional().default(false)
  }).refine(data => {
    if (data.type === 'money') {
      return (data.amount !== undefined || data.amountDeclared !== undefined) && data.proofBase64 !== undefined;
    } else {
      return data.items !== undefined || data.itemsDescription !== undefined;
    }
  }, {
    message: 'Faltan campos requeridos según el tipo de donativo',
    path: ['type']
  })
});
