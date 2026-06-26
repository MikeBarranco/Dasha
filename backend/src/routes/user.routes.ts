import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { updateAvailabilitySchema } from '../schemas/user.schema';

const router = Router();

// GET /api/v1/me (Protegida, requiere sesión)
router.get('/', requireAuth, UserController.getMe);

// PATCH /api/v1/me (Protegida, actualizar datos del perfil como nombre y teléfono)
router.patch('/', requireAuth, UserController.updateProfile);

// PATCH /api/v1/me/availability (Protegida, modo activo voluntario)
router.patch('/availability', requireAuth, validate(updateAvailabilitySchema), UserController.updateAvailability);

// GET /api/v1/me/reports (Protegida, mis reportes)
router.get('/reports', requireAuth, UserController.getMyReports);

// POST /api/v1/me/volunteer-application (Protegida, enviar solicitud)
router.post('/volunteer-application', requireAuth, UserController.applyForVolunteer);

export default router;
