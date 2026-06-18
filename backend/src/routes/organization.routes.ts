import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';

const router = Router();

// GET /api/v1/allies (Pública, obtiene aliados para el mapa)
router.get('/', OrganizationController.getAllies);

export default router;
