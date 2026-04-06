import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, spacesTable, usersTable, projectsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/spaces", async (_req, res): Promise<void> => {
  const spaces = await db
    .select({
      id: spacesTable.id,
      name: spacesTable.name,
      description: spacesTable.description,
      color: spacesTable.color,
      icon: spacesTable.icon,
      ownerId: spacesTable.ownerId,
      ownerName: usersTable.displayName,
      createdAt: spacesTable.createdAt,
    })
    .from(spacesTable)
    .leftJoin(usersTable, eq(spacesTable.ownerId, usersTable.id));

  const result = await Promise.all(
    spaces.map(async (s) => {
      const [projectCount] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(projectsTable)
        .where(eq(projectsTable.spaceId, s.id));
      return { ...s, ownerName: s.ownerName ?? "Unknown", projectCount: projectCount?.count ?? 0, memberCount: 0 };
    })
  );
  res.json(result);
});

router.post("/spaces", async (req, res): Promise<void> => {
  const { name, description, color = "#6366f1", icon = "📁", ownerId } = req.body;
  const [space] = await db
    .insert(spacesTable)
    .values({ name, description, color, icon, ownerId })
    .returning();
  const owner = await db.select().from(usersTable).where(eq(usersTable.id, ownerId)).limit(1);
  res.status(201).json({ ...space, ownerName: owner[0]?.displayName ?? "Unknown", projectCount: 0, memberCount: 0 });
});

router.get("/spaces/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [space] = await db
    .select({
      id: spacesTable.id,
      name: spacesTable.name,
      description: spacesTable.description,
      color: spacesTable.color,
      icon: spacesTable.icon,
      ownerId: spacesTable.ownerId,
      ownerName: usersTable.displayName,
      createdAt: spacesTable.createdAt,
    })
    .from(spacesTable)
    .leftJoin(usersTable, eq(spacesTable.ownerId, usersTable.id))
    .where(eq(spacesTable.id, id));
  if (!space) { res.status(404).json({ error: "Not found" }); return; }
  const [projectCount] = await db.select({ count: sql<number>`COUNT(*)::int` }).from(projectsTable).where(eq(projectsTable.spaceId, id));
  res.json({ ...space, ownerName: space.ownerName ?? "Unknown", projectCount: projectCount?.count ?? 0, memberCount: 0 });
});

router.patch("/spaces/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, description, color, icon } = req.body;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (color !== undefined) update.color = color;
  if (icon !== undefined) update.icon = icon;
  const [space] = await db.update(spacesTable).set(update).where(eq(spacesTable.id, id)).returning();
  if (!space) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...space, ownerName: "", projectCount: 0, memberCount: 0 });
});

router.delete("/spaces/:id", async (req, res): Promise<void> => {
  await db.delete(spacesTable).where(eq(spacesTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
