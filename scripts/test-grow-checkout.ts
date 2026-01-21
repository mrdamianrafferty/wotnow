/**
 * Test Grow Daisy Checkout Flow
 *
 * Tests the complete checkout flow:
 * 1. Validates subscription tier configuration
 * 2. Tests checkout session creation
 * 3. Verifies Stripe price IDs are valid
 */

import Stripe from 'stripe';
import { GROW_TIERS, GrowSubscriptionTier, GrowSubscriptionType } from '../lib/grow/subscription';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

interface TestResult {
  test: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

async function testPriceExists(priceId: string | undefined, tier: string, billingType: string): Promise<boolean> {
  if (!priceId) {
    log('⚠️', `No price ID configured for ${tier} ${billingType}`);
    return false;
  }

  try {
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
    const currency = price.currency.toUpperCase();
    const recurring = price.recurring ? `${price.recurring.interval}ly` : 'one-time';

    log('✅', `${tier} ${billingType}: €${amount} ${currency} (${recurring})`);
    return true;
  } catch (error) {
    log('❌', `${tier} ${billingType}: Price ${priceId} not found in Stripe`);
    return false;
  }
}

async function testTierConfiguration() {
  log('🧪', 'Testing tier configuration...\n');

  const tiers: GrowSubscriptionTier[] = ['sprout', 'bloom', 'harvest', 'orchard'];
  const billingTypes: GrowSubscriptionType[] = ['monthly', 'annual', 'lifetime'];

  let allPricesValid = true;

  for (const tier of tiers) {
    const tierInfo = GROW_TIERS[tier];
    log('📦', `\n${tierInfo.name} (${tierInfo.tagline})`);

    for (const billingType of billingTypes) {
      const price = tierInfo.pricing[billingType];
      const priceId = tierInfo.stripePriceIds?.[billingType];

      // Skip if tier doesn't offer this billing type
      if (price === null) {
        log('⏭️', `  ${billingType}: Not offered`);
        continue;
      }

      const isValid = await testPriceExists(priceId, tier, billingType);
      if (!isValid) allPricesValid = false;
    }
  }

  results.push({
    test: 'All Stripe prices configured correctly',
    passed: allPricesValid,
  });
}

async function testCheckoutSessionCreation() {
  log('\n🧪', 'Testing checkout session creation...\n');

  // Test creating a checkout session for Bloom annual (most popular)
  const bloomPriceId = GROW_TIERS.bloom.stripePriceIds?.annual;

  if (!bloomPriceId) {
    results.push({
      test: 'Create checkout session',
      passed: false,
      details: 'No Bloom annual price ID configured',
    });
    return;
  }

  try {
    // Create a test customer
    const customer = await stripe.customers.create({
      email: 'test-checkout@growdaisy.test',
      metadata: {
        test: 'true',
        supabase_user_id: 'test-user-checkout',
        app: 'grow_daisy',
      },
    });

    log('✅', `Created test customer: ${customer.id}`);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: bloomPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://grow.godaisy.io/grow/settings?subscription=success&tier=bloom',
      cancel_url: 'https://grow.godaisy.io/grow/premium?canceled=true',
      subscription_data: {
        metadata: {
          supabase_user_id: 'test-user-checkout',
          app: 'grow_daisy',
          tier: 'bloom',
          billing_type: 'annual',
        },
        trial_period_days: 7,
      },
      metadata: {
        supabase_user_id: 'test-user-checkout',
        app: 'grow_daisy',
        tier: 'bloom',
        billing_type: 'annual',
      },
    });

    log('✅', `Created checkout session: ${session.id}`);
    log('🔗', `Checkout URL: ${session.url}`);

    results.push({
      test: 'Create checkout session',
      passed: true,
      details: `Session ID: ${session.id}`,
    });

    // Clean up test customer
    await stripe.customers.del(customer.id);
    log('🧹', `Cleaned up test customer`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('❌', `Failed to create checkout session: ${message}`);
    results.push({
      test: 'Create checkout session',
      passed: false,
      details: message,
    });
  }
}

