/**
 * Grow Daisy Subscription Hook
 *
 * React hook for managing Grow Daisy subscription state with:
 * - Offline-first caching (IndexedDB, 24h TTL)
 * - Real-time updates via Supabase postgres_changes
 * - Usage tracking for AI features
 * - Feature access helpers
 *
 * @module hooks/useGrowSubscription
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getCachedGrowSubscription,
  setCachedGrowSubscription,
  getCachedGrowUsage,
  setCachedGrowUsage,
} from '@/lib/offline/growSubscriptionCache';
import {
  GrowSubscriptionTier,
  GrowSubscriptionType,
  GrowTierLimits,
  getTierLimits,
  hasFeatureAccess,
  isOverLimit,
  getRemainingUsage,
  isTierAtLeast,
  getMinimumTierForFeature,
} from '@/lib/grow/subscription';

// =============================================================================
// TYPES
// =============================================================================

export interface GrowSubscriptionStatus {
  userId: string;
  tier: GrowSubscriptionTier;
  subscriptionType: GrowSubscriptionType | null;
  stripeSubscriptionId: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
}

export interface GrowUsageStatus {
  month: string;
  plantIdCalls: number;
  pestDiseaseCalls: number;
  expertQuestionCalls: number;
  photoCount: number;
}

export interface UseGrowSubscriptionState {
  // Subscription state
  subscription: GrowSubscriptionStatus | null;
  usage: GrowUsageStatus | null;
  isLoading: boolean;
  error: Error | null;

  // Convenience getters
  tier: GrowSubscriptionTier;
  limits: GrowTierLimits;
  isPaid: boolean;
  isBloomOrHigher: boolean;
  isHarvestOrHigher: boolean;

  // Feature checks
  canUse: (feature: keyof GrowTierLimits) => boolean;
  isAtLimit: (feature: 'plantIdCalls' | 'pestDiseaseCalls' | 'expertQuestionCalls') => boolean;
  getRemaining: (feature: 'plantIdCalls' | 'pestDiseaseCalls' | 'expertQuestionCalls') => number;
  requiresTier: (feature: keyof GrowTierLimits) => GrowSubscriptionTier;

  // Actions
  refetch: () => Promise<void>;
  refetchUsage: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to manage Grow Daisy subscription and usage state.
 *
 * @param userId - Optional user ID (uses auth session if not provided)
 * @returns Subscription state with helpers
 *
 * @example
 * ```typescript
 * function PlantIdButton() {
 *   const { canUse, isAtLimit, getRemaining, tier } = useGrowSubscription();
 *
 *   if (!canUse('plantIdCalls')) {
 *     return <UpgradePrompt feature="plantIdCalls" />;
 *   }
 *
 *   if (isAtLimit('plantIdCalls')) {
 *     return <UsageLimitPrompt remaining={getRemaining('plantIdCalls')} />;
 *   }
 *
 *   return <button>Identify Plant</button>;
 * }
 * ```
 */
