/**
 * JobsTimeline - Visual Gantt-style timeline showing all gardening tasks across 12 months
 *
 * Displays task types (sow, transplant, harvest, prune, feed, water, etc.) as colored bars
 * spanning the months when each task should be performed.
 */

import React, { useMemo } from 'react';
import {
  Sprout,
  Shovel,
  Scissors,
  Wheat,
  Droplets,
  Leaf,
  Shield,
  Sun,
  Wind,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface PlantingWindow {
  plantSlug: string;
  plantName: string | null;
  taskCode: string;
  taskName: string | null;
  startMonth?: number;
  endMonth?: number;
  startWeek?: number;
  endWeek?: number;
  notes?: string | null;
}

interface JobsTimelineProps {
  windows: PlantingWindow[];
  compact?: boolean;
}

// =============================================================================
// TASK STYLING
// =============================================================================

type TaskStyle = {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  category: 'planting' | 'maintenance' | 'harvest' | 'protection';
};

const TASK_STYLES: Record<string, TaskStyle> = {
  // Planting tasks
  sow_indoors: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
    icon: Sprout,
    label: 'Sow Indoors',
    category: 'planting',
  },
  sow_outdoors: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-400',
    borderColor: 'border-emerald-400',
    icon: Sprout,
    label: 'Sow Outdoors',
    category: 'planting',
  },
  direct_sow: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-400',
    borderColor: 'border-emerald-400',
    icon: Sprout,
    label: 'Direct Sow',
    category: 'planting',
  },
  sow_under_cover: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-300',
    borderColor: 'border-emerald-300',
    icon: Sprout,
    label: 'Sow Under Cover',
    category: 'planting',
  },
  plant_out: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    icon: Shovel,
    label: 'Plant Out',
    category: 'planting',
  },
  plant_out_hardy: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-400',
    borderColor: 'border-blue-400',
    icon: Shovel,
    label: 'Plant Out (Hardy)',
    category: 'planting',
  },
  plant_out_tender: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-300',
    borderColor: 'border-blue-300',
    icon: Shovel,
    label: 'Plant Out (Tender)',
    category: 'planting',
  },
  transplant: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    icon: Shovel,
    label: 'Transplant',
    category: 'planting',
  },
  harden_off: {
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-400',
    borderColor: 'border-cyan-400',
    icon: Wind,
    label: 'Harden Off',
    category: 'planting',
  },

  // Harvest
  harvest: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500',
    icon: Wheat,
    label: 'Harvest',
    category: 'harvest',
  },

  // Maintenance tasks
  prune: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-500',
    borderColor: 'border-purple-500',
    icon: Scissors,
    label: 'Prune',
    category: 'maintenance',
  },
  prune_winter: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-600',
    borderColor: 'border-purple-600',
    icon: Scissors,
    label: 'Winter Pruning',
    category: 'maintenance',
  },
  prune_summer: {
    color: 'text-purple-700',
    bgColor: 'bg-purple-400',
    borderColor: 'border-purple-400',
    icon: Scissors,
    label: 'Summer Pruning',
    category: 'maintenance',
  },
  feed: {
    color: 'text-lime-700',
    bgColor: 'bg-lime-500',
    borderColor: 'border-lime-500',
    icon: Sparkles,
    label: 'Feed',
    category: 'maintenance',
  },
  fertilize: {
    color: 'text-lime-700',
    bgColor: 'bg-lime-500',
    borderColor: 'border-lime-500',
    icon: Sparkles,
    label: 'Fertilize',
    category: 'maintenance',
  },
  water: {
    color: 'text-sky-700',
    bgColor: 'bg-sky-400',
    borderColor: 'border-sky-400',
    icon: Droplets,
    label: 'Water',
    category: 'maintenance',
  },
  mulch: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-400',
    borderColor: 'border-orange-400',
    icon: Leaf,
    label: 'Mulch',
    category: 'maintenance',
  },
  thin: {
    color: 'text-rose-700',
    bgColor: 'bg-rose-400',
    borderColor: 'border-rose-400',
    icon: Scissors,
    label: 'Thin Seedlings',
    category: 'maintenance',
  },
  deadhead: {
    color: 'text-pink-700',
    bgColor: 'bg-pink-400',
    borderColor: 'border-pink-400',
    icon: Scissors,
    label: 'Deadhead',
    category: 'maintenance',
  },
  stake: {
    color: 'text-stone-700',
    bgColor: 'bg-stone-400',
    borderColor: 'border-stone-400',
    icon: Shovel,
    label: 'Stake/Support',
    category: 'maintenance',
  },
  weed: {
    color: 'text-green-700',
    bgColor: 'bg-green-400',
    borderColor: 'border-green-400',
    icon: Leaf,
    label: 'Weed',
    category: 'maintenance',
  },

  // Protection
  protect_frost: {
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-400',
    borderColor: 'border-indigo-400',
    icon: Shield,
    label: 'Frost Protection',
    category: 'protection',
  },
};

const DEFAULT_STYLE: TaskStyle = {
  color: 'text-gray-700',
  bgColor: 'bg-gray-400',
  borderColor: 'border-gray-400',
  icon: Sun,
  label: 'Task',
  category: 'maintenance',
};

function getTaskStyle(taskCode: string): TaskStyle {
  return TASK_STYLES[taskCode] || DEFAULT_STYLE;
}

// =============================================================================
// HELPERS
// =============================================================================

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function getCurrentMonthIndex(): number {
  return new Date().getMonth();
}

/**
 * Check if a month falls within a range (supports wrapping, e.g., Nov-Feb)
 */
