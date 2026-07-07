import { prisma } from '../config/db';
import { Prisma } from '@prisma/client';

export class AnimalService {
  /**
   * Crea un perfil de animal con sus fotos
   */
  static async createProfile(data: any, photos: any[]) {
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.report.findUnique({ where: { id: data.reportId } });
      const timelineEvents: any[] = [];
      
      if (report) {
        timelineEvents.push({
          title: 'Reporte ciudadano',
          description: 'Se recibió el reporte inicial del caso.',
          type: 'reportado',
          date: report.createdAt
        });
        if (report.volunteerId) {
          timelineEvents.push({
            title: 'Rescate iniciado',
            description: 'Un voluntario fue asignado al caso.',
            type: 'rescatado',
            date: report.updatedAt
          });
        }
      }
      
      timelineEvents.push({
        title: 'Ingreso a rehabilitación',
        description: 'Se creó el perfil médico del animal.',
        type: 'veterinaria',
        date: new Date()
      });

      // Crear el perfil del animal
      const animal = await tx.animalProfile.create({
        data: {
          reportId: data.reportId,
          organizationId: data.organizationId,
          name: data.name,
          species: data.species,
          breed: data.breed,
          ageEstimation: data.ageEstimation,
          weightKg: data.weightKg,
          color: data.color,
          gender: data.gender,
          isNeutered: data.isNeutered || false,
          microchipId: data.microchipId,
          story: data.story,
          status: data.status,
          totalCostNeeded: data.totalCostNeeded || 0,
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          // Insertar fotos en la misma transacción
          photos: {
            create: photos.map((photo: any, index: number) => ({
              url: photo.url,
              publicId: photo.publicId,
              orderIndex: index
            }))
          },
          timeline: {
            create: timelineEvents
          }
        },
        include: {
          photos: true,
          timeline: { orderBy: { date: 'asc' } }
        }
      });

      return animal;
    });
  }

  /**
   * Añade un récord médico a un animal
   */
  static async addMedicalRecord(animalId: string, veterinarianId: string, data: any, uploadedPhotosData: any[]) {
    return await prisma.medicalRecord.create({
      data: {
        animalId,
        veterinarianId,
        recordType: data.recordType,
        description: data.description,
        diagnosis: data.diagnosis,
        prescription: data.prescription,
        cost: data.cost || 0,
        photoUrls: uploadedPhotosData.length > 0 ? uploadedPhotosData : undefined
      }
    });
  }

  /**
   * Obtiene todos los animales públicos en rehabilitación o adopción
   */
  static async getPublicAnimals() {
    return await prisma.animalProfile.findMany({
      where: {
        isPublic: true,
        status: {
          in: ['in_treatment', 'recovering', 'looking_for_foster', 'looking_for_adoption']
        }
      },
      include: {
        photos: {
          orderBy: { orderIndex: 'asc' }
        },
        organization: {
          select: { name: true, address: true }
        },
        timeline: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Obtiene un animal por ID con todo su historial médico
   */
  static async getAnimalById(id: string) {
    return await prisma.animalProfile.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { orderIndex: 'asc' } },
        medicalRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            veterinarian: { select: { name: true, email: true } }
          }
        },
        organization: { select: { name: true } },
        currentFoster: { select: { name: true } },
        timeline: { orderBy: { date: 'asc' } }
      }
    });
  }
}
