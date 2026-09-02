/**
 * Grow Daisy transactional email templates.
 *
 * Every generator returns { subject, html, text }. The text part is not
 * optional politeness: a message sent with only an HTML part scores worse with
 * spam filters, and this domain is brand new to Resend with no sending
 * reputation, so the multipart alternative matters more than usual here.
 *
 * HTML is deliberately old-fashioned — tables, inline styles, no flexbox or
 * grid, no <style> block relied upon for layout. Outlook renders through Word,
 * and Gmail strips <head> styles entirely.
 *
 * Copy rules baked in here, derived from how the product actually bills:
 * - The 7-day trial exists ONLY on monthly plans (see create-checkout-session.ts).
 *   Annual and lifetime purchases have no trial, so no template promises one.
 * - Cancellation instructions differ by platform. iOS subscribers CANNOT use
 *   the Stripe billing portal; they must go through Apple. Passing the wrong
 *   platform here sends a subscriber somewhere that cannot work for them.
 *
 * @module lib/grow/emailTemplates
 */

// =============================================================================
// TYPES
// =============================================================================

export type GrowEmailPlatform = 'web' | 'ios';

export interface GrowEmailRendered {
  subject: string;
  html: string;
  text: string;
}

interface ShellOptions {
  /** Preheader: the grey line clients show next to the subject. */
  preview: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
}

export interface TrialStartedData {
  name?: string | null;
  tierName: string;
  /** Already-formatted, e.g. "9 September 2026". */
  trialEndsOn: string;
  /** Already-formatted with currency, e.g. "€6.99". */
  firstChargeAmount: string;
  platform: GrowEmailPlatform;
  manageUrl: string;
}

export interface TrialEndingData {
  name?: string | null;
  tierName: string;
  trialEndsOn: string;
  chargeAmount: string;
  platform: GrowEmailPlatform;
  manageUrl: string;
}

export interface SubscriptionConfirmedData {
  name?: string | null;
  tierName: string;
  amount: string;
  /** "month" | "year" | null for lifetime. */
  interval: 'month' | 'year' | null;
  /** Formatted date, or null for lifetime. */
  nextBillingOn: string | null;
  platform: GrowEmailPlatform;
  manageUrl: string;
}

export interface PaymentFailedData {
  name?: string | null;
  tierName: string;
  amount: string;
  /** When Stripe will retry, already formatted. Null if it won't. */
  nextAttemptOn: string | null;
  platform: GrowEmailPlatform;
  manageUrl: string;
}

export interface SubscriptionCancelledData {
  name?: string | null;
  tierName: string;
  /** Formatted date access actually ends — usually the paid period end. */
  accessEndsOn: string | null;
  resubscribeUrl: string;
}

// =============================================================================
// SHELL
// =============================================================================

const BRAND = {
  green: '#15803d',
  greenDark: '#166534',
  ink: '#1f2937',
  muted: '#6b7280',
  hairline: '#e5e7eb',
  canvas: '#f4f6f4',
};

export const GROW_SUPPORT_EMAIL = 'hello@godaisy.io';

/** Escape a value destined for HTML. Names come from user input. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Make a URL safe to drop into an href.
 *
 * Two separate problems, both needed:
 *  - Scheme. HTML-escaping does nothing to `javascript:` or `data:` URLs, so
 *    the scheme is allow-listed to http/https first. Anything else collapses
 *    to '#' rather than rendering a live hostile link.
 *  - Attribute context. Even a legitimate URL containing a quote would close
 *    the href early and let the rest be parsed as markup, so the survivor is
 *    still entity-escaped.
 *
 * Every caller today passes a constant built from NEXT_PUBLIC_BASE_URL, so
 * this is defence in depth — but these generators are exported with plain
 * `string` parameters, and a per-user deep link is an obvious future change.
 */
export function safeUrl(url: string): string {
  const raw = (url || '').trim();
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return '#';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '#';
  return escapeHtml(parsed.toString());
}

/** "Hi Damian," or a neutral "Hi," when we have no name. */
function greeting(name?: string | null): string {
  const trimmed = (name || '').trim();
  return trimmed ? `Hi ${trimmed},` : 'Hi,';
}