export function useGrowSubscription(userId?: string): UseGrowSubscriptionState {
  const [subscription, setSubscription] = useState<GrowSubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<GrowUsageStatus | null>(null);
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
          // Not logged in - default to free tier
          setSubscription(null);
          setIsLoading(false);
          return;
        }
        targetUserId = user.id;
      }

      // Try cache first
      const cached = await getCachedGrowSubscription(targetUserId);
      if (cached) {
        setSubscription({
          userId: cached.userId,
          tier: cached.tier,
          subscriptionType: cached.subscriptionType,
          stripeSubscriptionId: cached.stripeSubscriptionId,
          subscriptionStartDate: cached.subscriptionStartDate,
          subscriptionEndDate: cached.subscriptionEndDate,
        });
        setIsLoading(false);
      }

      // Fetch fresh data
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('grow_subscription_tier, grow_subscription_type, grow_stripe_subscription_id, grow_subscription_start_date, grow_subscription_end_date')
        .eq('id', targetUserId)
        .single();

      if (fetchError) {
        // If profile doesn't exist, user is on free tier
        if (fetchError.code === 'PGRST116') {
          const defaultSub: GrowSubscriptionStatus = {
            userId: targetUserId,
            tier: 'seed',
            subscriptionType: null,
            stripeSubscriptionId: null,
            subscriptionStartDate: null,
            subscriptionEndDate: null,
          };
          setSubscription(defaultSub);
          await setCachedGrowSubscription(defaultSub);
          return;
        }
        throw new Error(`Failed to fetch subscription: ${fetchError.message}`);
      }

      const subscriptionData: GrowSubscriptionStatus = {
        userId: targetUserId,
        tier: (data?.grow_subscription_tier as GrowSubscriptionTier) || 'seed',
        subscriptionType: data?.grow_subscription_type as GrowSubscriptionType | null,
        stripeSubscriptionId: data?.grow_stripe_subscription_id || null,
        subscriptionStartDate: data?.grow_subscription_start_date || null,
        subscriptionEndDate: data?.grow_subscription_end_date || null,
      };

      setSubscription(subscriptionData);
      await setCachedGrowSubscription(subscriptionData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching Grow subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  // ---------------------------------------------------------------------------
  // FETCH USAGE
  // ---------------------------------------------------------------------------

  const fetchUsage = useCallback(async () => {
    try {
      // Get current user
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUsage(null);
          return;
        }
        targetUserId = user.id;
      }

      // Try cache first
      const cached = await getCachedGrowUsage(targetUserId);
      if (cached) {
        setUsage({
          month: cached.month,
          plantIdCalls: cached.plantIdCalls,
          pestDiseaseCalls: cached.pestDiseaseCalls,
          expertQuestionCalls: cached.expertQuestionCalls,
          photoCount: cached.photoCount,
        });
      }

      // Fetch from RPC function
      const { data, error: fetchError } = await supabase
        .rpc('grow_get_current_usage', { p_user_id: targetUserId });

      if (fetchError) {
        console.error('Error fetching usage:', fetchError);
        return;
      }

      const usageData: GrowUsageStatus = {
        month: data?.month || new Date().toISOString().slice(0, 7),
        plantIdCalls: data?.plant_id_calls || 0,
        pestDiseaseCalls: data?.pest_disease_calls || 0,
        expertQuestionCalls: data?.expert_question_calls || 0,
        photoCount: data?.photo_count || 0,
      };

      setUsage(usageData);
      await setCachedGrowUsage({
        userId: targetUserId,
        ...usageData,
      });
    } catch (err) {
      console.error('Error fetching Grow usage:', err);
    }
  }, [userId, supabase]);

  // ---------------------------------------------------------------------------
  // REAL-TIME SUBSCRIPTION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      setIsLoading(true);

      // Fetch initial data
      await fetchSubscription();
      await fetchUsage();

      // Get user ID for realtime filter
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        targetUserId = user.id;
      }

      // Subscribe to profile changes
      const channel = supabase
        .channel('grow-subscription-changes')
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

            const newData: GrowSubscriptionStatus = {
              userId: targetUserId,
              tier: (payload.new.grow_subscription_tier as GrowSubscriptionTier) || 'seed',
              subscriptionType: payload.new.grow_subscription_type as GrowSubscriptionType | null,
              stripeSubscriptionId: payload.new.grow_stripe_subscription_id || null,
              subscriptionStartDate: payload.new.grow_subscription_start_date || null,
              subscriptionEndDate: payload.new.grow_subscription_end_date || null,
            };

            setSubscription(newData);
            await setCachedGrowSubscription(newData);
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
  }, [userId, fetchSubscription, fetchUsage, supabase]);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------

  const tier = subscription?.tier || 'seed';
  const limits = useMemo(() => getTierLimits(tier), [tier]);
  const isPaid = tier !== 'seed';
  const isBloomOrHigher = isTierAtLeast(tier, 'bloom');
  const isHarvestOrHigher = isTierAtLeast(tier, 'harvest');

  // ---------------------------------------------------------------------------
  // FEATURE CHECKS
  // ---------------------------------------------------------------------------

  const canUse = useCallback((feature: keyof GrowTierLimits): boolean => {
    return hasFeatureAccess(tier, feature);
  }, [tier]);

  const isAtLimit = useCallback((feature: 'plantIdCalls' | 'pestDiseaseCalls' | 'expertQuestionCalls'): boolean => {
    if (!usage) return false;

    const currentUsage = feature === 'plantIdCalls' ? usage.plantIdCalls
      : feature === 'pestDiseaseCalls' ? usage.pestDiseaseCalls
      : usage.expertQuestionCalls;

    return isOverLimit(tier, feature, currentUsage);
  }, [tier, usage]);

  const getRemaining = useCallback((feature: 'plantIdCalls' | 'pestDiseaseCalls' | 'expertQuestionCalls'): number => {
    if (!usage) return limits[feature] === -1 ? Infinity : limits[feature];

    const currentUsage = feature === 'plantIdCalls' ? usage.plantIdCalls
      : feature === 'pestDiseaseCalls' ? usage.pestDiseaseCalls
      : usage.expertQuestionCalls;

    return getRemainingUsage(tier, feature, currentUsage);
  }, [tier, usage, limits]);

  const requiresTier = useCallback((feature: keyof GrowTierLimits): GrowSubscriptionTier => {
    return getMinimumTierForFeature(feature);
  }, []);

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    subscription,
    usage,
    isLoading,
    error,
    tier,
    limits,
    isPaid,
    isBloomOrHigher,
    isHarvestOrHigher,
    canUse,
    isAtLimit,
    getRemaining,
    requiresTier,
    refetch: fetchSubscription,
    refetchUsage: fetchUsage,
  };
}
