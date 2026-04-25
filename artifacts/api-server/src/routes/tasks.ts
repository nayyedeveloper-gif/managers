import { Router, type IRouter } from "express";
import { eq, sql, and, lt, isNotNull } from "drizzle-orm";
import { db, tasksTable, taskCommentsTable, taskWatchersTable, usersTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

async function enrichTask(t: typeof tasksTable.$inferSelect) {
  const assignee = t.assigneeId ? await db.select().from(usersTable).where(eq(usersTable.id, t.assigneeId)).limit(1) : [];
  const creator = await db.select().from(usersTable).where(eq(usersTable.id, t.creatorId)).limit(1);
  const project = t.projectId ? await db.select({ name: projectsTable.name }).from(projectsTable).where(eq(projectsTable.id, t.projectId)).limit(1) : [];
  const [subCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(eq(tasksTable.parentTaskId, t.id));
  const [completedSub] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(and(eq(tasksTable.parentTaskId, t.id), eq(tasksTable.status, "done")));
  const [commentCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(taskCommentsTable).where(eq(taskCommentsTable.taskId, t.id));

  return {
    ...t,
    projectName: project[0]?.name ?? null,
    assigneeName: assignee[0]?.displayName ?? null,
    assigneeAvatar: assignee[0]?.avatarUrl ?? null,
    creatorName: creator[0]?.displayName ?? "Unknown",
    subtaskCount: subCount?.count ?? 0,
    completedSubtaskCount: completedSub?.count ?? 0,
    commentCount: commentCount?.count ?? 0,
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const { assigneeId, projectId, status, priority, dueToday, overdue } = req.query;
  const conditions = [];
  if (assigneeId) conditions.push(eq(tasksTable.assigneeId, parseInt(assigneeId as string)));
  if (projectId) conditions.push(eq(tasksTable.projectId, parseInt(projectId as string)));
  if (status) conditions.push(eq(tasksTable.status, status as string));
  if (priority) conditions.push(eq(tasksTable.priority, priority as string));
  if (overdue === "true") {
    conditions.push(isNotNull(tasksTable.dueDate));
    conditions.push(lt(tasksTable.dueDate, new Date()));
  }
  const tasks = conditions.length > 0
    ? await db.select().from(tasksTable).where(and(...conditions)).orderBy(sql`${tasksTable.createdAt} DESC`)
    : await db.select().from(tasksTable).orderBy(sql`${tasksTable.createdAt} DESC`);
  res.json(await Promise.all(tasks.map(enrichTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const { title, description, status = "todo", priority = "medium", projectId, parentTaskId, assigneeId, creatorId, dueDate, startDate, estimatedHours, tags = [] } = req.body;
  const [task] = await db
    .insert(tasksTable)
    .values({ title, description, status, priority, projectId, parentTaskId, assigneeId, creatorId, dueDate: dueDate ? new Date(dueDate) : null, startDate: startDate ? new Date(startDate) : null, estimatedHours, tags })
    .returning();
  res.status(201).json(await enrichTask(task));
});

router.get("/tasks/my-tasks", async (req, res): Promise<void> => {
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

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichTask(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { title, description, status, priority, assigneeId, dueDate, startDate, estimatedHours, actualHours, tags } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (status !== undefined) update.status = status;
  if (priority !== undefined) update.priority = priority;
  if (assigneeId !== undefined) update.assigneeId = assigneeId;
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
  if (startDate !== undefined) update.startDate = startDate ? new Date(startDate) : null;
  if (estimatedHours !== undefined) update.estimatedHours = estimatedHours;
  if (actualHours !== undefined) update.actualHours = actualHours;
  if (tags !== undefined) update.tags = tags;
  const [task] = await db.update(tasksTable).set(update).where(eq(tasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichTask(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  await db.delete(tasksTable).where(eq(tasksTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

router.get("/tasks/:id/subtasks", async (req, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.parentTaskId, parseInt(req.params.id)));
  res.json(await Promise.all(tasks.map(enrichTask)));
});

router.get("/tasks/:id/comments", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  const comments = await db
    .select({
      id: taskCommentsTable.id,
      taskId: taskCommentsTable.taskId,
      authorId: taskCommentsTable.authorId,
      authorName: usersTable.displayName,
      authorAvatar: usersTable.avatarUrl,
      content: taskCommentsTable.content,
      createdAt: taskCommentsTable.createdAt,
      updatedAt: taskCommentsTable.updatedAt,
    })
    .from(taskCommentsTable)
    .leftJoin(usersTable, eq(taskCommentsTable.authorId, usersTable.id))
    .where(eq(taskCommentsTable.taskId, taskId))
    .orderBy(sql`${taskCommentsTable.createdAt} ASC`);
  res.json(comments.map((c: (typeof comments)[number]) => ({ ...c, authorName: c.authorName ?? "Unknown" })));
});

router.post("/tasks/:id/comments", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  const { content, authorId } = req.body;
  const [comment] = await db
    .insert(taskCommentsTable)
    .values({ taskId, authorId, content })
    .returning();
  const author = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  res.status(201).json({ ...comment, authorName: author[0]?.displayName ?? "Unknown", authorAvatar: author[0]?.avatarUrl ?? null });
});

router.post("/tasks/:id/watchers", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.id);
  const { userId } = req.body;
  await db.insert(taskWatchersTable).values({ taskId, userId }).onConflictDoNothing();
  res.json({ success: true });
});

export default router;
