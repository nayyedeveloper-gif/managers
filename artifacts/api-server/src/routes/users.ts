import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, departmentsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import {
  CreateUserBody,
  UpdateUserBody,
  UpdateUserParams,
  GetUserParams,
  LoginUserBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getUserWithDept(id: number) {
  const user = await db.select({
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
    .where(eq(usersTable.id, id));
  return user[0] ?? null;
}

router.get("/users", async (req, res): Promise<void> => {
  const users = await db.select({
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
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id));
  res.json(users);
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
  const full = await getUserWithDept(user.id);
  res.status(201).json(full);
});

router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  await db.update(usersTable).set({ status: "online" }).where(eq(usersTable.id, user.id));
  (req.session as Record<string, unknown>).userId = user.id;
  const full = await getUserWithDept(user.id);
  res.json(full);
});

router.post("/users/logout", async (req, res): Promise<void> => {
  const userId = (req.session as Record<string, unknown>).userId as number | undefined;
  if (userId) {
    await db.update(usersTable).set({ status: "offline" }).where(eq(usersTable.id, userId));
  }
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get("/users/me", async (req, res): Promise<void> => {
  const userId = (req.session as Record<string, unknown>).userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await getUserWithDept(userId);
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(user);
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = await getUserWithDept(params.data.id);
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(user);
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, params.data.id));
  const user = await getUserWithDept(params.data.id);
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(user);
});

export default router;
