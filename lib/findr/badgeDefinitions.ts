// Badge System for Findr Trophy Gallery
// Gamification layer to encourage user engagement and reward fishing activity

import {
  Award,
  Trophy,
  Sunrise,
  Camera,
  ThumbsUp,
  CalendarDays,
  Fish,
  MapPin,
  Anchor,
  Flame,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catch session data structure from the API
 * This represents a single catch entry
 */
export interface CatchSession {
  id: string;
  species_id: string;
  species_common_name: string;
  caught_at: string; // ISO timestamp
  rectangle_code: string;
  quantity: number;
  size_category?: string;
  bait_used?: string;
  habitat_type?: string;
  notes?: string;
  pinned?: boolean;
  photo_assets?: Array<{
    url: string;
    thumbnail_url: string;
  }> | null;
}

/**
 * Badge definition with requirements and progress tracking
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind color class (e.g., 'amber-500')
  bgColor: string; // Background color class (e.g., 'amber-500/10')
  requirement: (sessions: CatchSession[], isFounder?: boolean) => boolean;
  progress?: (sessions: CatchSession[], isFounder?: boolean) => { current: number; target: number };
}

/**
 * Check if a timestamp is during dawn (5 AM - 7 AM local time)
 */
function isDawnCatch(timestamp: string): boolean {
  const date = new Date(timestamp);
  const hour = date.getHours();
  return hour >= 5 && hour < 7;
}

/**
 * Check if a date is on weekend (Saturday or Sunday)
 */
function isWeekend(timestamp: string): boolean {
  const date = new Date(timestamp);
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Get date key for grouping catches by day
 */
function getDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Count consecutive days with catches
 */
function getConsecutiveDays(sessions: CatchSession[]): number {
  if (sessions.length === 0) return 0;

  // Group catches by date
  const dateSet = new Set(sessions.map(s => getDateKey(s.caught_at)));
  const sortedDates = Array.from(dateSet).sort().reverse();

  if (sortedDates.length === 0) return 0;

  // Start from most recent date and count backwards
  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const current = new Date(sortedDates[i]);
    const next = new Date(sortedDates[i + 1]);
    const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break; // Streak broken
    }
  }

  return streak;
}

/**
 * All badge definitions for the Findr app
 */
