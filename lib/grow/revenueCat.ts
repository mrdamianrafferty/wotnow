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

/**
 * Mark RevenueCat as ready for use.
 *
 * The SDK is configured natively in AppDelegate.swift because the
 * Capacitor plugin's configure() bridge call hangs (the JS promise
 * never resolves). All other plugin methods (getOfferings, purchase,
 * etc.) work through the bridge once the native SDK is configured.
 */
export async function initRevenueCat(supabaseUserId: string | null): Promise<void> {
  if (configured) return;
  if (!isIOS()) return;

  // Native AppDelegate already configured the SDK.
  // Just mark ready so other methods proceed.
  configured = true;

  // If we have a user ID, identify them (this bridge call works fine)
  if (supabaseUserId) {
    await identifyRevenueCatUser(supabaseUserId);
  }
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
