import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/v1/me
router.get('/', requireAuth, UserController.getMe);

export default router;
