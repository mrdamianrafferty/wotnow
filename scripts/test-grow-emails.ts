/**
 * Render (and optionally send) the Grow Daisy subscription emails for review.
 *
 * Preview to files — no sending, no API key needed:
 *   npx tsx scripts/test-grow-emails.ts
 *
 * Send real copies to yourself:
 *   TEST_EMAIL=you@example.com npx tsx scripts/test-grow-emails.ts --send
 *
 * Sending requires RESEND_API_KEY (run `npm run env:sync` first) AND a verified
 * godaisy.io domain in Resend. Without verification Resend rejects the send with
 * a 403 — that is the expected failure, not a bug in the templates.
 *
 * Deliberately does not import the Stripe webhook or Supabase: this renders
 * templates from fixture data only, so it is safe to run against any
 * environment.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Resend } from 'resend';
import {
  renderTrialStarted,
  renderTrialEnding,
  renderSubscriptionConfirmed,
  renderSubscriptionCancelled,
  renderPaymentFailed,
  type GrowEmailRendered,
} from '../lib/grow/emailTemplates';

const OUT_DIR = join(process.cwd(), '.email-previews');
const SEND = process.argv.includes('--send');
const TEST_EMAIL = process.env.TEST_EMAIL;

const samples: Array<{ key: string; label: string; rendered: GrowEmailRendered }> = [
  {
    key: 'trial-started',
    label: 'Trial started (monthly Bloom, web)',
    rendered: renderTrialStarted({
      name: 'Damian',
      tierName: 'Bloom',
      trialEndsOn: '9 September 2026',
      firstChargeAmount: '€6.99',
      platform: 'web',
      manageUrl: 'https://grow.godaisy.io/grow/support',
    }),
  },
  {
    key: 'trial-ending',
    label: 'Trial ending in 3 days (web)',
    rendered: renderTrialEnding({
      name: 'Damian',
      tierName: 'Bloom',
      trialEndsOn: '9 September 2026',
      chargeAmount: '€6.99',
      platform: 'web',
      manageUrl: 'https://grow.godaisy.io/grow/support',
    }),
  },
  {
    key: 'trial-ending-ios',
    label: 'Trial ending — iOS copy (cancels via Apple, NOT Stripe portal)',
    rendered: renderTrialEnding({
      name: null, // exercises the no-name greeting
      tierName: 'Bloom',
      trialEndsOn: '9 September 2026',
      chargeAmount: '€6.99',
      platform: 'ios',
      manageUrl: 'https://grow.godaisy.io/grow/support',
    }),
  },
  {
    key: 'confirmed-monthly',
    label: 'Subscription confirmed (monthly)',
    rendered: renderSubscriptionConfirmed({
      name: 'Damian',
      tierName: 'Bloom',
      amount: '€6.99',
      interval: 'month',
      nextBillingOn: '9 October 2026',
      platform: 'web',
      manageUrl: 'https://grow.godaisy.io/grow/support',
    }),
  },
  {
    key: 'confirmed-lifetime',
    label: 'Purchase confirmed (lifetime — must not mention renewal or trial)',
    rendered: renderSubscriptionConfirmed({
      name: 'Damian',
      tierName: 'Harvest',
      amount: '€149.99',
      interval: null,
      nextBillingOn: null,
      platform: 'web',
      manageUrl: 'https://grow.godaisy.io/grow/support',
    }),
  },
  {
    key: 'payment-failed',
    label: 'Payment failed (dunning — must NOT read as a cut-off)',
    rendered: renderPaymentFailed({
      name: 'Damian',
      tierName: 'Bloom',
      amount: '€6.99',
      nextAttemptOn: '5 September 2026',
      platform: 'web',
      manageUrl: 'https://grow.godaisy.io/grow/support',
    }),
  },
  {
    key: 'payment-failed-ios',
    label: 'Payment failed — iOS (card lives with Apple)',
    rendered: renderPaymentFailed({
      name: 'Damian',
      tierName: 'Bloom',
      amount: '€6.99',
      nextAttemptOn: null,
      platform: 'ios',
      manageUrl: 'https://grow.godaisy.io/grow/support',
    }),
  },
  {
    key: 'cancelled',
    label: 'Subscription cancelled (access continues to period end)',
    rendered: renderSubscriptionCancelled({
      name: 'Damian',
      tierName: 'Bloom',
      accessEndsOn: '9 October 2026',
      resubscribeUrl: 'https://grow.godaisy.io/grow/premium',
    }),
  },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const s of samples) {
    writeFileSync(join(OUT_DIR, `${s.key}.html`), s.rendered.html, 'utf8');
    writeFileSync(join(OUT_DIR, `${s.key}.txt`), s.rendered.text, 'utf8');
    console.log(`✓ ${s.key.padEnd(20)} ${s.rendered.subject}`);
  }

  console.log(`\nWrote ${samples.length * 2} files to ${OUT_DIR}`);

  if (!SEND) {
    console.log('\nOpen the .html files in a browser to review.');
    console.log('To send real copies:  TEST_EMAIL=you@example.com npx tsx scripts/test-grow-emails.ts --send');
    return;
  }

  if (!TEST_EMAIL) {
    console.error('\n--send requires TEST_EMAIL. Refusing to guess a recipient.');
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('\nRESEND_API_KEY not set. Run: npm run env:sync');
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  for (const s of samples) {
    const { data, error } = await resend.emails.send({
      from: 'Grow Daisy <hello@godaisy.io>',
      to: TEST_EMAIL,
      replyTo: 'hello@godaisy.io',
      subject: `[TEST ${s.key}] ${s.rendered.subject}`,
      html: s.rendered.html,
      text: s.rendered.text,
    });
    if (error) {
      console.error(`✗ ${s.key}: ${error.message ?? JSON.stringify(error)}`);
    } else {
      console.log(`✓ sent ${s.key} → ${TEST_EMAIL} (${data?.id})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
