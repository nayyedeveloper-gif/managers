import { Router, type IRouter, type Request } from "express";
import { eq, lt, desc, or, and } from "drizzle-orm";
import { db, directMessagesTable, usersTable, notificationsTable } from "@workspace/db";
import { sendPushToUser } from "./push";

const router: IRouter = Router();

// Extend Request type to include userId
interface AuthenticatedRequest extends Request {
  userId: number;
}

// Authentication middleware - ensures user is logged in
function requireAuth(req: Request, res: any, next: any) {
  const userId = (req.session as unknown as Record<string, unknown>).userId as number | undefined;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  (req as AuthenticatedRequest).userId = userId;
  next();
}

// Apply authentication to all DM routes
router.use(requireAuth);

// Get DMs between current user and another user
router.get("/dms/:userId/messages", async (req, res): Promise<void> => {
  const currentUserId = (req as unknown as AuthenticatedRequest).userId;
  const otherUserId = Number(req.params.userId);

  if (!otherUserId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const limit = Number(req.query.limit) || 50;
  const before = req.query.before ? new Date(req.query.before as string) : undefined;

  const q = db.select({
    id: directMessagesTable.id,
    content: directMessagesTable.content,
    senderId: directMessagesTable.senderId,
    receiverId: directMessagesTable.receiverId,
    senderName: usersTable.displayName,
    senderAvatar: usersTable.avatarUrl,
    fileUrl: directMessagesTable.fileUrl,
    fileName: directMessagesTable.fileName,
    fileType: directMessagesTable.fileType,
    isEdited: directMessagesTable.isEdited,
    reactions: directMessagesTable.reactions,
    isRead: directMessagesTable.isRead,
    createdAt: directMessagesTable.createdAt,
    updatedAt: directMessagesTable.updatedAt,
  })
    .from(directMessagesTable)
    .innerJoin(usersTable, eq(directMessagesTable.senderId, usersTable.id))
    .where(
      and(
        or(
          and(eq(directMessagesTable.senderId, currentUserId), eq(directMessagesTable.receiverId, otherUserId)),
          and(eq(directMessagesTable.senderId, otherUserId), eq(directMessagesTable.receiverId, currentUserId))
        ),
        before ? lt(directMessagesTable.createdAt, before) : undefined
      )
    )
    .orderBy(desc(directMessagesTable.createdAt))
    .limit(limit);

  const msgs = await q;
  res.json(msgs.reverse());
});

// Send a DM to another user
router.post("/dms/:userId/messages", async (req, res): Promise<void> => {
  const senderId = (req as unknown as AuthenticatedRequest).userId;
  const receiverId = Number(req.params.userId);
  const { content, fileUrl, fileName, fileType } = req.body;

  if (!receiverId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  if (senderId === receiverId) {
    res.status(400).json({ error: "Cannot send message to yourself" });
    return;
  }

  if (!content && !fileUrl) {
    res.status(400).json({ error: "Either content or fileUrl is required" });
    return;
  }

  const [msg] = await db.insert(directMessagesTable).values({
    content: content ?? null,
    senderId,
    receiverId,
    fileUrl: fileUrl ?? null,
    fileName: fileName ?? null,
    fileType: fileType ?? null,
    reactions: [],
    isRead: false,
  }).returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, senderId));
  const [receiver] = await db.select().from(usersTable).where(eq(usersTable.id, receiverId));

  // Create notification for receiver
  await db.insert(notificationsTable).values({
    userId: receiverId,
    type: "message" as const,
    title: `New message from ${sender?.displayName ?? "Someone"}`,
    body: content?.slice(0, 100) ?? "Sent you a file",
    isRead: false,
  });

  // Send push notification to receiver
  await sendPushToUser(receiverId, {
    title: `New message from ${sender?.displayName ?? "Someone"}`,
    body: content?.slice(0, 80) ?? "Sent you a file",
    url: `/dm/${senderId}`,
    icon: "/icon-192.png",
  });

  res.status(201).json({
    ...msg,
    senderName: sender?.displayName ?? "Unknown",
    senderAvatar: sender?.avatarUrl ?? null,
    reactions: [],
  });
});

