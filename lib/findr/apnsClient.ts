/**
 * Apple Push Notification Service (APNS) Client
 *
 * Sends push notifications to iOS devices using the APNS HTTP/2 API.
 *
 * Prerequisites:
 * - APNS Key (.p8 file) from Apple Developer Portal
 * - Key ID, Team ID, and Bundle ID configured in environment variables
 *
 * Environment Variables Required:
 * - APNS_KEY_ID: Your APNS key ID (e.g., GA35BR2674)
 * - APNS_TEAM_ID: Your Apple Developer Team ID (e.g., T7754BV8QM)
 * - APNS_KEY: Your APNS private key (PEM format)
 * - APNS_BUNDLE_ID: Your app bundle ID (e.g., eu.fishfindr.app)
 */

import apn from 'apn';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_KEY = process.env.APNS_KEY;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'eu.fishfindr.app';

let apnsProvider: apn.Provider | null = null;

/**
 * Get APNS provider instance (singleton)
 *
 * Creates a reusable APNS provider that handles HTTP/2 connections
 * to Apple's push notification servers.
 */
function getApnsProvider(): apn.Provider | null {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_KEY) {
    console.error('[APNS] Missing configuration. Required env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY');
    return null;
  }

  if (!apnsProvider) {
    try {
      apnsProvider = new apn.Provider({
        token: {
          key: APNS_KEY.replace(/\\n/g, '\n'), // Convert escaped newlines
          keyId: APNS_KEY_ID,
          teamId: APNS_TEAM_ID,
        },
        production: process.env.NODE_ENV === 'production',
      });
      console.log('[APNS] Provider initialized successfully');
    } catch (error) {
      console.error('[APNS] Failed to initialize provider:', error);
      return null;
    }
  }

  return apnsProvider;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

/**
 * Send push notification to iOS device via APNS
 *
 * @param token - APNS device token (obtained from iOS device registration)
 * @param payload - Notification content and metadata
 * @returns Promise<boolean> - True if sent successfully, false otherwise
 *
 * @example
 * ```typescript
 * await sendApnsPushNotification('device-token-123', {
 *   title: '🎣 Hot Bite Alert!',
 *   body: 'Bass at 89% confidence in Cork Harbor',
 *   data: {
 *     type: 'hot_bite',
 *     speciesId: 'BSS',
 *     rectangleCode: '31E8',
 *   },
 *   badge: 1,
 *   sound: 'default',
 * });
 * ```
 */
export async function sendApnsPushNotification(
  token: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  const provider = getApnsProvider();

  if (!provider) {
    console.error('[APNS] Provider not initialized - cannot send notification');
    return false;
  }

  if (!token || token.trim() === '') {
    console.error('[APNS] Invalid device token provided');
    return false;
  }

  try {
    const note = new apn.Notification();

    // Alert content
    note.alert = {
      title: payload.title,
      body: payload.body,
    };

    // Audio and badge
    note.sound = payload.sound || 'default';
    note.badge = payload.badge ?? 1;

    // Required fields
    note.topic = APNS_BUNDLE_ID; // Must match your app's bundle ID
    note.expiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // Expire after 24 hours

    // Custom data payload
    if (payload.data) {
      note.payload = payload.data;
    }

    // Send notification
    const result = await provider.send(note, token);

    // Check for failures
    if (result.failed.length > 0) {
      const failure = result.failed[0];
      console.error('[APNS] Failed to send notification:', {
        token: token.substring(0, 10) + '...',
        status: failure.status,
        response: failure.response,
      });
      return false;
    }

    // Success
    console.log('[APNS] Notification sent successfully:', {
      token: token.substring(0, 10) + '...',
      title: payload.title,
      sentCount: result.sent.length,
    });

    return true;
  } catch (error) {
    console.error('[APNS] Unexpected error sending notification:', error);
    return false;
  }
}

/**
 * Send push notifications to multiple devices (batch)
 *
 * @param tokens - Array of APNS device tokens
 * @param payload - Notification content and metadata
 * @returns Promise<{ sent: number; failed: number }> - Success/failure counts
 *
 * @example
 * ```typescript
 * const result = await sendBatchApnsPushNotifications(
 *   ['token1', 'token2', 'token3'],
 *   {
 *     title: '🎣 Hot Bite Alert!',
 *     body: 'Multiple species active!',
 *   }
 * );
 * console.log(`Sent to ${result.sent} devices, ${result.failed} failed`);
 * ```
 */
export async function sendBatchApnsPushNotifications(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  if (!tokens || tokens.length === 0) {
    console.warn('[APNS] No tokens provided for batch send');
    return { sent: 0, failed: 0 };
  }

  console.log(`[APNS] Sending batch notification to ${tokens.length} devices`);

  const results = await Promise.allSettled(
    tokens.map(token => sendApnsPushNotification(token, payload))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - sent;

  console.log(`[APNS] Batch send complete: ${sent} sent, ${failed} failed`);

  return { sent, failed };
}

/**
 * Test APNS configuration
 *
 * Validates that all required environment variables are set and the provider
 * can be initialized. Useful for debugging configuration issues.
 *
 * @returns boolean - True if configuration is valid
 */
export function testApnsConfiguration(): boolean {
  console.log('[APNS] Testing configuration...');

  if (!APNS_KEY_ID) {
    console.error('[APNS] Missing APNS_KEY_ID');
    return false;
  }

  if (!APNS_TEAM_ID) {
    console.error('[APNS] Missing APNS_TEAM_ID');
    return false;
  }

  if (!APNS_KEY) {
    console.error('[APNS] Missing APNS_KEY');
    return false;
  }

  if (!APNS_BUNDLE_ID) {
    console.error('[APNS] Missing APNS_BUNDLE_ID');
    return false;
  }

  console.log('[APNS] Configuration OK:', {
    keyId: APNS_KEY_ID,
    teamId: APNS_TEAM_ID,
    bundleId: APNS_BUNDLE_ID,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  });

  // Try to initialize provider
  const provider = getApnsProvider();
  if (!provider) {
    console.error('[APNS] Failed to initialize provider');
    return false;
  }

  console.log('[APNS] Provider initialized successfully');
  return true;
}
