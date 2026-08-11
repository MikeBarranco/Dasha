const fs = require('fs');
const file = 'src/controllers/admin.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /static async deleteForumPost[\s\S]*?res\.status\(200\)\.json\(\{ message: 'Post del foro eliminado correctamente' \}\);/;

const replacement = `static async deleteForumPost(req: Request, res: Response, next: NextFunction) {
      try {
        const id = req.params.id as string;
        
        await prisma.$transaction(async (tx) => {
          const post = await tx.forumPost.findUnique({ where: { id } });
          if (post) {
            // Eliminar reportes (flags)
            await tx.forumPostFlag.deleteMany({ where: { postId: id } });
            
            // Eliminar votos del post y de las respuestas de este post
            await tx.forumVote.deleteMany({
              where: {
                OR: [
                  { postId: id },
                  { reply: { postId: id } }
                ]
              }
            });
            
            // Eliminar flags de las respuestas de este post
            const replies = await tx.forumReply.findMany({ where: { postId: id } });
            if (replies.length > 0) {
              await tx.forumReplyFlag.deleteMany({
                where: { replyId: { in: replies.map(r => r.id) } }
              });
            }
            
            // Eliminar respuestas
            await tx.forumReply.deleteMany({ where: { postId: id } });
            // Eliminar el post
            await tx.forumPost.delete({ where: { id } });
          } else {
            // Como el frontend unifica los reportes, puede ser un comentario
            const reply = await tx.forumReply.findUnique({ where: { id } });
            if (reply) {
              await tx.forumReplyFlag.deleteMany({ where: { replyId: id } });
              await tx.forumVote.deleteMany({ where: { replyId: id } });
              await tx.forumReply.delete({ where: { id } });
            } else {
              throw new Error("Registro no encontrado");
            }
          }
        });
        
        res.status(200).json({ message: 'Post del foro eliminado correctamente' });`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log('Update successful');
} else {
    console.log('Regex not matched');
}
