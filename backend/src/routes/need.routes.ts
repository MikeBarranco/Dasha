import { Router } from 'express';
import { NeedController } from '../controllers/need.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/needs - Listar todas las necesidades activas
router.get('/', NeedController.getNeeds);

// POST /api/v1/needs/contributions/:contributionId/confirm | /reject
// El aliado ACEPTA o DESCARTA un aporte pendiente a una de sus necesidades.
// Van antes de las rutas /:id para que "contributions" no se tome como un id.
router.post('/contributions/:contributionId/confirm', requireAuth, NeedController.confirmContribution);
router.post('/contributions/:contributionId/reject', requireAuth, NeedController.rejectContribution);

// PATCH /api/v1/needs/:id - Actualizar necesidad
router.patch('/:id', requireAuth, NeedController.updateNeed);

// DELETE /api/v1/needs/:id - Eliminar necesidad
router.delete('/:id', requireAuth, NeedController.deleteNeed);

// POST /api/v1/needs/:id/cover - Ofrecer ayuda con una necesidad
router.post('/:id/cover', requireAuth, NeedController.coverNeed);

export default router;
