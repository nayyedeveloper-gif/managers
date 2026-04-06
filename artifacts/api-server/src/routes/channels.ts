import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, channelsTable, channelMembersTable, usersTable, departmentsTable } from "@workspace/db";
import {
  CreateChannelBody,
  GetChannelParams,
  UpdateChannelParams,
  DeleteChannelParams,
  GetChannelMembersParams,
  AddChannelMemberParams,
  AddChannelMemberBody,
  ListChannelsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getChannelFull(id: number, userId?: number) {
  const [ch] = await db.select({
    id: channelsTable.id,
    name: channelsTable.name,
    description: channelsTable.description,
    type: channelsTable.type,
    departmentId: channelsTable.departmentId,
    departmentName: departmentsTable.name,
    createdAt: channelsTable.createdAt,
    updatedAt: channelsTable.updatedAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM channel_members WHERE channel_id = ${channelsTable.id})::int`,
    lastMessageAt: sql<string | null>`(SELECT created_at FROM messages WHERE channel_id = ${channelsTable.id} ORDER BY created_at DESC LIMIT 1)`,
    unreadCount: sql<number>`0::int`,
  })
    .from(channelsTable)
    .leftJoin(departmentsTable, eq(channelsTable.departmentId, departmentsTable.id))
    .where(eq(channelsTable.id, id));
  return ch ?? null;
}

router.get("/channels", async (req, res): Promise<void> => {
  const query = ListChannelsQueryParams.safeParse(req.query);
  let conditions: ReturnType<typeof and>[] = [];

  if (query.success) {
    if (query.data.departmentId) {
      conditions.push(eq(channelsTable.departmentId, query.data.departmentId));
    }
    if (query.data.type) {
      conditions.push(eq(channelsTable.type, query.data.type));
    }
  }

  const baseQuery = db.select({
    id: channelsTable.id,
    name: channelsTable.name,
    description: channelsTable.description,
    type: channelsTable.type,
    departmentId: channelsTable.departmentId,
    departmentName: departmentsTable.name,
    createdAt: channelsTable.createdAt,
    updatedAt: channelsTable.updatedAt,
    memberCount: sql<number>`(SELECT COUNT(*) FROM channel_members WHERE channel_id = ${channelsTable.id})::int`,
    lastMessageAt: sql<string | null>`(SELECT created_at FROM messages WHERE channel_id = ${channelsTable.id} ORDER BY created_at DESC LIMIT 1)`,
    unreadCount: sql<number>`0::int`,
  })
    .from(channelsTable)
    .leftJoin(departmentsTable, eq(channelsTable.departmentId, departmentsTable.id));

  const channels = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  res.json(channels);
});

router.post("/channels", async (req, res): Promise<void> => {
  const parsed = CreateChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { memberIds, ...channelData } = parsed.data;
  const [ch] = await db.insert(channelsTable).values(channelData).returning();
  if (memberIds && memberIds.length > 0) {
    await db.insert(channelMembersTable).values(memberIds.map((uid) => ({ channelId: ch.id, userId: uid })));
  }
  const full = await getChannelFull(ch.id);
  res.status(201).json(full);
});

router.get("/channels/:id", async (req, res): Promise<void> => {
  const params = GetChannelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const ch = await getChannelFull(params.data.id);
  if (!ch) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(ch);
});

router.patch("/channels/:id", async (req, res): Promise<void> => {
  const params = UpdateChannelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { memberIds, ...channelData } = parsed.data;
  await db.update(channelsTable).set(channelData).where(eq(channelsTable.id, params.data.id));
  const full = await getChannelFull(params.data.id);
  if (!full) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(full);
});

router.delete("/channels/:id", async (req, res): Promise<void> => {
  const params = DeleteChannelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(channelMembersTable).where(eq(channelMembersTable.channelId, params.data.id));
  await db.delete(channelsTable).where(eq(channelsTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/channels/:id/members", async (req, res): Promise<void> => {
  const params = GetChannelMembersParams.safeParse(req.params);
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
    .from(channelMembersTable)
    .innerJoin(usersTable, eq(channelMembersTable.userId, usersTable.id))
    .leftJoin(departmentsTable, eq(usersTable.departmentId, departmentsTable.id))
    .where(eq(channelMembersTable.channelId, params.data.id));
  res.json(members);
});

router.post("/channels/:id/members", async (req, res): Promise<void> => {
  const params = AddChannelMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddChannelMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.insert(channelMembersTable).values({ channelId: params.data.id, userId: parsed.data.userId }).onConflictDoNothing();
  res.json({ ok: true });
});

export default router;
