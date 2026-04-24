import { Router, type IRouter } from "express";
import { eq, sql, lt, and, isNotNull } from "drizzle-orm";
import { db, usersTable, notificationsTable, messagesTable, tasksTable, projectsTable, goalsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/dashboard", async (req, res): Promise<void> => {
  const [totalUsers] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(usersTable);
  const [onlineUsers] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(usersTable).where(eq(usersTable.status, "online"));
  const [totalProjects] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(projectsTable);
  const [activeProjects] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(projectsTable).where(eq(projectsTable.status, "active"));
  const [totalTasks] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable);
  const [completedTasks] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "done"));
  const [overdueTasks] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(
    and(isNotNull(tasksTable.dueDate), lt(tasksTable.dueDate, new Date()), sql`${tasksTable.status} != 'done'`)
  );
  const [totalGoals] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(goalsTable);
  const [goalsOnTrack] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(goalsTable).where(eq(goalsTable.status, "on_track"));
  const [unreadNotifs] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(notificationsTable).where(eq(notificationsTable.isRead, false));
  const [msgsToday] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(messagesTable).where(sql`DATE(created_at) = CURRENT_DATE`);

  res.json({
    totalUsers: totalUsers?.count ?? 0,
    onlineUsers: onlineUsers?.count ?? 0,
    totalProjects: totalProjects?.count ?? 0,
    activeProjects: activeProjects?.count ?? 0,
    totalTasks: totalTasks?.count ?? 0,
    completedTasks: completedTasks?.count ?? 0,
    overdueTasks: overdueTasks?.count ?? 0,
    totalGoals: totalGoals?.count ?? 0,
    goalsOnTrack: goalsOnTrack?.count ?? 0,
    unreadNotifications: unreadNotifs?.count ?? 0,
    messagesToday: msgsToday?.count ?? 0,
  });
});

router.get("/stats/activity", async (_req, res): Promise<void> => {
  const msgs = await db
    .select({
      id: messagesTable.id,
      type: sql<string>`'message'`,
      description: sql<string>`CONCAT('sent a message in a channel')`,
      actorName: usersTable.displayName,
      actorAvatar: usersTable.avatarUrl,
      targetId: messagesTable.channelId,
      targetName: sql<string | null>`NULL`,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .orderBy(sql`${messagesTable.createdAt} DESC`)
    .limit(10);

  const taskActs = await db
    .select({
      id: tasksTable.id,
      type: sql<string>`'task_created'`,
      description: sql<string>`CONCAT('created task: ', ${tasksTable.title})`,
      actorName: usersTable.displayName,
      actorAvatar: usersTable.avatarUrl,
      targetId: tasksTable.id,
      targetName: tasksTable.title,
      createdAt: tasksTable.createdAt,
    })
    .from(tasksTable)
    .innerJoin(usersTable, eq(tasksTable.creatorId, usersTable.id))
    .orderBy(sql`${tasksTable.createdAt} DESC`)
    .limit(10);

  const all = [...msgs, ...taskActs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
  res.json(all);
});

router.get("/stats/my-tasks", async (req, res): Promise<void> => {
  const userId = parseInt(req.query.userId as string);
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));
  const enriched = await Promise.all(tasks.map(async (t: typeof tasksTable.$inferSelect) => {
    const creator = await db.select().from(usersTable).where(eq(usersTable.id, t.creatorId)).limit(1);
    const project = t.projectId ? await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, t.projectId)).limit(1) : [];
    return {
      ...t,
      projectName: project[0]?.name ?? null,
      assigneeName: null,
      assigneeAvatar: null,
      creatorName: creator[0]?.displayName ?? "Unknown",
      subtaskCount: 0,
      completedSubtaskCount: 0,
      commentCount: 0,
    };
  }));

  const now = new Date();
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  res.json({
    todo: enriched.filter(t => t.status === "todo").length,
    inProgress: enriched.filter(t => t.status === "in_progress").length,
    inReview: enriched.filter(t => t.status === "in_review").length,
    done: enriched.filter(t => t.status === "done").length,
    overdue: enriched.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "done").length,
    dueToday: enriched.filter(t => t.dueDate && new Date(t.dueDate) <= todayEnd && new Date(t.dueDate) >= new Date(now.setHours(0, 0, 0, 0)) && t.status !== "done").length,
    recentTasks: enriched.slice(0, 5),
  });
});

export default router;
