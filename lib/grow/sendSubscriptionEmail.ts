/**
 * Grow Daisy transactional email dispatch.
 *
 * Two invariants govern this module, both learned from how the Stripe webhook
 * behaves rather than from taste:
 *
 * 1. IT NEVER THROWS. `sendGrowSubscriptionEmail` resolves to a result object
 *    in every path, including network failure and misconfiguration. The caller
 *    is `pages/api/stripe/webhook.ts`, and a rejection there would bubble to the
 *    handler's catch and return 500 — which makes Stripe retry the whole event,
 *    re-running the profile/tier writes. An email outage must never become a
 *    billing-state problem.
 *
 * 2. IT CLAIMS BEFORE IT SENDS. The dedupe key is INSERTed first and a unique
 *    violation is treated as "already sent". Checking with a SELECT and then
 *    inserting would leave a race window that concurrent webhook retries would
 *    eventually land in. If the send then fails, the claim is released so a
 *    later retry can try again — a rare duplicate is a far better failure than
 *    a silently lost trial-ending warning.
 *
 * @module lib/grow/sendSubscriptionEmail
 */

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  renderTrialStarted,
  renderTrialEnding,
  renderSubscriptionConfirmed,
  renderSubscriptionCancelled,
  renderPaymentFailed,
  type GrowEmailPlatform,
  type GrowEmailRendered,
  type TrialStartedData,
  type TrialEndingData,
  type SubscriptionConfirmedData,
  type SubscriptionCancelledData,
  type PaymentFailedData,
} from './emailTemplates';

// =============================================================================
// CONFIG
// =============================================================================

/**
 * Sender address. `godaisy.io` must be a verified domain in Resend or every
 * send is rejected with a 403 before delivery is attempted — see the DNS notes
 * in the migration for grow_email_sends.
 */
const FROM = 'Grow Daisy <hello@godaisy.io>';
const REPLY_TO = 'hello@godaisy.io';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://grow.godaisy.io';

export const GROW_MANAGE_URL = `${BASE_URL}/grow/support`;
export const GROW_PREMIUM_URL = `${BASE_URL}/grow/premium`;

export type GrowEmailType =
  | 'trial_started'
  | 'trial_ending'
  | 'subscription_confirmed'
  | 'subscription_cancelled'
  | 'payment_failed';

export interface GrowEmailResult {
  ok: boolean;
  /** Why nothing was sent, when ok is false or the send was skipped. */
  skipped?: 'already_sent' | 'no_recipient' | 'not_configured' | 'send_failed';
  resendId?: string;
  error?: string;
}

type AnySupabase = SupabaseClient<never, never, never>;

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Stripe amounts are in the currency's minor unit for most currencies, but
 * zero-decimal currencies (JPY, KRW and friends) are not — dividing those by
 * 100 would understate the price by 100x in the email. Intl handles the
 * fraction digits once we hand it a major-unit number, so the only thing to get
 * right here is whether to divide.
 */
const ZERO_DECIMAL = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga',
  'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

export function formatStripeAmount(
  amountMinor: number | null | undefined,
  currency: string | null | undefined,
  locale = 'en-GB'
): string {
  if (amountMinor === null || amountMinor === undefined) return '';
  const code = (currency || 'eur').toLowerCase();
  const major = ZERO_DECIMAL.has(code) ? amountMinor : amountMinor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code.toUpperCase(),
    }).format(major);
  } catch {
    // Unknown currency code — better a bare number than a thrown email.
    return `${major} ${code.toUpperCase()}`;
  }
}

/** Unix seconds → "9 September 2026". Returns null for missing input. */
export function formatEpochDate(
  epochSeconds: number | null | undefined,
  locale = 'en-GB'
): string | null {
  if (!epochSeconds) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(epochSeconds * 1000));
  } catch {
    return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
  }
}

/**
 * Map a stored profile language to a BCP-47 locale for dates and currency.
 * `preferred_language` holds short codes ('en', 'fr', ...). Copy itself is
 * English-only for now — these emails are rendered server-side, so the app's
 * <TranslatedText>/DeepL path is not available here. Formatting at least
 * follows the user's locale rather than forcing US conventions on everyone.
 */
export function localeFor(preferredLanguage?: string | null): string {
  const lang = (preferredLanguage || '').trim().toLowerCase();
  if (!lang) return 'en-GB';
  const map: Record<string, string> = {
    en: 'en-GB', fr: 'fr-FR', es: 'es-ES',
    de: 'de-DE', it: 'it-IT', pt: 'pt-PT',
  };
  return map[lang.slice(0, 2)] || 'en-GB';
}

// =============================================================================
// RECIPIENT LOOKUP
// =============================================================================

export interface GrowEmailRecipient {
  email: string;
  name: string | null;
  locale: string;
}