/**
 * How this subscriber cancels. Web goes to the Stripe billing portal; iOS must
 * go through Apple, which is the whole reason platform is threaded through
 * every template.
 */
function cancelClause(platform: GrowEmailPlatform, manageUrl: string): string {
  return platform === 'ios'
    ? 'cancel any time in iOS Settings &rarr; tap your name &rarr; Subscriptions. Because the purchase is held by Apple, cancellation has to happen there — we cannot do it for you from our end.'
    : `cancel any time from <a href="${safeUrl(manageUrl)}" style="color:${BRAND.green};">your subscription settings</a>.`;
}

function cancelClauseText(platform: GrowEmailPlatform, manageUrl: string): string {
  return platform === 'ios'
    ? 'cancel any time in iOS Settings > tap your name > Subscriptions. Because the purchase is held by Apple, cancellation has to happen there - we cannot do it for you from our end.'
    : `cancel any time from your subscription settings: ${manageUrl}`;
}

/** Where this subscriber updates their card, which differs by platform. */
function updatePaymentClause(platform: GrowEmailPlatform, manageUrl: string): string {
  return platform === 'ios'
    ? 'do that in iOS Settings &rarr; tap your name &rarr; Payment &amp; Shipping. Because Apple holds the payment method, it has to be changed there.'
    : `<a href="${safeUrl(manageUrl)}" style="color:${BRAND.green};">update your payment details here</a>.`;
}

/** Sentence-initial form: "You can cancel any time ...". */
function cancelSentence(platform: GrowEmailPlatform, manageUrl: string): string {
  return `You can ${cancelClause(platform, manageUrl)}`;
}

function cancelSentenceText(platform: GrowEmailPlatform, manageUrl: string): string {
  return `You can ${cancelClauseText(platform, manageUrl)}`;
}

function shell({ preview, heading, bodyHtml, cta }: ShellOptions): string {
  const ctaHtml = cta
    ? `<tr><td style="padding:8px 0 24px;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0">
           <tr><td bgcolor="${BRAND.green}" style="border-radius:8px;">
             <a href="${safeUrl(cta.url)}"
                style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
               ${escapeHtml(cta.label)}
             </a>
           </td></tr>
         </table>
       </td></tr>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.canvas};">
<div style="display:none;font-size:1px;color:${BRAND.canvas};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.canvas};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid ${BRAND.hairline};">
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${BRAND.greenDark};letter-spacing:0.02em;">
              Grow Daisy
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0;">
            <h1 style="margin:0 0 12px;font-family:Helvetica,Arial,sans-serif;font-size:21px;line-height:1.3;font-weight:700;color:${BRAND.ink};">
              ${escapeHtml(heading)}
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.ink};">
            ${bodyHtml}
          </td>
        </tr>
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${ctaHtml}</table>
        </td></tr>
        <tr>
          <td style="padding:8px 32px 28px;border-top:1px solid ${BRAND.hairline};">
            <p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.muted};">
              Questions? Just reply to this email — it reaches a person.
            </p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${BRAND.muted};">
        Grow Daisy &middot; <a href="https://grow.godaisy.io" style="color:${BRAND.muted};">grow.godaisy.io</a>
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Wrap plain text consistently so every message signs off the same way. */
function textShell(lines: string[]): string {
  return [...lines, '', '--', 'Grow Daisy', 'https://grow.godaisy.io', `Questions? Reply to this email or write to ${GROW_SUPPORT_EMAIL}`].join('\n');
}

// =============================================================================
// 1. TRIAL STARTED
// =============================================================================

export function renderTrialStarted(d: TrialStartedData): GrowEmailRendered {
  const subject = `Your Grow Daisy ${d.tierName} trial has started`;
  const name = escapeHtml(greeting(d.name));
  const tier = escapeHtml(d.tierName);

  const bodyHtml = `
    <p style="margin:0 0 16px;">${name}</p>
    <p style="margin:0 0 16px;">
      Your 7-day free trial of <strong>Grow Daisy ${tier}</strong> is active — every ${tier} feature is
      unlocked from now until <strong>${escapeHtml(d.trialEndsOn)}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:0 0 20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <tr><td style="padding:14px 16px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">
        <strong>What happens next:</strong><br>
        Your trial ends on ${escapeHtml(d.trialEndsOn)}. Unless you cancel before then, your subscription
        starts automatically and you will be charged <strong>${escapeHtml(d.firstChargeAmount)}</strong>.
        We will email you a reminder a few days beforehand.
      </td></tr>
    </table>
    <p style="margin:0 0 16px;">${cancelSentence(d.platform, d.manageUrl)} Cancel before ${escapeHtml(d.trialEndsOn)} and you will not be charged anything at all.</p>
  `;

  const text = textShell([
    greeting(d.name),
    '',
    `Your 7-day free trial of Grow Daisy ${d.tierName} is active - every ${d.tierName} feature is unlocked from now until ${d.trialEndsOn}.`,
    '',
    'WHAT HAPPENS NEXT',
    `Your trial ends on ${d.trialEndsOn}. Unless you cancel before then, your subscription starts automatically and you will be charged ${d.firstChargeAmount}. We will email you a reminder a few days beforehand.`,
    '',
    `${cancelSentenceText(d.platform, d.manageUrl)}`,
    `Cancel before ${d.trialEndsOn} and you will not be charged anything at all.`,
  ]);

  return {
    subject,
    text,
    html: shell({
      preview: `Free until ${d.trialEndsOn}. Cancel any time before then and you won't be charged.`,
      heading: `Your ${d.tierName} trial is under way`,
      bodyHtml,
      cta: { label: 'Open Grow Daisy', url: 'https://grow.godaisy.io/grow' },
    }),
  };
}

