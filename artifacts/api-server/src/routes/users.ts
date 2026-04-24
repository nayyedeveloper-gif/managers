import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

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
    emailVerified: usersTable.emailVerified,
    googleId: usersTable.googleId,
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

  try {
    const { password, ...rest } = parsed.data;

    const [existingUser] = await db
      .select({ id: usersTable.id, username: usersTable.username, email: usersTable.email })
      .from(usersTable)
      .where(or(eq(usersTable.username, rest.username), eq(usersTable.email, rest.email)));

    if (existingUser) {
      if (existingUser.username === rest.username) {
        res.status(409).json({ error: "Username is already taken" });
        return;
      }

      if (existingUser.email === rest.email) {
        res.status(409).json({ error: "Email is already registered" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ ...rest, passwordHash }).returning();
    const full = await getUserWithDept(user.id);
    res.status(201).json(full);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error, "Could not create account") });
  }
});

router.post("/users/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const identifier = parsed.data.username.trim();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.username, identifier), eq(usersTable.email, identifier)));

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.passwordHash) {
      res.status(401).json({ error: "This account uses Google login. Please sign in with Google." });
      return;
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    await db.update(usersTable).set({ status: "online" }).where(eq(usersTable.id, user.id));
    (req.session as unknown as Record<string, unknown>).userId = user.id;
    const full = await getUserWithDept(user.id);
    res.json(full);
  } catch (error) {
    res.status(500).json({ error: getErrorMessage(error, "Login failed") });
  }
});

router.post("/users/logout", async (req, res): Promise<void> => {
  const userId = (req.session as unknown as Record<string, unknown>).userId as number | undefined;
  if (userId) {
    await db.update(usersTable).set({ status: "offline" }).where(eq(usersTable.id, userId));
  }
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get("/users/me", async (req, res): Promise<void> => {
  const userId = (req.session as unknown as Record<string, unknown>).userId as number | undefined;
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

// Admin-only: update another user's role or status
router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const sessionUserId = (req.session as unknown as Record<string, unknown>).userId as number | undefined;
  if (!sessionUserId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [requester] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sessionUserId));
  if (!requester || requester.role !== "admin") { res.status(403).json({ error: "Admin access required" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  if (id === sessionUserId) { res.status(400).json({ error: "Cannot modify your own admin role" }); return; }

  const updates: Record<string, string> = {};
  if (req.body.role) updates.role = req.body.role;
  if (req.body.status) updates.status = req.body.status;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No updates" }); return; }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, id));
  const user = await getUserWithDept(id);
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
