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
router.patch('/users/:id/role', AdminController.updateUserRole);
router.delete('/users/:id', AdminController.deleteUser);

// ==========================================
// NOVEDADES
// ==========================================
import { ChangelogController } from '../controllers/changelog.controller';
router.post('/novedades', ChangelogController.createEntry);
router.patch('/novedades/:id', ChangelogController.updateEntry);
router.delete('/novedades/:id', ChangelogController.deleteEntry);

// ==========================================
// REPORTES
// ==========================================
// GET /api/v1/admin/forum/reports
router.get('/forum/reports', AdminController.getForumReports);

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
router.get('/organizations/:id/team', AdminController.getOrganizationTeam);
router.post('/organizations/:id/team', AdminController.addOrganizationTeamMember);
router.delete('/organizations/:id/team/:employeeId', AdminController.removeOrganizationTeamMember);

router.get('/organizations/:id/team', AdminController.getOrganizationTeam);
router.post('/organizations/:id/team', AdminController.addOrganizationTeamMember);
router.delete('/organizations/:id/team/:userId', AdminController.removeOrganizationTeamMember);

// ==========================================
// ANIMALES EN REHABILITACIÓN
// ==========================================
router.get('/animals', AdminController.getAllAnimals);
router.post('/animals', AdminController.createAnimal);
router.patch('/animals/:id', AdminController.updateAnimal);
router.delete('/animals/:id', AdminController.deleteAnimal);
router.delete('/animals/:id/photos/:photoId', AdminController.deleteAnimalPhoto);

router.post('/animals/:id/timeline', AdminController.createAnimalTimelineEvent);
router.patch('/animals/:id/timeline/:eventId', AdminController.updateAnimalTimelineEvent);
router.delete('/animals/:id/timeline/:eventId', AdminController.deleteAnimalTimelineEvent);

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

// ==========================================
// EVENTOS
// ==========================================
router.get('/events', AdminController.getAllEvents);
router.post('/events', AdminController.createEvent);
router.patch('/events/:id', AdminController.updateEvent);
router.delete('/events/:id', AdminController.deleteEvent);

// ==========================================
// NOVEDADES (CHANGELOG)
// ==========================================
router.get('/novedades', AdminController.getAllChangelogEntries);
router.post('/novedades', AdminController.createChangelogEntry);
router.patch('/novedades/:id', AdminController.updateChangelogEntry);
router.delete('/novedades/:id', AdminController.deleteChangelogEntry);
// ==========================================
// NOTIFICACIONES MANUALES (AVISOS)
// ==========================================
router.post('/notifications', AdminController.sendManualNotification);
router.get('/notifications', AdminController.getManualNotificationsHistory);
router.delete('/notifications/:id', AdminController.deleteManualNotification);
// ==========================================
// DENUNCIAS (FLAGS) Y MEDALLAS
// ==========================================
router.get('/flags', AdminController.getAllFlags);
router.delete('/flags/:id', AdminController.deleteFlag);
router.delete('/users/:userId/achievements/:achievementId', AdminController.revokeUserAchievement);

export default router;
