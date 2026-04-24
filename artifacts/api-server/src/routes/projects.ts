import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, projectsTable, usersTable, tasksTable, spacesTable, departmentsTable, taskCommentsTable } from "@workspace/db";

const router: IRouter = Router();

async function enrichProject(p: typeof projectsTable.$inferSelect) {
  const owner = await db.select().from(usersTable).where(eq(usersTable.id, p.ownerId)).limit(1);
  const [taskCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(eq(tasksTable.projectId, p.id));
  const [completedCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(and(eq(tasksTable.projectId, p.id), eq(tasksTable.status, "done")));
  const total = taskCount?.count ?? 0;
  const completed = completedCount?.count ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  let spaceName: string | null = null;
  if (p.spaceId) {
    const [s] = await db.select({ name: spacesTable.name }).from(spacesTable).where(eq(spacesTable.id, p.spaceId));
    spaceName = s?.name ?? null;
  }

  let departmentName: string | null = null;
  if (p.departmentId) {
    const [d] = await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, p.departmentId));
    departmentName = d?.name ?? null;
  }

  return {
    ...p,
    ownerName: owner[0]?.displayName ?? "Unknown",
    spaceName,
    departmentName,
    taskCount: total,
    completedTaskCount: completed,
    progress,
  };
}

router.get("/projects", async (req, res): Promise<void> => {
  const { spaceId, departmentId, status } = req.query;
  let query = db.select().from(projectsTable);
  const conditions = [];
  if (spaceId) conditions.push(eq(projectsTable.spaceId, parseInt(spaceId as string)));
  if (departmentId) conditions.push(eq(projectsTable.departmentId, parseInt(departmentId as string)));
  if (status) conditions.push(eq(projectsTable.status, status as string));
  if (conditions.length > 0) {
    const projects = await query.where(and(...conditions));
    res.json(await Promise.all(projects.map(enrichProject)));
  } else {
    const projects = await query;
    res.json(await Promise.all(projects.map(enrichProject)));
  }
});

router.post("/projects", async (req, res): Promise<void> => {
  const { name, description, status = "active", priority = "medium", color = "#6366f1", spaceId, departmentId, ownerId, startDate, dueDate } = req.body;
  const [project] = await db
    .insert(projectsTable)
    .values({ name, description, status, priority, color, spaceId, departmentId, ownerId, startDate, dueDate })
    .returning();
  res.status(201).json(await enrichProject(project));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, parseInt(req.params.id)));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichProject(project));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, description, status, priority, color, startDate, dueDate } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (status !== undefined) update.status = status;
  if (priority !== undefined) update.priority = priority;
  if (color !== undefined) update.color = color;
  if (startDate !== undefined) update.startDate = startDate;
  if (dueDate !== undefined) update.dueDate = dueDate;
  const [project] = await db.update(projectsTable).set(update).where(eq(projectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichProject(project));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  await db.delete(projectsTable).where(eq(projectsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

router.get("/projects/:id/tasks", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id);
  const { status, assigneeId, priority } = req.query;
  const conditions: ReturnType<typeof eq>[] = [eq(tasksTable.projectId, projectId)];
  if (status) conditions.push(eq(tasksTable.status, status as string));
  if (assigneeId) conditions.push(eq(tasksTable.assigneeId, parseInt(assigneeId as string)));
  if (priority) conditions.push(eq(tasksTable.priority, priority as string));
  const tasks = await db.select().from(tasksTable).where(and(...conditions));
  const enriched = await Promise.all(tasks.map(async (t: typeof tasksTable.$inferSelect) => {
    const assignee = t.assigneeId ? await db.select().from(usersTable).where(eq(usersTable.id, t.assigneeId)).limit(1) : [];
    const creator = await db.select().from(usersTable).where(eq(usersTable.id, t.creatorId)).limit(1);
    const [subCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(eq(tasksTable.parentTaskId, t.id));
    const [completedSub] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(tasksTable).where(and(eq(tasksTable.parentTaskId, t.id), eq(tasksTable.status, "done")));
    const [commentCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(taskCommentsTable).where(eq(taskCommentsTable.taskId, t.id));
    return {
      ...t,
      projectName: null,
      assigneeName: assignee[0]?.displayName ?? null,
      assigneeAvatar: assignee[0]?.avatarUrl ?? null,
      creatorName: creator[0]?.displayName ?? "Unknown",
      subtaskCount: subCount?.count ?? 0,
      completedSubtaskCount: completedSub?.count ?? 0,
      commentCount: commentCount?.count ?? 0,
    };
  }));
  res.json(enriched);
});

router.get("/projects/:id/stats", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id);
  const allTasks = await db.select().from(tasksTable).where(eq(tasksTable.projectId, projectId));
  const total = allTasks.length;
  const completed = allTasks.filter((t: typeof tasksTable.$inferSelect) => t.status === "done").length;
  const inProgress = allTasks.filter((t: typeof tasksTable.$inferSelect) => t.status === "in_progress").length;
  const todo = allTasks.filter((t: typeof tasksTable.$inferSelect) => t.status === "todo").length;
  const overdue = allTasks.filter((t: typeof tasksTable.$inferSelect) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length;
  const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
  allTasks.forEach((t: typeof tasksTable.$inferSelect) => { (byPriority as Record<string, number>)[t.priority] = ((byPriority as Record<string, number>)[t.priority] ?? 0) + 1; });

  const assigneeMap = new Map<number, { userId: number; name: string; count: number }>();
  for (const t of allTasks) {
    if (t.assigneeId) {
      if (!assigneeMap.has(t.assigneeId)) {
        const u = await db.select().from(usersTable).where(eq(usersTable.id, t.assigneeId)).limit(1);
        assigneeMap.set(t.assigneeId, { userId: t.assigneeId, name: u[0]?.displayName ?? "Unknown", count: 0 });
      }
      const entry = assigneeMap.get(t.assigneeId)!;
      entry.count++;
    }
  }

  res.json({
    taskCount: total,
    completedCount: completed,
    inProgressCount: inProgress,
    todoCount: todo,
    overdueCount: overdue,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    byPriority,
    byAssignee: Array.from(assigneeMap.values()),
  });
});

export default router;