export const BADGE_CONFIGS: Badge[] = [
  {
    id: 'founder',
    name: 'Founder',
    description: 'One of the first 500 anglers on Findr',
    icon: Award,
    color: 'amber-500',
    bgColor: 'amber-500/10',
    requirement: (sessions, isFounder) => {
      return isFounder === true;
    },
    progress: (sessions, isFounder) => ({
      current: isFounder ? 1 : 0,
      target: 1
    }),
  },
  {
    id: 'species-champion',
    name: 'Species Champion',
    description: 'Caught the same species 10+ times',
    icon: Trophy,
    color: 'purple-600',
    bgColor: 'purple-600/10',
    requirement: (sessions) => {
      const speciesCounts = new Map<string, number>();
      sessions.forEach(s => {
        const count = speciesCounts.get(s.species_common_name) || 0;
        speciesCounts.set(s.species_common_name, count + s.quantity);
      });
      return Array.from(speciesCounts.values()).some(count => count >= 10);
    },
    progress: (sessions) => {
      const speciesCounts = new Map<string, number>();
      sessions.forEach(s => {
        const count = speciesCounts.get(s.species_common_name) || 0;
        speciesCounts.set(s.species_common_name, count + s.quantity);
      });
      const maxCount = Math.max(0, ...Array.from(speciesCounts.values()));
      return { current: Math.min(maxCount, 10), target: 10 };
    },
  },
  {
    id: 'dawn-patrol',
    name: 'Dawn Patrol',
    description: '5+ catches during dawn hours (5-7 AM)',
    icon: Sunrise,
    color: 'orange-500',
    bgColor: 'orange-500/10',
    requirement: (sessions) => {
      const dawnCatches = sessions.filter(s => isDawnCatch(s.caught_at));
      return dawnCatches.length >= 5;
    },
    progress: (sessions) => {
      const dawnCatches = sessions.filter(s => isDawnCatch(s.caught_at));
      return { current: Math.min(dawnCatches.length, 5), target: 5 };
    },
  },
  {
    id: 'photographer',
    name: 'Photographer',
    description: '20+ catches with photos',
    icon: Camera,
    color: 'blue-600',
    bgColor: 'blue-600/10',
    requirement: (sessions) => {
      const withPhotos = sessions.filter(s => s.photo_assets && s.photo_assets.length > 0);
      return withPhotos.length >= 20;
    },
    progress: (sessions) => {
      const withPhotos = sessions.filter(s => s.photo_assets && s.photo_assets.length > 0);
      return { current: Math.min(withPhotos.length, 20), target: 20 };
    },
  },
  {
    id: 'honest-angler',
    name: 'Honest Angler',
    description: '3+ blank trip reports submitted',
    icon: ThumbsUp,
    color: 'red-500',
    bgColor: 'red-500/10',
    requirement: (sessions) => {
      // Blank trips would have quantity: 0 or a specific flag
      // For now, checking if notes contain "blank" or "no catch"
      const blankTrips = sessions.filter(s =>
        s.quantity === 0 ||
        s.notes?.toLowerCase().includes('blank') ||
        s.notes?.toLowerCase().includes('no catch')
      );
      return blankTrips.length >= 3;
    },
    progress: (sessions) => {
      const blankTrips = sessions.filter(s =>
        s.quantity === 0 ||
        s.notes?.toLowerCase().includes('blank') ||
        s.notes?.toLowerCase().includes('no catch')
      );
      return { current: Math.min(blankTrips.length, 3), target: 3 };
    },
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'More weekend catches than weekday',
    icon: CalendarDays,
    color: 'indigo-600',
    bgColor: 'indigo-600/10',
    requirement: (sessions) => {
      const weekendCatches = sessions.filter(s => isWeekend(s.caught_at)).length;
      const weekdayCatches = sessions.length - weekendCatches;
      return weekendCatches > weekdayCatches && weekendCatches > 0;
    },
    progress: (sessions) => {
      const weekendCatches = sessions.filter(s => isWeekend(s.caught_at)).length;
      const weekdayCatches = sessions.length - weekendCatches;
      const target = weekdayCatches + 1;
      return { current: Math.min(weekendCatches, target), target };
    },
  },
  {
    id: 'multi-species',
    name: 'Multi-Species Expert',
    description: 'Caught 3+ different species',
    icon: Fish,
    color: 'teal-600',
    bgColor: 'teal-600/10',
    requirement: (sessions) => {
      const uniqueSpecies = new Set(sessions.map(s => s.species_common_name));
      return uniqueSpecies.size >= 3;
    },
    progress: (sessions) => {
      const uniqueSpecies = new Set(sessions.map(s => s.species_common_name));
      return { current: Math.min(uniqueSpecies.size, 3), target: 3 };
    },
  },
  {
    id: 'local-expert',
    name: 'Local Expert',
    description: '50+ catches at the same location',
    icon: MapPin,
    color: 'green-600',
    bgColor: 'green-600/10',
    requirement: (sessions) => {
      const locationCounts = new Map<string, number>();
      sessions.forEach(s => {
        if (!s.rectangle_code) return;
        const count = locationCounts.get(s.rectangle_code) || 0;
        locationCounts.set(s.rectangle_code, count + 1);
      });
      return Array.from(locationCounts.values()).some(count => count >= 50);
    },
    progress: (sessions) => {
      const locationCounts = new Map<string, number>();
      sessions.forEach(s => {
        if (!s.rectangle_code) return;
        const count = locationCounts.get(s.rectangle_code) || 0;
        locationCounts.set(s.rectangle_code, count + 1);
      });
      const maxCount = Math.max(0, ...Array.from(locationCounts.values()));
      return { current: Math.min(maxCount, 50), target: 50 };
    },
  },
  {
    id: 'pier-master',
    name: 'Pier Master',
    description: '10+ catches from piers or harbors',
    icon: Anchor,
    color: 'slate-600',
    bgColor: 'slate-600/10',
    requirement: (sessions) => {
      const pierCatches = sessions.filter(s =>
        s.habitat_type?.toLowerCase().includes('pier') ||
        s.habitat_type?.toLowerCase().includes('harbor') ||
        s.habitat_type?.toLowerCase().includes('dock')
      );
      return pierCatches.length >= 10;
    },
    progress: (sessions) => {
      const pierCatches = sessions.filter(s =>
        s.habitat_type?.toLowerCase().includes('pier') ||
        s.habitat_type?.toLowerCase().includes('harbor') ||
        s.habitat_type?.toLowerCase().includes('dock')
      );
      return { current: Math.min(pierCatches.length, 10), target: 10 };
    },
  },
  {
    id: 'on-fire',
    name: 'On Fire',
    description: '7 consecutive days with catches',
    icon: Flame,
    color: 'orange-600',
    bgColor: 'orange-600/10',
    requirement: (sessions) => {
      return getConsecutiveDays(sessions) >= 7;
    },
    progress: (sessions) => {
      const streak = getConsecutiveDays(sessions);
      return { current: Math.min(streak, 7), target: 7 };
    },
  },
];

/**
 * Get all earned badges for the given sessions
 */
export function getEarnedBadges(sessions: CatchSession[], isFounder?: boolean): Badge[] {
  return BADGE_CONFIGS.filter(badge => badge.requirement(sessions, isFounder));
}

/**
 * Get the next badge to unlock (closest to completion)
 */
export function getNextBadge(sessions: CatchSession[], isFounder?: boolean): {
  badge: Badge;
  progress: { current: number; target: number };
} | null {
  const unearnedBadges = BADGE_CONFIGS.filter(badge => !badge.requirement(sessions, isFounder));

  if (unearnedBadges.length === 0) return null;

  // Find badge with highest completion percentage
  const badgesWithProgress = unearnedBadges
    .map(badge => {
      const progress = badge.progress ? badge.progress(sessions, isFounder) : { current: 0, target: 1 };
      const percentage = progress.target > 0 ? progress.current / progress.target : 0;
      return { badge, progress, percentage };
    })
    .sort((a, b) => b.percentage - a.percentage);

  return badgesWithProgress[0] || null;
}
