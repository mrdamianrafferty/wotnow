import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '../../lib/grow/api';
import { toast } from 'sonner';
import type { DedicatedGroup, SerializedBed } from '../../lib/grow/server/beds';
import { ROTATION_GROUP_FRIENDLY, type RotationGroup } from '../../lib/grow/bedIntelligenceTypes';

interface RotationPlanCardProps {
  bed: SerializedBed;
  onBedUpdated: (bed: SerializedBed) => void;
}

const ASSIGNABLE_GROUPS: DedicatedGroup[] = ['brassica', 'legume', 'root_allium', 'solanaceae', 'cucurbit'];

const GROUP_EMOJI: Record<DedicatedGroup, string> = {
  brassica: '🥬',
  legume: '🫛',
  root_allium: '🥕',
  solanaceae: '🍅',
  cucurbit: '🎃',
};

export function RotationPlanCard({ bed, onBedUpdated }: RotationPlanCardProps) {
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState(false);

  if (bed.rotationMode !== 'rotating' || !bed.dedicatedGroup) {
    return null;
  }

  const currentGroup = bed.dedicatedGroup as RotationGroup;
  const friendly = ROTATION_GROUP_FRIENDLY[currentGroup];
  const year = new Date().getFullYear();

  const handleGroupChange = async (newGroup: DedicatedGroup) => {
    setSaving(true);
    try {
      const response = await api.updateBed(bed.id, { dedicatedGroup: newGroup });
      const updated = response?.bed as SerializedBed;
      if (updated) {
        onBedUpdated(updated);
      }
      toast.success(`Switched to ${ROTATION_GROUP_FRIENDLY[newGroup as RotationGroup]?.label || newGroup}`);
      setChanging(false);
    } catch {
      toast.error('Could not update rotation group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-green-800">
          <RefreshCw className="h-4 w-4" />
          Crop Rotation Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current year assignment */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{GROUP_EMOJI[bed.dedicatedGroup]}</span>
          <div>
            <p className="text-xs font-medium text-green-800">
              This year ({year}): {friendly?.label || currentGroup}
            </p>
            {friendly?.examples && (
              <p className="text-[10px] text-green-600">{friendly.examples}</p>
            )}
          </div>
        </div>

        {/* Next year suggestion */}
        {friendly?.followWith && (
          <div className="p-2 rounded-md bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-800">
              <span className="font-medium">Next year:</span> try {friendly.followWith}
            </p>
          </div>
        )}

        {/* Change group */}
        {!changing ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-green-700 hover:text-green-800 h-7 px-2"
            onClick={() => setChanging(true)}
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Change this year&apos;s group
          </Button>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium">Select crop family:</p>
            {ASSIGNABLE_GROUPS.map(group => {
              const info = ROTATION_GROUP_FRIENDLY[group as RotationGroup];
              const isActive = group === bed.dedicatedGroup;
              return (
                <button
                  key={group}
                  disabled={saving}
                  onClick={() => !isActive && handleGroupChange(group)}
                  className={`w-full text-left p-2 rounded-md text-xs transition-colors ${
                    isActive
                      ? 'bg-green-100 border border-green-300 text-green-800 font-medium'
                      : 'bg-white border border-gray-200 hover:border-green-300 hover:bg-green-50 text-gray-700'
                  }`}
                >
                  <span className="mr-1.5">{GROUP_EMOJI[group]}</span>
                  {info?.label || group}
                  {saving && !isActive && <Loader2 className="h-3 w-3 animate-spin inline ml-2" />}
                </button>
              );
            })}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6 w-full"
              onClick={() => setChanging(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
