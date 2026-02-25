/**
 * Go Daisy Push Notifications Hook
 *
 * Client-side hook for managing Web Push API subscriptions for Go Daisy.
 * Handles subscription, unsubscription, and permission requests.
 *
 * @module hooks/useGoDaisyPushNotifications
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface UseGoDaisyPushNotificationsState {
  isSupported: boolean;
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
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

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS Safari';
  if (/Android/i.test(ua)) return 'Android Chrome';
  if (/Chrome/i.test(ua)) return 'Chrome Desktop';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Safari/i.test(ua)) return 'Safari';
  if (/Edge/i.test(ua)) return 'Edge';
  return 'Unknown Browser';
}

// =============================================================================
// HOOK
// =============================================================================

export function useGoDaisyPushNotifications(): UseGoDaisyPushNotificationsState {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('prompt');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const checkSupport = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setIsSupported(false);
        setPermission('unsupported');
        setIsLoading(false);
        return;
      }

      setIsSupported(true);
      const perm = Notification.permission as PushPermissionState;
      setPermission(perm);

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('[GoDaisyPush] Error checking subscription:', err);
      }

      setIsLoading(false);
    };

    checkSupport();
  }, []);

  const requestPermission = useCallback(async (): Promise<PushPermissionState> => {
    if (!isSupported) return 'unsupported';
    try {
      const result = await Notification.requestPermission();
      const perm = result as PushPermissionState;
      setPermission(perm);
      return perm;
    } catch (err) {
      console.error('[GoDaisyPush] Error requesting permission:', err);
      setError('Failed to request notification permission');
      return 'denied';
    }
  }, [isSupported]);

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
      if (permission !== 'granted') {
        const newPerm = await requestPermission();
        if (newPerm !== 'granted') {
          setError('Notification permission denied');
          setIsLoading(false);
          return false;
        }
      }

      const registration = await navigator.serviceWorker.ready;

      if (registration.active) {
        registration.active.postMessage({
          type: 'SET_VAPID_KEY',
          key: VAPID_PUBLIC_KEY,
        });
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Please log in to enable notifications');
        setIsLoading(false);
        return false;
      }

      const response = await fetch('/api/godaisy/push/subscribe', {
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
      console.error('[GoDaisyPush] Subscribe error:', err);
      setError(message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, permission, requestPermission, supabase]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          await fetch('/api/godaisy/push/subscribe', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe';
      console.error('[GoDaisyPush] Unsubscribe error:', err);
      setError(message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, supabase]);

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
