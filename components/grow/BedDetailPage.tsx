import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Sprout,
  Search,
  Sun,
  CloudSun,
  Cloud,
  Droplets,
  X,
  AlertTriangle,
  Leaf,
  ChevronDown,
  ChevronUp,
  MoveRight,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '../../lib/grow/api';
import { BED_COLOR_HEX, BED_TYPES, type SerializedBed, type SerializedBedPlanting } from '../../lib/grow/server/beds';
import type { SerializedPlant } from '../../lib/grow/server/plants';
import { EditBedDialog } from './EditBedDialog';
import { MovePlantDialog } from './MovePlantDialog';
import type { BedIntelligenceResponse } from '../../lib/grow/bedIntelligenceTypes';

export function BedDetailPage() {
  const router = useRouter();
  const bedId = router.query.bedId as string;

  const [bed, setBed] = useState<SerializedBed | null>(null);
  const [plantings, setPlantings] = useState<SerializedBedPlanting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // History
  const [history, setHistory] = useState<SerializedBedPlanting[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Move plant dialog
  const [movePlanting, setMovePlanting] = useState<SerializedBedPlanting | null>(null);

  // Intelligence
  const [intelligence, setIntelligence] = useState<BedIntelligenceResponse | null>(null);

  // Add plants panel
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [allPlants, setAllPlants] = useState<SerializedPlant[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Map<string, number>>(new Map());
  const [isAdding, setIsAdding] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadBed = useCallback(async () => {
    if (!bedId) return;
    setIsLoading(true);
    try {
      const response = await api.getBed(bedId);
      setBed(response.bed);
      setPlantings(response.plantings || []);
      setHistory(response.history || []);
    } catch {
      toast.error('Could not load bed');
    } finally {
      setIsLoading(false);
    }
  }, [bedId]);

  useEffect(() => {
    loadBed();
  }, [loadBed]);

  // Fetch intelligence (supplementary — silently fails)
  useEffect(() => {
    if (!bedId) return;
    api.getBedIntelligence(bedId).then(setIntelligence).catch(() => {});
  }, [bedId]);

  // Set of plant IDs already in this bed
  const existingPlantIds = useMemo(
    () => new Set(plantings.map(p => p.plantId)),
    [plantings]
  );

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

  const handleShowAddPanel = async () => {
    try {
      const response = await api.getUserPlants();
      const plants = (response.plants || []) as SerializedPlant[];
      setAllPlants(plants);
      setSelectedQuantities(new Map());
      setTypeFilter(null);
      setSearchQuery('');
      setShowAddPanel(true);
    } catch {
      toast.error('Could not load plants');
    }
  };

  const togglePlantSelection = (plantId: string, checked: boolean) => {
    setSelectedQuantities(prev => {
      const next = new Map(prev);
      if (checked) {
        next.set(plantId, 1);
      } else {
        next.delete(plantId);
      }
      return next;
    });
  };

  const updateQuantity = (plantId: string, qty: number) => {
    setSelectedQuantities(prev => {
      const next = new Map(prev);
      next.set(plantId, Math.max(1, Math.floor(qty)));
      return next;
    });
  };

  // Filtered plants for the assignment panel
  const filteredPlants = useMemo(() => {
    return allPlants
      .filter(p => !typeFilter || p.type === typeFilter)
      .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allPlants, typeFilter, searchQuery]);

  // Selectable (non-already-in-bed) plants in current filter
  const selectablePlants = useMemo(() => {
    return filteredPlants.filter(p => !existingPlantIds.has(p.id));
  }, [filteredPlants, existingPlantIds]);

  const handleSelectAll = () => {
    setSelectedQuantities(prev => {
      const next = new Map(prev);
      const allSelected = selectablePlants.every(p => next.has(p.id));
      if (allSelected) {
        // Deselect all in current filter
        for (const p of selectablePlants) next.delete(p.id);
      } else {
        // Select all in current filter
        for (const p of selectablePlants) {
          if (!next.has(p.id)) next.set(p.id, 1);
        }
      }
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!bed || selectedQuantities.size === 0) return;
    setIsAdding(true);
    try {
      const assignments = Array.from(selectedQuantities.entries()).map(([plantId, quantity]) => ({
        plantId,
        quantity,
      }));
      await api.assignPlantsToBed(bed.id, assignments);
      toast.success(`${assignments.length} plant${assignments.length !== 1 ? 's' : ''} added to ${bed.name}`);
      setShowAddPanel(false);
      await loadBed();
    } catch {
      toast.error('Could not add plants');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemovePlant = async (planting: SerializedBedPlanting) => {
    if (!bed) return;
    try {
      await api.removePlantsFromBed(bed.id, [planting.plantId]);
      setPlantings(prev => prev.filter(p => p.plantingId !== planting.plantingId));
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
  const allFilteredSelected = selectablePlants.length > 0 && selectablePlants.every(p => selectedQuantities.has(p.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/grow/garden" className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hexColor }} />
              <h1 className="text-xl font-semibold truncate">{bed.name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {BED_TYPES[bed.type] || bed.type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {plantings.length} plant{plantings.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
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

      {/* Rotation Warnings */}
      {intelligence?.rotationWarnings && intelligence.rotationWarnings.length > 0 && (
        <div className="space-y-2">
          {intelligence.rotationWarnings.map((w) => (
            <div
              key={w.rotationGroup}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-100"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800">Rotation Warning</p>
                <p className="text-xs text-amber-700 mt-0.5">{w.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShowAddPanel}
          className="text-green-600 border-green-600 hover:bg-green-50"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add plants
        </Button>
      </div>

      {/* Add plants panel */}
      {showAddPanel && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select plants to add</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddPanel(false)}>Cancel</Button>
            </div>

            {allPlants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No plants found. Add plants first.</p>
            ) : (
              <>
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search plants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>

                {/* Type filter tabs + Select all */}
                {(() => {
                  const types = [...new Set(allPlants.map(p => p.type).filter(Boolean))].sort();
                  if (types.length <= 1) return null;
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setTypeFilter(null)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          typeFilter === null
                            ? 'bg-green-600 text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        All
                      </button>
                      {types.map(t => (
                        <button
                          key={t}
                          onClick={() => setTypeFilter(t)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                            typeFilter === t
                              ? 'bg-green-600 text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Select all toggle */}
                {selectablePlants.length > 1 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    {allFilteredSelected
                      ? `Deselect all ${selectablePlants.length}`
                      : `Select all ${selectablePlants.length}${typeFilter ? ` ${typeFilter}` : ''}`}
                  </button>
                )}

                {/* Plant list */}
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {filteredPlants.map(plant => {
                    const isSelected = selectedQuantities.has(plant.id);
                    const alreadyInBed = existingPlantIds.has(plant.id);
                    return (
                      <div
                        key={plant.id}
                        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-green-50 ring-1 ring-green-200' : ''
                        } ${alreadyInBed ? 'opacity-50' : ''}`}
                      >
                        <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                          <Checkbox
                            checked={isSelected || alreadyInBed}
                            disabled={alreadyInBed}
                            onCheckedChange={(checked) => togglePlantSelection(plant.id, !!checked)}
                          />
                          <span className="text-sm truncate">{plant.name}</span>
                          {/* Companion indicator */}
                          {intelligence?.companionSets && plant.speciesSlug && (() => {
                            const slug = plant.speciesSlug;
                            const isBad = intelligence.companionSets.badCompanions.includes(slug);
                            const isGood = intelligence.companionSets.goodCompanions.includes(slug);
                            if (isBad) return <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Poor companion for current plants" />;
                            if (isGood) return <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Good companion for current plants" />;
                            return null;
                          })()}
                          {plant.type && !typeFilter && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">({plant.type})</span>
                          )}
                          {alreadyInBed && (
                            <span className="text-[10px] text-green-600 flex-shrink-0">In bed</span>
                          )}
                        </label>
                        {isSelected && !alreadyInBed && (
                          <Input
                            type="number"
                            min={1}
                            value={selectedQuantities.get(plant.id) ?? 1}
                            onChange={(e) => updateQuantity(plant.id, parseInt(e.target.value, 10) || 1)}
                            className="w-16 h-7 text-xs flex-shrink-0"
                          />
                        )}
                      </div>
                    );
                  })}
                  {filteredPlants.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No plants match your search.</p>
                  )}
                </div>

                {/* Sticky confirm button */}
                <div className="sticky bottom-0 pt-2 bg-card">
                  <Button
                    onClick={handleAddSelected}
                    disabled={selectedQuantities.size === 0 || isAdding}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    {isAdding ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding…</>
                    ) : (
                      `Add ${selectedQuantities.size} plant${selectedQuantities.size !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plants list */}
      {plantings.length === 0 ? (
        <div className="space-y-3">
          {/* Rich empty state */}
          <Card className="overflow-hidden border-dashed border-2 border-green-200">
            <div
              className="py-10 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hexColor}08, ${hexColor}18)` }}
            >
              <div className="text-center px-6">
                <div className="relative inline-block">
                  <Sprout className="h-12 w-12 text-green-300" />
                  <Plus className="h-5 w-5 text-green-500 absolute -top-1 -right-1 bg-white rounded-full p-0.5" />
                </div>
                <p className="text-sm font-medium mt-3">
                  {bed.name} is ready for planting
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
                  Add your plants to track what grows where and get tailored advice for this bed.
                </p>
                <Button
                  onClick={handleShowAddPanel}
                  className="mt-4 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add plants to this bed
                </Button>
              </div>
            </div>
          </Card>

          {/* Contextual tips based on bed metadata */}
          {bed.sunExposure && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-100">
              {bed.sunExposure === 'full_sun' && <Sun className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />}
              {bed.sunExposure === 'partial_shade' && <CloudSun className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />}
              {bed.sunExposure === 'full_shade' && <Cloud className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />}
              <div>
                <p className="text-xs font-medium text-amber-800">
                  {bed.sunExposure === 'full_sun' && 'Full Sun Bed'}
                  {bed.sunExposure === 'partial_shade' && 'Partial Shade Bed'}
                  {bed.sunExposure === 'full_shade' && 'Shade Bed'}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {bed.sunExposure === 'full_sun' && 'Great for tomatoes, peppers, courgettes, and herbs like basil.'}
                  {bed.sunExposure === 'partial_shade' && 'Ideal for lettuce, spinach, kale, and root vegetables.'}
                  {bed.sunExposure === 'full_shade' && 'Consider shade-loving plants like hostas, ferns, or wild garlic.'}
                </p>
              </div>
            </div>
          )}
          {bed.type === 'container' && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Droplets className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-800">Container Tip</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Containers dry out faster than ground beds. Check soil moisture daily in warm weather.
                </p>
              </div>
            </div>
          )}
          {bed.type === 'greenhouse' && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-50 border border-green-100">
              <Sprout className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-800">Greenhouse Tip</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Ventilate on warm days to prevent fungal diseases. Tomatoes, cucumbers, and peppers thrive here.
                </p>
              </div>
            </div>
          )}

          {/* Quick Fill Suggestions */}
          {intelligence?.quickFillSuggestions && intelligence.quickFillSuggestions.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <h3 className="text-sm font-medium">What to plant now</h3>
                </div>
                <div className="space-y-2">
                  {intelligence.quickFillSuggestions.map((s) => (
                    <div key={s.speciesSlug} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.speciesName}</p>
                        <p className="text-xs text-muted-foreground">{s.reason}</p>
                      </div>
                      {s.category && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                          {s.category}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Plants ({plantings.length})
          </h3>
          {plantings.map(planting => (
            <Card key={planting.plantingId} className="overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{planting.plantName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">{planting.plantType}</span>
                    {planting.variety && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground italic">{planting.variety}</span>
                      </>
                    )}
                    {planting.quantity > 1 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
                        {planting.quantity}x
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMovePlanting(planting)}
                  className="h-8 w-8 text-muted-foreground hover:text-green-600 flex-shrink-0"
                  aria-label={`Move ${planting.plantName} to another bed`}
                >
                  <MoveRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePlant(planting)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 flex-shrink-0"
                  aria-label={`Remove ${planting.plantName}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Succession Prompts */}
      {intelligence?.successionPrompts && intelligence.successionPrompts.length > 0 && (
        <div className="space-y-2">
          {intelligence.successionPrompts.map((sp, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100"
            >
              <Sprout className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-800">
                  {sp.removedPlantName} came out in {sp.removedMonth}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Consider {sp.suggestions.map(s => s.speciesName).join(', ')} for a second crop.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Planting History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            History ({history.length} past)
          </button>
          {showHistory && (
            <div className="space-y-2">
              {history.map(h => {
                const from = new Date(h.plantedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                const to = h.removedAt ? new Date(h.removedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'present';
                return (
                  <Card key={h.plantingId} className="overflow-hidden opacity-70">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm text-muted-foreground truncate">{h.plantName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{h.plantType}</span>
                        {h.quantity > 1 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {h.quantity}x
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">{from} – {to}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <MovePlantDialog
        open={!!movePlanting}
        onOpenChange={(open) => { if (!open) setMovePlanting(null); }}
        planting={movePlanting}
        currentBedId={bed.id}
        onMoved={() => {
          if (movePlanting) {
            setPlantings(prev => prev.filter(p => p.plantingId !== movePlanting.plantingId));
            setBed(prev => prev ? { ...prev, plantCount: Math.max(0, prev.plantCount - 1) } : prev);
          }
          setMovePlanting(null);
        }}
      />

      <EditBedDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        bed={bed}
        onBedUpdated={handleBedUpdated}
      />
    </div>
  );
}
