import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable, departmentsTable, channelsTable, messagesTable, filesTable, notificationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/dashboard", async (req, res): Promise<void> => {
  const userId = ((req.session as Record<string, unknown>).userId as number) ?? 1;

  const [totalUsers] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(usersTable);
  const [onlineUsers] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(usersTable).where(eq(usersTable.status, "online"));
  const [totalDepts] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(departmentsTable);
  const [totalChannels] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(channelsTable);
  const [totalMsgs] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(messagesTable);
  const [msgsToday] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(messagesTable).where(sql`DATE(created_at) = CURRENT_DATE`);
  const [filesShared] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(filesTable);
  const [unreadNotifs] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(notificationsTable).where(eq(notificationsTable.isRead, false));

  res.json({
    totalUsers: totalUsers?.count ?? 0,
    onlineUsers: onlineUsers?.count ?? 0,
    totalDepartments: totalDepts?.count ?? 0,
    totalChannels: totalChannels?.count ?? 0,
    totalMessages: totalMsgs?.count ?? 0,
    messagesToday: msgsToday?.count ?? 0,
    filesShared: filesShared?.count ?? 0,
    unreadNotifications: unreadNotifs?.count ?? 0,
  });
});

router.get("/stats/activity", async (_req, res): Promise<void> => {
  const msgs = await db.select({
    id: messagesTable.id,
    type: sql<string>`'message'`,
    description: sql<string>`CONCAT('sent a message: ', LEFT(${messagesTable.content}, 60))`,
    actorName: usersTable.displayName,
    actorAvatar: usersTable.avatarUrl,
    channelId: messagesTable.channelId,
    channelName: sql<string | null>`(SELECT name FROM channels WHERE id = ${messagesTable.channelId})`,
    createdAt: messagesTable.createdAt,
  })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .orderBy(sql`${messagesTable.createdAt} DESC`)
    .limit(20);

  res.json(msgs);
});

export default router;
