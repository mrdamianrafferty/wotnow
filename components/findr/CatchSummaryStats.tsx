'use client';

import { useMemo } from 'react';
import { Fish, TrendingUp } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { MemberStatus } from './MemberStatus';
import { BadgeShowcase } from './BadgeShowcase';
import { getFishingEncouragement } from '@/lib/findr/encouragementMessages';
import type { CatchSession } from '@/lib/findr/badgeDefinitions';

interface CatchSummaryStatsProps {
  sessions: CatchSession[];
  className?: string;
}

export function CatchSummaryStats({ sessions, className = '' }: CatchSummaryStatsProps) {
  const speciesNames = useMemo(() => {
    const allNames = sessions.map((session) => session.species_common_name).filter(Boolean);
    const unique = Array.from(new Set(allNames));
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [sessions]);

  const speciesCount = speciesNames.length;

  const totalFishCount = useMemo(() => {
    return sessions.reduce((total, session) => total + (session.quantity || 0), 0);
  }, [sessions]);

  const encouragementMessage = useMemo(() => {
    return getFishingEncouragement(totalFishCount);
  }, [totalFishCount]);

  const topSpecies = speciesNames.slice(0, 8);
  const remainingSpecies = speciesNames.length - topSpecies.length;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ${className}`.trim()}>
      <div className="stat bg-base-100 shadow rounded-lg">
        <div className="stat-title">
          <TranslatedText text="Species Caught" />
        </div>
        <div className="stat-value flex items-center gap-2">
          <span className="text-primary">{speciesCount}</span>
          <Fish className="w-7 h-7 text-primary" />
          <Fish className="w-7 h-7 text-secondary" />
        </div>
        {topSpecies.length > 0 && (
          <div className="stat-desc mt-2">
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
              {topSpecies.map((name) => (
                <span key={name} className="badge badge-sm badge-primary badge-outline">
                  {name}
                </span>
              ))}
              {remainingSpecies > 0 && (
                <span className="text-xs opacity-60 mt-1">
                  +{remainingSpecies} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="stat bg-base-100 shadow rounded-lg">
        <div className="stat-title">
          <TranslatedText text="Total Fish" />
        </div>
        <div className="stat-value flex items-center gap-2">
          <span className="text-success">{totalFishCount}</span>
          <TrendingUp className="w-7 h-7 text-success" />
        </div>
        {encouragementMessage && (
          <div className="stat-desc mt-2">
            <span className="badge badge-success gap-1">{encouragementMessage}</span>
          </div>
        )}
      </div>

      <MemberStatus sessions={sessions} />
      <BadgeShowcase sessions={sessions} />
    </div>
  );
}
