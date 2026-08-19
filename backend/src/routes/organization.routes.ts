import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { NeedController } from '../controllers/need.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ==========================================
// PORTAL DE ALIADOS (ZONA PRIVADA)
// ==========================================
router.get('/portal/profile', requireAuth, OrganizationController.getMyPortalProfile);
router.patch('/portal/profile', requireAuth, OrganizationController.updateMyPortalProfile);
router.get('/portal/team', requireAuth, OrganizationController.getMyPortalTeam);
router.post('/portal/team', requireAuth, OrganizationController.addTeamMember);
router.patch('/portal/team/:employeeId', requireAuth, OrganizationController.updateTeamMember);
router.delete('/portal/team/:employeeId', requireAuth, OrganizationController.removeTeamMember);
router.get('/portal/reports/nearby', requireAuth, OrganizationController.getNearbyReports);
router.post('/reports/:reportId/offers', requireAuth, OrganizationController.offerResourceForReport);
router.post('/reports/:reportId/rescue', requireAuth, OrganizationController.startRescueAssignment);
router.post('/reports/:reportId/intake', requireAuth, OrganizationController.intakeReport);
router.get('/portal/incoming-rescues', requireAuth, OrganizationController.getIncomingRescues);

// PORTAL DE ANIMALES Y ADOPCIONES
router.get('/portal/animals', requireAuth, OrganizationController.getPortalAnimals);
router.post('/portal/animals', requireAuth, OrganizationController.createPortalAnimal);
router.post('/portal/animals/direct-intake', requireAuth, OrganizationController.directIntakeAnimal);
router.patch('/portal/animals/:animalId', requireAuth, OrganizationController.updatePortalAnimal);
router.post('/portal/animals/:animalId/photos', requireAuth, OrganizationController.addPortalAnimalPhoto);
router.delete('/portal/animals/:animalId/photos', requireAuth, OrganizationController.deletePortalAnimalPhoto);
router.patch('/portal/animals/:animalId/photos/reorder', requireAuth, OrganizationController.reorderPortalAnimalPhotos);
router.post('/portal/animals/:animalId/records', requireAuth, OrganizationController.addPortalAnimalRecord);
router.post('/portal/animals/:animalId/timeline', requireAuth, OrganizationController.addPortalTimelineEvent);

router.get('/adoption-requests', requireAuth, OrganizationController.getPortalAdoptions);
router.patch('/adoption-requests/:applicationId/approve', requireAuth, OrganizationController.approvePortalAdoption);
router.patch('/adoption-requests/:applicationId/reject', requireAuth, OrganizationController.rejectPortalAdoption);

router.get('/portal/donations', requireAuth, OrganizationController.getPortalDonations);
router.patch('/portal/donations/:donationId/approve', requireAuth, OrganizationController.approvePortalDonation);
router.patch('/portal/donations/:donationId/reject', requireAuth, OrganizationController.rejectPortalDonation);

router.get('/portal/needs', requireAuth, OrganizationController.getPortalNeeds);
router.patch('/portal/needs/:needId/reopen', requireAuth, OrganizationController.reopenPortalNeed);

// ==========================================
// DIRECTORIO PUBLICO
// ==========================================
// GET /api/v1/allies (Publica, obtiene aliados para el mapa)
router.get('/', OrganizationController.getAllies);

// GET /api/v1/allies/:id (Publica, ficha detallada del aliado)
router.get('/:id', OrganizationController.getAllyById);

// GET /api/v1/organizations/:id/needs (Listar necesidades de una org especifica)
router.get('/:id/needs', NeedController.getOrganizationNeeds);

// POST /api/v1/organizations/:id/needs (Crear necesidad para una org)
router.post('/:id/needs', requireAuth, NeedController.createNeed);

// PATCH /api/v1/organizations/:id/needs/:needId (Actualizar necesidad)
// Redirige al controlador de necesidades (usa params.needId en vez de id)
router.patch('/:id/needs/:needId', requireAuth, (req, res, next) => {
  req.params.id = req.params.needId;
  NeedController.updateNeed(req, res, next);
});

import { EventController } from '../controllers/event.controller';
// POST /api/v1/organizations/:id/events (Crear evento por aliado)
router.post('/:id/events', requireAuth, EventController.createOrganizationEvent);
// PATCH /api/v1/organizations/:id/events/:eventId (Editar evento del aliado)
router.patch('/:id/events/:eventId', requireAuth, EventController.updateOrganizationEvent);
// DELETE /api/v1/organizations/:id/events/:eventId (Cancelar/quitar evento, borrado suave)
router.delete('/:id/events/:eventId', requireAuth, EventController.deleteOrganizationEvent);

export default router;