// =============================================================================
// 2. TRIAL ENDING SOON
// =============================================================================

export function renderTrialEnding(d: TrialEndingData): GrowEmailRendered {
  const subject = `Your Grow Daisy trial ends on ${d.trialEndsOn}`;
  const name = escapeHtml(greeting(d.name));
  const tier = escapeHtml(d.tierName);

  const bodyHtml = `
    <p style="margin:0 0 16px;">${name}</p>
    <p style="margin:0 0 16px;">
      A quick heads-up: your free trial of <strong>Grow Daisy ${tier}</strong> ends on
      <strong>${escapeHtml(d.trialEndsOn)}</strong>.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:0 0 20px;background-color:#fefce8;border:1px solid #fde68a;border-radius:8px;">
      <tr><td style="padding:14px 16px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">
        On ${escapeHtml(d.trialEndsOn)} your subscription will begin and you will be charged
        <strong>${escapeHtml(d.chargeAmount)}</strong>. No action is needed if you would like to carry on.
      </td></tr>
    </table>
    <p style="margin:0 0 16px;">
      If Grow Daisy is not for you, you can ${cancelClause(d.platform, d.manageUrl)}
      Cancel before ${escapeHtml(d.trialEndsOn)} and you will not be charged.
    </p>
  `;

  const text = textShell([
    greeting(d.name),
    '',
    `A quick heads-up: your free trial of Grow Daisy ${d.tierName} ends on ${d.trialEndsOn}.`,
    '',
    `On ${d.trialEndsOn} your subscription will begin and you will be charged ${d.chargeAmount}. No action is needed if you would like to carry on.`,
    '',
    `If Grow Daisy is not for you: ${cancelSentenceText(d.platform, d.manageUrl)}`,
    `Cancel before ${d.trialEndsOn} and you will not be charged.`,
  ]);

  return {
    subject,
    text,
    html: shell({
      preview: `You'll be charged ${d.chargeAmount} on ${d.trialEndsOn} unless you cancel.`,
      heading: 'Your free trial ends in a few days',
      bodyHtml,
      cta: { label: 'Manage subscription', url: d.manageUrl },
    }),
  };
}

// =============================================================================
// 3. SUBSCRIPTION CONFIRMED
// =============================================================================

