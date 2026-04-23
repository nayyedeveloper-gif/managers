import { Router } from "express";
import webpush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

webpush.setVapidDetails(
  process.env["VAPID_SUBJECT"] ?? "mailto:admin@example.com",
  process.env["VAPID_PUBLIC_KEY"] ?? "",
  process.env["VAPID_PRIVATE_KEY"] ?? ""
);

export { webpush };

// GET /api/push/vapid-public-key
router.get("/push/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "" });
});

// POST /api/push/subscribe
router.post("/push/subscribe", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription object" });
  }

  try {
    await db
      .insert(pushSubscriptionsTable)
      .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { userId, p256dh: keys.p256dh, auth: keys.auth },
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// DELETE /api/push/subscribe
router.delete("/push/subscribe", async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  await db
    .delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint));

  res.json({ ok: true });
});

export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  const subs = await db
    .select()
    .from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  const results = await Promise.allSettled(
    subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  const failed = results
    .map((r, i) => ({ r, sub: subs[i] }))
    .filter(({ r }) => r.status === "rejected");

  for (const { sub } of failed) {
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
  }
}

export default router;
