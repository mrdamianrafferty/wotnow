/**
 * Grow Daisy Push Notifications Hook
 *
 * Client-side hook for managing Web Push API subscriptions.
 * Handles subscription, unsubscription, and permission requests.
 *
 * @module hooks/useGrowPushNotifications
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface UseGrowPushNotificationsState {
  // State
  isSupported: boolean;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<PushPermissionState>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert base64 string to Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Get device name from user agent
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'iOS Safari';
  } else if (/Android/i.test(ua)) {
    return 'Android Chrome';
  } else if (/Chrome/i.test(ua)) {
    return 'Chrome Desktop';
  } else if (/Firefox/i.test(ua)) {
    return 'Firefox';
  } else if (/Safari/i.test(ua)) {
    return 'Safari';
  } else if (/Edge/i.test(ua)) {
    return 'Edge';
  }

  return 'Unknown Browser';
}

// =============================================================================
// HOOK
// =============================================================================

export function useGrowPushNotifications(): UseGrowPushNotificationsState {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('prompt');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // ---------------------------------------------------------------------------
  // CHECK SUPPORT & INITIAL STATE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const checkSupport = async () => {
      // Check if push notifications are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        setPermission('unsupported');
        setIsLoading(false);
        return;
      }

      setIsSupported(true);

      // Check notification permission
      const perm = Notification.permission as PushPermissionState;
      setPermission(perm);

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('[PushNotifications] Error checking subscription:', err);
      }

      setIsLoading(false);
    };

    checkSupport();
  }, []);

  // ---------------------------------------------------------------------------
  // REQUEST PERMISSION
  // ---------------------------------------------------------------------------

  const requestPermission = useCallback(async (): Promise<PushPermissionState> => {
    if (!isSupported) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      const perm = result as PushPermissionState;
      setPermission(perm);
      return perm;
    } catch (err) {
      console.error('[PushNotifications] Error requesting permission:', err);
      setError('Failed to request notification permission');
      return 'denied';
    }
  }, [isSupported]);

  // ---------------------------------------------------------------------------
  // SUBSCRIBE
  // ---------------------------------------------------------------------------

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      setError('VAPID key not configured');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const newPerm = await requestPermission();
        if (newPerm !== 'granted') {
          setError('Notification permission denied');
          setIsLoading(false);
          return false;
        }
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Send VAPID key to service worker for potential resubscription
      if (registration.active) {
        registration.active.postMessage({
          type: 'SET_VAPID_KEY',
          key: VAPID_PUBLIC_KEY,
        });
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Get the subscription details
      const subscriptionJson = subscription.toJSON();

      // Get auth token for API call
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Please log in to enable notifications');
        setIsLoading(false);
        return false;
      }

      // Save subscription to server
      const response = await fetch('/api/grow/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          endpoint: subscriptionJson.endpoint,
          keys: {
            p256dh: subscriptionJson.keys?.p256dh,
            auth: subscriptionJson.keys?.auth,
          },
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe';
      console.error('[PushNotifications] Subscribe error:', err);
      setError(message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, permission, requestPermission, supabase]);

  // ---------------------------------------------------------------------------
  // UNSUBSCRIBE
  // ---------------------------------------------------------------------------

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Get auth token for API call
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          // Remove subscription from server
          await fetch('/api/grow/push/subscribe', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          });
        }
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
      console.error('[PushNotifications] Unsubscribe error:', err);
      setError(message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, supabase]);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}
