/**
 * Clear the app-icon badge and any delivered alerts in Notification Centre.
 *
 * The APNs clients send `badge: payload.badge ?? 1`, so a push that names no
 * badge still puts a red 1 on the icon. The native SceneDelegate resets it on
 * sceneDidBecomeActive, but a build without that callback, or one where it does
 * not run, leaves the 1 for good. The iOS push plugin's
 * removeAllDeliveredNotifications also zeroes the icon badge and exists in every
 * shipped build, so this works without a native update.
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export async function clearAppBadge(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.warn('[Badge] Could not clear badge:', error);
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
