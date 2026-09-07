/**
 * Turn a granted permission into an actual subscription.
 *
 * ─── The bug this exists for ─────────────────────────────────────────────
 *
 * `pages/start.tsx` asks for notification permission at the one moment it is
 * obviously worth granting — the person has just chosen an hour — and then
 * calls `push.subscribe().catch(() => false)`. Subscribing writes a row
 * against a user id, so `/api/godaisy/push/subscribe` answers 401 when signed
 * out, and that `.catch` swallows it.
 *
 * The comment there says "the subscription can be created later". Nothing
 * created it later. `AuthContext` mirrored the call setup and the native token
 * on sign-in and never the web subscription, so the browser sat in the worst
 * possible state: permission GRANTED, no subscription, nothing to retry it —
 * and a browser gives you that prompt exactly once. To the person, Go Daisy
 * has permission to send notifications and simply never does.
 *
 * ─── What this does, and what it deliberately does not ───────────────────
 *
 * It NEVER PROMPTS. It runs on sign-in, where a prompt would be both
 * unexpected and wasteful — asked cold, a permission request is refused, and
 * refused it cannot be asked again. It acts only on a permission already
 * granted, which means it is repairing a decision the person has made rather
 * than making one for them.
 *
 * It is also idempotent: an existing subscription is reused, and the endpoint
 * upserts, so it is safe on every session restore.
 *
 * @module lib/godaisy/push/ensureWebSubscription
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Web Push wants the key as bytes; VAPID publishes it base64url. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS device';
  if (/Android/.test(ua)) return 'Android device';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Browser';
}

/**
 * @param accessToken a live Supabase access token — the caller has one, and
 *   fetching a second here would race the session it came from.
 * @returns true when a subscription is now stored server-side.
 */
export async function ensureWebPushSubscription(accessToken: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (!VAPID_PUBLIC_KEY) return false;

    // The whole point: act on a granted permission, never create one.
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Reuse before re-subscribing. A browser that already has one hands back
    // the same endpoint, so this stays cheap on every sign-in.
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const res = await fetch('/api/godaisy/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        deviceName: deviceName(),
        userAgent: navigator.userAgent,
      }),
    });

    return res.ok;
  } catch {
    // Never throws at the caller. This runs inside an auth state change, and
    // a failed repair must not take the sign-in with it — the next session
    // restore tries again.
    return false;
  }
}
