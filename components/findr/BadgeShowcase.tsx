/**
 * Badge Showcase Component
 *
 * Displays user achievements with progress tracking in a scrollable gallery.
 * Replaces the "Photo Coverage" stat box on the Trophy Gallery page.
 */

import { Award, ChevronRight } from 'lucide-react';
import { CatchSession, BADGE_CONFIGS, getEarnedBadges, getNextBadge } from '@/lib/findr/badgeDefinitions';
import { TranslatedText } from '@/components/translation/TranslatedFishCard';

interface BadgeShowcaseProps {
  sessions: CatchSession[];
}

export function BadgeShowcase({ sessions }: BadgeShowcaseProps) {
  const earnedBadges = getEarnedBadges(sessions);
  const nextBadge = getNextBadge(sessions);

  // Total badges available
  const totalBadges = BADGE_CONFIGS.length;
  const earnedCount = earnedBadges.length;

  return (
    <div className="stat bg-base-100 shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-6 h-6 text-accent" />
          <div>
            <div className="stat-title text-sm">
              <TranslatedText text="Achievements" />
            </div>
            <div className="stat-desc text-xs opacity-60">
              {earnedCount} of {totalBadges} <TranslatedText text="unlocked" />
            </div>
          </div>
        </div>
        {BADGE_CONFIGS.length > 4 && (
          <ChevronRight className="w-4 h-4 text-base-content/30" />
        )}
      </div>

      {/* Scrollable Badge Gallery */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent mb-3">
        {BADGE_CONFIGS.map((badge) => {
          const isEarned = earnedBadges.includes(badge);
          const Icon = badge.icon;
          const progress = badge.progress ? badge.progress(sessions) : null;

          // Map badge color to Tailwind classes
          const colorMap: Record<string, { bg: string; border: string; text: string }> = {
            'amber-500': { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-500' },
            'purple-600': { bg: 'bg-purple-600/10', border: 'border-purple-600', text: 'text-purple-600' },
            'orange-500': { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-500' },
            'blue-600': { bg: 'bg-blue-600/10', border: 'border-blue-600', text: 'text-blue-600' },
            'red-500': { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500' },
            'indigo-600': { bg: 'bg-indigo-600/10', border: 'border-indigo-600', text: 'text-indigo-600' },
            'teal-600': { bg: 'bg-teal-600/10', border: 'border-teal-600', text: 'text-teal-600' },
            'green-600': { bg: 'bg-green-600/10', border: 'border-green-600', text: 'text-green-600' },
            'slate-600': { bg: 'bg-slate-600/10', border: 'border-slate-600', text: 'text-slate-600' },
            'orange-600': { bg: 'bg-orange-600/10', border: 'border-orange-600', text: 'text-orange-600' },
          };

          const colors = colorMap[badge.color] || { bg: 'bg-gray-500/10', border: 'border-gray-500', text: 'text-gray-500' };

          return (
            <div
              key={badge.id}
              className={`flex-shrink-0 w-20 h-20 rounded-lg p-2 flex flex-col items-center justify-center transition-all border-2 relative group ${
                isEarned
                  ? `${colors.bg} ${colors.border}`
                  : 'bg-base-200 opacity-40 border-base-300'
              }`}
              title={`${badge.name}: ${badge.description}`}
            >
              <Icon
                className={`w-6 h-6 ${isEarned ? colors.text : 'text-base-content/30'}`}
              />
              {isEarned && (
                <span className="text-xs mt-1 font-semibold opacity-70">
                  ✓
                </span>
              )}
              {!isEarned && progress && (
                <span className="text-[10px] mt-1 font-medium opacity-50">
                  {progress.current}/{progress.target}
                </span>
              )}

              {/* Tooltip on hover */}
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                <div className="bg-base-300 text-xs font-medium px-2 py-1 rounded shadow-lg">
                  <div className="font-semibold">{badge.name}</div>
                  <div className="text-[10px] opacity-70">{badge.description}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state or completion message */}
      {sessions.length === 0 ? (
        <div className="bg-base-200 rounded-lg p-2 text-center">
          <div className="text-xs opacity-60">
            <TranslatedText text="Log catches to unlock badges!" />
          </div>
        </div>
      ) : earnedCount === totalBadges ? (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-2 text-center">
          <div className="text-xl">🏆</div>
          <div className="text-xs font-semibold mt-1">
            <TranslatedText text="All Badges Unlocked!" />
          </div>
        </div>
      ) : nextBadge ? (
        <div className="bg-base-200 rounded-lg p-2 flex items-center gap-2">
          <div className="text-xs flex-1">
            <span className="font-semibold"><TranslatedText text="Next:" /></span> {nextBadge.badge.name}
          </div>
          <div className="text-xs font-semibold opacity-60">
            {nextBadge.progress.current}/{nextBadge.progress.target}
          </div>
        </div>
      ) : null}
    </div>
  );
}
