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

const router = Router();

router.use('/auth', authRoutes);
router.use('/me', userRoutes);
router.use('/reports', reportRoutes);
router.use('/uploads', uploadRoutes);
router.use('/stats', statsRoutes);
router.use('/allies', organizationRoutes);
router.use('/animals', animalRoutes);
router.use('/colonies', colonyRoutes);
router.use('/admin', adminRoutes);
router.use('/lost-pets', lostPetRoutes);
router.use('/novedades', changelogRoutes);
router.use('/events', eventRoutes);
router.use('/forum', forumRoutes);
router.use('/rescue-assignments', rescueAssignmentRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
