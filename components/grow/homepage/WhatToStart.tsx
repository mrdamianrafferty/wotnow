import React from 'react';
import { Sprout, Snowflake } from 'lucide-react';
import type { SeasonalTint } from '../../../lib/grow/seasonalColors';

interface CalendarWindow {
  plantSlug: string;
  plantName: string | null;
  taskCode: string;
  taskName: string | null;
  startMonth: number;
  startWeek: number;
  endMonth: number;
  endWeek: number;
  frostTolerance: 'hardy' | 'half_hardy' | 'tender' | null;
  frostProtectionNeeded: boolean;
}

interface WhatToStartProps {
  windows: CalendarWindow[];
  userPlantSlugs: Set<string>;
  seasonal: SeasonalTint;
  t: (value: string) => string;
}

const TASK_BADGES: Record<string, { label: string; emoji: string; className: string }> = {
  sow_indoors: { label: 'Sow indoors', emoji: '\u{1F331}', className: 'bg-amber-100 text-amber-800' },
  direct_sow: { label: 'Direct sow', emoji: '\u{1F33F}', className: 'bg-green-100 text-green-700' },
  transplant: { label: 'Transplant', emoji: '\u{1FAB4}', className: 'bg-blue-100 text-blue-700' },
  plant_out: { label: 'Plant out', emoji: '\u{1F33B}', className: 'bg-emerald-100 text-emerald-700' },
};

function isInCurrentWindow(w: CalendarWindow): boolean {
  const now = new Date();
  const month = now.getMonth() + 1;
  const dayOfMonth = now.getDate();
  const week = Math.ceil(dayOfMonth / 7);

  const startIdx = (w.startMonth - 1) * 4 + (w.startWeek - 1);
  const endIdx = (w.endMonth - 1) * 4 + (w.endWeek - 1);
  const currentIdx = (month - 1) * 4 + (week - 1);

  return currentIdx >= startIdx && currentIdx <= endIdx;
}

export function WhatToStart({ windows, userPlantSlugs, seasonal, t }: WhatToStartProps) {
  // Filter to windows active now, excluding species user already grows
  const active = windows
    .filter(w => isInCurrentWindow(w) && !userPlantSlugs.has(w.plantSlug))
    .slice(0, 3);

  if (active.length === 0) return null;

  return (
    <section aria-labelledby="start-heading">
      <h2 id="start-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <Sprout size={16} style={{ color: seasonal.accentColor }} aria-hidden="true" />
        {t('What to Start This Week')}
      </h2>
      <div className="space-y-2">
        {active.map(w => {
          const badge = TASK_BADGES[w.taskCode] || { label: w.taskName || w.taskCode, emoji: '', className: 'bg-gray-100 text-gray-700' };
          return (
            <div
              key={`${w.plantSlug}-${w.taskCode}`}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 hover:shadow-sm hover:scale-[1.01] transition-all duration-200"
              style={{ backgroundImage: seasonal.gradient }}
            >
              <span className="text-sm font-medium text-foreground">{w.plantName || w.plantSlug}</span>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                  {badge.emoji ? `${badge.emoji} ` : ''}{badge.label}
                </span>
                {w.frostTolerance === 'tender' && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                    <Snowflake size={10} aria-hidden="true" />
                    Frost tender
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
