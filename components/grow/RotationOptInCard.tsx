import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, RefreshCw, Shuffle } from 'lucide-react';
import { api } from '../../lib/grow/api';
import { toast } from 'sonner';
import type { DedicatedGroup, RotationMode, SerializedBed } from '../../lib/grow/server/beds';

interface RotationOptInCardProps {
  bed: SerializedBed;
  /** The rotation group of the first plant in the bed (used to auto-assign dedicated_group) */
  firstPlantRotationGroup?: DedicatedGroup | null;
  onBedUpdated: (bed: SerializedBed) => void;
}

export function RotationOptInCard({ bed, firstPlantRotationGroup, onBedUpdated }: RotationOptInCardProps) {
  const [saving, setSaving] = useState<RotationMode | null>(null);

  // Only show for veg_patch beds with no rotation_mode set
  if (bed.type !== 'veg_patch' || bed.rotationMode !== null && bed.rotationMode !== undefined) {
    return null;
  }

  const handleChoice = async (mode: RotationMode) => {
    setSaving(mode);
    try {
      const updates: Record<string, unknown> = { rotationMode: mode };
      if (mode === 'rotating' && firstPlantRotationGroup) {
        updates.dedicatedGroup = firstPlantRotationGroup;
      }
      const response = await api.updateBed(bed.id, updates);
      const updated = response?.bed as SerializedBed;
      if (updated) {
        onBedUpdated(updated);
      }
      toast.success(
        mode === 'rotating'
          ? 'Rotation mode enabled — we\'ll help you plan next year'
          : 'Mixed planting mode — no rotation tracking'
      );
    } catch {
      toast.error('Could not update bed');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-green-800">
          <RefreshCw className="h-4 w-4" />
          Rotate your crops?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-green-700">
          Growing the same family in the same spot year after year depletes the soil.
          Rotation keeps things healthy and reduces pests.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
            disabled={saving !== null}
            onClick={() => handleChoice('rotating')}
          >
            {saving === 'rotating' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Yes, help me rotate
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            disabled={saving !== null}
            onClick={() => handleChoice('mixed')}
          >
            {saving === 'mixed' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Shuffle className="h-3.5 w-3.5 mr-1" />
                No, I&apos;ll mix it up
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
