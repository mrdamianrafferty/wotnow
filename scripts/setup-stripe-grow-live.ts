/**
 * Setup Grow Daisy Stripe Products in LIVE Mode
 *
 * Creates all products and prices for Grow Daisy subscription tiers.
 * Run this once to set up your live Stripe account.
 *
 * Usage: npx tsx scripts/setup-stripe-grow-live.ts
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set');
  process.exit(1);
}

if (!STRIPE_SECRET_KEY.startsWith('sk_live_')) {
  console.error('❌ This script requires a LIVE mode key (sk_live_...)');
  console.error('   Current key starts with:', STRIPE_SECRET_KEY.substring(0, 10));
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

interface TierConfig {
  name: string;
  description: string;
  prices: {
    monthly?: number;
    annual?: number;
    lifetime?: number;
  };
}

const TIERS: Record<string, TierConfig> = {
  sprout: {
    name: 'Grow Daisy Sprout',
    description: 'The Organized Gardener - 75 plants, 20 AI IDs/month, 7-day forecast',
    prices: {
      monthly: 3.99,
      annual: 29.99,
      lifetime: 59.99,
    },
  },
  bloom: {
    name: 'Grow Daisy Bloom',
    description: 'The Weather-Smart Gardener - Unlimited plants, soil temperature, frost alerts, smart watering',
    prices: {
      monthly: 6.99,
      annual: 49.99,
      lifetime: 99.99,
    },
  },
  harvest: {
    name: 'Grow Daisy Harvest',
    description: 'The Productive Gardener - Yield predictions, analytics, team sharing, AI expert access',
    prices: {
      monthly: 11.99,
      annual: 79.99,
      lifetime: 149.99,
    },
  },
  orchard: {
    name: 'Grow Daisy Orchard',
    description: 'The Professional - API access, white-label, unlimited teams, priority support',
    prices: {
      annual: 199.00,
      lifetime: 399.00,
    },
  },
};

interface CreatedPrice {
  tier: string;
  billingType: string;
  priceId: string;
  amount: number;
}

const createdPrices: CreatedPrice[] = [];

async function createProduct(tierId: string, config: TierConfig): Promise<string> {
  console.log(`\n📦 Creating product: ${config.name}`);

  const product = await stripe.products.create({
    name: config.name,
    description: config.description,
    metadata: {
      app: 'grow_daisy',
      tier: tierId,
    },
  });

  console.log(`   ✅ Product created: ${product.id}`);
  return product.id;
}

async function createPrice(
  productId: string,
  tierId: string,
  billingType: 'monthly' | 'annual' | 'lifetime',
  amount: number
): Promise<string> {
  const isRecurring = billingType !== 'lifetime';

  const priceParams: Stripe.PriceCreateParams = {
    product: productId,
    currency: 'eur',
    unit_amount: Math.round(amount * 100), // Convert to cents
    metadata: {
      app: 'grow_daisy',
      tier: tierId,
      billing_type: billingType,
    },
  };

  if (isRecurring) {
    priceParams.recurring = {
      interval: billingType === 'monthly' ? 'month' : 'year',
    };
  }

  const price = await stripe.prices.create(priceParams);

  console.log(`   💰 ${billingType}: €${amount} → ${price.id}`);

  createdPrices.push({
    tier: tierId,
    billingType,
    priceId: price.id,
    amount,
  });

  return price.id;
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  Grow Daisy - Create LIVE Stripe Products');
  console.log('═'.repeat(60));
  console.log();
  console.log('⚠️  WARNING: This will create LIVE products in Stripe!');
  console.log('   These will be visible to real customers.');
  console.log();

  try {
    // Create all products and prices
    for (const [tierId, config] of Object.entries(TIERS)) {
      const productId = await createProduct(tierId, config);

      // Create prices for this tier
      if (config.prices.monthly) {
        await createPrice(productId, tierId, 'monthly', config.prices.monthly);
      }
      if (config.prices.annual) {
        await createPrice(productId, tierId, 'annual', config.prices.annual);
      }
      if (config.prices.lifetime) {
        await createPrice(productId, tierId, 'lifetime', config.prices.lifetime);
      }
    }

    // Output environment variables
    console.log('\n' + '═'.repeat(60));
    console.log('  Environment Variables to Add');
    console.log('═'.repeat(60));
    console.log('\nAdd these to your .env.local:\n');

    const envVars: string[] = [];

    for (const price of createdPrices) {
      const varName = `STRIPE_GROW_${price.tier.toUpperCase()}_${price.billingType.toUpperCase()}_PRICE_ID`;
      envVars.push(`${varName}=${price.priceId}`);
    }

    // Sort for consistent ordering
    envVars.sort();

    for (const envVar of envVars) {
      console.log(envVar);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  Setup Complete!');
    console.log('═'.repeat(60));
    console.log(`\n✅ Created ${Object.keys(TIERS).length} products`);
    console.log(`✅ Created ${createdPrices.length} prices`);
    console.log('\nNext steps:');
    console.log('1. Copy the environment variables above to .env.local');
    console.log('2. Deploy to Vercel and add them there too');
    console.log('3. Test the checkout flow');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
