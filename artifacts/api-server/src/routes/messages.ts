import { Router, type IRouter } from "express";
import { eq, lt, desc } from "drizzle-orm";
import { db, messagesTable, usersTable, notificationsTable } from "@workspace/db";
import {
  GetChannelMessagesParams,
  GetChannelMessagesQueryParams,
  SendMessageParams,
  SendMessageBody,
  UpdateMessageParams,
  UpdateMessageBody,
  DeleteMessageParams,
  AddReactionParams,
  AddReactionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/channels/:id/messages", async (req, res): Promise<void> => {
  const params = GetChannelMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const qp = GetChannelMessagesQueryParams.safeParse(req.query);
  const limit = qp.success && qp.data.limit ? qp.data.limit : 50;
  const before = qp.success && qp.data.before ? qp.data.before : undefined;

  let q = db.select({
    id: messagesTable.id,
    content: messagesTable.content,
    channelId: messagesTable.channelId,
    senderId: messagesTable.senderId,
    senderName: usersTable.displayName,
    senderAvatar: usersTable.avatarUrl,
    fileUrl: messagesTable.fileUrl,
    fileName: messagesTable.fileName,
    fileType: messagesTable.fileType,
    isEdited: messagesTable.isEdited,
    reactions: messagesTable.reactions,
    createdAt: messagesTable.createdAt,
    updatedAt: messagesTable.updatedAt,
  })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.channelId, params.data.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  const msgs = await q;
  res.json(msgs.reverse());
});

router.post("/channels/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [msg] = await db.insert(messagesTable).values({
    content: parsed.data.content,
    channelId: params.data.id,
    senderId: parsed.data.senderId,
    fileUrl: parsed.data.fileUrl ?? null,
    fileName: parsed.data.fileName ?? null,
    fileType: parsed.data.fileType ?? null,
    reactions: [],
  }).returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));

  await db.insert(notificationsTable).values({
    userId: parsed.data.senderId,
    type: "message",
    title: `New message in channel`,
    body: parsed.data.content.slice(0, 100),
    isRead: false,
    channelId: params.data.id,
    messageId: msg.id,
  });

  res.status(201).json({
    ...msg,
    senderName: sender?.displayName ?? "Unknown",
    senderAvatar: sender?.avatarUrl ?? null,
    reactions: [],
  });
});

router.patch("/messages/:id", async (req, res): Promise<void> => {
  const params = UpdateMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(messagesTable)
    .set({ content: parsed.data.content, isEdited: true })
    .where(eq(messagesTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, updated.senderId));
  res.json({
    ...updated,
    senderName: sender?.displayName ?? "Unknown",
    senderAvatar: sender?.avatarUrl ?? null,
  });
});

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const params = DeleteMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(messagesTable).where(eq(messagesTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/messages/:id/reactions", async (req, res): Promise<void> => {
  const params = AddReactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddReactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, params.data.id));
  if (!msg) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const reactions = (msg.reactions as { emoji: string; count: number; userIds: number[] }[]) ?? [];
  const existing = reactions.find((r) => r.emoji === parsed.data.emoji);
  if (existing) {
    if (existing.userIds.includes(parsed.data.userId)) {
      existing.userIds = existing.userIds.filter((uid) => uid !== parsed.data.userId);
      existing.count = existing.userIds.length;
    } else {
      existing.userIds.push(parsed.data.userId);
      existing.count = existing.userIds.length;
    }
  } else {
    reactions.push({ emoji: parsed.data.emoji, count: 1, userIds: [parsed.data.userId] });
  }
  const filtered = reactions.filter((r) => r.count > 0);
  await db.update(messagesTable).set({ reactions: filtered }).where(eq(messagesTable.id, params.data.id));
  res.json({ ok: true });
});

export default router;
