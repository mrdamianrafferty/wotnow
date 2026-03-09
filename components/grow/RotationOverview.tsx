import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { SerializedBed, DedicatedGroup } from '../../lib/grow/server/beds';
import { ROTATION_GROUP_FRIENDLY, type RotationGroup } from '../../lib/grow/bedIntelligenceTypes';

interface RotationOverviewProps {
  beds: SerializedBed[];
}

const GROUP_EMOJI: Record<DedicatedGroup, string> = {
  brassica: '🥬',
  legume: '🫛',
  root_allium: '🥕',
  solanaceae: '🍅',
  cucurbit: '🎃',
};

export function RotationOverview({ beds }: RotationOverviewProps) {
  const rotatingBeds = beds.filter(b => b.rotationMode === 'rotating' && b.dedicatedGroup);

  if (rotatingBeds.length < 2) return null;

  const year = new Date().getFullYear();

  // Detect conflicts: multiple beds with the same dedicated group
  const groupCounts = new Map<string, number>();
  for (const bed of rotatingBeds) {
    if (bed.dedicatedGroup) {
      groupCounts.set(bed.dedicatedGroup, (groupCounts.get(bed.dedicatedGroup) || 0) + 1);
    }
  }
  const hasConflicts = [...groupCounts.values()].some(c => c > 1);

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-green-800">
          <RefreshCw className="h-4 w-4" />
          Rotation Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="divide-y divide-green-100">
          {rotatingBeds.map(bed => {
            const group = bed.dedicatedGroup as DedicatedGroup;
            const friendly = ROTATION_GROUP_FRIENDLY[group as RotationGroup];
            const isDuplicate = (groupCounts.get(group) || 0) > 1;

            return (
              <div key={bed.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{GROUP_EMOJI[group]}</span>
                  <span className="text-xs font-medium truncate">{bed.name}</span>
                  {isDuplicate && (
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-[10px] text-green-700">
                    {friendly?.label?.split(' (')[0] || group} {year}
                  </p>
                  {friendly?.followWith && (
                    <p className="text-[10px] text-muted-foreground">
                      Next: {friendly.followWith.split(' — ')[0].split(',')[0]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasConflicts && (
          <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-50 border border-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-700">
              Some beds share the same crop family. Spread different families across beds for maximum soil health.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
