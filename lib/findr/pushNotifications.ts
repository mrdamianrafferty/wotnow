/**
 * Push Notification Registration for iOS
 *
 * Handles device token registration with APNS and saves tokens to database.
 * Android users skip this and continue using email notifications.
 *
 * Usage:
 * - Call registerPushNotifications(userId) after successful login
 * - Automatically registers on iOS, skips on Android/web
 * - Saves device token to database for cron job to use
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { createClient } from '@/lib/supabase/client';

/**
 * Register for push notifications (iOS only)
 *
 * @param userId - Authenticated user ID from Supabase
 * @returns Promise<boolean> - True if registration succeeded, false otherwise
 *
 * @example
 * ```typescript
 * // After login
 * const { data: { user } } = await supabase.auth.getUser();
 * if (user) {
 *   await registerPushNotifications(user.id);
 * }
 * ```
 */
export async function registerPushNotifications(userId: string): Promise<boolean> {
  // Only register on iOS
  if (Capacitor.getPlatform() !== 'ios') {
    console.log('[Push] Skipping registration - not iOS (platform:', Capacitor.getPlatform(), ')');
    return false;
  }

  try {
    console.log('[Push] Starting registration for user:', userId);

    // 1. Check/request permission
    let permission = await PushNotifications.checkPermissions();

    if (permission.receive === 'prompt') {
      console.log('[Push] Requesting permissions...');
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') {
      console.log('[Push] Permission denied by user');
      return false;
    }

    console.log('[Push] Permission granted, registering with APNS...');

    // 2. Register with APNS
    await PushNotifications.register();

    // 3. Listen for successful registration
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Token received:', token.value.substring(0, 20) + '...');

      // 4. Save to database
      const supabase = createClient();
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: token.value,
          platform: 'ios',
          bundle_id: 'eu.fishfindr.app',
          last_used: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform,bundle_id',
        });

      if (error) {
        console.error('[Push] Failed to save token:', error);
      } else {
        console.log('[Push] Token saved successfully to database');
      }
    });

    // 5. Handle registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration failed:', error);
    });

    // 6. Handle notification received (when app is open)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received while app open:', notification);
      // Optional: Show in-app banner here
    });

    // 7. Handle notification tapped (opens app)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] Notification tapped, opening app');
      const data = notification.notification.data;

      if (data.type === 'hot_bite' && data.speciesId) {
        // Deep link to species page
        const url = `/findr/species/${data.speciesId}?rectangle=${data.rectangleCode}`;
        console.log('[Push] Deep linking to:', url);

        // Use window.location or your router
        if (typeof window !== 'undefined') {
          window.location.href = url;
        }
      }
    });

    console.log('[Push] Registration initiated successfully');
    return true;
  } catch (error) {
    console.error('[Push] Registration error:', error);
    return false;
  }
}

/**
 * Unregister from push notifications
 *
 * Removes device token from APNS and database.
 *
 * @param userId - Authenticated user ID
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * await unregisterPushNotifications(user.id);
 * ```
 */
export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') {
    return;
  }

  try {
    console.log('[Push] Unregistering for user:', userId);

    // Remove from APNS
    await PushNotifications.unregister();

    // Remove from database
    const supabase = createClient();
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'ios')
      .eq('bundle_id', 'eu.fishfindr.app');

    if (error) {
      console.error('[Push] Failed to remove token from database:', error);
    } else {
      console.log('[Push] Token removed successfully');
    }
  } catch (error) {
    console.error('[Push] Unregister error:', error);
  }
}

/**
 * Check if push notifications are enabled
 *
 * @returns Promise<boolean> - True if push is available and enabled
 */
export async function isPushNotificationEnabled(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  try {
    const permission = await PushNotifications.checkPermissions();
    return permission.receive === 'granted';
  } catch {
    return false;
  }
}
