/**
 * Apple Push Notification Service (APNS) Client for Grow Daisy
 *
 * Sends push notifications to iOS devices using the APNS HTTP/2 API.
 * Uses the same APNS keys as Findr but with Grow Daisy's bundle ID.
 *
 * Environment Variables Required:
 * - APNS_KEY_ID: Your APNS key ID
 * - APNS_TEAM_ID: Your Apple Developer Team ID
 * - APNS_KEY: Your APNS private key (PEM format)
 * - GROW_APNS_BUNDLE_ID: Grow Daisy bundle ID (defaults to io.growdaisy.app)
 *
 * @module lib/grow/apnsClient
 */

import apn from 'apn';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_KEY = process.env.APNS_KEY;
const GROW_BUNDLE_ID = process.env.GROW_APNS_BUNDLE_ID || 'io.growdaisy.app';

let apnsProvider: apn.Provider | null = null;

/**
 * Get APNS provider instance (singleton)
 */
function getApnsProvider(): apn.Provider | null {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_KEY) {
    console.error('[GrowAPNS] Missing configuration. Required env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY');
    return null;
  }

  if (!apnsProvider) {
    try {
      apnsProvider = new apn.Provider({
        token: {
          key: APNS_KEY.replace(/\\n/g, '\n'),
          keyId: APNS_KEY_ID,
          teamId: APNS_TEAM_ID,
        },
        production: process.env.NODE_ENV === 'production',
      });
      console.log('[GrowAPNS] Provider initialized for bundle:', GROW_BUNDLE_ID);
    } catch (error) {
      console.error('[GrowAPNS] Failed to initialize provider:', error);
      return null;
    }
  }

  return apnsProvider;
}

export interface GrowPushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

/**
 * Send push notification to iOS device via APNS
 */
export async function sendGrowApnsPushNotification(
  token: string,
  payload: GrowPushPayload
): Promise<boolean> {
  const provider = getApnsProvider();

  if (!provider) {
    console.error('[GrowAPNS] Provider not initialized - cannot send notification');
    return false;
  }

  if (!token || token.trim() === '') {
    console.error('[GrowAPNS] Invalid device token provided');
    return false;
  }

  try {
    const note = new apn.Notification();

    note.alert = {
      title: payload.title,
      body: payload.body,
    };

    note.sound = payload.sound || 'default';
    note.badge = payload.badge ?? 1;
    note.topic = GROW_BUNDLE_ID;
    note.expiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    if (payload.data) {
      note.payload = payload.data;
    }

    const result = await provider.send(note, token);

    if (result.failed.length > 0) {
      const failure = result.failed[0];
      console.error('[GrowAPNS] Failed to send notification:', {
        token: token.substring(0, 10) + '...',
        status: failure.status,
        response: failure.response,
      });
      return false;
    }

    console.log('[GrowAPNS] Notification sent successfully:', {
      token: token.substring(0, 10) + '...',
      title: payload.title,
    });

    return true;
  } catch (error) {
    console.error('[GrowAPNS] Unexpected error sending notification:', error);
    return false;
  }
}

/**
 * Send push notifications to multiple iOS devices (batch)
 */
export async function sendBatchGrowApnsPushNotifications(
  tokens: string[],
  payload: GrowPushPayload
): Promise<{ sent: number; failed: number }> {
  if (!tokens || tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  console.log(`[GrowAPNS] Sending batch notification to ${tokens.length} devices`);

  const results = await Promise.allSettled(
    tokens.map(token => sendGrowApnsPushNotification(token, payload))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - sent;

  console.log(`[GrowAPNS] Batch send complete: ${sent} sent, ${failed} failed`);

  return { sent, failed };
}
