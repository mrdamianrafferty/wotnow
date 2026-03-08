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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const supabase = createClient();

  // ---------------------------------------------------------------------------
  // FETCH SUBSCRIPTION
  // ---------------------------------------------------------------------------

  const fetchSubscription = useCallback(async () => {
    try {
      setError(null);

      // Get current user if userId not provided
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Not logged in — default to free tier (no error)
          setSubscription(null);
          setIsLoading(false);
          return;
        }
        targetUserId = user.id;
      }

      // Try cache first for instant UI feedback
      const cached = await getCachedGoDaisySubscription(targetUserId);
      if (cached) {
        setSubscription({
          userId: cached.userId,
          tier: cached.tier,
          subscriptionType: cached.subscriptionType,
          stripeSubscriptionId: cached.stripeSubscriptionId,
          subscriptionStart: cached.subscriptionStart,
          subscriptionEnd: cached.subscriptionEnd,
        });
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

      const subscriptionData: GoDaisySubscriptionStatus = {
        userId: targetUserId,
        tier: (data?.godaisy_subscription_tier as GoDaisyTier) || 'free',
        subscriptionType: data?.godaisy_subscription_type as GoDaisySubscriptionType | null,
        stripeSubscriptionId: data?.godaisy_stripe_subscription_id || null,
        subscriptionStart: data?.godaisy_subscription_start || null,
        subscriptionEnd: data?.godaisy_subscription_end || null,
      };

      setSubscription(subscriptionData);
      await setCachedGoDaisySubscription(subscriptionData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching Go Daisy subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  // ---------------------------------------------------------------------------
  // REAL-TIME SUBSCRIPTION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      setIsLoading(true);
      await fetchSubscription();

      // Get user ID for realtime filter
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        targetUserId = user.id;
      }

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

            const newData: GoDaisySubscriptionStatus = {
              userId: targetUserId,
              tier: (payload.new.godaisy_subscription_tier as GoDaisyTier) || 'free',
              subscriptionType: payload.new.godaisy_subscription_type as GoDaisySubscriptionType | null,
              stripeSubscriptionId: payload.new.godaisy_stripe_subscription_id || null,
              subscriptionStart: payload.new.godaisy_subscription_start || null,
              subscriptionEnd: payload.new.godaisy_subscription_end || null,
            };

            setSubscription(newData);
            await setCachedGoDaisySubscription(newData);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [userId, fetchSubscription, supabase]);

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
