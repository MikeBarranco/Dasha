import { Router } from 'express';
import { LostPetController } from '../controllers/lost-pet.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/lost-pets (Pública) -> Lista todas las mascotas perdidas activas para el mapa
router.get('/', LostPetController.getActiveLostPets);

// POST /api/v1/lost-pets (Protegida) -> Crea el reporte de una mascota perdida
router.post('/', requireAuth, LostPetController.createLostPet);

// PATCH /api/v1/lost-pets/:id/found (Protegida) -> Marca la mascota como encontrada
router.patch('/:id/found', requireAuth, LostPetController.markAsFound);

export default router;
