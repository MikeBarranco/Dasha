import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';

const router = Router();

// GET /api/v1/allies (Pública, obtiene aliados para el mapa)
router.get('/', OrganizationController.getAllies);

// GET /api/v1/allies/:id (Pública, ficha detallada del aliado)
router.get('/:id', OrganizationController.getAllyById);

export default router;
