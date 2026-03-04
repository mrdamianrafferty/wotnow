/**
 * RevenueCat SDK Wrapper for iOS In-App Purchases
 *
 * The official @revenuecat/purchases-capacitor plugin's Capacitor bridge is
 * completely broken — all methods (configure, getOfferings, purchase) hang
 * indefinitely. The native SDK is configured in AppDelegate.swift.
 *
 * For tips (consumable IAP), we use a custom native Capacitor plugin
 * (GoDaisyTipsPlugin.swift) that calls Purchases.shared directly and
 * is guaranteed to load because it's in the App target.
 *
 * Legacy exports (initRevenueCat, identifyRevenueCatUser, etc.) are kept
 * as no-ops for build compatibility with other pages.
 *
 * @module lib/grow/revenueCat
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Custom native plugin (GoDaisyTipsPlugin.swift)
// ---------------------------------------------------------------------------

/** Shape returned by our custom GoDaisyTipsPlugin */
export interface TipPackage {
  identifier: string;
  title: string;
  priceString: string;
  price: number;
}

interface GoDaisyTipsPlugin {
  getOfferings(): Promise<{
    currentIdentifier?: string;
    packages: TipPackage[];
  }>;
  purchase(opts: { productId: string }): Promise<{
    cancelled: boolean;
    productIdentifier?: string;
  }>;
  restorePurchases(): Promise<{ restored: boolean }>;
}

const GoDaisyTips = registerPlugin<GoDaisyTipsPlugin>('GoDaisyTips');

function isIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Fetch tip packages from RevenueCat via our custom native plugin.
 */
export async function fetchTipPackages(): Promise<TipPackage[]> {
  if (!isIOS()) return [];

  const result = await GoDaisyTips.getOfferings();
  return result.packages ?? [];
}

/**
 * Purchase a tip by product identifier.
 * @returns true if purchased, false if user cancelled
 */
export async function purchaseTip(productId: string): Promise<boolean> {
  if (!isIOS()) return false;

  const result = await GoDaisyTips.purchase({ productId });
  return !result.cancelled;
}

// ---------------------------------------------------------------------------
// Legacy exports — kept as no-ops for build compatibility.
// The Capacitor bridge to @revenuecat/purchases-capacitor is broken.
// ---------------------------------------------------------------------------

/** @deprecated Native AppDelegate configures the SDK. No-op. */
export async function initRevenueCat(_supabaseUserId: string | null): Promise<void> {
  // No-op: Native AppDelegate already configured the SDK.
}

/** @deprecated Bridge is broken. No-op. */
export async function identifyRevenueCatUser(_supabaseUserId: string): Promise<void> {
  // No-op
}

/** @deprecated Bridge is broken. No-op. */
export async function logOutRevenueCat(): Promise<void> {
  // No-op
}

/** @deprecated Use fetchTipPackages() instead. Returns null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchOfferings(): Promise<any> {
  return null;
}

/** @deprecated Use purchaseTip() instead. Returns null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function purchasePackage(_pkg?: any): Promise<any> {
  return null;
}

/** @deprecated Bridge is broken. Returns null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function restorePurchases(): Promise<any> {
  return null;
}

/** @deprecated Bridge is broken. Returns null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCustomerInfo(): Promise<any> {
  return null;
}
