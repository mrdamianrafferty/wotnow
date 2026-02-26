#!/usr/bin/env tsx
/**
 * RevenueCat Project Setup Script
 *
 * Creates all products, entitlements, offerings, and packages in RevenueCat
 * from the product definitions in lib/grow/revenueCatProducts.ts.
 *
 * Prerequisites:
 *   1. Create a RevenueCat account and project at app.revenuecat.com
 *   2. Add your iOS app (bundle ID: io.growdaisy.app)
 *   3. Generate a Secret API key (starts with sk_)
 *   4. Note your Project ID (starts with proj) and App ID (starts with app)
 *
 * Usage:
 *   REVENUECAT_SECRET_KEY=sk_xxx \
 *   REVENUECAT_PROJECT_ID=proj_xxx \
 *   REVENUECAT_APP_ID=app_xxx \
 *   npx tsx scripts/setup-revenuecat.ts
 *
 * This script is idempotent-ish: it will skip resources that already exist
 * (409 Conflict) and continue with the rest.
 */

const API_BASE = 'https://api.revenuecat.com/v2';

const SECRET_KEY = process.env.REVENUECAT_SECRET_KEY;
const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID;
const APP_ID = process.env.REVENUECAT_APP_ID;

if (!SECRET_KEY || !PROJECT_ID || !APP_ID) {
  console.error('Missing required environment variables:');
  console.error('  REVENUECAT_SECRET_KEY  - Secret API key (sk_xxx)');
  console.error('  REVENUECAT_PROJECT_ID  - Project ID (proj_xxx)');
  console.error('  REVENUECAT_APP_ID      - iOS App ID (app_xxx)');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Product definitions (mirrors lib/grow/revenueCatProducts.ts)
// ---------------------------------------------------------------------------

interface ProductDef {
  storeId: string;
  tier: string;
  billingType: 'monthly' | 'annual' | 'lifetime';
  type: 'subscription' | 'non_consumable';
  displayName: string;
}

const PRODUCTS: ProductDef[] = [
  // Sprout
  { storeId: 'growdaisy_sprout_monthly',  tier: 'sprout',  billingType: 'monthly',  type: 'subscription',    displayName: 'Sprout Monthly' },
  { storeId: 'growdaisy_sprout_annual',   tier: 'sprout',  billingType: 'annual',   type: 'subscription',    displayName: 'Sprout Annual' },
  { storeId: 'growdaisy_sprout_lifetime', tier: 'sprout',  billingType: 'lifetime', type: 'non_consumable',  displayName: 'Sprout Lifetime' },
  // Bloom
  { storeId: 'growdaisy_bloom_monthly',   tier: 'bloom',   billingType: 'monthly',  type: 'subscription',    displayName: 'Bloom Monthly' },
  { storeId: 'growdaisy_bloom_annual',    tier: 'bloom',   billingType: 'annual',   type: 'subscription',    displayName: 'Bloom Annual' },
  { storeId: 'growdaisy_bloom_lifetime',  tier: 'bloom',   billingType: 'lifetime', type: 'non_consumable',  displayName: 'Bloom Lifetime' },
  // Harvest
  { storeId: 'growdaisy_harvest_monthly', tier: 'harvest', billingType: 'monthly',  type: 'subscription',    displayName: 'Harvest Monthly' },
  { storeId: 'growdaisy_harvest_annual',  tier: 'harvest', billingType: 'annual',   type: 'subscription',    displayName: 'Harvest Annual' },
  { storeId: 'growdaisy_harvest_lifetime',tier: 'harvest', billingType: 'lifetime', type: 'non_consumable',  displayName: 'Harvest Lifetime' },
  // Orchard (annual + lifetime only)
  { storeId: 'growdaisy_orchard_annual',  tier: 'orchard', billingType: 'annual',   type: 'subscription',    displayName: 'Orchard Annual' },
  { storeId: 'growdaisy_orchard_lifetime',tier: 'orchard', billingType: 'lifetime', type: 'non_consumable',  displayName: 'Orchard Lifetime' },
];

// Entitlements: each tier gets its own entitlement
const ENTITLEMENTS = [
  { lookupKey: 'sprout_access',  displayName: 'Sprout Access',  tiers: ['sprout'] },
  { lookupKey: 'bloom_access',   displayName: 'Bloom Access',   tiers: ['bloom'] },
  { lookupKey: 'harvest_access', displayName: 'Harvest Access', tiers: ['harvest'] },
  { lookupKey: 'orchard_access', displayName: 'Orchard Access', tiers: ['orchard'] },
];

// Package lookup keys
function packageLookupKey(tier: string, billing: string): string {
  return `$rc_custom_${tier}_${billing}`;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function rcFetch(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${API_BASE}/projects/${PROJECT_ID}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== RevenueCat Setup for Grow Daisy ===\n');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`App:     ${APP_ID}`);
  console.log(`Products to create: ${PRODUCTS.length}`);
  console.log(`Entitlements to create: ${ENTITLEMENTS.length}\n`);

  // Track created resource IDs
  const productIds: Record<string, string> = {}; // storeId → RC product ID
  const entitlementIds: Record<string, string> = {}; // lookupKey → RC entitlement ID

  // -------------------------------------------------------------------------
  // Step 1: Create Products
  // -------------------------------------------------------------------------
  log('1', 'Creating products...');

  for (const product of PRODUCTS) {
    const { ok, status, data } = await rcFetch('/products', {
      store_identifier: product.storeId,
      app_id: APP_ID,
      type: product.type === 'non_consumable' ? 'non_consumable' : 'subscription',
      display_name: product.displayName,
    });

    if (ok) {
      const id = (data as { id?: string }).id ?? '';
      productIds[product.storeId] = id;
      log('  +', `Created ${product.storeId} → ${id}`);
    } else if (status === 409) {
      // Already exists — try to find it
      log('  =', `${product.storeId} already exists, fetching...`);
      const existing = await findExistingProduct(product.storeId);
      if (existing) {
        productIds[product.storeId] = existing;
        log('  =', `Found existing: ${existing}`);
      } else {
        log('  !', `Could not find existing product ${product.storeId}`);
      }
    } else {
      log('  !', `Failed to create ${product.storeId}: ${status} ${JSON.stringify(data)}`);
    }

    // Respect rate limit (60/min)
    await sleep(1100);
  }

  console.log(`\n  Created/found ${Object.keys(productIds).length}/${PRODUCTS.length} products\n`);

  // -------------------------------------------------------------------------
  // Step 2: Create Entitlements
  // -------------------------------------------------------------------------
  log('2', 'Creating entitlements...');

  for (const ent of ENTITLEMENTS) {
    const { ok, status, data } = await rcFetch('/entitlements', {
      lookup_key: ent.lookupKey,
      display_name: ent.displayName,
    });

    if (ok) {
      const id = (data as { id?: string }).id ?? '';
      entitlementIds[ent.lookupKey] = id;
      log('  +', `Created ${ent.lookupKey} → ${id}`);
    } else if (status === 409) {
      log('  =', `${ent.lookupKey} already exists, fetching...`);
      const existing = await findExistingEntitlement(ent.lookupKey);
      if (existing) {
        entitlementIds[ent.lookupKey] = existing;
        log('  =', `Found existing: ${existing}`);
      }
    } else {
      log('  !', `Failed to create ${ent.lookupKey}: ${status} ${JSON.stringify(data)}`);
    }

    await sleep(1100);
  }

  console.log(`\n  Created/found ${Object.keys(entitlementIds).length}/${ENTITLEMENTS.length} entitlements\n`);

  // -------------------------------------------------------------------------
  // Step 3: Attach Products to Entitlements
  // -------------------------------------------------------------------------
  log('3', 'Attaching products to entitlements...');

  for (const ent of ENTITLEMENTS) {
    const entId = entitlementIds[ent.lookupKey];
    if (!entId) {
      log('  !', `Skipping ${ent.lookupKey} — no entitlement ID`);
      continue;
    }

    // Find all product IDs for this entitlement's tiers
    const tierProductIds = PRODUCTS
      .filter(p => ent.tiers.includes(p.tier))
      .map(p => productIds[p.storeId])
      .filter(Boolean);

    if (tierProductIds.length === 0) {
      log('  !', `No products found for ${ent.lookupKey}`);
      continue;
    }

    const { ok, status, data } = await rcFetch(
      `/entitlements/${entId}/actions/attach_products`,
      { product_ids: tierProductIds }
    );

    if (ok) {
      log('  +', `Attached ${tierProductIds.length} products to ${ent.lookupKey}`);
    } else {
      log('  !', `Failed to attach products to ${ent.lookupKey}: ${status} ${JSON.stringify(data)}`);
    }

    await sleep(1100);
  }

  // -------------------------------------------------------------------------
  // Step 4: Create Offering
  // -------------------------------------------------------------------------
  log('\n4', 'Creating offering...');

  let offeringId = '';

  const { ok: offOk, status: offStatus, data: offData } = await rcFetch('/offerings', {
    lookup_key: 'default',
    display_name: 'Grow Daisy Premium',
  });

  if (offOk) {
    offeringId = (offData as { id?: string }).id ?? '';
    log('  +', `Created offering → ${offeringId}`);
  } else if (offStatus === 409) {
    log('  =', 'Offering "default" already exists, fetching...');
    const existing = await findExistingOffering('default');
    if (existing) {
      offeringId = existing;
      log('  =', `Found existing: ${offeringId}`);
    }
  } else {
    log('  !', `Failed to create offering: ${offStatus} ${JSON.stringify(offData)}`);
  }

  if (!offeringId) {
    console.error('\nFailed to create or find offering. Cannot continue.');
    process.exit(1);
  }

  // Set as current/default
  await sleep(1100);
  const { ok: curOk } = await rcFetch(`/offerings/${offeringId}`, {
    is_current: true,
  });
  log(curOk ? '  +' : '  !', curOk ? 'Set as current offering' : 'Failed to set as current');

  // -------------------------------------------------------------------------
  // Step 5: Create Packages + Attach Products
  // -------------------------------------------------------------------------
  log('\n5', 'Creating packages and attaching products...');

  for (const product of PRODUCTS) {
    const rcProductId = productIds[product.storeId];
    if (!rcProductId) {
      log('  !', `Skipping package for ${product.storeId} — no product ID`);
      continue;
    }

    const lookupKey = packageLookupKey(product.tier, product.billingType);

    // Create package
    await sleep(1100);
    const { ok: pkgOk, status: pkgStatus, data: pkgData } = await rcFetch(
      `/offerings/${offeringId}/packages`,
      {
        lookup_key: lookupKey,
        display_name: product.displayName,
      }
    );

    let packageId = '';

    if (pkgOk) {
      packageId = (pkgData as { id?: string }).id ?? '';
      log('  +', `Created package ${lookupKey} → ${packageId}`);
    } else if (pkgStatus === 409) {
      log('  =', `Package ${lookupKey} already exists, fetching...`);
      const existing = await findExistingPackage(offeringId, lookupKey);
      if (existing) {
        packageId = existing;
        log('  =', `Found existing: ${packageId}`);
      }
    } else {
      log('  !', `Failed to create package ${lookupKey}: ${pkgStatus} ${JSON.stringify(pkgData)}`);
      continue;
    }

    if (!packageId) continue;

    // Attach product to package
    await sleep(1100);
    const { ok: attachOk, status: attachStatus, data: attachData } = await rcFetch(
      `/packages/${packageId}/actions/attach_products`,
      {
        products: [{
          product_id: rcProductId,
          eligibility_criteria: 'all',
        }],
      }
    );

    if (attachOk) {
      log('  +', `Attached ${product.storeId} to package ${lookupKey}`);
    } else {
      log('  !', `Failed to attach product to package: ${attachStatus} ${JSON.stringify(attachData)}`);
    }
  }

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  console.log('\n=== Setup Complete ===\n');
  console.log('Next steps:');
  console.log('  1. Note the Public SDK Key (appl_xxx) from the RevenueCat dashboard');
  console.log('  2. Run: ./scripts/vercel-env-add.sh NEXT_PUBLIC_REVENUECAT_IOS_PUBLIC_KEY "appl_xxx" production');
  console.log('  3. Configure the webhook URL in RevenueCat dashboard:');
  console.log('     https://grow.godaisy.io/api/revenuecat/webhook');
  console.log('  4. Run: ./scripts/vercel-env-add.sh REVENUECAT_WEBHOOK_SECRET "your_secret" production');
  console.log('');
}

// ---------------------------------------------------------------------------
// Helpers to find existing resources (for idempotency)
// ---------------------------------------------------------------------------

async function rcGet(path: string): Promise<Record<string, unknown> | null> {
  const url = `${API_BASE}/projects/${PROJECT_ID}${path}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${SECRET_KEY}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function findExistingProduct(storeId: string): Promise<string | null> {
  const data = await rcGet('/products');
  if (!data) return null;

  const items = (data as { items?: Array<{ id: string; store_identifier: string }> }).items ?? [];
  const match = items.find(p => p.store_identifier === storeId);
  return match?.id ?? null;
}

async function findExistingEntitlement(lookupKey: string): Promise<string | null> {
  const data = await rcGet('/entitlements');
  if (!data) return null;

  const items = (data as { items?: Array<{ id: string; lookup_key: string }> }).items ?? [];
  const match = items.find(e => e.lookup_key === lookupKey);
  return match?.id ?? null;
}

async function findExistingOffering(lookupKey: string): Promise<string | null> {
  const data = await rcGet('/offerings');
  if (!data) return null;

  const items = (data as { items?: Array<{ id: string; lookup_key: string }> }).items ?? [];
  const match = items.find(o => o.lookup_key === lookupKey);
  return match?.id ?? null;
}

async function findExistingPackage(offeringId: string, lookupKey: string): Promise<string | null> {
  const data = await rcGet(`/offerings/${offeringId}/packages`);
  if (!data) return null;

  const items = (data as { items?: Array<{ id: string; lookup_key: string }> }).items ?? [];
  const match = items.find(p => p.lookup_key === lookupKey);
  return match?.id ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
