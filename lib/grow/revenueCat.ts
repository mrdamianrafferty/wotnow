/**
 * Go Daisy Tip Jar — StoreKit 2 via WKScriptMessageHandler
 *
 * Bypasses both RevenueCat and Capacitor's plugin system entirely.
 * GoDaisyViewController.swift registers a WKScriptMessageHandler ("GoDaisyTips")
 * that calls StoreKit 2 directly for consumable tip purchases.
 *
 * JS sends: window.webkit.messageHandlers.GoDaisyTips.postMessage(...)
 * Swift replies: window._GoDaisyTipsResolve(callbackId, data)
 *
 * All functions are safe no-ops on non-iOS platforms.
 *
 * @module lib/grow/revenueCat
 */

import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TipPackage {
  identifier: string;
  title: string;
  priceString: string;
  price: number;
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
  (window as any)._GoDaisyTipsResolve = (callbackId: string, data: unknown) => {
    const call = pendingCalls.get(callbackId);
    if (call) {
      call.resolve(data);
      pendingCalls.delete(callbackId);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any)._GoDaisyTipsReject = (callbackId: string, error: string) => {
    const call = pendingCalls.get(callbackId);
    if (call) {
      call.reject(new Error(error));
      pendingCalls.delete(callbackId);
    }
  };
}

/** Send a message to the native TipJarHandler and return a promise for the result */
function callNative(action: string, params: Record<string, string> = {}): Promise<unknown> {
  setupGlobalCallbacks();

  return new Promise((resolve, reject) => {
    const callbackId = String(++nextCallId);
    pendingCalls.set(callbackId, { resolve, reject });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (window as any).webkit?.messageHandlers?.GoDaisyTips;
      if (!handler) {
        pendingCalls.delete(callbackId);
        reject(new Error('GoDaisyTips message handler not available'));
        return;
      }
      handler.postMessage({ action, callbackId, ...params });
    } catch (err) {
      pendingCalls.delete(callbackId);
      reject(err);
    }

    // Timeout after 15 seconds
    setTimeout(() => {
      if (pendingCalls.has(callbackId)) {
        pendingCalls.delete(callbackId);
        reject(new Error(`${action} timed out after 15s`));
      }
    }, 15000);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function isIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Fetch tip products from StoreKit 2 via our native handler.
 */
export async function fetchTipPackages(): Promise<TipPackage[]> {
  if (!isIOS()) return [];

  const result = (await callNative('getProducts')) as TipPackage[];
  return result ?? [];
}

/**
 * Purchase a tip by product identifier.
 * @returns true if purchased, false if user cancelled
 */
export async function purchaseTip(productId: string): Promise<boolean> {
  if (!isIOS()) return false;

  const result = (await callNative('purchase', { productId })) as { cancelled: boolean };
  return !result.cancelled;
}

// ---------------------------------------------------------------------------
// Legacy exports — kept as no-ops for build compatibility.
// ---------------------------------------------------------------------------

/** @deprecated No-op. */
export async function initRevenueCat(_supabaseUserId: string | null): Promise<void> {}

/** @deprecated No-op. */
export async function identifyRevenueCatUser(_supabaseUserId: string): Promise<void> {}

/** @deprecated No-op. */
export async function logOutRevenueCat(): Promise<void> {}

/** @deprecated Use fetchTipPackages() instead. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchOfferings(): Promise<any> {
  return null;
}

/** @deprecated Use purchaseTip() instead. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function purchasePackage(_pkg?: any): Promise<any> {
  return null;
}

/** @deprecated No-op. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function restorePurchases(): Promise<any> {
  return null;
}

/** @deprecated No-op. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCustomerInfo(): Promise<any> {
  return null;
}
