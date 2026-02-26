/**
 * Shared Native Push Registration Helper
 *
 * Reusable function for registering iOS push tokens with the correct bundle_id.
 * Used by Go Daisy and Grow Daisy. Findr has its own registration in
 * lib/findr/pushNotifications.ts with Findr-specific deep linking.
 *
 * @module lib/notifications/registerNativePush
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { createClient } from '@/lib/supabase/client';

/**
 * Register for native iOS push notifications with the correct bundle ID.
 *
 * @param userId - Authenticated user ID from Supabase
 * @param bundleId - The app's bundle ID (e.g., 'io.godaisy.app', 'io.growdaisy.app')
 * @returns Promise<boolean> - True if registration succeeded
 */
export async function registerNativePush(userId: string, bundleId: string): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'ios') {
    console.log(`[NativePush] Skipping registration - not iOS (platform: ${Capacitor.getPlatform()})`);
    return false;
  }

  try {
    console.log(`[NativePush] Starting registration for user: ${userId}, bundle: ${bundleId}`);

    let permission = await PushNotifications.checkPermissions();

    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== 'granted') {
      console.log('[NativePush] Permission denied by user');
      return false;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log(`[NativePush] Token received for ${bundleId}:`, token.value.substring(0, 20) + '...');

      const supabase = createClient();
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: token.value,
          platform: 'ios',
          bundle_id: bundleId,
          last_used: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform,bundle_id',
        });

      if (error) {
        console.error('[NativePush] Failed to save token:', error);
      } else {
        console.log(`[NativePush] Token saved for ${bundleId}`);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NativePush] Registration failed:', error);
    });

    return true;
  } catch (error) {
    console.error('[NativePush] Registration error:', error);
    return false;
  }
}

/**
 * Unregister native push notifications for a specific app.
 *
 * @param userId - Authenticated user ID
 * @param bundleId - The app's bundle ID
 */
export async function unregisterNativePush(userId: string, bundleId: string): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') {
    return;
  }

  try {
    await PushNotifications.unregister();

    const supabase = createClient();
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'ios')
      .eq('bundle_id', bundleId);

    if (error) {
      console.error('[NativePush] Failed to remove token:', error);
    } else {
      console.log(`[NativePush] Token removed for ${bundleId}`);
    }
  } catch (error) {
    console.error('[NativePush] Unregister error:', error);
  }
}
