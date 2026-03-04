/**
 * Grow Daisy Subscriptions — RevenueCat via WKScriptMessageHandler
 *
 * GrowDaisyViewController.swift registers a WKScriptMessageHandler ("GrowDaisySubs")
 * that calls RevenueCat SDK for subscription management.
 *
 * JS sends: window.webkit.messageHandlers.GrowDaisySubs.postMessage(...)
 * Swift replies: window._GrowDaisySubsResolve(callbackId, data)
 *
 * All functions are safe no-ops on non-iOS platforms.
 *
 * @module lib/grow/growDaisySubs
 */

import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GrowDaisyPackage {
  identifier: string;
  productIdentifier: string;
  priceString: string;
  price: number;
}

export interface PurchaseResult {
  cancelled: boolean;
  productIdentifier?: string;
  activeEntitlements?: string[];
}

export interface RestoreResult {
  activeEntitlements: string[];
}

export interface CustomerInfo {
  activeEntitlements: string[];
  originalAppUserId?: string;
}

// ---------------------------------------------------------------------------
// Direct WKScriptMessageHandler bridge
// ---------------------------------------------------------------------------

/** Pending native call promises, keyed by callbackId */
const pendingCalls = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let nextCallId = 0;

/** Called from Swift via evaluateJavaScript */
function setupGlobalCallbacks() {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._GrowDaisySubsResolve = (callbackId: string, data: unknown) => {
    const call = pendingCalls.get(callbackId);
    if (call) {
      call.resolve(data);
      pendingCalls.delete(callbackId);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._GrowDaisySubsReject = (callbackId: string, error: string) => {
    const call = pendingCalls.get(callbackId);
    if (call) {
      call.reject(new Error(error));
      pendingCalls.delete(callbackId);
    }
  };
}

/** Send a message to the native SubscriptionHandler and return a promise for the result */
function callNative(action: string, params: Record<string, string> = {}): Promise<unknown> {
  setupGlobalCallbacks();

  return new Promise((resolve, reject) => {
    const callbackId = String(++nextCallId);
    pendingCalls.set(callbackId, { resolve, reject });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (window as any).webkit?.messageHandlers?.GrowDaisySubs;
      if (!handler) {
        pendingCalls.delete(callbackId);
        reject(new Error('GrowDaisySubs message handler not available'));
        return;
      }
      handler.postMessage({ action, callbackId, ...params });
    } catch (err) {
      pendingCalls.delete(callbackId);
      reject(err);
    }

    // Timeout — purchases need longer (StoreKit sheet + sandbox delays)
    const timeoutMs = action === 'purchase' ? 120000 : 15000;
    setTimeout(() => {
      if (pendingCalls.has(callbackId)) {
        pendingCalls.delete(callbackId);
        reject(new Error(`${action} timed out`));
      }
    }, timeoutMs);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function isIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Identify the RevenueCat user with the Supabase user ID.
 * Call this before fetching offerings so RevenueCat knows who the user is.
 */
export async function identifyUser(userId: string): Promise<void> {
  if (!isIOS()) return;
  await callNative('identify', { userId });
}

/**
 * Fetch subscription offerings from RevenueCat via our native handler.
 */
export async function fetchOfferings(): Promise<GrowDaisyPackage[]> {
  if (!isIOS()) return [];

  const result = (await callNative('getOfferings')) as { packages: GrowDaisyPackage[] };
  return result?.packages ?? [];
}

/**
 * Purchase a subscription by product identifier.
 * @returns PurchaseResult with cancelled flag and active entitlements
 */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!isIOS()) return { cancelled: true };

  const result = (await callNative('purchase', { productId })) as PurchaseResult;
  return result;
}

/**
 * Restore previous purchases (Apple requirement).
 */
export async function restorePurchases(): Promise<RestoreResult> {
  if (!isIOS()) return { activeEntitlements: [] };

  const result = (await callNative('restore')) as RestoreResult;
  return result;
}

/**
 * Get current customer info including active entitlements.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  if (!isIOS()) return { activeEntitlements: [] };

  const result = (await callNative('getCustomerInfo')) as CustomerInfo;
  return result;
}
