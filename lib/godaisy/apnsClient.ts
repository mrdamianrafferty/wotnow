/**
 * Apple Push Notification Service (APNS) Client for Go Daisy
 *
 * Sends push notifications to iOS devices using the APNS HTTP/2 API.
 * Uses shared APNS keys with Go Daisy's bundle ID.
 *
 * Environment Variables Required:
 * - APNS_KEY_ID: Your APNS key ID
 * - APNS_TEAM_ID: Your Apple Developer Team ID
 * - APNS_KEY: Your APNS private key (PEM format)
 * - GODAISY_APNS_BUNDLE_ID: Go Daisy bundle ID (defaults to io.godaisy.app)
 *
 * @module lib/godaisy/apnsClient
 */

import apn from 'apn';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_KEY = process.env.APNS_KEY;
const GODAISY_BUNDLE_ID = process.env.GODAISY_APNS_BUNDLE_ID || 'io.godaisy.app';

let apnsProvider: apn.Provider | null = null;

function getApnsProvider(): apn.Provider | null {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_KEY) {
    console.error('[GoDaisyAPNS] Missing configuration. Required env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY');
    return null;
  }

  if (!apnsProvider) {
    try {
      // Normalise the PEM key: handle escaped \n, missing line-breaks, or proper multi-line
      let pemKey = APNS_KEY.replace(/\\n/g, '\n');
      if (!pemKey.includes('\n')) {
        const body = pemKey
          .replace('-----BEGIN PRIVATE KEY-----', '')
          .replace('-----END PRIVATE KEY-----', '')
          .trim();
        pemKey = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
      }

      apnsProvider = new apn.Provider({
        token: {
          key: Buffer.from(pemKey, 'utf-8'),
          keyId: APNS_KEY_ID,
          teamId: APNS_TEAM_ID,
        },
        production: process.env.NODE_ENV === 'production',
      });
      console.log('[GoDaisyAPNS] Provider initialized for bundle:', GODAISY_BUNDLE_ID);
    } catch (error) {
      console.error('[GoDaisyAPNS] Failed to initialize provider:', error);
      return null;
    }
  }

  return apnsProvider;
}

export interface GoDaisyPushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

export async function sendGoDaisyApnsPushNotification(
  token: string,
  payload: GoDaisyPushPayload
): Promise<boolean> {
  const provider = getApnsProvider();

  if (!provider) {
    console.error('[GoDaisyAPNS] Provider not initialized - cannot send notification');
    return false;
  }

  if (!token || token.trim() === '') {
    console.error('[GoDaisyAPNS] Invalid device token provided');
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
    note.topic = GODAISY_BUNDLE_ID;
    note.expiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

    if (payload.data) {
      note.payload = payload.data;
    }

    const result = await provider.send(note, token);

    if (result.failed.length > 0) {
      const failure = result.failed[0];
      console.error('[GoDaisyAPNS] Failed to send notification:', {
        token: token.substring(0, 10) + '...',
        status: failure.status,
        response: failure.response,
      });
      return false;
    }

    console.log('[GoDaisyAPNS] Notification sent successfully:', {
      token: token.substring(0, 10) + '...',
      title: payload.title,
    });

    return true;
  } catch (error) {
    console.error('[GoDaisyAPNS] Unexpected error sending notification:', error);
    return false;
  }
}

export async function sendBatchGoDaisyApnsPushNotifications(
  tokens: string[],
  payload: GoDaisyPushPayload
): Promise<{ sent: number; failed: number }> {
  if (!tokens || tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  console.log(`[GoDaisyAPNS] Sending batch notification to ${tokens.length} devices`);

  const results = await Promise.allSettled(
    tokens.map(token => sendGoDaisyApnsPushNotification(token, payload))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - sent;

  console.log(`[GoDaisyAPNS] Batch send complete: ${sent} sent, ${failed} failed`);

  return { sent, failed };
}
