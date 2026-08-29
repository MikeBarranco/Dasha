import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../config/db';
import { AnimalService } from '../services/animal.service';

export class AnimalController {
  
  static async createProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { photosBase64, ...data } = req.body;
      
      const uploadedPhotos = [];
      
      // Subir cada foto a Cloudinary
      if (photosBase64 && Array.isArray(photosBase64)) {
        for (const base64Str of photosBase64) {
          const uploadResult = await cloudinary.uploader.upload(base64Str, {
            folder: 'dasha_animals',
          });
          uploadedPhotos.push({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
          });
        }
      }

      const animal = await AnimalService.createProfile(data, uploadedPhotos);

      res.status(201).json({
        status: 'success',
        message: 'Perfil de animal creado correctamente',
        data: animal
      });
    } catch (error) {
      next(error);
    }
  }

  static async addRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const animalId = req.params.id as string;
      const veterinarianId = (req as any).user?.id;
      const { photosBase64, ...data } = req.body;

      if (!veterinarianId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const uploadedPhotosData = [];
      
      if (photosBase64 && Array.isArray(photosBase64)) {
        for (const base64Str of photosBase64) {
          const uploadResult = await cloudinary.uploader.upload(base64Str, {
            folder: 'dasha_medical_records',
          });
          uploadedPhotosData.push({
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
          });
        }
      }

      const record = await AnimalService.addMedicalRecord(
        animalId,
        veterinarianId,
        data,
        uploadedPhotosData
      );

      res.status(201).json({
        status: 'success',
        message: 'Récord médico añadido exitosamente',
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicAnimals(req: Request, res: Response, next: NextFunction) {
    try {
      let status = req.query.status as string;
      if (status === 'adoption') {
        status = 'adoptable';
      }
      const animals = await AnimalService.getPublicAnimals(status);
      res.status(200).json(animals);
    } catch (error) {
      next(error);
    }
  }

  static async getAnimalById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const animal = await AnimalService.getAnimalById(id);
      
      if (!animal) {
        res.status(404).json({ error: 'Animal no encontrado' });
        return;
      }
      
      res.status(200).json(animal);
    } catch (error) {
      next(error);
    }
  }

  static async followAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      if (!animal) {
        res.status(404).json({ error: 'Animal no encontrado' });
        return;
      }

      await prisma.animalFollower.upsert({
        where: { userId_animalId: { userId, animalId } },
        update: {},
        create: { userId, animalId }
      });

      res.status(200).json({ message: 'Ahora sigues a este animal' });
    } catch (error) {
      next(error);
    }
  }

  static async unfollowAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      try {
        await prisma.animalFollower.delete({
          where: { userId_animalId: { userId, animalId } }
        });
      } catch (e) {
        // Ignorar si no existía
      }

      res.status(200).json({ message: 'Dejaste de seguir a este animal' });
    } catch (error) {
      next(error);
    }
  }

  static async requestAdoption(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.id as string;
      const { 
        message, 
        applicantName, 
        whatsapp, 
        housingType, 
        hasHadPets, 
        otherPets, 
        reason 
      } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const animal = await prisma.animalProfile.findUnique({ where: { id: animalId } });
      if (!animal) {
        res.status(404).json({ error: 'Animal no encontrado' });
        return;
      }

      if (animal.status === 'adopted') {
        res.status(400).json({ error: 'Este animal ya ha sido adoptado' });
        return;
      }

      // Check if user already applied
      const existingApplication = await prisma.adoptionApplication.findFirst({
        where: {
          animalId,
          applicantId: userId,
          status: { in: ['pending', 'approved'] }
        }
      });

      if (existingApplication) {
        res.status(400).json({ error: 'Ya tienes una solicitud activa para este animal' });
        return;
      }

      let finalMessage = message || '';
      if (applicantName || whatsapp || reason || housingType !== undefined || hasHadPets !== undefined || otherPets !== undefined) {
        finalMessage = JSON.stringify({
          applicantName,
          whatsapp,
          housingType,
          hasHadPets,
          otherPets,
          reason,
          originalMessage: message
        });
      }

      const application = await prisma.adoptionApplication.create({
        data: {
          animalId,
          applicantId: userId,
          message: finalMessage
        }
      });

      // Notificar la solicitud de adopcion. Debe llegar a los administradores del
      // aliado dueño del animal Y tambien a los administradores de Dasha (equipo
      // central, rol 'admin'), para que ambos se enteren. Se juntan los ids en un
      // Set para no avisar dos veces al mismo usuario, y va en su propio try para
      // que un fallo de notificacion no tumbe la solicitud (se responde igual).
      try {
        const { NotificationService } = await import('../services/notification.service.js');
        const recipientIds = new Set<string>();

        // Administradores del aliado dueño del animal (si el animal es de una org).
        if (animal.organizationId) {
          const orgAdmins = await prisma.organizationEmployee.findMany({
            where: { organizationId: animal.organizationId, roleInOrg: 'admin', isVerified: true },
            select: { userId: true }
          });
          orgAdmins.forEach((a) => recipientIds.add(a.userId));
        }

        // Administradores de Dasha (equipo central).
        const dashaAdmins = await prisma.user.findMany({
          where: { role: 'admin' },
          select: { id: true }
        });
        dashaAdmins.forEach((u) => recipientIds.add(u.id));

        // No notificar al propio solicitante (por si un admin se postula).
        recipientIds.delete(userId);

        await Promise.allSettled(
          [...recipientIds].map((recipientId) =>
            NotificationService.sendNotification({
              userId: recipientId,
              title: '¡Nueva solicitud de adopción!',
              body: `${applicantName || 'Alguien'} ha solicitado adoptar a ${animal.name}.`,
              link: '/portal/adopciones',
              type: 'system' as any
            })
          )
        );
      } catch (err) {
        console.error('Error notificando solicitud de adopcion', err);
      }

      res.status(201).json({
        status: 'success',
        message: 'Solicitud de adopción enviada exitosamente',
        data: application
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkAdoptionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const animalId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      const existingApplication = await prisma.adoptionApplication.findFirst({
        where: {
          animalId,
          applicantId: userId,
          status: { in: ['pending', 'approved'] }
        }
      });

      res.status(200).json({ hasApplied: !!existingApplication });
    } catch (error) {
      next(error);
    }
  }

  static async donateToAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const animalId = req.params.id as string;
      const userId = req.user!.id;
      const { type, items, itemsDescription, amount, amountDeclared, proofBase64, notes, isAnonymous } = req.body;

      const animal = await prisma.animalProfile.findUnique({
        where: { id: animalId }
      });
      if (!animal) {
        res.status(404).json({ error: 'Animal no encontrado' });
        return;
      }

      // Base donation structure
      const donationData: any = {
        animalId,
        userId,
        type: type === 'items' ? 'items' : 'money',
        amount: type === 'items' ? 0 : (amount || amountDeclared || 0),
        currency: 'MXN',
        status: 'pending',
        isAnonymous: Boolean(isAnonymous),
        items: type === 'items' ? (itemsDescription || items) : null
      };

      const newDonation = await prisma.donation.create({
        data: donationData
      });

      if (type === 'money' && proofBase64) {
        // Upload proof to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(proofBase64, {
          folder: 'dasha/donation_proofs'
        });
        
        await prisma.donationProof.create({
          data: {
            donationId: newDonation.id,
            proofUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            amountDeclared: amountDeclared || 0,
            notes
          }
        });
      }

      // Give XP
      prisma.user.update({
        where: { id: userId },
        data: { experiencePoints: { increment: 20 } }
      }).catch((err: any) => console.error('Error granting XP for donation:', err));

      const { AchievementService } = await import('../services/achievement.service.js');
      await AchievementService.checkAndGrantDonorAchievements(userId);

      res.status(201).json({
        status: 'success',
        message: 'Donativo registrado correctamente',
        data: newDonation
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdoptedAnimals(req: Request, res: Response, next: NextFunction) {
    try {
      const adopted = await prisma.animalProfile.findMany({
        where: { status: 'adopted' },
        include: {
          photos: {
            orderBy: { orderIndex: 'asc' }
          },
          // Reporte original (fotos de calle + avistamientos) para el álbum completo.
          report: {
            include: {
              photos: { orderBy: { orderIndex: 'asc' } },
              caseActions: { orderBy: { createdAt: 'asc' } }
            }
          },
          organization: {
            select: { id: true, name: true, logoUrl: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
      res.status(200).json(adopted);
    } catch (error) {
      next(error);
    }
  }

  static async addMoment(req: Request, res: Response, next: NextFunction) {
    try {
      const animalId = req.params.id as string;
      const { photoBase64, caption } = req.body;

      if (!photoBase64) {
        res.status(400).json({ error: 'Falta la foto (photoBase64)' });
        return;
      }

      const { v2: cloudinary } = await import('cloudinary');
      const uploadResult = await cloudinary.uploader.upload(photoBase64, {
        folder: 'dasha/adopted_moments'
      });

      const photo = await prisma.animalPhoto.create({
        data: {
          animalId,
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          caption: caption || 'Un hermoso momento',
          orderIndex: 0
        }
      });

      res.status(201).json({
        message: 'Momento agregado con éxito',
        data: photo
      });
    } catch (error) {
      next(error);
    }
  }
}