export function renderSubscriptionConfirmed(d: SubscriptionConfirmedData): GrowEmailRendered {
  const isLifetime = d.interval === null;
  const subject = isLifetime
    ? `Your Grow Daisy ${d.tierName} purchase is confirmed`
    : `Your Grow Daisy ${d.tierName} subscription is active`;

  const name = escapeHtml(greeting(d.name));
  const tier = escapeHtml(d.tierName);
  const cadence = d.interval === 'year' ? 'a year' : 'a month';

  const billingRow = isLifetime
    ? `<tr><td style="padding:4px 0;color:${BRAND.muted};">Billing</td>
         <td style="padding:4px 0;text-align:right;"><strong>One-off payment — no renewal</strong></td></tr>`
    : `<tr><td style="padding:4px 0;color:${BRAND.muted};">Renews</td>
         <td style="padding:4px 0;text-align:right;"><strong>${d.nextBillingOn ? escapeHtml(d.nextBillingOn) : '&mdash;'}</strong></td></tr>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">${name}</p>
    <p style="margin:0 0 16px;">
      Thank you — your <strong>Grow Daisy ${tier}</strong> ${isLifetime ? 'purchase' : 'subscription'} is confirmed and every
      ${tier} feature is now unlocked on your account.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:0 0 20px;border:1px solid ${BRAND.hairline};border-radius:8px;">
      <tr><td style="padding:14px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">
          <tr><td style="padding:4px 0;color:${BRAND.muted};">Plan</td>
              <td style="padding:4px 0;text-align:right;"><strong>${tier}</strong></td></tr>
          <tr><td style="padding:4px 0;color:${BRAND.muted};">Amount</td>
              <td style="padding:4px 0;text-align:right;"><strong>${escapeHtml(d.amount)}${isLifetime ? '' : ` ${escapeHtml(cadence)}`}</strong></td></tr>
          ${billingRow}
        </table>
      </td></tr>
    </table>
    ${isLifetime ? '' : `<p style="margin:0 0 16px;">${cancelSentence(d.platform, d.manageUrl)}</p>`}
  `;

  const text = textShell([
    greeting(d.name),
    '',
    `Thank you - your Grow Daisy ${d.tierName} ${isLifetime ? 'purchase' : 'subscription'} is confirmed and every ${d.tierName} feature is now unlocked on your account.`,
    '',
    `Plan:   ${d.tierName}`,
    `Amount: ${d.amount}${isLifetime ? '' : ` ${cadence}`}`,
    isLifetime ? 'Billing: One-off payment - no renewal' : `Renews: ${d.nextBillingOn || 'unknown'}`,
    ...(isLifetime ? [] : ['', cancelSentenceText(d.platform, d.manageUrl)]),
  ]);

  return {
    subject,
    text,
    html: shell({
      preview: `${d.tierName} is unlocked on your account.`,
      heading: isLifetime ? 'Your purchase is confirmed' : 'Your subscription is active',
      bodyHtml,
      cta: { label: 'Open Grow Daisy', url: 'https://grow.godaisy.io/grow' },
    }),
  };
}

// =============================================================================
// 4. PAYMENT FAILED (dunning)
// =============================================================================

/**
 * Sent when a renewal charge fails.
 *
 * The tone matters more here than anywhere else in the set. Access has NOT
 * been withdrawn at this point — the webhook deliberately leaves the tier
 * alone while Stripe retries over several days, and most failures recover on
 * their own. So this must not read as a cut-off notice: it is a "your card
 * needs a look" nudge. Overstating it drives cancellations that the retry
 * would have prevented anyway.
 */
