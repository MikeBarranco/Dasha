const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user');

  const post = await prisma.forumPost.create({
    data: {
      userId: user.id,
      title: 'Test',
      content: 'Test',
      category: 'general'
    }
  });

  const reply = await prisma.forumReply.create({
    data: {
      postId: post.id,
      userId: user.id,
      content: 'Reply test'
    }
  });

  await prisma.forumPostFlag.create({
    data: {
      postId: post.id,
      flaggedBy: user.id,
      reason: 'spam'
    }
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.forumPostFlag.deleteMany({ where: { postId: post.id } });
      await tx.forumVote.deleteMany({
        where: {
          OR: [
            { postId: post.id },
            { reply: { postId: post.id } }
          ]
        }
      });
      const replies = await tx.forumReply.findMany({ where: { postId: post.id } });
      if (replies.length > 0) {
        await tx.forumReplyFlag.deleteMany({
          where: { replyId: { in: replies.map(r => r.id) } }
        });
      }
      await tx.forumReply.deleteMany({ where: { postId: post.id } });
      await tx.forumPost.delete({ where: { id: post.id } });
    });
    console.log('Success');
  } catch (e) {
    console.error(e);
  }
}
run();
