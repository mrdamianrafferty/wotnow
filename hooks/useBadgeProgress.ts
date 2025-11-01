/**
 * Badge Progress Hook
 *
 * Memoized calculations for badge achievements and progress tracking.
 * Optimizes performance by caching results based on session data.
 */

import { useMemo } from 'react';
import {
  CatchSession,
  Badge,
  BADGE_CONFIGS,
  getEarnedBadges,
  getNextBadge,
} from '@/lib/findr/badgeDefinitions';

interface BadgeProgressState {
  earnedBadges: Badge[];
  nextBadge: {
    badge: Badge;
    progress: { current: number; target: number };
  } | null;
  totalBadges: number;
  earnedCount: number;
  progressPercentage: number;
}

/**
 * Calculate badge progress from catch sessions
 *
 * @param sessions - Array of catch sessions to calculate badges from
 * @returns Memoized badge progress state
 */
export function useBadgeProgress(sessions: CatchSession[]): BadgeProgressState {
  return useMemo(() => {
    const earnedBadges = getEarnedBadges(sessions);
    const nextBadge = getNextBadge(sessions);
    const totalBadges = BADGE_CONFIGS.length;
    const earnedCount = earnedBadges.length;
    const progressPercentage =
      totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

    return {
      earnedBadges,
      nextBadge,
      totalBadges,
      earnedCount,
      progressPercentage,
    };
  }, [sessions]);
}
