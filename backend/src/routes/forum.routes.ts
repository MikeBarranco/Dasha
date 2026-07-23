import { Router } from 'express';
import { ForumController } from '../controllers/forum.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Públicas
router.get('/posts', ForumController.getPosts);
router.get('/posts/:id', ForumController.getPostDetails);
router.get('/posts/:id/replies', ForumController.getReplies);

// Requieren sesión
router.post('/posts', requireAuth, ForumController.createPost);
router.post('/posts/:id/replies', requireAuth, ForumController.createReply);
router.post('/posts/:id/like', requireAuth, ForumController.toggleLikePost);
router.post('/posts/:id/report', requireAuth, ForumController.reportPost);
router.post('/replies/:id/vote', requireAuth, ForumController.voteReply);

export default router;
