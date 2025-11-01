/**
 * Badge Showcase Component
 *
 * Displays user achievements with progress tracking.
 * Replaces the "Photo Coverage" stat box on the Trophy Gallery page.
 */

import { Award } from 'lucide-react';
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

  // Select up to 4 badges to display
  // Prioritize: earned badges first, then next badge, then others
  const displayBadges = [...earnedBadges]
    .slice(0, 4)
    .concat(
      BADGE_CONFIGS.filter(b => !earnedBadges.includes(b)).slice(0, 4 - earnedBadges.slice(0, 4).length)
    );

  return (
    <div className="stat bg-base-100 shadow rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="stat-figure text-accent">
          <Award className="w-8 h-8" />
        </div>
        <div className="flex-1 ml-2">
          <div className="stat-title">
            <TranslatedText text="Achievements" />
          </div>
          <div className="stat-desc text-xs opacity-60">
            {earnedCount} of {totalBadges} <TranslatedText text="unlocked" />
          </div>
        </div>
      </div>

      {/* Badge Grid - 4 slots */}
      <div className="flex gap-2 mb-3">
        {displayBadges.map((badge) => {
          const isEarned = earnedBadges.includes(badge);
          const Icon = badge.icon;

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
              className={`flex-1 rounded-lg p-2 flex flex-col items-center justify-center transition-all border-2 ${
                isEarned
                  ? `${colors.bg} ${colors.border}`
                  : 'bg-base-200 opacity-40 border-base-300'
              }`}
              title={`${badge.name}: ${badge.description}`}
            >
              <Icon
                className={`w-5 h-5 ${isEarned ? colors.text : 'text-base-content/30'}`}
              />
              {isEarned && (
                <span className="text-xs mt-1 font-semibold opacity-70">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Next Badge Progress */}
      {nextBadge && (() => {
        const colorMap: Record<string, { bg: string; text: string }> = {
          'amber-500': { bg: 'bg-amber-500/10', text: 'text-amber-500' },
          'purple-600': { bg: 'bg-purple-600/10', text: 'text-purple-600' },
          'orange-500': { bg: 'bg-orange-500/10', text: 'text-orange-500' },
          'blue-600': { bg: 'bg-blue-600/10', text: 'text-blue-600' },
          'red-500': { bg: 'bg-red-500/10', text: 'text-red-500' },
          'indigo-600': { bg: 'bg-indigo-600/10', text: 'text-indigo-600' },
          'teal-600': { bg: 'bg-teal-600/10', text: 'text-teal-600' },
          'green-600': { bg: 'bg-green-600/10', text: 'text-green-600' },
          'slate-600': { bg: 'bg-slate-600/10', text: 'text-slate-600' },
          'orange-600': { bg: 'bg-orange-600/10', text: 'text-orange-600' },
        };
        const colors = colorMap[nextBadge.badge.color] || { bg: 'bg-gray-500/10', text: 'text-gray-500' };
        const Icon = nextBadge.badge.icon;

        return (
          <div className="bg-base-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className={`flex-shrink-0 rounded-full ${colors.bg} p-1.5`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold mb-1">
                <TranslatedText text="Next:" /> {nextBadge.badge.name}
              </div>
              <div className="text-xs opacity-60 mb-2 truncate">
                {nextBadge.badge.description}
              </div>
              <div className="flex items-center gap-2">
                <progress
                  className="progress progress-primary w-full h-2"
                  value={nextBadge.progress.current}
                  max={nextBadge.progress.target}
                ></progress>
                <span className="text-xs font-semibold whitespace-nowrap">
                  {nextBadge.progress.current}/{nextBadge.progress.target}
                </span>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* All badges earned state */}
      {!nextBadge && earnedCount === totalBadges && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-xs font-semibold">
            <TranslatedText text="All Badges Unlocked!" />
          </div>
        </div>
      )}

      {/* No catches yet state */}
      {sessions.length === 0 && (
        <div className="bg-base-200 rounded-lg p-3 text-center">
          <div className="text-xs opacity-60">
            <TranslatedText text="Log catches to unlock badges!" />
          </div>
        </div>
      )}
    </div>
  );
}
