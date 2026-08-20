import { Router } from 'express';
import reportRoutes from './report.routes';
import authRoutes from './auth.routes';
import uploadRoutes from './upload.routes';
import statsRoutes from './stats.routes';
import userRoutes from './user.routes';
import organizationRoutes from './organization.routes';
import animalRoutes from './animal.routes';
import colonyRoutes from './colony.routes';
import adminRoutes from './admin.routes';
import lostPetRoutes from './lost-pet.routes';
import changelogRoutes from './changelog.routes';
import eventRoutes from './event.routes';
import forumRoutes from './forum.routes';
import rescueAssignmentRoutes from './rescue-assignment.routes';
import achievementRoutes from './achievement.routes';
import needRoutes from './need.routes';
import organizationApplicationRoutes from './organization-application.routes';

import { authLimiter, publicGetLimiter, standardLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

// Límite estricto para autenticación
router.use('/auth', authLimiter, authRoutes);

// Límite estándar para el resto por defecto, excepto los puramente GET o públicos si se desea separarlos, 
// pero usaremos standardLimiter para la mayoría de mutaciones o uso normal.
router.use(standardLimiter);

router.use('/me', userRoutes);
router.use('/reports', reportRoutes);
router.use('/uploads', uploadRoutes);
router.use('/stats', publicGetLimiter, statsRoutes); // Generoso
router.use('/allies', organizationRoutes);
router.use('/animals', animalRoutes);
router.use('/colonies', colonyRoutes);
router.get('/debug-cookie', (req, res) => res.json({ headers: req.headers, cookies: req.cookies }));
router.get('/debug-headers', (req, res) => res.json({ headers: req.headers, cookies: req.cookies }));
router.use('/admin', adminRoutes);
router.use('/lost-pets', lostPetRoutes);
router.use('/novedades', publicGetLimiter, changelogRoutes); // Generoso
router.use('/events', eventRoutes);
router.use('/forum', forumRoutes);
router.use('/rescue-assignments', rescueAssignmentRoutes);
router.use('/achievements', publicGetLimiter, achievementRoutes);
router.use('/needs', needRoutes);
router.use('/organization-applications', organizationApplicationRoutes);

// ==========================================================
// FIX PARA FRONTEND: Rutas de portal que el frontend consume en la raíz
// ==========================================================
import { requireAuth } from '../middlewares/auth.middleware';
import { OrganizationController } from '../controllers/organization.controller';

router.get('/organizations/portal/incoming-rescues', requireAuth, OrganizationController.getIncomingRescues);
router.patch('/portal/animals/:animalId', requireAuth, OrganizationController.updatePortalAnimal);
router.post('/portal/animals/:animalId/photos', requireAuth, OrganizationController.addPortalAnimalPhoto);
router.delete('/portal/animals/:animalId/photos', requireAuth, OrganizationController.deletePortalAnimalPhoto);
router.patch('/portal/animals/:animalId/photos/reorder', requireAuth, OrganizationController.reorderPortalAnimalPhotos);
router.post('/portal/animals/direct-intake', requireAuth, OrganizationController.directIntakeAnimal);

import { NeedController } from '../controllers/need.controller';
import { EventController } from '../controllers/event.controller';

// IMPORTANT: /portal/needs MUST be defined before /:id/needs to prevent "portal" from being parsed as a UUID
router.get('/organizations/portal/needs', requireAuth, OrganizationController.getPortalNeeds);
router.patch('/organizations/portal/needs/:needId/reopen', requireAuth, OrganizationController.reopenPortalNeed);

router.get('/organizations/:id/needs', NeedController.getOrganizationNeeds);
router.post('/organizations/:id/needs', requireAuth, NeedController.createNeed);
router.patch('/organizations/:id/needs/:needId', requireAuth, (req, res, next) => {
  req.params.id = req.params.needId;
  NeedController.updateNeed(req, res, next);
});

router.post('/organizations/:id/events', requireAuth, EventController.createOrganizationEvent);

router.get('/health', publicGetLimiter, (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
