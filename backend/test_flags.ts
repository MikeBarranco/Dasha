import { prisma } from './src/config/db';
async function test() {
  try {
    const postFlags = await prisma.forumPostFlag.findMany({ include: { post: { include: { user: true } }, flagger: true } });
    console.log('postFlags:', postFlags.length);
    const replyFlags = await prisma.forumReplyFlag.findMany({ include: { reply: { include: { user: true } }, flagger: true } });
    console.log('replyFlags:', replyFlags.length);
    const reportFlags = await prisma.reportFlag.findMany({ include: { report: { include: { user: true } }, flagger: true } });
    console.log('reportFlags:', reportFlags.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