function isMonthInRange(monthIndex: number, startMonth: number, endMonth: number): boolean {
  // Convert to 0-indexed
  const s = startMonth - 1;
  const e = endMonth - 1;

  if (s <= e) {
    // Normal range: Jan-Mar
    return monthIndex >= s && monthIndex <= e;
  } else {
    // Wrapped range: Nov-Feb
    return monthIndex >= s || monthIndex <= e;
  }
}

/**
 * Group windows by task code and merge overlapping ranges
 */
function groupAndMergeWindows(windows: PlantingWindow[]): Map<string, {
  taskCode: string;
  taskName: string;
  ranges: Array<{ start: number; end: number }>;
  notes: string[];
}> {
  const grouped = new Map<string, {
    taskCode: string;
    taskName: string;
    ranges: Array<{ start: number; end: number }>;
    notes: string[];
  }>();

  for (const w of windows) {
    // Skip windows without valid month data
    if (w.startMonth === undefined || w.endMonth === undefined) continue;

    const existing = grouped.get(w.taskCode);
    const range = { start: w.startMonth, end: w.endMonth };
    const note = w.notes || '';

    if (existing) {
      existing.ranges.push(range);
      if (note && !existing.notes.includes(note)) {
        existing.notes.push(note);
      }
    } else {
      const style = getTaskStyle(w.taskCode);
      grouped.set(w.taskCode, {
        taskCode: w.taskCode,
        taskName: w.taskName || style.label,
        ranges: [range],
        notes: note ? [note] : [],
      });
    }
  }

  return grouped;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function JobsTimeline({ windows, compact = false }: JobsTimelineProps) {
  const currentMonth = useMemo(() => getCurrentMonthIndex(), []);

  const taskGroups = useMemo(() => {
    const grouped = groupAndMergeWindows(windows);

    // Sort by category then by start month of first range
    const categoryOrder = ['planting', 'harvest', 'maintenance', 'protection'];

    return Array.from(grouped.values()).sort((a, b) => {
      const styleA = getTaskStyle(a.taskCode);
      const styleB = getTaskStyle(b.taskCode);
      const catDiff = categoryOrder.indexOf(styleA.category) - categoryOrder.indexOf(styleB.category);
      if (catDiff !== 0) return catDiff;

      // Within same category, sort by earliest start month
      const minStartA = Math.min(...a.ranges.map(r => r.start));
      const minStartB = Math.min(...b.ranges.map(r => r.start));
      return minStartA - minStartB;
    });
  }, [windows]);

  if (windows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Month headers */}
      <div className="flex">
        {/* Task name column */}
        <div className={compact ? "w-24 shrink-0" : "w-32 shrink-0"} />

        {/* Month columns */}
        <div className="flex-1 grid grid-cols-12 gap-px">
          {MONTHS.map((month, idx) => (
            <div
              key={month + idx}
              className={`
                text-center text-[10px] font-medium py-1
                ${idx === currentMonth
                  ? 'bg-green-600 text-white rounded-t'
                  : 'text-muted-foreground'
                }
              `}
              title={MONTH_NAMES[idx]}
            >
              {month}
            </div>
          ))}
        </div>
      </div>

      {/* Task rows */}
      <div className="space-y-1">
        {taskGroups.map((task) => {
          const style = getTaskStyle(task.taskCode);
          const Icon = style.icon;

          return (
            <div key={task.taskCode} className="flex items-center group">
              {/* Task name */}
              <div
                className={`
                  ${compact ? "w-24" : "w-32"} shrink-0 pr-2
                  flex items-center gap-1.5 text-xs truncate
                `}
                title={`${task.taskName}${task.notes.length > 0 ? ': ' + task.notes.join('; ') : ''}`}
              >
                <Icon className={`h-3.5 w-3.5 ${style.color} shrink-0`} />
                <span className={`truncate ${style.color} font-medium`}>
                  {compact ? task.taskCode.replace(/_/g, ' ') : task.taskName}
                </span>
              </div>

              {/* Month bars */}
              <div className="flex-1 grid grid-cols-12 gap-px">
                {Array.from({ length: 12 }, (_, monthIdx) => {
                  const isActive = task.ranges.some(r =>
                    isMonthInRange(monthIdx, r.start, r.end)
                  );
                  const isCurrentMonth = monthIdx === currentMonth;

                  return (
                    <div
                      key={monthIdx}
                      className={`
                        h-6 rounded-sm transition-all
                        ${isActive
                          ? `${style.bgColor} ${isCurrentMonth ? 'ring-2 ring-green-600 ring-offset-1' : ''}`
                          : 'bg-gray-100'
                        }
                        ${isCurrentMonth && !isActive ? 'ring-1 ring-green-400' : ''}
                      `}
                      title={isActive
                        ? `${task.taskName}: ${MONTH_NAMES[monthIdx]}`
                        : MONTH_NAMES[monthIdx]
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-2">Legend</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {taskGroups.map((task) => {
              const style = getTaskStyle(task.taskCode);
              const Icon = style.icon;
              return (
                <div key={task.taskCode} className="flex items-center gap-1.5 text-xs">
                  <div className={`w-3 h-3 rounded-sm ${style.bgColor}`} />
                  <Icon className={`h-3 w-3 ${style.color}`} />
                  <span className="text-muted-foreground">{task.taskName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current month indicator */}
      <div className="text-xs text-muted-foreground text-center">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 bg-green-600 rounded-full" />
          Current month: {MONTH_NAMES[currentMonth]}
        </span>
      </div>
    </div>
  );
}

export default JobsTimeline;
