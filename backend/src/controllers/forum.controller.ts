import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ForumCategory } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

export class ForumController {
  // GET /forum/posts
  static async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, sort } = req.query; // sort: 'recent' | 'popular'
      
      const whereClause: any = {
        user: { isActive: true }
      };
      if (category) {
        whereClause.category = category as ForumCategory;
      }

      const orderByClause: any = sort === 'popular' 
        ? { upvotes: 'desc' } 
        : { createdAt: 'desc' };

      const userId = (req as any).user?.id; // Puede venir si el middleware lo inyecta opcionalmente

      const includeClause: any = {
        user: { select: { name: true, role: true, avatarUrl: true } },
        _count: { select: { replies: true } }
      };

      if (userId) {
        includeClause.flags = {
          where: { flaggedBy: userId },
          select: { id: true }
        };
        includeClause.votes = {
          where: { userId, value: 1 },
          select: { id: true }
        };
      }

      const postsRaw = await prisma.forumPost.findMany({
        where: whereClause,
        orderBy: orderByClause,
        include: includeClause
      });

      const posts = postsRaw.map((p: any) => {
        const { flags, votes, ...rest } = p;
        return {
          ...rest,
          hasReported: flags ? flags.length > 0 : false,
          likedByMe: votes ? votes.length > 0 : false
        };
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
          user: { select: { name: true, role: true, isActive: true } },
          replies: {
            where: {
              user: { isActive: true }
            },
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

      // Si el autor del post está baneado (inactivo), podríamos querer ocultar todo el post,
      // pero la regla 12 pide explícitamente ocultar "sus respuestas".
      // Aún así, si el post original es de un baneado, tal vez devolvamos 404.
      if (post.user && !(post.user as any).isActive) {
        res.status(404).json({ error: 'El autor de esta publicación ya no está activo.' });
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
      const { title, content, category, text, imageBase64 } = req.body;
      
      const postContent = content || text;

      if (!postContent) {
        res.status(400).json({ error: 'Faltan campos requeridos: content/text' });
        return;
      }

      const imageUrls: string[] = [];
      if (imageBase64) {
        const uploadRes = await cloudinary.uploader.upload(imageBase64, { folder: 'dasha/forum' });
        imageUrls.push(uploadRes.secure_url);
      }

      const postTitle = title || (postContent.length > 30 ? postContent.substring(0, 30) + '...' : postContent);
      const postCategory = category || 'general';

      const post = await prisma.forumPost.create({
        data: {
          userId,
          title: postTitle,
          content: postContent,
          category: postCategory as any,
          images: imageUrls
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
      const { content, text } = req.body;
      const replyContent = content || text;

      if (!replyContent) {
        res.status(400).json({ error: 'El contenido es requerido' });
        return;
      }

      const reply = await prisma.forumReply.create({
        data: {
          userId,
          postId,
          content: replyContent
        },
        include: {
          user: { select: { id: true, name: true, role: true, avatarUrl: true } }
        }
      });

      try {
        const { NotificationService } = await import('../services/notification.service.js');
        const post = await prisma.forumPost.findUnique({ where: { id: postId }, select: { userId: true, title: true } });
        if (post && post.userId !== userId) {
          await NotificationService.sendNotification({
            userId: post.userId,
            title: 'Nueva respuesta en el foro',
            body: `${reply.user.name || 'Alguien'} respondió a tu publicación "${post.title}".`,
            type: 'system',
            referenceId: postId,
            referenceType: 'forum_post',
            link: '/forum/posts/' + postId
          });
        }
      } catch (err) {
        console.error('Error enviando push por forum reply', err);
      }

      res.status(201).json(reply);
    } catch (error) {
      next(error);
    }
  }

  // GET /forum/posts/:id/replies
  static async getReplies(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.id as string;
      const userId = (req as any).user?.id;
      const includeClause: any = {
        user: { select: { id: true, name: true, role: true, avatarUrl: true } }
      };

      if (userId) {
        includeClause.votes = {
          where: { userId, value: 1 },
          select: { id: true }
        };
      }

      const repliesRaw = await prisma.forumReply.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        include: includeClause
      });

      const replies = repliesRaw.map((r: any) => {
        const { votes, ...rest } = r;
        return {
          ...rest,
          likedByMe: votes ? votes.length > 0 : false
        };
      });

      res.status(200).json(replies);
    } catch (error) {
      next(error);
    }
  }

  // POST /forum/posts/:id/like
  static async toggleLikePost(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const postId = req.params.id as string;

      // Buscar si ya existe el voto
      const existingVote = await prisma.forumVote.findUnique({
        where: { userId_postId: { userId, postId } }
      });

      let increment = 0;

      if (existingVote && existingVote.value === 1) {
        // Ya le dio like, se lo quitamos
        await prisma.forumVote.delete({
          where: { userId_postId: { userId, postId } }
        });
        increment = -1;
      } else if (existingVote && existingVote.value === -1) {
        // Tenía dislike, lo cambiamos a like
        await prisma.forumVote.update({
          where: { userId_postId: { userId, postId } },
          data: { value: 1 }
        });
        increment = 2; // de -1 a +1 = +2
      } else {
        // No tenía voto, lo creamos
        await prisma.forumVote.create({
          data: { userId, postId, value: 1 }
        });
        increment = 1;
      }

      const post = await prisma.forumPost.update({
        where: { id: postId },
        data: { upvotes: { increment } },
        select: { upvotes: true }
      });

      res.status(200).json({ message: 'Like procesado', totalVotes: post.upvotes });
    } catch (error) {
      next(error);
    }
  }



  // POST /forum/replies/:id/like
  static async toggleLikeReply(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const replyId = req.params.id as string;

      const existingVote = await prisma.forumVote.findUnique({
        where: { userId_replyId: { userId, replyId } }
      });

      let increment = 0;

      if (existingVote && existingVote.value === 1) {
        await prisma.forumVote.delete({
          where: { userId_replyId: { userId, replyId } }
        });
        increment = -1;
      } else if (existingVote && existingVote.value === -1) {
        await prisma.forumVote.update({
          where: { userId_replyId: { userId, replyId } },
          data: { value: 1 }
        });
        increment = 2;
      } else {
        await prisma.forumVote.create({
          data: { userId, replyId, value: 1 }
        });
        increment = 1;
      }

      const reply = await prisma.forumReply.update({
        where: { id: replyId },
        data: { upvotes: { increment } },
        select: { upvotes: true }
      });
      res.status(200).json({ message: 'Like procesado', totalVotes: reply.upvotes });
    } catch (error) {
      next(error);
    }
  }

  // Función para mapear motivos en español al enum de Prisma FlagReason
  static mapReason(reason: string): any {
    const normalized = reason.toLowerCase();
    if (normalized.includes('ofensivo') || normalized.includes('inapropiado')) return 'inappropriate';
    if (normalized.includes('spam') || normalized.includes('publicidad')) return 'spam';
    if (normalized.includes('falsa') || normalized.includes('internet') || normalized.includes('no hay')) return 'fake';
    return 'other';
  }

  // POST /forum/posts/:id/report
  static async reportPost(req: Request, res: Response, next: NextFunction) {
    try {
      const postId = req.params.id as string;
      const { reason, notes, details } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Debe proporcionar una razón para el reporte' });
        return;
      }

      const post = await prisma.forumPost.findUnique({ where: { id: postId } });
      if (!post) {
        res.status(404).json({ error: 'Post no encontrado' });
        return;
      }

      const mappedReason = ForumController.mapReason(reason);

      const flag = await prisma.forumPostFlag.create({
        data: {
          postId,
          flaggedBy: userId,
          reason: mappedReason,
          notes: details || notes || reason,
          status: 'open'
        }
      });
      
      res.status(201).json({ message: 'Publicación reportada', flag });
    } catch (error) {
      next(error);
    }
  }

  // POST /forum/replies/:id/report
  static async reportReply(req: Request, res: Response, next: NextFunction) {
    try {
      const replyId = req.params.id as string;
      const { reason, notes, details } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Debe proporcionar una razón para el reporte' });
        return;
      }

      const reply = await prisma.forumReply.findUnique({ where: { id: replyId } });
      if (!reply) {
        res.status(404).json({ error: 'Respuesta no encontrada' });
        return;
      }

      const mappedReason = ForumController.mapReason(reason);

      const flag = await prisma.forumReplyFlag.create({
        data: {
          replyId,
          flaggedBy: userId,
          reason: mappedReason,
          notes: details || notes || reason,
          status: 'open'
        }
      });

      res.status(201).json({ message: 'Respuesta reportada', flag });
    } catch (error) {
      next(error);
    }
  }
}
