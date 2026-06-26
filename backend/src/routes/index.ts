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

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