export function renderPaymentFailed(d: PaymentFailedData): GrowEmailRendered {
  const subject = 'We could not process your Grow Daisy payment';
  const name = escapeHtml(greeting(d.name));
  const tier = escapeHtml(d.tierName);

  const retryHtml = d.nextAttemptOn
    ? `We will try again automatically on <strong>${escapeHtml(d.nextAttemptOn)}</strong>, so there may be nothing for you to do — this often resolves itself.`
    : `We will retry automatically over the next few days, so there may be nothing for you to do.`;

  const retryText = d.nextAttemptOn
    ? `We will try again automatically on ${d.nextAttemptOn}, so there may be nothing for you to do - this often resolves itself.`
    : 'We will retry automatically over the next few days, so there may be nothing for you to do.';

  const bodyHtml = `
    <p style="margin:0 0 16px;">${name}</p>
    <p style="margin:0 0 16px;">
      We tried to charge <strong>${escapeHtml(d.amount)}</strong> for your Grow Daisy ${tier}
      subscription and the payment did not go through.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:0 0 20px;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <tr><td style="padding:14px 16px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.ink};">
        <strong>Your ${tier} features are still switched on.</strong> ${retryHtml}
      </td></tr>
    </table>
    <p style="margin:0 0 16px;">
      If your card has expired or been replaced, updating it now will save the retry a wasted trip — you can
      ${updatePaymentClause(d.platform, d.manageUrl)}
    </p>
  `;

  const text = textShell([
    greeting(d.name),
    '',
    `We tried to charge ${d.amount} for your Grow Daisy ${d.tierName} subscription and the payment did not go through.`,
    '',
    `YOUR ${d.tierName.toUpperCase()} FEATURES ARE STILL SWITCHED ON. ${retryText}`,
    '',
    'If your card has expired or been replaced, updating it now will save the retry a wasted trip.',
    d.platform === 'ios'
      ? 'Update your payment details in iOS Settings > tap your name > Payment & Shipping.'
      : `Update your payment details here: ${d.manageUrl}`,
  ]);

  return {
    subject,
    text,
    html: shell({
      preview: 'Your features are still on — we just could not take the payment.',
      heading: 'That payment did not go through',
      bodyHtml,
      cta: { label: 'Update payment details', url: d.manageUrl },
    }),
  };
}

// =============================================================================
// 5. SUBSCRIPTION CANCELLED
// =============================================================================

export function renderSubscriptionCancelled(d: SubscriptionCancelledData): GrowEmailRendered {
  const subject = 'Your Grow Daisy subscription has been cancelled';
  const name = escapeHtml(greeting(d.name));
  const tier = escapeHtml(d.tierName);

  const accessLine = d.accessEndsOn
    ? `You keep full <strong>${tier}</strong> access until <strong>${escapeHtml(d.accessEndsOn)}</strong>, after which your account moves to the free Seed plan.`
    : `Your account has moved to the free Seed plan.`;

  const accessLineText = d.accessEndsOn
    ? `You keep full ${d.tierName} access until ${d.accessEndsOn}, after which your account moves to the free Seed plan.`
    : 'Your account has moved to the free Seed plan.';

  const bodyHtml = `
    <p style="margin:0 0 16px;">${name}</p>
    <p style="margin:0 0 16px;">
      Your Grow Daisy ${tier} subscription has been cancelled and will not renew. ${accessLine}
    </p>
    <p style="margin:0 0 16px;">
      Your garden, plants and history all stay exactly where they are — nothing is deleted, and everything
      comes straight back if you resubscribe later.
    </p>
    <p style="margin:0 0 16px;">
      If you cancelled by accident, or something went wrong that we could have fixed, just reply to this
      email and tell us. We read every one.
    </p>
  `;

  const text = textShell([
    greeting(d.name),
    '',
    `Your Grow Daisy ${d.tierName} subscription has been cancelled and will not renew. ${accessLineText}`,
    '',
    'Your garden, plants and history all stay exactly where they are - nothing is deleted, and everything comes straight back if you resubscribe later.',
    '',
    'If you cancelled by accident, or something went wrong that we could have fixed, just reply to this email and tell us. We read every one.',
    '',
    `Resubscribe any time: ${d.resubscribeUrl}`,
  ]);

  return {
    subject,
    text,
    html: shell({
      preview: d.accessEndsOn ? `Access continues until ${d.accessEndsOn}.` : 'Your account has moved to the free Seed plan.',
      heading: 'Your subscription has been cancelled',
      bodyHtml,
      cta: { label: 'Resubscribe', url: d.resubscribeUrl },
    }),
  };
}
