import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
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
      const animalId = req.params.id;
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
}
