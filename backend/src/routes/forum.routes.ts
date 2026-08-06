import { Router } from 'express';
import { ForumController } from '../controllers/forum.controller';
import { requireAuth, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

// Públicas (con auth opcional para calcular likedByMe)
router.get('/posts', optionalAuth, ForumController.getPosts);
router.get('/posts/:id', optionalAuth, ForumController.getPostDetails);
router.get('/posts/:id/replies', optionalAuth, ForumController.getReplies);

// Requieren sesión
router.post('/posts', requireAuth, ForumController.createPost);
router.post('/posts/:id/replies', requireAuth, ForumController.createReply);
router.post('/posts/:id/like', requireAuth, ForumController.toggleLikePost);
router.post('/posts/:id/report', requireAuth, ForumController.reportPost);
router.post('/replies/:id/like', requireAuth, ForumController.toggleLikeReply);
router.post('/replies/:id/report', requireAuth, ForumController.reportReply);

export default router;
