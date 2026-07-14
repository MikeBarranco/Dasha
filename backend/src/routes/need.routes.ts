import { Router } from 'express';
import { NeedController } from '../controllers/need.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/needs - Listar todas las necesidades activas
router.get('/', NeedController.getNeeds);

// PATCH /api/v1/needs/:id - Actualizar necesidad
router.patch('/:id', requireAuth, NeedController.updateNeed);

// DELETE /api/v1/needs/:id - Eliminar necesidad
router.delete('/:id', requireAuth, NeedController.deleteNeed);

export default router;
