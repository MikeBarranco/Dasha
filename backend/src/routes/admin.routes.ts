import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

// Todas las rutas de admin requieren sesión iniciada Y ser administrador
router.use(requireAuth);
router.use(requireRole('admin'));

// ==========================================
// USUARIOS
// ==========================================
router.get('/users', AdminController.getAllUsers);
router.delete('/users/:id', AdminController.deleteUser);

// ==========================================
// REPORTES
// ==========================================
router.get('/reports', AdminController.getAllReports);
router.patch('/reports/:id', AdminController.updateReport);
router.delete('/reports/:id', AdminController.deleteReport);

// ==========================================
// ORGANIZACIONES / ALIADOS
// ==========================================
router.get('/organizations', AdminController.getAllOrganizations);
router.post('/organizations', AdminController.createOrganization);
router.patch('/organizations/:id', AdminController.updateOrganization);
router.delete('/organizations/:id', AdminController.deleteOrganization);

// ==========================================
// ANIMALES EN REHABILITACIÓN
// ==========================================
router.get('/animals', AdminController.getAllAnimals);
router.post('/animals', AdminController.createAnimal);
router.patch('/animals/:id', AdminController.updateAnimal);
router.delete('/animals/:id', AdminController.deleteAnimal);

// ==========================================
// FORO
// ==========================================
router.get('/forum/posts', AdminController.getAllForumPosts);
router.delete('/forum/posts/:id', AdminController.deleteForumPost);
router.delete('/forum/replies/:id', AdminController.deleteForumReply);

// ==========================================
// SOLICITUDES DE VOLUNTARIADO
// ==========================================
router.get('/volunteers', AdminController.getVolunteerApplications);
router.patch('/volunteers/:id/status', AdminController.updateVolunteerStatus);

export default router;
