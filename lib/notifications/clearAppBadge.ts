/**
 * Clear the app-icon badge and any delivered alerts in Notification Centre.
 *
 * The APNs clients send `badge: payload.badge ?? 1`, so a push that names no
 * badge still puts a red 1 on the icon. The native SceneDelegate resets it on
 * sceneDidBecomeActive, but a build without that callback, or one where it does
 * not run, leaves the 1 for good. The iOS push plugin's
 * removeAllDeliveredNotifications also zeroes the icon badge and exists in every
 * shipped build, so this works without a native update.
 *
 * That call also rejects until APNs registration has completed in the current
 * launch, so when it rejects we register (permission permitting) and clear again.
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

let clearing: Promise<void> | null = null;

export function clearAppBadge(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return Promise.resolve();
  // A burst of foreground events shares one attempt.
  clearing ??= clearBadgeNow().finally(() => {
    clearing = null;
  });
  return clearing;
}

async function clearBadgeNow(): Promise<void> {
  try {
    await PushNotifications.removeAllDeliveredNotifications();
    return;
  } catch {
    // The plugin rejects this until APNs registration has completed in this
    // launch, which only happens after sign-in. Register first, below.
  }
  try {
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') return;
    await registerThenWait();
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.warn('[Badge] Could not clear badge:', error);
  }
}

const REGISTRATION_WAIT_MS = 10_000;

/** Register with APNs and wait for it to answer (token or error), or give up. */
async function registerThenWait(): Promise<void> {
  const handles: Array<{ remove: () => Promise<void> }> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const answered = new Promise<void>((resolve) => {
    void PushNotifications.addListener('registration', () => resolve()).then((h) => handles.push(h));
    void PushNotifications.addListener('registrationError', () => resolve()).then((h) => handles.push(h));
    timer = setTimeout(resolve, REGISTRATION_WAIT_MS);
  });
  try {
    await PushNotifications.register();
    await answered;
  } finally {
    clearTimeout(timer);
    await Promise.all(handles.map((h) => h.remove()));
  }
}

/**
 * Clear now and every time the app returns to the foreground. Returns a function
 * that stops listening. Does nothing outside the native iOS app.
 */
export async function watchAppBadge(): Promise<() => void> {
  if (Capacitor.getPlatform() !== 'ios') return () => undefined;
  const { App } = await import('@capacitor/app');
  await clearAppBadge();
  const handle = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void clearAppBadge();
  });
  return () => {
    void handle.remove();
  };
}
