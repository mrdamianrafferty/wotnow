import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Sprout,
  MoveRight,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/grow/api';
import { BED_COLOR_HEX, BED_TYPES, type SerializedBed } from '../../lib/grow/server/beds';
import type { SerializedPlant } from '../../lib/grow/server/plants';
import { EditBedDialog } from './EditBedDialog';

export function BedDetailPage() {
  const router = useRouter();
  const bedId = router.query.bedId as string;

  const [bed, setBed] = useState<SerializedBed | null>(null);
  const [plants, setPlants] = useState<SerializedPlant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Move plants mode
  const [showMovePanel, setShowMovePanel] = useState(false);
  const [unassignedPlants, setUnassignedPlants] = useState<SerializedPlant[]>([]);
  const [selectedMoveIds, setSelectedMoveIds] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);

  const loadBed = useCallback(async () => {
    if (!bedId) return;
    setIsLoading(true);
    try {
      const response = await api.getBed(bedId);
      setBed(response.bed);
      setPlants(response.plants || []);
    } catch {
      toast.error('Could not load bed');
    } finally {
      setIsLoading(false);
    }
  }, [bedId]);

  useEffect(() => {
    loadBed();
  }, [loadBed]);

  const handleDelete = async () => {
    if (!bed) return;
    if (!window.confirm(`Delete "${bed.name}"? Plants will be unassigned but not deleted.`)) return;

    setIsDeleting(true);
    try {
      await api.deleteBed(bed.id);
      toast.success(`${bed.name} deleted`);
      router.push('/grow/garden');
    } catch {
      toast.error('Could not delete bed');
      setIsDeleting(false);
    }
  };

  const handleBedUpdated = (updated: SerializedBed) => {
    setBed(updated);
  };

  const handleShowMovePanel = async () => {
    try {
      const response = await api.getUserPlants();
      const allPlants = (response.plants || []) as SerializedPlant[];
      setUnassignedPlants(allPlants.filter(p => !p.bedId));
      setSelectedMoveIds(new Set());
      setShowMovePanel(true);
    } catch {
      toast.error('Could not load plants');
    }
  };

  const handleMoveSelected = async () => {
    if (!bed || selectedMoveIds.size === 0) return;
    setIsMoving(true);
    try {
      await api.assignPlantsToBed(bed.id, Array.from(selectedMoveIds));
      toast.success(`${selectedMoveIds.size} plant${selectedMoveIds.size !== 1 ? 's' : ''} moved to ${bed.name}`);
      setShowMovePanel(false);
      loadBed();
    } catch {
      toast.error('Could not move plants');
    } finally {
      setIsMoving(false);
    }
  };

  const handleRemovePlant = async (plantId: string) => {
    if (!bed) return;
    try {
      await api.removePlantsFromBed(bed.id, [plantId]);
      setPlants(prev => prev.filter(p => p.id !== plantId));
      setBed(prev => prev ? { ...prev, plantCount: Math.max(0, prev.plantCount - 1) } : prev);
      toast.success('Plant removed from bed');
    } catch {
      toast.error('Could not remove plant');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!bed) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Bed not found</p>
        <Link href="/grow/garden" className="text-green-600 hover:underline mt-2 inline-block">
          Back to garden
        </Link>
      </div>
    );
  }

  const hexColor = BED_COLOR_HEX[bed.color] || BED_COLOR_HEX.terracotta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/grow/garden" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hexColor }} />
              <h1 className="text-xl font-semibold">{bed.name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {BED_TYPES[bed.type] || bed.type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {bed.plantCount} plant{bed.plantCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Notes */}
      {bed.notes && (
        <p className="text-sm text-muted-foreground">{bed.notes}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShowMovePanel}
          className="text-green-600 border-green-600 hover:bg-green-50"
        >
          <MoveRight className="h-4 w-4 mr-1" />
          Move plants here
        </Button>
      </div>

      {/* Move plants panel */}
      {showMovePanel && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select unassigned plants</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMovePanel(false)}>Cancel</Button>
            </div>
            {unassignedPlants.length === 0 ? (
              <p className="text-sm text-muted-foreground">All plants are already in beds.</p>
            ) : (
              <>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {unassignedPlants.map(plant => (
                    <label key={plant.id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={selectedMoveIds.has(plant.id)}
                        onCheckedChange={(checked) => {
                          setSelectedMoveIds(prev => {
                            const next = new Set(prev);
                            if (checked) next.add(plant.id); else next.delete(plant.id);
                            return next;
                          });
                        }}
                      />
                      <span className="text-sm">{plant.name}</span>
                      {plant.location && (
                        <span className="text-xs text-muted-foreground">({plant.location})</span>
                      )}
                    </label>
                  ))}
                </div>
                <Button
                  onClick={handleMoveSelected}
                  disabled={selectedMoveIds.size === 0 || isMoving}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {isMoving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Moving…</>
                  ) : (
                    `Move ${selectedMoveIds.size} plant${selectedMoveIds.size !== 1 ? 's' : ''}`
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plants list */}
      {plants.length === 0 ? (
        <Card className="p-8 text-center">
          <Sprout className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No plants in this bed yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add a plant or move existing plants here.
          </p>
          <Button
            variant="outline"
            onClick={handleShowMovePanel}
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add plants
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Plants ({plants.length})
          </h3>
          {plants.map(plant => (
            <Card key={plant.id} className="overflow-hidden">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{plant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {plant.type}
                    {plant.quantity && plant.quantity > 1 ? ` · ${plant.quantity}x` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePlant(plant.id)}
                  className="text-muted-foreground hover:text-red-600 text-xs"
                >
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditBedDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        bed={bed}
        onBedUpdated={handleBedUpdated}
      />
    </div>
  );
}
