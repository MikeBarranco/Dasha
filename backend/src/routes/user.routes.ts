import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { OrganizationController } from '../controllers/organization.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { updateAvailabilitySchema } from '../schemas/user.schema';

const router = Router();

// GET /api/v1/me (Protegida, requiere sesión)
router.get('/', requireAuth, UserController.getMe);

// PATCH /api/v1/me (Protegida, actualizar datos del perfil como nombre y teléfono)
router.patch('/', requireAuth, UserController.updateProfile);

// GET /api/v1/me/availability
router.get('/availability', requireAuth, UserController.getAvailability);

// PATCH /api/v1/me/availability (Protegida, modo activo voluntario)
router.patch('/availability', requireAuth, validate(updateAvailabilitySchema), UserController.updateAvailability);

// GET /api/v1/me/reports (Protegida, mis reportes)
router.get('/reports', requireAuth, UserController.getMyReports);

// GET /api/v1/me/rescue-assignments
router.get('/rescue-assignments', requireAuth, UserController.getMyRescueAssignments);

// POST /api/v1/me/volunteer-application (Protegida, enviar solicitud)
router.post('/volunteer-application', requireAuth, UserController.applyForVolunteer);

// GET /api/v1/me/notifications (Protegida, mis notificaciones)
router.get('/notifications', requireAuth, UserController.getMyNotifications);

// ==========================================
// CARTILLA MÉDICA Y PORTAL DE ANIMALES (Frontend specific)
// ==========================================

// GET /api/v1/me/organization/animals
router.get('/organization/animals', requireAuth, OrganizationController.getOrganizationAnimals);

// PATCH /api/v1/me/organization/animals/:id (esterilizado)
router.patch('/organization/animals/:id', requireAuth, OrganizationController.updateAnimalSterilized);

// POST /api/v1/me/organization/animals/:id/medical (agregar registro)
router.post('/organization/animals/:id/medical', requireAuth, OrganizationController.addAnimalMedicalEntry);

// DELETE /api/v1/me/organization/animals/:id/medical/:entryId (borrar registro)
router.delete('/organization/animals/:id/medical/:entryId', requireAuth, OrganizationController.deleteAnimalMedicalEntry);

// PATCH /api/v1/me/notifications/:id (Protegida, marcar como leída)
router.patch('/notifications/:id', requireAuth, UserController.updateNotification);

// POST /api/v1/me/notifications/read-all (Protegida, marcar todas como leídas)
router.post('/notifications/read-all', requireAuth, UserController.markAllNotificationsRead);

// POST /api/v1/me/push-subscription (Protegida, guardar token para push)
router.post('/push-subscription', requireAuth, UserController.savePushSubscription);

export default router;
