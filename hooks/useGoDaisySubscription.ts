/**
 * Go Daisy+ Subscription Hook
 *
 * React hook for managing Go Daisy subscription state with:
 * - Offline-first caching (IndexedDB, 24h TTL)
 * - Real-time updates via Supabase postgres_changes
 * - Feature access helpers for gating
 *
 * @module hooks/useGoDaisySubscription
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  getCachedGoDaisySubscription,
  setCachedGoDaisySubscription,
} from '@/lib/offline/goDaisySubscriptionCache';
import {
  GoDaisyTier,
  GoDaisySubscriptionType,
  GoDaisyTierLimits,
  getTierLimits,
  hasFeatureAccess,
  isOverLimit,
  getRemainingUsage,
  getMinimumTierForFeature,
} from '@/lib/godaisy/subscription';

// =============================================================================
// TYPES
// =============================================================================

export interface GoDaisySubscriptionStatus {
  userId: string;
  tier: GoDaisyTier;
  subscriptionType: GoDaisySubscriptionType | null;
  stripeSubscriptionId: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
}

export interface UseGoDaisySubscriptionState {
  subscription: GoDaisySubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;

  // Convenience getters
  tier: GoDaisyTier;
  limits: GoDaisyTierLimits;
  isPaid: boolean;

  // Feature checks
  canUse: (feature: keyof GoDaisyTierLimits) => boolean;
  isAtLimit: (feature: 'maxOutdoorActivities', currentCount: number) => boolean;
  getRemaining: (feature: 'maxOutdoorActivities', currentCount: number) => number;
  requiresTier: (feature: keyof GoDaisyTierLimits) => GoDaisyTier;

  // Actions
  refetch: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to manage Go Daisy+ subscription state.
 *
 * @param userId - Optional user ID (uses auth session if not provided)
 * @returns Subscription state with feature gating helpers
 *
 * @example
 * ```typescript
 * function ActivityList() {
 *   const { canUse, isAtLimit, tier } = useGoDaisySubscription();
 *
 *   if (!canUse('forecastDays')) {
 *     return <GoDaisyUpgradePrompt feature="forecast" />;
 *   }
 *
 *   return <ForecastCards />;
 * }
 * ```
 */
export function useGoDaisySubscription(userId?: string): UseGoDaisySubscriptionState {
  const [subscription, setSubscription] = useState<GoDaisySubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Map a profile row (from fetch or realtime payload) to subscription status.
   * Centralises the mapping that was previously duplicated 3×.
   */
  const toSubscriptionStatus = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (targetUserId: string, row: Record<string, any>): GoDaisySubscriptionStatus => ({
      userId: targetUserId,
      tier: (row.godaisy_subscription_tier as GoDaisyTier) || 'free',
      subscriptionType: (row.godaisy_subscription_type as GoDaisySubscriptionType | null) ?? null,
      stripeSubscriptionId: row.godaisy_stripe_subscription_id || null,
      subscriptionStart: row.godaisy_subscription_start || null,
      subscriptionEnd: row.godaisy_subscription_end || null,
    }),
    []
  );

  // ---------------------------------------------------------------------------
  // RESOLVE USER ID (called once, shared between fetch & realtime setup)
  // ---------------------------------------------------------------------------

  const resolveUserId = useCallback(async (): Promise<string | null> => {
    if (userId) return userId;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  }, [userId]);

  // ---------------------------------------------------------------------------
  // FETCH SUBSCRIPTION
  // ---------------------------------------------------------------------------

  const fetchSubscription = useCallback(async () => {
    try {
      setError(null);

      const targetUserId = await resolveUserId();
      if (!targetUserId) {
        // Not logged in — default to free tier (no error)
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      // Try cache first for instant UI feedback
      const cached = await getCachedGoDaisySubscription(targetUserId);
      if (cached) {
        setSubscription(toSubscriptionStatus(targetUserId, cached));
        setIsLoading(false);
      }

      // Fetch fresh data from Supabase
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('godaisy_subscription_tier, godaisy_subscription_type, godaisy_stripe_subscription_id, godaisy_subscription_start, godaisy_subscription_end')
        .eq('id', targetUserId)
        .single();

      if (fetchError) {
        // If profile doesn't exist, user is on free tier
        if (fetchError.code === 'PGRST116') {
          const defaultSub: GoDaisySubscriptionStatus = {
            userId: targetUserId,
            tier: 'free',
            subscriptionType: null,
            stripeSubscriptionId: null,
            subscriptionStart: null,
            subscriptionEnd: null,
          };
          setSubscription(defaultSub);
          await setCachedGoDaisySubscription(defaultSub);
          return;
        }
        throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
      }

      const subscriptionData = toSubscriptionStatus(targetUserId, data ?? {});
      setSubscription(subscriptionData);
      await setCachedGoDaisySubscription(subscriptionData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching Go Daisy subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [resolveUserId, toSubscriptionStatus]);

  // ---------------------------------------------------------------------------
  // REAL-TIME SUBSCRIPTION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      setIsLoading(true);
      await fetchSubscription();

      // Resolve user ID once (no duplicate getUser call)
      const targetUserId = await resolveUserId();
      if (!targetUserId) return;

      // Subscribe to profile changes (ONLY for this user)
      const channel = supabase
        .channel('godaisy-subscription-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${targetUserId}`,
          },
          async (payload) => {
            if (!isMounted || payload.new.id !== targetUserId) return;

            const newData = toSubscriptionStatus(targetUserId, payload.new);
            setSubscription(newData);
            await setCachedGoDaisySubscription(newData);
          }
        )
        .subscribe();

      // Store channel ref for cleanup
      channelRef.current = channel;
    };

    setup();

    return () => {
      isMounted = false;
      // Properly unsubscribe the realtime channel on unmount
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [userId, fetchSubscription, resolveUserId, toSubscriptionStatus]);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const tier = subscription?.tier || 'free';
  const limits = useMemo(() => getTierLimits(tier), [tier]);
  const isPaid = tier !== 'free';

  // ---------------------------------------------------------------------------
  // FEATURE CHECKS
  // ---------------------------------------------------------------------------

  const canUse = useCallback((feature: keyof GoDaisyTierLimits): boolean => {
    return hasFeatureAccess(tier, feature);
  }, [tier]);

  const isAtLimit = useCallback((feature: 'maxOutdoorActivities', currentCount: number): boolean => {
    return isOverLimit(tier, feature, currentCount);
  }, [tier]);

  const getRemaining = useCallback((feature: 'maxOutdoorActivities', currentCount: number): number => {
    return getRemainingUsage(tier, feature, currentCount);
  }, [tier]);

  const requiresTier = useCallback((feature: keyof GoDaisyTierLimits): GoDaisyTier => {
    return getMinimumTierForFeature(feature);
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    subscription,
    isLoading,
    error,
    tier,
    limits,
    isPaid,
    canUse,
    isAtLimit,
    getRemaining,
    requiresTier,
    refetch: fetchSubscription,
  };
}
