import { Router } from 'express';
import { ForumController } from '../controllers/forum.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Públicas
router.get('/posts', ForumController.getPosts);
router.get('/posts/:id', ForumController.getPostDetails);

// Requieren sesión
router.post('/posts', requireAuth, ForumController.createPost);
router.post('/posts/:id/replies', requireAuth, ForumController.createReply);
router.post('/posts/:id/vote', requireAuth, ForumController.votePost);
router.post('/replies/:id/vote', requireAuth, ForumController.voteReply);

export default router;
