/**
 * RevenueCat Webhook Handler
 *
 * Handles RevenueCat server-to-server webhook events for iOS In-App Purchases.
 * Mirrors the Stripe webhook pattern from pages/api/stripe/webhook.ts.
 *
 * Events handled:
 * - INITIAL_PURCHASE: New subscription or lifetime purchase
 * - RENEWAL: Subscription renewed
 * - CANCELLATION: User cancelled (access continues until period end)
 * - EXPIRATION: Subscription expired — downgrade to seed
 * - BILLING_ISSUE_DETECTED: Payment failed (log only, RevenueCat retries)
 * - PRODUCT_CHANGE: User changed plan (upgrade/downgrade)
 *
 * @route POST /api/revenuecat/webhook
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';
import { mapProductToTier } from '@/lib/grow/revenueCatProducts';
import { isGoDaisyTip } from '@/lib/godaisy/tipProducts';
import type { GrowSubscriptionTier } from '@/lib/grow/subscription';

// Disable Next.js body parsing for raw body access
export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

// RevenueCat webhook event types
type RCEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE_DETECTED'
  | 'PRODUCT_CHANGE'
  | 'SUBSCRIBER_ALIAS'
  | 'TRANSFER'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'TEMPORARY_ENTITLEMENT_GRANT'
  | 'TEST';

interface RCWebhookEvent {
  api_version: string;
  event: {
    id: string;
    type: RCEventType;
    app_user_id: string;
    product_id: string;
    entitlement_ids?: string[];
    period_type?: 'NORMAL' | 'TRIAL' | 'INTRO';
    purchased_at_ms?: number;
    expiration_at_ms?: number;
    environment?: 'SANDBOX' | 'PRODUCTION';
    store?: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'AMAZON';
    is_family_share?: boolean;
    original_app_user_id?: string;
    cancel_reason?: string;
    price_in_purchased_currency?: number;
    currency?: string;
    transaction_id?: string;
    original_transaction_id?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!WEBHOOK_SECRET) {
    console.error('[revenuecat] REVENUECAT_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('[revenuecat] Invalid authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse the raw body
    const buf = await buffer(req);
    const payload: RCWebhookEvent = JSON.parse(buf.toString());
    const event = payload.event;

    console.log(`[revenuecat] Received event: ${event.type} for user ${event.app_user_id}, product ${event.product_id}`);

    // Skip anonymous users (not linked to Supabase)
    if (event.app_user_id.startsWith('$RCAnonymousID:')) {
      console.log('[revenuecat] Skipping anonymous user event');
      return res.status(200).json({ received: true });
    }

    // Skip test events in production (but process them in development)
    if (event.type === 'TEST') {
      console.log('[revenuecat] Test event received');
      return res.status(200).json({ received: true });
    }

    // app_user_id IS the Supabase UUID (set during identifyRevenueCatUser)
    const userId = event.app_user_id;

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Deduplicate: check if we've already processed this event
    if (event.id) {
      const { data: existing } = await supabase
        .from('grow_subscription_events')
        .select('id')
        .eq('revenuecat_event_id', event.id)
        .maybeSingle();

      if (existing) {
        console.log(`[revenuecat] Duplicate event ${event.id}, skipping`);
        return res.status(200).json({ received: true });
      }
    }

    // Map product to tier
    const mapping = mapProductToTier(event.product_id);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'NON_RENEWING_PURCHASE': {
        // Consumable tips: log and skip — no profile tier update needed
        if (isGoDaisyTip(event.product_id)) {
          console.log(`[revenuecat] Tip received from ${userId}: ${event.product_id}`);
          break;
        }

        if (!mapping) {
          console.error(`[revenuecat] Unknown product ID: ${event.product_id}`);
          break;
        }

        const isLifetime = mapping.type === 'lifetime';

        const updateData: Record<string, unknown> = {
          grow_subscription_tier: mapping.tier,
          grow_subscription_type: mapping.type,
          grow_subscription_start: event.purchased_at_ms
            ? new Date(event.purchased_at_ms).toISOString()
            : new Date().toISOString(),
          grow_subscription_end: isLifetime
            ? null
            : event.expiration_at_ms
              ? new Date(event.expiration_at_ms).toISOString()
              : null,
          grow_stripe_subscription_id: null, // Not a Stripe subscription
          revenuecat_customer_id: userId,
        };

        // Set trial end if in trial period
        if (event.period_type === 'TRIAL' && event.expiration_at_ms) {
          updateData.grow_trial_ends_at = new Date(event.expiration_at_ms).toISOString();
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          console.error(`[revenuecat] Failed to update profile for ${userId}:`, updateError);
          // Still return 200 to avoid retry loops for permanent errors
        } else {
          console.log(`[revenuecat] Updated user ${userId}: tier=${mapping.tier}, type=${mapping.type}`);
        }
        break;
      }

      case 'CANCELLATION': {
        // Apple grants access through the end of the billing period.
        // Do NOT downgrade yet — EXPIRATION event will handle that.
        console.log(`[revenuecat] User ${userId} cancelled (access continues until period end)`);
        break;
      }

      case 'EXPIRATION': {
        // Subscription has actually expired — downgrade to seed
        const { error: expireError } = await supabase
          .from('profiles')
          .update({
            grow_subscription_tier: 'seed',
            grow_subscription_end: new Date().toISOString(),
          })
          .eq('id', userId);

        if (expireError) {
          console.error(`[revenuecat] Failed to expire subscription for ${userId}:`, expireError);
        } else {
          console.log(`[revenuecat] Subscription expired for ${userId}, downgraded to seed`);
        }
        break;
      }

      case 'BILLING_ISSUE_DETECTED': {
        // Log only — RevenueCat handles retry logic. EXPIRATION fires if all retries fail.
        console.log(`[revenuecat] Billing issue for ${userId}, product ${event.product_id}`);
        break;
      }

      default: {
        console.log(`[revenuecat] Unhandled event type: ${event.type}`);
      }
    }

    // Record audit trail
    const newTier = mapping?.tier ?? (event.type === 'EXPIRATION' ? 'seed' : undefined);
    await recordEvent(supabase, userId, event, newTier as GrowSubscriptionTier | undefined);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[revenuecat] Webhook handler error:', error);
    // Return 200 even on errors to prevent RevenueCat from retrying permanently
    return res.status(200).json({ received: true, error: 'Processing error' });
  }
}

/**
 * Record event in grow_subscription_events for audit trail
 */
async function recordEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  event: RCWebhookEvent['event'],
  newTier?: GrowSubscriptionTier
) {
  try {
    await supabase.from('grow_subscription_events').insert({
      user_id: userId,
      event_type: `revenuecat.${event.type.toLowerCase()}`,
      revenuecat_event_id: event.id,
      new_tier: newTier ?? null,
      event_data: event,
    });
  } catch (err) {
    console.error('[revenuecat] Failed to record event:', err);
  }
}