/**
 * Resolve who to write to. Reads the profile rather than the Stripe customer:
 * the profile address is the one the user actually signs in with, and Stripe's
 * copy can be a checkout-time typo or an Apple private-relay alias.
 */
export async function resolveRecipient(
  supabase: AnySupabase,
  userId: string
): Promise<GrowEmailRecipient | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, name, preferred_language')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[grow-email] Failed to load profile for recipient:', error.message);
      return null;
    }

    const row = data as { email?: string | null; name?: string | null; preferred_language?: string | null } | null;
    if (!row?.email) return null;

    return {
      email: row.email,
      name: row.name ?? null,
      locale: localeFor(row.preferred_language),
    };
  } catch (err) {
    console.error('[grow-email] resolveRecipient threw:', err);
    return null;
  }
}

// =============================================================================
// DISPATCH
// =============================================================================

export interface SendGrowEmailArgs {
  supabase: AnySupabase;
  userId: string;
  emailType: GrowEmailType;
  /**
   * Semantic identity of this message, e.g. `trial_started:sub_123`. Must be
   * stable across every Stripe event that describes the same transition — that
   * is what makes this dedupe stronger than keying on the event id.
   */
  dedupeKey: string;
  rendered: GrowEmailRendered;
  recipient: GrowEmailRecipient;
  stripeEventId?: string | null;
  stripeSubscriptionId?: string | null;
}

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505';

