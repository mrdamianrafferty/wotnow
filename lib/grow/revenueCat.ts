/**
 * RevenueCat SDK Wrapper for iOS In-App Purchases
 *
 * Wraps @revenuecat/purchases-capacitor for iOS In-App Purchases.
 * Supports both Grow Daisy and Go Daisy apps with separate API keys.
 * All functions are safe no-ops on non-iOS platforms.
 *
 * @module lib/grow/revenueCat
 */

import { Capacitor } from '@capacitor/core';
import type {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  MakePurchaseResult,
} from '@revenuecat/purchases-capacitor';

const RC_GROW_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_PUBLIC_KEY ?? '';
const RC_GODAISY_KEY = process.env.NEXT_PUBLIC_REVENUECAT_GODAISY_IOS_PUBLIC_KEY ?? '';

/**
 * Select the correct RevenueCat API key based on the running app.
 * Grow Daisy loads from grow.godaisy.io; Go Daisy loads from godaisy.io.
 */
function getRevenueCatKey(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('grow.')) {
      return RC_GROW_KEY;
    }
  }
  // Go Daisy (default) or Findr — all share the Go Daisy RC app for tips
  return RC_GODAISY_KEY || RC_GROW_KEY;
}

function isIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Lazily import the Purchases plugin to avoid loading native code on web.
 */
async function getPurchases() {
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  return Purchases;
}

let configured = false;
let configurePromise: Promise<void> | null = null;

/**
 * Configure the RevenueCat SDK and optionally identify the user.
 * Safe to call on any platform — no-ops on non-iOS.
 * Uses singleton promise so concurrent callers share one configure call.
 */
export async function initRevenueCat(supabaseUserId: string | null): Promise<void> {
  if (configured) return;
  if (configurePromise) return configurePromise;

  const apiKey = getRevenueCatKey();
  if (!isIOS() || !apiKey) {
    console.warn('[RevenueCat] Skipping init — isIOS:', isIOS(), 'apiKey:', apiKey ? 'set' : 'MISSING');
    return;
  }

  configurePromise = (async () => {
    try {
      const Purchases = await getPurchases();

      // Fire configure without awaiting — Capacitor 7 treats the native
      // method's CAPPluginReturnNone as fire-and-forget, so the JS promise
      // from Purchases.configure() never resolves. We fire it, then poll
      // isConfigured() (which IS a promise-returning method) to confirm.
      Purchases.configure({
        apiKey,
        appUserID: supabaseUserId ?? undefined,
      });

      // Poll isConfigured() — this has CAPPluginReturnPromise so it resolves
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 250));
        try {
          const { isConfigured } = await Purchases.isConfigured();
          if (isConfigured) {
            configured = true;
            console.log('[RevenueCat] Configured', supabaseUserId ? `for user ${supabaseUserId}` : 'anonymously');
            return;
          }
        } catch {
          // isConfigured not available — fall back to timeout
        }
      }

      // Fallback: assume configured after 5s if polling didn't work
      configured = true;
      console.warn('[RevenueCat] Assumed configured after timeout');
    } catch (error) {
      console.error('[RevenueCat] Failed to configure:', error);
    } finally {
      configurePromise = null;
    }
  })();

  return configurePromise;
}

/**
 * Identify the current user after sign-in.
 * Links the Supabase UUID as the RevenueCat App User ID so that
 * webhook event.app_user_id IS the Supabase UUID.
 */
export async function identifyRevenueCatUser(supabaseUserId: string): Promise<void> {
  if (!isIOS() || !configured) return;

  try {
    const Purchases = await getPurchases();
    await Purchases.logIn({ appUserID: supabaseUserId });
    console.log('[RevenueCat] Identified user:', supabaseUserId);
  } catch (error) {
    console.error('[RevenueCat] Failed to identify user:', error);
  }
}

/**
 * Log out from RevenueCat on sign-out. Resets to anonymous user.
 */
export async function logOutRevenueCat(): Promise<void> {
  if (!isIOS() || !configured) return;

  try {
    const Purchases = await getPurchases();
    await Purchases.logOut();
    console.log('[RevenueCat] Logged out');
  } catch (error) {
    console.error('[RevenueCat] Failed to log out:', error);
  }
}

/**
 * Fetch current offerings from RevenueCat.
 * Returns packages with App Store prices in the user's local currency.
 */
export async function fetchOfferings(): Promise<PurchasesOfferings | null> {
  if (!isIOS() || !configured) {
    console.warn('[RevenueCat] fetchOfferings skipped — isIOS:', isIOS(), 'configured:', configured);
    return null;
  }

  try {
    const Purchases = await getPurchases();
    const offerings = await Purchases.getOfferings();
    console.log('[RevenueCat] Offerings fetched — current:', offerings?.current?.identifier ?? 'NONE',
      'packages:', offerings?.current?.availablePackages?.length ?? 0,
      'all offering keys:', Object.keys(offerings?.all ?? {}));
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] Failed to fetch offerings:', error);
    return null;
  }
}

/**
 * Purchase a package. Triggers the native StoreKit purchase sheet.
 *
 * @returns MakePurchaseResult on success, null if user cancelled or error
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<MakePurchaseResult | null> {
  if (!isIOS() || !configured) return null;

  try {
    const Purchases = await getPurchases();
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    console.log('[RevenueCat] Purchase successful:', result.productIdentifier);
    return result;
  } catch (error: unknown) {
    // RevenueCat throws with userCancelled flag when user dismisses the sheet
    if (error && typeof error === 'object' && 'userCancelled' in error && (error as { userCancelled: boolean }).userCancelled) {
      console.log('[RevenueCat] User cancelled purchase');
      return null;
    }
    console.error('[RevenueCat] Purchase failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases. Apple requires this in the UI for auto-renewable subscriptions.
 *
 * @returns CustomerInfo after restore, or null on non-iOS
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isIOS() || !configured) return null;

  try {
    const Purchases = await getPurchases();
    const { customerInfo } = await Purchases.restorePurchases();
    console.log('[RevenueCat] Purchases restored');
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Failed to restore purchases:', error);
    throw error;
  }
}

/**
 * Get current customer info (entitlements, active subscriptions).
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isIOS() || !configured) return null;

  try {
    const Purchases = await getPurchases();
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Failed to get customer info:', error);
    return null;
  }
}
