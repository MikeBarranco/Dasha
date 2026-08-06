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

// DELETE /api/v1/me (Protegida, desactivar cuenta)
router.delete('/', requireAuth, UserController.deleteAccount);

// PATCH /api/v1/me/password (Protegida, cambiar contraseña)
router.patch('/password', requireAuth, UserController.updatePassword);

// GET /api/v1/me/availability
router.get('/availability', requireAuth, UserController.getAvailability);

// GET /api/v1/me/achievements/available
router.get('/achievements/available', requireAuth, UserController.getAvailableAchievements);

// PATCH /api/v1/me/availability (Protegida, modo activo voluntario)
router.patch('/availability', requireAuth, validate(updateAvailabilitySchema), UserController.updateAvailability);

// GET /api/v1/me/reports (Protegida, mis reportes)
router.get('/reports', requireAuth, UserController.getMyReports);

// GET /api/v1/me/contributions (Protegida, mis contribuciones a necesidades y donaciones)
router.get('/contributions', requireAuth, UserController.getMyContributions);

// GET /api/v1/me/adopted (Protegida, mi álbum privado de mascotas adoptadas)
router.get('/adopted', requireAuth, UserController.getMyAdopted);
router.get('/adoptions', requireAuth, UserController.getMyAdopted);

// GET /api/v1/me/rescue-assignments
router.get('/rescue-assignments', requireAuth, UserController.getMyRescueAssignments);

// POST /api/v1/me/volunteer-application (Protegida, enviar solicitud)
router.post('/volunteer-application', requireAuth, UserController.applyForVolunteer);

// GET /api/v1/me/notifications (Protegida, mis notificaciones)
router.get('/notifications', requireAuth, UserController.getMyNotifications);

// ==========================================
// CARTILLA MÉDICA Y PORTAL DE ANIMALES (Frontend specific)
// ==========================================

// GET /api/v1/me/organization (Portal de Aliado)
router.get('/organization', requireAuth, UserController.getMyOrganization);

// PATCH /api/v1/me/organization (actualizar perfil de aliado)
router.patch('/organization', requireAuth, OrganizationController.updateMyPortalProfile);

// GET /api/v1/me/organization/team
router.get('/organization/team', requireAuth, OrganizationController.getMyPortalTeam);

// POST /api/v1/me/organization/team
router.post('/organization/team', requireAuth, OrganizationController.addTeamMember);

// DELETE /api/v1/me/organization/team/:employeeId
router.delete('/organization/team/:employeeId', requireAuth, OrganizationController.removeTeamMember);

// POST /api/v1/me/organization/reports/:reportId/intake
router.post('/organization/reports/:reportId/intake', requireAuth, OrganizationController.intakeReport);

// GET /api/v1/me/organization/animals
router.get('/organization/animals', requireAuth, OrganizationController.getOrganizationAnimals);

// PATCH /api/v1/me/organization/animals/:id (esterilizado)
router.patch('/organization/animals/:id', requireAuth, OrganizationController.updateAnimalSterilized);

// POST /api/v1/me/organization/animals/:id/medical (agregar registro)
router.post('/organization/animals/:id/medical', requireAuth, OrganizationController.addAnimalMedicalEntry);

// DELETE /api/v1/me/organization/animals/:id/medical/:entryId (borrar registro)
router.delete('/organization/animals/:id/medical/:entryId', requireAuth, OrganizationController.deleteAnimalMedicalEntry);

// GET /api/v1/me/organization/donations
router.get('/organization/donations', requireAuth, OrganizationController.getPortalDonations);

// PATCH /api/v1/me/organization/donations/:id
router.patch('/organization/donations/:id', requireAuth, (req, res, next) => {
  req.params.donationId = req.params.id;
  if (req.body.received) {
    OrganizationController.approvePortalDonation(req, res, next);
  } else {
    OrganizationController.rejectPortalDonation(req, res, next);
  }
});

// GET /api/v1/me/organization/adoption-requests
router.get('/organization/adoption-requests', requireAuth, OrganizationController.getPortalAdoptions);

// PATCH /api/v1/me/organization/adoption-requests/:id
router.patch('/organization/adoption-requests/:id', requireAuth, (req, res, next) => {
  req.params.applicationId = req.params.id;
  if (req.body.status === 'approved') {
    OrganizationController.approvePortalAdoption(req, res, next);
  } else {
    OrganizationController.rejectPortalAdoption(req, res, next);
  }
});

// PATCH /api/v1/me/notifications/:id (Protegida, marcar como leída)
router.patch('/notifications/:id', requireAuth, UserController.updateNotification);

// POST /api/v1/me/notifications/read-all (Protegida, marcar todas como leídas)
router.post('/notifications/read-all', requireAuth, UserController.markAllNotificationsRead);

// POST /api/v1/me/push-subscription (Protegida, guardar token para push)
router.post('/push-subscription', requireAuth, UserController.savePushSubscription);

export default router;
