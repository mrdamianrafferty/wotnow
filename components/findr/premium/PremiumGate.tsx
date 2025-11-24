/**
 * Premium Feature Gate Component
 *
 * Restricts access to premium features and shows upgrade prompt to free users.
 *
 * Usage:
 * ```tsx
 * <PremiumGate fallback={<UpgradePrompt />}>
 *   <PremiumFeature />
 * </PremiumGate>
 * ```
 */

import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useSubscription } from '@/hooks/useSubscription';

interface PremiumGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Shows children only if user has premium subscription.
 * Shows fallback or default upgrade prompt otherwise.
 */
export function PremiumGate({
  children,
  fallback,
  showUpgradePrompt = true,
}: PremiumGateProps) {
  const { isPremium, isLoading } = useSubscription();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show default upgrade prompt
  if (showUpgradePrompt) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <div className="badge badge-warning mx-auto mb-2">Premium Feature</div>
          <h3 className="card-title justify-center">Upgrade to Premium</h3>
          <p className="text-base-content/70">
            This feature is only available to Premium subscribers.
          </p>
          <div className="card-actions justify-center mt-4">
            <button
              onClick={() => router.push('/findr/premium')}
              className="btn btn-primary"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything if showUpgradePrompt is false
  return null;
}

/**
 * Shows premium badge if user has premium subscription.
 */
export function PremiumBadge() {
  const { isPremium, isTrial } = useSubscription();

  if (!isPremium) return null;

  return (
    <div className="badge badge-success gap-1">
      {isTrial && <span className="text-xs">Trial</span>}
      Premium
    </div>
  );
}

/**
 * Inline premium label for small UI elements.
 */
export function PremiumLabel() {
  return (
    <span className="badge badge-warning badge-xs">PRO</span>
  );
}
