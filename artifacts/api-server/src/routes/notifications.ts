import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import {
  ListNotificationsQueryParams,
  MarkNotificationReadParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const qp = ListNotificationsQueryParams.safeParse(req.query);
  const userId = ((req.session as Record<string, unknown>).userId as number) ?? 1;

  let notifications;
  if (qp.success && qp.data.unreadOnly) {
    notifications = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)))
      .orderBy(notificationsTable.createdAt);
  } else {
    notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(notificationsTable.createdAt);
  }
  res.json(notifications);
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, params.data.id));
  res.json({ ok: true });
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  const userId = ((req.session as Record<string, unknown>).userId as number) ?? 1;
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

export default router;
