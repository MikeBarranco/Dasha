import { Router } from 'express';
import reportRoutes from './report.routes';

const router = Router();

router.use('/reports', reportRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
