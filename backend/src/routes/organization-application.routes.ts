import { Router } from 'express';
import { OrganizationApplicationController } from '../controllers/organization-application.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// ==========================================
// POSTULACIÓN DE ALIADOS
// ==========================================

// Ciudadano postula su clínica u organización
router.post('/', requireAuth, OrganizationApplicationController.apply);

// Admin ve las postulaciones
router.get('/', requireAuth, requireRole('admin'), OrganizationApplicationController.getApplications);

// Admin aprueba o rechaza (status: 'approved' | 'rejected')
router.patch('/:id', requireAuth, requireRole('admin'), OrganizationApplicationController.updateApplication);

export default router;