async function testLifetimePurchase() {
  log('\n🧪', 'Testing lifetime purchase flow...\n');

  const harvestLifetimeId = GROW_TIERS.harvest.stripePriceIds?.lifetime;

  if (!harvestLifetimeId) {
    results.push({
      test: 'Create lifetime checkout',
      passed: false,
      details: 'No Harvest lifetime price ID configured',
    });
    return;
  }

  try {
    const customer = await stripe.customers.create({
      email: 'test-lifetime@growdaisy.test',
      metadata: { test: 'true', app: 'grow_daisy' },
    });

    // Lifetime purchases use mode: 'payment' not 'subscription'
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: harvestLifetimeId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment for lifetime
      success_url: 'https://grow.godaisy.io/grow/settings?subscription=success&tier=harvest',
      cancel_url: 'https://grow.godaisy.io/grow/premium?canceled=true',
      metadata: {
        supabase_user_id: 'test-user-lifetime',
        app: 'grow_daisy',
        tier: 'harvest',
        billing_type: 'lifetime',
      },
    });

    log('✅', `Created lifetime checkout session: ${session.id}`);
    log('🔗', `Checkout URL: ${session.url}`);

    results.push({
      test: 'Create lifetime checkout',
      passed: true,
      details: `Session ID: ${session.id}`,
    });

    await stripe.customers.del(customer.id);
    log('🧹', `Cleaned up test customer`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('❌', `Failed to create lifetime checkout: ${message}`);
    results.push({
      test: 'Create lifetime checkout',
      passed: false,
      details: message,
    });
  }
}

async function testVoucherFlow() {
  log('\n🧪', 'Testing voucher/coupon flow...\n');

  try {
    // Create a test coupon
    const coupon = await stripe.coupons.create({
      percent_off: 25,
      duration: 'once',
      name: 'Test Voucher EARLYBIRD25',
    });

    log('✅', `Created test coupon: ${coupon.id} (25% off)`);

    const customer = await stripe.customers.create({
      email: 'test-voucher@growdaisy.test',
      metadata: { test: 'true', app: 'grow_daisy' },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: GROW_TIERS.bloom.stripePriceIds?.annual!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://grow.godaisy.io/grow/settings?subscription=success',
      cancel_url: 'https://grow.godaisy.io/grow/premium?canceled=true',
      discounts: [{ coupon: coupon.id }],
      metadata: {
        supabase_user_id: 'test-user-voucher',
        app: 'grow_daisy',
        tier: 'bloom',
        billing_type: 'annual',
        voucherCode: 'EARLYBIRD25',
      },
    });

    log('✅', `Created checkout session with discount: ${session.id}`);

    results.push({
      test: 'Create checkout with voucher',
      passed: true,
    });

    // Cleanup
    await stripe.customers.del(customer.id);
    await stripe.coupons.del(coupon.id);
    log('🧹', `Cleaned up test data`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('❌', `Failed voucher test: ${message}`);
    results.push({
      test: 'Create checkout with voucher',
      passed: false,
      details: message,
    });
  }
}

async function testWebhookSecret() {
  log('\n🧪', 'Testing webhook configuration...\n');

  const webhookSecret = process.env.STRIPE_GROW_WEBHOOK_SECRET;

  if (webhookSecret && webhookSecret.startsWith('whsec_')) {
    log('✅', 'Webhook secret configured correctly');
    results.push({
      test: 'Webhook secret configured',
      passed: true,
    });
  } else {
    log('❌', 'Webhook secret not configured or invalid format');
    results.push({
      test: 'Webhook secret configured',
      passed: false,
      details: 'STRIPE_GROW_WEBHOOK_SECRET should start with whsec_',
    });
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  Grow Daisy Checkout Flow Test');
  console.log('═'.repeat(60));
  console.log();

  await testTierConfiguration();
  await testCheckoutSessionCreation();
  await testLifetimePurchase();
  await testVoucherFlow();
  await testWebhookSecret();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('  Test Summary');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log();
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}${result.details ? ` (${result.details})` : ''}`);
  }

  console.log();
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('═'.repeat(60));

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