// Update a DM
router.patch("/dms/messages/:id", async (req, res): Promise<void> => {
  const messageId = Number(req.params.id);
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  const [updated] = await db.update(directMessagesTable)
    .set({ content, isEdited: true })
    .where(eq(directMessagesTable.id, messageId))
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

// Delete a DM
router.delete("/dms/messages/:id", async (req, res): Promise<void> => {
  const messageId = Number(req.params.id);
  await db.delete(directMessagesTable).where(eq(directMessagesTable.id, messageId));
  res.sendStatus(204);
});

// Add reaction to a DM
router.post("/dms/messages/:id/reactions", async (req, res): Promise<void> => {
  const messageId = Number(req.params.id);
  const { emoji, userId } = req.body;

  if (!emoji || !userId) {
    res.status(400).json({ error: "Both emoji and userId are required" });
    return;
  }

  const [msg] = await db.select().from(directMessagesTable).where(eq(directMessagesTable.id, messageId));
  if (!msg) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const reactions = (msg.reactions as { emoji: string; count: number; userIds: number[] }[]) ?? [];
  const existing = reactions.find((r) => r.emoji === emoji);
  if (existing) {
    if (existing.userIds.includes(userId)) {
      existing.userIds = existing.userIds.filter((uid) => uid !== userId);
      existing.count = existing.userIds.length;
    } else {
      existing.userIds.push(userId);
      existing.count = existing.userIds.length;
    }
  } else {
    reactions.push({ emoji, count: 1, userIds: [userId] });
  }

  const filtered = reactions.filter((r) => r.count > 0);
  await db.update(directMessagesTable).set({ reactions: filtered }).where(eq(directMessagesTable.id, messageId));
  res.json({ ok: true });
});

// List all DM conversations for current user
router.get("/dms/conversations", async (req, res): Promise<void> => {
  const currentUserId = (req as unknown as AuthenticatedRequest).userId;

  // Get all unique users the current user has DMs with
  const sentDms = await db.select({ receiverId: directMessagesTable.receiverId })
    .from(directMessagesTable)
    .where(eq(directMessagesTable.senderId, currentUserId));

  const receivedDms = await db.select({ senderId: directMessagesTable.senderId })
    .from(directMessagesTable)
    .where(eq(directMessagesTable.receiverId, currentUserId));

  const userIds = new Set<number>();
  sentDms.forEach((dm: { receiverId: number }) => userIds.add(dm.receiverId));
  receivedDms.forEach((dm: { senderId: number }) => userIds.add(dm.senderId));

  if (userIds.size === 0) {
    res.json([]);
    return;
  }

  // Get user details for each conversation
  const users = await db.select({
    id: usersTable.id,
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
    username: usersTable.username,
  }).from(usersTable).where(eq(usersTable.id, Array.from(userIds)[0] || 0));

  // For each user, get the last message and unread count
  const conversations = await Promise.all(Array.from(userIds).map(async (otherUserId) => {
    const [lastMessage] = await db.select()
      .from(directMessagesTable)
      .where(
        or(
          and(eq(directMessagesTable.senderId, currentUserId), eq(directMessagesTable.receiverId, otherUserId)),
          and(eq(directMessagesTable.senderId, otherUserId), eq(directMessagesTable.receiverId, currentUserId))
        )
      )
      .orderBy(desc(directMessagesTable.createdAt))
      .limit(1);

    const unreadCount = await db.select({ count: directMessagesTable.id })
      .from(directMessagesTable)
      .where(
        and(
          eq(directMessagesTable.senderId, otherUserId),
          eq(directMessagesTable.receiverId, currentUserId),
          eq(directMessagesTable.isRead, false)
        )
      );

    const user = users.find((u: { id: number }) => u.id === otherUserId);

    return {
      userId: otherUserId,
      displayName: user?.displayName ?? "Unknown",
      avatarUrl: user?.avatarUrl ?? null,
      username: user?.username ?? "",
      lastMessage: lastMessage ?? null,
      unreadCount: unreadCount.length,
    };
  }));

  // Sort by last message date
  conversations.sort((a, b) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
  });

  res.json(conversations);
});

// Mark conversation as read
router.patch("/dms/conversations/:userId/read", async (req, res): Promise<void> => {
  const currentUserId = (req as unknown as AuthenticatedRequest).userId;
  const otherUserId = Number(req.params.userId);

  if (!otherUserId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  await db.update(directMessagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(directMessagesTable.senderId, otherUserId),
        eq(directMessagesTable.receiverId, currentUserId),
        eq(directMessagesTable.isRead, false)
      )
    );

  res.json({ ok: true });
});

export default router;
