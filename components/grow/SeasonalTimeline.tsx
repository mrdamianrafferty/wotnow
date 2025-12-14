import React from 'react';
import { Calendar } from 'lucide-react';
import type { PlantSpecies } from '../../lib/grow/species';

interface SeasonalTimelineProps {
  species: Pick<PlantSpecies, 'harvestSeason' | 'floweringSeason'>;
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type ActivityType = 'harvest' | 'flower';

const activityColors: Record<ActivityType, { bg: string; border: string; label: string }> = {
  harvest: { bg: 'bg-orange-500', border: 'border-orange-300', label: 'Harvest' },
  flower: { bg: 'bg-pink-500', border: 'border-pink-300', label: 'Flowering' },
};

function parseMonthString(monthStr: string | null | undefined): number[] {
  if (!monthStr) return [];
  
  // Handle various formats: "March to May", "Spring", month arrays, etc.
  const monthMap: Record<string, number> = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
    // Seasons
    'spring': -1, // Will expand to Mar, Apr, May
    'summer': -2, // Will expand to Jun, Jul, Aug
    'fall': -3, 'autumn': -3, // Will expand to Sep, Oct, Nov
    'winter': -4, // Will expand to Dec, Jan, Feb
  };

  const lower = monthStr.toLowerCase();
  const result: number[] = [];

  // Check for season keywords
  if (lower.includes('spring')) result.push(2, 3, 4);
  if (lower.includes('summer')) result.push(5, 6, 7);
  if (lower.includes('fall') || lower.includes('autumn')) result.push(8, 9, 10);
  if (lower.includes('winter')) result.push(11, 0, 1);

  if (result.length > 0) return [...new Set(result)];

  // Try to find month names
  for (const [name, idx] of Object.entries(monthMap)) {
    if (idx >= 0 && lower.includes(name)) {
      result.push(idx);
    }
  }

  // Handle "X to Y" ranges
  const rangeMatch = lower.match(/(\w+)\s+to\s+(\w+)/);
  if (rangeMatch) {
    const startMonth = monthMap[rangeMatch[1]];
    const endMonth = monthMap[rangeMatch[2]];
    if (startMonth !== undefined && startMonth >= 0 && endMonth !== undefined && endMonth >= 0) {
      for (let i = startMonth; i !== (endMonth + 1) % 12; i = (i + 1) % 12) {
        result.push(i);
        if (result.length > 12) break; // Safety
      }
      result.push(endMonth);
    }
  }

  return [...new Set(result)];
}

/**
 * Visual calendar showing harvest and flowering times throughout the year.
 * Displays activity types as colored bars on a month grid.
 */
export function SeasonalTimeline({ species }: SeasonalTimelineProps) {
  const activities: { type: ActivityType; months: number[] }[] = [
    { type: 'harvest' as const, months: parseMonthString(species.harvestSeason) },
    { type: 'flower' as const, months: parseMonthString(species.floweringSeason) },
  ].filter(a => a.months.length > 0);

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar className="h-4 w-4 text-green-600" />
        Growing Calendar
      </div>
      
      {/* Month headers */}
      <div className="grid grid-cols-12 gap-px text-center">
        {MONTHS.map((month, idx) => (
          <div 
            key={month + idx} 
            className="text-[10px] text-gray-500 font-medium"
            title={MONTH_NAMES[idx]}
          >
            {month}
          </div>
        ))}
      </div>
      
      {/* Activity rows */}
      <div className="space-y-1">
        {activities.map(({ type, months }) => (
          <div key={type} className="grid grid-cols-12 gap-px">
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const isActive = months.includes(monthIdx);
              const colors = activityColors[type];
              return (
                <div
                  key={monthIdx}
                  className={`h-3 rounded-sm transition-colors ${
                    isActive ? colors.bg : 'bg-gray-100'
                  }`}
                  title={isActive ? `${colors.label}: ${MONTH_NAMES[monthIdx]}` : ''}
                />
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {activities.map(({ type }) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-2 rounded-sm ${activityColors[type].bg}`} />
            <span className="text-gray-600">{activityColors[type].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
