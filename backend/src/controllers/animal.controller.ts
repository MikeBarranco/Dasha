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
      const animals = await AnimalService.getPublicAnimals();
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
      if (applicantName || whatsapp || reason) {
        finalMessage = `Nombre: ${applicantName || 'N/A'}\nWhatsApp: ${whatsapp || 'N/A'}\nTipo de vivienda: ${housingType || 'N/A'}\n¿Ha tenido mascotas?: ${hasHadPets ? 'Sí' : 'No'}\nOtras mascotas: ${otherPets || 'Ninguna'}\nMotivo: ${reason || 'N/A'}`;
      }

      const application = await prisma.adoptionApplication.create({
        data: {
          animalId,
          applicantId: userId,
          message: finalMessage
        }
      });

      res.status(201).json({
        status: 'success',
        message: 'Solicitud de adopción enviada exitosamente',
        data: application
      });
    } catch (error) {
      next(error);
    }
  }

  static async donateToAnimal(req: Request, res: Response, next: NextFunction) {
    try {
      const animalId = req.params.id as string;
      const userId = req.user!.id;
      const { type, items, amountDeclared, proofBase64, notes, isAnonymous } = req.body;

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
        amount: type === 'items' ? 0 : (amountDeclared || 0),
        currency: 'MXN',
        status: 'pending',
        isAnonymous: Boolean(isAnonymous),
        items: type === 'items' ? items : null
      };

      const newDonation = await prisma.donation.create({
        data: donationData
      });

      if (type === 'money' && proofBase64) {
        // Here we would normally upload to Cloudinary. Mocking for now:
        const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
        await prisma.donationProof.create({
          data: {
            donationId: newDonation.id,
            proofUrl: cloudinaryUrl,
            publicId: 'mock_public_id',
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

      res.status(201).json({
        status: 'success',
        message: 'Donativo registrado correctamente',
        data: newDonation
      });
    } catch (error) {
      next(error);
    }
  }
}
