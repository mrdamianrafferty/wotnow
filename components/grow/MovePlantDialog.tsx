import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/grow/api';
import { BED_COLOR_HEX, type SerializedBed, type SerializedBedPlanting } from '../../lib/grow/server/beds';

interface MovePlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planting: SerializedBedPlanting | null;
  currentBedId: string;
  onMoved: () => void;
}

export function MovePlantDialog({ open, onOpenChange, planting, currentBedId, onMoved }: MovePlantDialogProps) {
  const [beds, setBeds] = useState<SerializedBed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    api.getBeds()
      .then((res: { beds: SerializedBed[] }) => setBeds(res.beds.filter(b => b.id !== currentBedId)))
      .catch(() => toast.error('Could not load beds'))
      .finally(() => setIsLoading(false));
  }, [open, currentBedId]);

  const handleMove = async (targetBedId: string) => {
    if (!planting) return;
    setIsMoving(true);
    try {
      await api.movePlantToBed(currentBedId, planting.plantingId, targetBedId);
      const targetBed = beds.find(b => b.id === targetBedId);
      toast.success(`${planting.plantName} moved to ${targetBed?.name || 'bed'}`);
      onOpenChange(false);
      onMoved();
    } catch {
      toast.error('Could not move plant');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            Move {planting?.plantName || 'plant'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : beds.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No other beds available. Create another bed first.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {beds.map(bed => {
              const hexColor = BED_COLOR_HEX[bed.color] || BED_COLOR_HEX.terracotta;
              return (
                <Button
                  key={bed.id}
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3"
                  disabled={isMoving}
                  onClick={() => handleMove(bed.id)}
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hexColor }} />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate">{bed.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bed.plantCount} plant{bed.plantCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
