import { Router } from 'express';
import { AnimalController } from '../controllers/animal.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { createAnimalSchema, addMedicalRecordSchema } from '../schemas/animal.schema';

const router = Router();

// GET /api/v1/animals (Pública, mapa/directorio de adopción)
router.get('/', AnimalController.getPublicAnimals);

// GET /api/v1/animals/:id (Pública, detalle de un animal)
router.get('/:id', AnimalController.getAnimalById);

// POST /api/v1/animals (Protegida, crear perfil de animal rescatado)
router.post('/', requireAuth, validate(createAnimalSchema), AnimalController.createProfile);

// POST /api/v1/animals/:id/records (Protegida, añadir récord médico con fotos)
router.post('/:id/records', requireAuth, validate(addMedicalRecordSchema), AnimalController.addRecord);

// POST /api/v1/animals/:id/follow (Protegida, seguir a un animal)
router.post('/:id/follow', requireAuth, AnimalController.followAnimal);

// DELETE /api/v1/animals/:id/follow (Protegida, dejar de seguir)
router.delete('/:id/follow', requireAuth, AnimalController.unfollowAnimal);

// POST /api/v1/animals/:id/adopt (Protegida, solicitar adopción)
router.post('/:id/adopt', requireAuth, AnimalController.requestAdoption);

// POST /api/v1/animals/:id/donations (Protegida, enviar donativo de dinero o especie)
router.post('/:id/donations', requireAuth, AnimalController.donateToAnimal);

export default router;
