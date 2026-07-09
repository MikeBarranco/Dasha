import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ==========================================
// PORTAL DE ALIADOS (ZONA PRIVADA)
// ==========================================
router.get('/portal/profile', requireAuth, OrganizationController.getMyPortalProfile);
router.patch('/portal/profile', requireAuth, OrganizationController.updateMyPortalProfile);
router.get('/portal/team', requireAuth, OrganizationController.getMyPortalTeam);
router.post('/portal/team', requireAuth, OrganizationController.addTeamMember);
router.delete('/portal/team/:employeeId', requireAuth, OrganizationController.removeTeamMember);
router.get('/portal/reports/nearby', requireAuth, OrganizationController.getNearbyReports);
router.post('/reports/:reportId/offers', requireAuth, OrganizationController.offerResourceForReport);
router.post('/reports/:reportId/rescue', requireAuth, OrganizationController.startRescueAssignment);
router.post('/reports/:reportId/intake', requireAuth, OrganizationController.intakeReport);
router.get('/portal/incoming-rescues', requireAuth, OrganizationController.getIncomingRescues);

router.post('/portal/animals', requireAuth, OrganizationController.createPortalAnimal);
router.post('/portal/animals/:animalId/records', requireAuth, OrganizationController.addPortalAnimalRecord);
router.post('/portal/animals/:animalId/timeline', requireAuth, OrganizationController.addPortalTimelineEvent);

router.get('/adoption-requests', requireAuth, OrganizationController.getPortalAdoptions);
router.patch('/adoption-requests/:applicationId/approve', requireAuth, OrganizationController.approvePortalAdoption);
router.patch('/adoption-requests/:applicationId/reject', requireAuth, OrganizationController.rejectPortalAdoption);

router.get('/portal/donations', requireAuth, OrganizationController.getPortalDonations);
router.patch('/portal/donations/:donationId/approve', requireAuth, OrganizationController.approvePortalDonation);
router.patch('/portal/donations/:donationId/reject', requireAuth, OrganizationController.rejectPortalDonation);

// ==========================================
// DIRECTORIO PÚBLICO
// ==========================================
// GET /api/v1/allies (Pública, obtiene aliados para el mapa)
router.get('/', OrganizationController.getAllies);

// GET /api/v1/allies/:id (Pública, ficha detallada del aliado)
router.get('/:id', OrganizationController.getAllyById);

export default router;
