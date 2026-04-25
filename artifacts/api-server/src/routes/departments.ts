import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, departmentsTable, usersTable } from "@workspace/db";
import {
  CreateDepartmentBody,
  GetDepartmentParams,
  UpdateDepartmentParams,
  DeleteDepartmentParams,
  GetDepartmentMembersParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/departments", async (_req, res): Promise<void> => {
  const departments = await db.select({
    id: departmentsTable.id,
    name: departmentsTable.name,
    description: departmentsTable.description,
    color: departmentsTable.color,
    createdAt: departmentsTable.createdAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM users WHERE department_id = ${departmentsTable.id})::int`,
  }).from(departmentsTable);

  const users = await db.select({
    id: usersTable.id,
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
    role: usersTable.role,
    status: usersTable.status,
    departmentId: usersTable.departmentId,
  }).from(usersTable);

  const deptWithMembers = departments.map((d: typeof departments[number]) => ({
    ...d,
    members: users.filter((u: typeof users[number]) => u.departmentId === d.id),
  }));

  res.json(deptWithMembers);
});

router.post("/departments", async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [dept] = await db.insert(departmentsTable).values(parsed.data).returning();
  res.status(201).json({ ...dept, memberCount: 0, members: [] });
});

router.get("/departments/:id", async (req, res): Promise<void> => {
  const params = GetDepartmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [dept] = await db.select({
    id: departmentsTable.id,
    name: departmentsTable.name,
    description: departmentsTable.description,
    color: departmentsTable.color,
    createdAt: departmentsTable.createdAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM users WHERE department_id = ${departmentsTable.id})::int`,
  }).from(departmentsTable).where(eq(departmentsTable.id, params.data.id));
  if (!dept) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(dept);
});

router.patch("/departments/:id", async (req, res): Promise<void> => {
  const params = UpdateDepartmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(departmentsTable).set(parsed.data).where(eq(departmentsTable.id, params.data.id));
  const [dept] = await db.select({
    id: departmentsTable.id,
    name: departmentsTable.name,
    description: departmentsTable.description,
    color: departmentsTable.color,
    createdAt: departmentsTable.createdAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM users WHERE department_id = ${departmentsTable.id})::int`,
  }).from(departmentsTable).where(eq(departmentsTable.id, params.data.id));
  if (!dept) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(dept);
});

router.delete("/departments/:id", async (req, res): Promise<void> => {
  const params = DeleteDepartmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(departmentsTable).where(eq(departmentsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/departments/:id/members", async (req, res): Promise<void> => {
  const params = GetDepartmentMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    displayName: usersTable.displayName,
    email: usersTable.email,
    avatarUrl: usersTable.avatarUrl,
    role: usersTable.role,
    status: usersTable.status,
    departmentId: usersTable.departmentId,
    departmentName: departmentsTable.name,
    createdAt: usersTable.createdAt,
  })
    .from(usersTable)
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .where(eq(usersTable.departmentId, params.data.id));
  res.json(members);
});

export default router;
