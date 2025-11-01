/**
 * User Status Medal System
 *
 * Gamification layer that assigns medals based on user activity and tenure.
 * Replaces the "Stock Photos" stat box with member status recognition.
 */

import { Crown, Anchor, TrendingUp, Sparkles, Clock, Flame, type LucideIcon } from 'lucide-react';

export interface UserData {
  userId: number;
  joinDate: Date;
  sessions: Array<{ date: string; type?: string }>;
}

export interface UserStatus {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  requirement: (data: UserData) => boolean;
}

export interface StatusMedal {
  tier: 'gold' | 'silver' | 'bronze';
  status: UserStatus;
  color: string;
  bgColor: string;
  borderClass: string;
}

// Medal tier assignment rules
export const STATUS_MEDAL_RULES = {
  gold: ['founder', 'seadog'],
  silver: ['regular', 'consistent'],
  bronze: ['newmember', 'inactive']
};

// Helper functions
function getMonthsDifference(startDate: Date, endDate: Date): number {
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                 (endDate.getMonth() - startDate.getMonth());
  return months;
}

function isWithinLastMonth(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return date >= thirtyDaysAgo && date <= now;
}

function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function hasConsecutiveDays(sessions: Array<{ date: string }>, targetDays: number): boolean {
  if (sessions.length === 0) return false;

  // Get unique dates and sort descending
  const dateSet = new Set(sessions.map(s => {
    const d = new Date(s.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }));

  const sortedDates = Array.from(dateSet)
    .sort()
    .reverse()
    .map(d => new Date(d));

  let consecutiveCount = 1;
  let currentDate = sortedDates[0];

  for (let i = 1; i < sortedDates.length && consecutiveCount < targetDays; i++) {
    const dayDiff = Math.floor((currentDate.getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      consecutiveCount++;
      currentDate = sortedDates[i];
    } else if (dayDiff > 1) {
      // Gap found, reset counter
      consecutiveCount = 1;
      currentDate = sortedDates[i];
    }
  }

  return consecutiveCount >= targetDays;
}

// Status definitions
export const STATUS_DEFINITIONS: UserStatus[] = [
  {
    id: 'founder',
    label: 'Founder',
    icon: Crown,
    description: 'First 500 anglers',
    requirement: (data) => data.userId <= 500
  },
  {
    id: 'seadog',
    label: 'Sea Dog',
    icon: Anchor,
    description: '6+ months member',
    requirement: (data) => getMonthsDifference(data.joinDate, new Date()) >= 6
  },
  {
    id: 'regular',
    label: 'Regular',
    icon: TrendingUp,
    description: 'Active this month',
    requirement: (data) => {
      return data.sessions.some(s => isWithinLastMonth(s.date));
    }
  },
  {
    id: 'consistent',
    label: 'On Fire',
    icon: Flame,
    description: '7-day streak',
    requirement: (data) => {
      return hasConsecutiveDays(data.sessions, 7);
    }
  },
  {
    id: 'newmember',
    label: 'New Angler',
    icon: Sparkles,
    description: 'Welcome aboard!',
    requirement: (data) => getMonthsDifference(data.joinDate, new Date()) < 3
  },
  {
    id: 'inactive',
    label: 'Dormant',
    icon: Clock,
    description: 'We miss you!',
    requirement: (data) => {
      if (data.sessions.length === 0) return true;
      const sortedSessions = [...data.sessions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastSession = sortedSessions[0];
      return daysSince(lastSession.date) > 30;
    }
  }
];

/**
 * Get user medals based on activity and tenure
 */
export function getUserMedals(userData: UserData): {
  gold?: StatusMedal;
  silver?: StatusMedal;
  bronze?: StatusMedal;
} {
  const qualifyingStatuses = STATUS_DEFINITIONS.filter(status =>
    status.requirement(userData)
  );

  const medals: { gold?: StatusMedal; silver?: StatusMedal; bronze?: StatusMedal } = {};

  // Special case: Founder + Sea Dog = "Founding Veteran"
  const statusIds = qualifyingStatuses.map(s => s.id);
  if (statusIds.includes('founder') && statusIds.includes('seadog')) {
    const founderStatus = STATUS_DEFINITIONS.find(s => s.id === 'founder');
    medals.gold = {
      tier: 'gold',
      status: {
        ...founderStatus!,
        label: 'Founding Veteran',
        description: 'Original crew member'
      },
      color: 'text-amber-600',
      bgColor: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100',
      borderClass: 'ring-2 ring-amber-400 ring-offset-1'
    };
  } else {
    // Normal gold medal
    const goldStatus = qualifyingStatuses.find(s => STATUS_MEDAL_RULES.gold.includes(s.id));
    if (goldStatus) {
      medals.gold = {
        tier: 'gold',
        status: goldStatus,
        color: 'text-amber-600',
        bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-100',
        borderClass: 'ring-2 ring-amber-400'
      };
    }
  }

  // Silver medal
  const silverStatus = qualifyingStatuses.find(s => STATUS_MEDAL_RULES.silver.includes(s.id));
  if (silverStatus) {
    medals.silver = {
      tier: 'silver',
      status: silverStatus,
      color: 'text-gray-600',
      bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100',
      borderClass: 'ring-2 ring-gray-300'
    };
  }

  // Bronze medal
  const bronzeStatus = qualifyingStatuses.find(s => STATUS_MEDAL_RULES.bronze.includes(s.id));
  if (bronzeStatus) {
    medals.bronze = {
      tier: 'bronze',
      status: bronzeStatus,
      color: bronzeStatus.id === 'newmember' ? 'text-blue-600' : 'text-orange-700',
      bgColor: bronzeStatus.id === 'newmember'
        ? 'bg-gradient-to-br from-blue-50 to-sky-50'
        : 'bg-gradient-to-br from-orange-50 to-amber-50',
      borderClass: 'ring-1 ring-orange-300'
    };
  }

  // Default to "New Angler" if no status qualifies
  if (!medals.gold && !medals.silver && !medals.bronze) {
    const newMemberStatus = STATUS_DEFINITIONS.find(s => s.id === 'newmember');
    medals.bronze = {
      tier: 'bronze',
      status: newMemberStatus!,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-50 to-sky-50',
      borderClass: 'ring-1 ring-blue-300'
    };
  }

  return medals;
}
