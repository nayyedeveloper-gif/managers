import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const array = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    array[i] = rawData.charCodeAt(i);
  }
  return array as Uint8Array<ArrayBuffer>;
}

export type PushStatus = "unsupported" | "default" | "granted" | "denied";

export function usePushNotifications(userId: number | null) {
  const [status, setStatus] = useState<PushStatus>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check support & current permission
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PushStatus);
  }, []);

  // Check if already subscribed
  useEffect(() => {
    if (!userId || status === "unsupported") return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, [userId, status]);

  const subscribe = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Get VAPID public key
      const keyRes = await fetch(`${API}/api/push/vapid-public-key`);
      const { publicKey } = await keyRes.json();

      // 2. Request permission
      const permission = await Notification.requestPermission();
      setStatus(permission as PushStatus);
      if (permission !== "granted") return;

      // 3. Subscribe via service worker
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Send subscription to server
      await fetch(`${API}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub.toJSON()),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error("Push subscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API}/api/push/subscribe`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, isSubscribed, loading, subscribe, unsubscribe };
}
