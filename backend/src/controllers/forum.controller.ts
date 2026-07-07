import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ForumCategory } from '@prisma/client';

export class ForumController {
  // GET /forum/posts
  static async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, sort } = req.query; // sort: 'recent' | 'popular'
      
      const whereClause: any = {};
      if (category) {
        whereClause.category = category as ForumCategory;
      }

      const orderByClause: any = sort === 'popular' 
        ? { upvotes: 'desc' } 
        : { createdAt: 'desc' };

      const posts = await prisma.forumPost.findMany({
        where: whereClause,
        orderBy: orderByClause,
        include: {
          user: { select: { name: true, role: true } },
          _count: { select: { replies: true } }
        }
      });

      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  }

  // GET /forum/posts/:id
  static async getPostDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.id; // Opcional, para saber si el usuario ya votó

      const post = await prisma.forumPost.findUnique({
        where: { id },
        include: {
          user: { select: { name: true, role: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { name: true, role: true } }
            }
          }
        }
      });

      if (!post) {
        res.status(404).json({ error: 'Publicación no encontrada' });
        return;
      }

      // Si el usuario está autenticado, buscar sus votos para esta discusión
      let userVotes: any[] = [];
      if (userId) {
        userVotes = await prisma.forumVote.findMany({
          where: {
            userId,
            OR: [
              { postId: id },
              { replyId: { in: post.replies.map((r: any) => r.id) } }
            ]
          }
        });
      }

      res.status(200).json({ post, userVotes });
    } catch (error) {
      next(error);
    }
  }

  // POST /forum/posts
  static async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { title, content, category } = req.body;

      if (!title || !content || !category) {
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
      }

      const post = await prisma.forumPost.create({
        data: {
          userId,
          title,
          content,
          category: category as ForumCategory
        }
      });

      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }

  // POST /forum/posts/:id/replies
  static async createReply(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const postId = req.params.id as string;
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ error: 'El contenido es requerido' });
        return;
      }

      const reply = await prisma.forumReply.create({
        data: {
          userId,
          postId,
          content
        }
      });

      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  }

  // POST /forum/posts/:id/vote
  static async votePost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const postId = req.params.id as string;
      const { value } = req.body; // 1 (upvote) o -1 (downvote)

      if (value !== 1 && value !== -1) {
        res.status(400).json({ error: 'Valor de voto inválido' });
        return;
      }

      // Upsert vote
      await prisma.forumVote.upsert({
        where: { userId_postId: { userId, postId } },
        update: { value },
        create: { userId, postId, value }
      });

      // Recalcular votos totales
      const allVotes = await prisma.forumVote.findMany({ where: { postId } });
      const total = allVotes.reduce((acc, v) => acc + v.value, 0);

      await prisma.forumPost.update({
        where: { id: postId },
        data: { upvotes: total }
      });

      res.status(200).json({ message: 'Voto registrado', totalVotes: total });
    } catch (error) {
      next(error);
    }
  }

  // POST /forum/replies/:id/vote
  static async voteReply(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const replyId = req.params.id as string;
      const { value } = req.body;

      if (value !== 1 && value !== -1) {
        res.status(400).json({ error: 'Valor de voto inválido' });
        return;
      }

      await prisma.forumVote.upsert({
        where: { userId_replyId: { userId, replyId } },
        update: { value },
        create: { userId, replyId, value }
      });

      // Recalcular votos totales
      const allVotes = await prisma.forumVote.findMany({ where: { replyId } });
      const total = allVotes.reduce((acc, v) => acc + v.value, 0);

      await prisma.forumReply.update({
        where: { id: replyId },
        data: { upvotes: total }
      });

      res.status(200).json({ message: 'Voto registrado', totalVotes: total });
    } catch (error) {
      next(error);
    }
  }
}
