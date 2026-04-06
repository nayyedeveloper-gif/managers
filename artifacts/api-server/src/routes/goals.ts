import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, goalsTable, milestonesTable, usersTable } from "@workspace/db";

const router: IRouter = Router();

async function enrichGoal(g: typeof goalsTable.$inferSelect) {
  const owner = await db.select().from(usersTable).where(eq(usersTable.id, g.ownerId)).limit(1);
  const [mCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(milestonesTable).where(eq(milestonesTable.goalId, g.id));
  const [completedM] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(milestonesTable).where(and(eq(milestonesTable.goalId, g.id), eq(milestonesTable.isCompleted, true)));
  const progress = g.targetValue > 0 ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)) : 0;
  return {
    ...g,
    ownerName: owner[0]?.displayName ?? "Unknown",
    ownerAvatar: owner[0]?.avatarUrl ?? null,
    progress,
    milestoneCount: mCount?.count ?? 0,
    completedMilestoneCount: completedM?.count ?? 0,
  };
}

router.get("/goals", async (req, res): Promise<void> => {
  const { ownerId, status } = req.query;
  const conditions = [];
  if (ownerId) conditions.push(eq(goalsTable.ownerId, parseInt(ownerId as string)));
  if (status) conditions.push(eq(goalsTable.status, status as string));
  const goals = conditions.length > 0
    ? await db.select().from(goalsTable).where(and(...conditions)).orderBy(sql`${goalsTable.createdAt} DESC`)
    : await db.select().from(goalsTable).orderBy(sql`${goalsTable.createdAt} DESC`);
  res.json(await Promise.all(goals.map(enrichGoal)));
});

router.post("/goals", async (req, res): Promise<void> => {
  const { title, description, status = "not_started", ownerId, targetValue = 100, currentValue = 0, unit = "%", dueDate } = req.body;
  const [goal] = await db
    .insert(goalsTable)
    .values({ title, description, status, ownerId, targetValue, currentValue, unit, dueDate: dueDate ? new Date(dueDate) : null })
    .returning();
  res.status(201).json(await enrichGoal(goal));
});

router.get("/goals/:id", async (req, res): Promise<void> => {
  const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, parseInt(req.params.id)));
  if (!goal) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichGoal(goal));
});

router.patch("/goals/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { title, description, status, targetValue, currentValue, unit, dueDate } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (description !== undefined) update.description = description;
  if (status !== undefined) update.status = status;
  if (targetValue !== undefined) update.targetValue = targetValue;
  if (currentValue !== undefined) update.currentValue = currentValue;
  if (unit !== undefined) update.unit = unit;
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
  const [goal] = await db.update(goalsTable).set(update).where(eq(goalsTable.id, id)).returning();
  if (!goal) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichGoal(goal));
});

router.delete("/goals/:id", async (req, res): Promise<void> => {
  await db.delete(goalsTable).where(eq(goalsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

router.get("/goals/:id/milestones", async (req, res): Promise<void> => {
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.goalId, parseInt(req.params.id)))
    .orderBy(sql`${milestonesTable.targetValue} ASC`);
  res.json(milestones);
});

router.post("/goals/:id/milestones", async (req, res): Promise<void> => {
  const goalId = parseInt(req.params.id);
  const { title, targetValue, dueDate } = req.body;
  const [milestone] = await db
    .insert(milestonesTable)
    .values({ goalId, title, targetValue, dueDate: dueDate ? new Date(dueDate) : null })
    .returning();
  res.status(201).json(milestone);
});

router.patch("/goals/:id/milestones/:milestoneId", async (req, res): Promise<void> => {
  const milestoneId = parseInt(req.params.milestoneId);
  const { title, targetValue, isCompleted, dueDate } = req.body;
  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title;
  if (targetValue !== undefined) update.targetValue = targetValue;
  if (isCompleted !== undefined) update.isCompleted = isCompleted;
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
  const [milestone] = await db.update(milestonesTable).set(update).where(eq(milestonesTable.id, milestoneId)).returning();
  if (!milestone) { res.status(404).json({ error: "Not found" }); return; }
  res.json(milestone);
});

export default router;