export async function sendGrowSubscriptionEmail(
  args: SendGrowEmailArgs
): Promise<GrowEmailResult> {
  const {
    supabase, userId, emailType, dedupeKey, rendered, recipient,
    stripeEventId, stripeSubscriptionId,
  } = args;

  try {
    if (!recipient?.email) {
      return { ok: false, skipped: 'no_recipient' };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Not an error worth failing the webhook over; loudly logged so it is
      // visible in Vercel logs the first time it happens in production.
      console.error(`[grow-email] RESEND_API_KEY not set — skipping ${emailType} for ${userId}`);
      return { ok: false, skipped: 'not_configured' };
    }

    // ── Claim the key ────────────────────────────────────────────────
    // A unique violation here means some other delivery of this (or a
    // sibling) event already sent this message. That is the dedupe working,
    // not a failure.
    const { data: claim, error: claimError } = await supabase
      .from('grow_email_sends')
      // @ts-expect-error - table not present in generated Supabase types
      .insert({
        dedupe_key: dedupeKey,
        email_type: emailType,
        user_id: userId,
        recipient: recipient.email,
        stripe_event_id: stripeEventId ?? null,
        stripe_subscription_id: stripeSubscriptionId ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (claimError) {
      if (claimError.code === UNIQUE_VIOLATION) {
        console.log(`[grow-email] ${emailType} already sent for ${dedupeKey} — skipping`);
        return { ok: true, skipped: 'already_sent' };
      }
      console.error(`[grow-email] Could not claim ${dedupeKey}:`, claimError.message);
      return { ok: false, skipped: 'send_failed', error: claimError.message };
    }

    const claimId = (claim as { id: string } | null)?.id;

    // ── Send ─────────────────────────────────────────────────────────
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: recipient.email,
      replyTo: REPLY_TO,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (error) {
      // Release the claim so a Stripe retry can attempt this again. A rare
      // duplicate beats a permanently lost message.
      if (claimId) {
        await supabase.from('grow_email_sends').delete().eq('id', claimId);
      }
      console.error(`[grow-email] Resend rejected ${emailType} for ${userId}:`, error.message ?? error);
      return { ok: false, skipped: 'send_failed', error: error.message ?? String(error) };
    }

    if (claimId) {
      await supabase
        .from('grow_email_sends')
        // @ts-expect-error - table not present in generated Supabase types
        .update({ status: 'sent', resend_id: data?.id ?? null, sent_at: new Date().toISOString() })
        .eq('id', claimId);
    }

    console.log(`[grow-email] Sent ${emailType} to user ${userId} (resend id ${data?.id})`);
    return { ok: true, resendId: data?.id };
  } catch (err) {
    // Final backstop. Nothing above may escape into the webhook handler.
    console.error(`[grow-email] Unexpected failure sending ${emailType}:`, err);
    return {
      ok: false,
      skipped: 'send_failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// =============================================================================
// TEMPLATE-SPECIFIC ENTRY POINTS
// =============================================================================

export interface GrowLifecycleContext {
  supabase: AnySupabase;
  userId: string;
  platform: GrowEmailPlatform;
  stripeEventId?: string | null;
  stripeSubscriptionId?: string | null;
}

export async function sendTrialStarted(
  ctx: GrowLifecycleContext,
  data: Omit<TrialStartedData, 'platform' | 'manageUrl' | 'name'>
): Promise<GrowEmailResult> {
  const recipient = await resolveRecipient(ctx.supabase, ctx.userId);
  if (!recipient) return { ok: false, skipped: 'no_recipient' };

  return sendGrowSubscriptionEmail({
    supabase: ctx.supabase,
    userId: ctx.userId,
    emailType: 'trial_started',
    dedupeKey: `trial_started:${ctx.stripeSubscriptionId ?? ctx.userId}`,
    recipient,
    stripeEventId: ctx.stripeEventId,
    stripeSubscriptionId: ctx.stripeSubscriptionId,
    rendered: renderTrialStarted({
      ...data,
      name: recipient.name,
      platform: ctx.platform,
      manageUrl: GROW_MANAGE_URL,
    }),
  });
}

export async function sendTrialEnding(
  ctx: GrowLifecycleContext,
  data: Omit<TrialEndingData, 'platform' | 'manageUrl' | 'name'>,
  /** Trial-end epoch, so a rescheduled trial gets a fresh reminder. */
  trialEndEpoch: number | null
): Promise<GrowEmailResult> {
  const recipient = await resolveRecipient(ctx.supabase, ctx.userId);
  if (!recipient) return { ok: false, skipped: 'no_recipient' };

  return sendGrowSubscriptionEmail({
    supabase: ctx.supabase,
    userId: ctx.userId,
    emailType: 'trial_ending',
    dedupeKey: `trial_ending:${ctx.stripeSubscriptionId ?? ctx.userId}:${trialEndEpoch ?? 'na'}`,
    recipient,
    stripeEventId: ctx.stripeEventId,
    stripeSubscriptionId: ctx.stripeSubscriptionId,
    rendered: renderTrialEnding({
      ...data,
      name: recipient.name,
      platform: ctx.platform,
      manageUrl: GROW_MANAGE_URL,
    }),
  });
}

export async function sendSubscriptionConfirmed(
  ctx: GrowLifecycleContext,
  data: Omit<SubscriptionConfirmedData, 'platform' | 'manageUrl' | 'name'>,
  /** Distinguishes a lifetime checkout from a recurring activation. */
  dedupeSubject: string
): Promise<GrowEmailResult> {
  const recipient = await resolveRecipient(ctx.supabase, ctx.userId);
  if (!recipient) return { ok: false, skipped: 'no_recipient' };

  return sendGrowSubscriptionEmail({
    supabase: ctx.supabase,
    userId: ctx.userId,
    emailType: 'subscription_confirmed',
    dedupeKey: `subscription_confirmed:${dedupeSubject}`,
    recipient,
    stripeEventId: ctx.stripeEventId,
    stripeSubscriptionId: ctx.stripeSubscriptionId,
    rendered: renderSubscriptionConfirmed({
      ...data,
      name: recipient.name,
      platform: ctx.platform,
      manageUrl: GROW_MANAGE_URL,
    }),
  });
}

export async function sendPaymentFailed(
  ctx: GrowLifecycleContext,
  data: Omit<PaymentFailedData, 'platform' | 'manageUrl' | 'name'>,
  /**
   * Invoice id, NOT the event id. Stripe fires invoice.payment_failed once per
   * retry attempt over several days, each with a fresh event id but the same
   * invoice — keying on the event would nag the customer four times about one
   * failed card.
   */
  invoiceId: string
): Promise<GrowEmailResult> {
  const recipient = await resolveRecipient(ctx.supabase, ctx.userId);
  if (!recipient) return { ok: false, skipped: 'no_recipient' };

  return sendGrowSubscriptionEmail({
    supabase: ctx.supabase,
    userId: ctx.userId,
    emailType: 'payment_failed',
    dedupeKey: `payment_failed:${invoiceId}`,
    recipient,
    stripeEventId: ctx.stripeEventId,
    stripeSubscriptionId: ctx.stripeSubscriptionId,
    rendered: renderPaymentFailed({
      ...data,
      name: recipient.name,
      platform: ctx.platform,
      manageUrl: GROW_MANAGE_URL,
    }),
  });
}

export async function sendSubscriptionCancelled(
  ctx: GrowLifecycleContext,
  data: Omit<SubscriptionCancelledData, 'resubscribeUrl' | 'name'>
): Promise<GrowEmailResult> {
  const recipient = await resolveRecipient(ctx.supabase, ctx.userId);
  if (!recipient) return { ok: false, skipped: 'no_recipient' };

  return sendGrowSubscriptionEmail({
    supabase: ctx.supabase,
    userId: ctx.userId,
    emailType: 'subscription_cancelled',
    dedupeKey: `subscription_cancelled:${ctx.stripeSubscriptionId ?? ctx.userId}`,
    recipient,
    stripeEventId: ctx.stripeEventId,
    stripeSubscriptionId: ctx.stripeSubscriptionId,
    rendered: renderSubscriptionCancelled({
      ...data,
      name: recipient.name,
      resubscribeUrl: GROW_PREMIUM_URL,
    }),
  });
}
