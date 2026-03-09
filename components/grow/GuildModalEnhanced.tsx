/**
Enhanced Permaculture Guild Modal
"Make me a guild" - Interactive guild builder with selection & prioritization
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
// Separator removed — no longer needed after focal plant joined role groups
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Search, 
  Trees, 
  Leaf, 
  Info,
  CheckCircle2,
  AlertCircle,
  Sprout,
  Loader2,
  Star,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import { 
  getAvailableGuildBlueprints, 
  getGuildCompanions,
  getPermacultureRole,
  type GuildBlueprint,
  type GuildCompanion,
  type PermacultureRole
} from '../../lib/grow/guild';
import type { SerializedBed } from '../../lib/grow/server/beds';

/** Format raw climate zone string for display: "usda_5b" → "USDA 5b" */
function formatClimateZone(zone: string): string {
  if (!zone) return 'Unknown';
  return zone
    .replace(/^usda[_-]/i, 'USDA ')
    .replace(/_/g, ' ');
}

/** Collapsible intro explaining companion planting for beginners */
function GuildIntroCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left rounded-lg border border-green-200 bg-green-50 p-3 transition-colors hover:bg-green-100"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-green-800 flex items-center gap-2">
          <Leaf className="h-4 w-4" />
          How does companion planting work?
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-green-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-green-600" />
        )}
      </div>
      {expanded && (
        <p className="mt-2 text-sm text-green-700 leading-relaxed">
          Some plants grow better together — they share nutrients, attract helpful insects,
          or repel pests for their neighbours. Pick a main plant below to see its best companions,
          then choose which ones to add to your garden.
        </p>
      )}
    </button>
  );
}

export interface GuildSelectionMeta {
  guildName: string;
  bedId?: string;
}

interface GuildModalProps {
  open: boolean;
  onClose: () => void;
  climateZone: string;
  isPermacultureMode?: boolean;
  beds?: SerializedBed[];
  onGuildSelected?: (companions: GuildCompanion[], meta?: GuildSelectionMeta) => void;
}

export function GuildModalEnhanced({
  open,
  onClose,
  climateZone,
  isPermacultureMode,
  beds = [],
  onGuildSelected
}: GuildModalProps) {
  const [step, setStep] = useState<'browse' | 'details' | 'assign-bed'>('browse');
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [blueprints, setBlueprints] = useState<GuildBlueprint[]>([]);
  const [filteredBlueprints, setFilteredBlueprints] = useState<GuildBlueprint[]>([]);
  const [allCompanions, setAllCompanions] = useState<GuildCompanion[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate actual unique selected count (deduplicated)
  const actualSelectedCount = useMemo(() => {
    if (allCompanions.length === 0 || selectedSlugs.size === 0) return 0;
    
    const deduped = groupAndDeduplicateByRole(allCompanions);
    const allDedupedCompanions = Object.values(deduped).flat();
    const actualSelected = allDedupedCompanions.filter(c => selectedSlugs.has(c.companionSlug));
    return actualSelected.length;
  }, [allCompanions, selectedSlugs]);

  const loadGuildBlueprints = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAvailableGuildBlueprints(climateZone);
      
      if (data.length === 0) {
        setError(`No guilds available for your climate zone (${climateZone})`);
      } else {
        setBlueprints(data);
        setFilteredBlueprints(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load guilds:', err);
      const message = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to load guild blueprints';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [climateZone]);

  // Load available guilds on mount
  useEffect(() => {
    if (open && climateZone) {
      void loadGuildBlueprints();
    }
  }, [open, climateZone, loadGuildBlueprints]);

  // Filter blueprints when search changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredBlueprints(blueprints);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredBlueprints(
        blueprints.filter(bp =>
          bp.focal_common_name.toLowerCase().includes(lower) ||
          bp.guild_name.toLowerCase().includes(lower) ||
          bp.focal_category?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, blueprints]);

  async function handleSelectBlueprint(blueprint: GuildBlueprint) {
    setLoading(true);
    setError(null);
    
    try {
      const companions = await getGuildCompanions(
        blueprint.focal_slug,
        climateZone
      );
      
      if (companions.length > 0) {
        setAllCompanions(companions);
        
        // Only auto-select the focal plant — let user choose companions
        const autoSelected = new Set<string>();
        const byRole = groupAndDeduplicateByRole(companions);

        Object.entries(byRole).forEach(([role, comps]) => {
          if (role === 'focal_plant') {
            comps.forEach(c => autoSelected.add(c.companionSlug));
          }
          // Non-focal companions start deselected so the user actively chooses
        });
        
        setSelectedSlugs(autoSelected);
        setStep('details');
      } else {
        setError('Could not load guild details');
      }
    } catch (err: unknown) {
      console.error('Failed to load guild companions:', err);
      const message = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to load guild companions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep('browse');
    setAllCompanions([]);
    setSelectedSlugs(new Set());
  }

  function handleConfirm() {
    if (selectedSlugs.size === 0) return;

    // In permaculture mode, skip bed selection (bed is auto-created)
    if (isPermacultureMode) {
      finalizeSelection();
      return;
    }

    // In standard mode, show bed selection step if beds available
    if (beds.length > 0) {
      setStep('assign-bed');
      return;
    }

    // No beds available — just add plants without a bed
    finalizeSelection();
  }

  function finalizeSelection(bedId?: string) {
    if (onGuildSelected) {
      const deduped = groupAndDeduplicateByRole(allCompanions);
      const allDedupedCompanions = Object.values(deduped).flat();
      const selected = allDedupedCompanions.filter(
        c => c.role === 'focal_plant' || selectedSlugs.has(c.companionSlug)
      );

      const guildName = allCompanions[0]?.guildName || 'Guild';
      onGuildSelected(selected, { guildName, bedId });
    }
    onClose();
  }

  function handleClose() {
    setStep('browse');
    setAllCompanions([]);
    setSelectedSlugs(new Set());
    setSearchTerm('');
    onClose();
  }

  function toggleCompanion(slug: string) {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function selectAllInRole(companions: GuildCompanion[]) {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      companions.forEach(c => next.add(c.companionSlug));
      return next;
    });
  }

  function deselectAllInRole(companions: GuildCompanion[]) {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      companions.forEach(c => next.delete(c.companionSlug));
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        {step === 'browse' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trees className="h-5 w-5 text-green-600" />
                Companion Planting
              </DialogTitle>
              <DialogDescription>
                Find plants that help each other grow
              </DialogDescription>
            </DialogHeader>

            {/* How guilds work intro */}
            <GuildIntroCard />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Climate Zone Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Showing guilds for <strong>{formatClimateZone(climateZone)}</strong> climate zone
              </AlertDescription>
            </Alert>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="ml-3 text-muted-foreground">Loading guilds...</span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Guild List */}
            {!loading && !error && (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {filteredBlueprints.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sprout className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No guilds found matching &quot;{searchTerm}&quot;</p>
                    </div>
                  ) : (
                    filteredBlueprints.map((blueprint) => (
                      <Card
                        key={blueprint.guild_id}
                        className="cursor-pointer hover:border-green-600 transition-colors"
                        onClick={() => handleSelectBlueprint(blueprint)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {blueprint.focal_common_name}
                              </CardTitle>
                              <CardDescription>
                                {blueprint.focal_category}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {blueprint.member_count} companions
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {blueprint.guild_description}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trees className="h-5 w-5 text-green-600" />
                {allCompanions[0]?.guildName}
              </DialogTitle>
              <DialogDescription>
                {allCompanions[0]?.guildDescription} • Select companions for your garden
              </DialogDescription>
            </DialogHeader>

            {allCompanions.length > 0 && (
              <GuildDetailsWithSelection 
                companions={allCompanions}
                selectedSlugs={selectedSlugs}
                onToggle={toggleCompanion}
                onSelectAll={selectAllInRole}
                onDeselectAll={deselectAllInRole}
              />
            )}

            <div className="flex items-center justify-between pt-4">
              <Badge variant="secondary" className="text-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {actualSelectedCount} selected
              </Badge>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={actualSelectedCount === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isPermacultureMode
                    ? `Create Space & Add ${actualSelectedCount} Plants`
                    : beds.length > 0
                      ? `Next: Choose a Bed`
                      : `Add ${actualSelectedCount} Plants`
                  }
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Assign to Bed */}
        {step === 'assign-bed' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                Where should these plants go?
              </DialogTitle>
              <DialogDescription>
                Choose a bed or add them to your garden without a bed
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {beds.map((bed) => (
                  <Card
                    key={bed.id}
                    className={`cursor-pointer transition-all ${
                      selectedBedId === bed.id
                        ? 'bg-green-50 border-green-400 ring-1 ring-green-400'
                        : 'hover:border-green-200'
                    }`}
                    onClick={() => setSelectedBedId(bed.id)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{bed.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bed.plantCount} plant{bed.plantCount !== 1 ? 's' : ''}
                          {bed.plantSummary ? ` · ${bed.plantSummary}` : ''}
                        </p>
                      </div>
                      {selectedBedId === bed.id && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBedId(null);
                  finalizeSelection();
                }}
                className="text-muted-foreground"
              >
                Skip — add without a bed
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('details')}>
                  Back
                </Button>
                <Button
                  onClick={() => finalizeSelection(selectedBedId || undefined)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!selectedBedId}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Add to {beds.find(b => b.id === selectedBedId)?.name || 'Bed'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper function to group and deduplicate
function groupAndDeduplicateByRole(companions: GuildCompanion[]): Record<string, GuildCompanion[]> {
  const byRole = companions.reduce<Record<string, GuildCompanion[]>>((acc, c) => {
    if (!acc[c.role]) acc[c.role] = [];
    acc[c.role].push(c);
    return acc;
  }, {});

  // Deduplicate each role by companion_slug
  return Object.fromEntries(
    Object.entries(byRole).map(([role, comps]) => {
      const bySlug = comps.reduce<Record<string, GuildCompanion[]>>((acc, c) => {
        if (!acc[c.companionSlug]) acc[c.companionSlug] = [];
        acc[c.companionSlug].push(c);
        return acc;
      }, {});

      const unique = Object.values(bySlug).map(slugGroup => {
        const sorted = slugGroup.sort((a, b) => 
          (a.rankInRole || 999) - (b.rankInRole || 999)
        );
        const primary = sorted[0];
        if (sorted.length > 1) {
          const allNotes = sorted
            .map(c => c.notes)
            .filter(Boolean)
            .filter((note, idx, arr) => arr.indexOf(note) === idx);
          primary.notes = allNotes.join(' • ');
        }
        return primary;
      });

      return [role, unique.sort((a, b) => 
        (a.rankInRole || 999) - (b.rankInRole || 999)
      )];
    })
  );
}

interface GuildDetailsProps {
  companions: GuildCompanion[];
  selectedSlugs: Set<string>;
  onToggle: (slug: string) => void;
  onSelectAll: (companions: GuildCompanion[]) => void;
  onDeselectAll: (companions: GuildCompanion[]) => void;
}

function GuildDetailsWithSelection({ 
  companions, 
  selectedSlugs,
  onToggle,
  onSelectAll,
  onDeselectAll
}: GuildDetailsProps) {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const toggleRole = (roleCode: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleCode)) {
        next.delete(roleCode);
      } else {
        next.add(roleCode);
      }
      return next;
    });
  };

  const deduplicatedByRole = groupAndDeduplicateByRole(companions);

  const roleOrder = [
    'focal_plant',
    'nitrogen_fixer',
    'dynamic_accumulator',
    'groundcover',
    'pollinator',
    'pest_repellent',
    'pest_deterrent',
    'beneficial_insect_attractor',
    'support_species',
    'biomass',
    'vine_layer',
    'ground_worker',
    'hedgerow',
    'shade_tree'
  ];

  const orderedRoles = roleOrder
    .filter(roleCode => deduplicatedByRole[roleCode])
    .map(roleCode => ({
      roleCode,
      companions: deduplicatedByRole[roleCode]
    }));

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-6">
        {/* All Plants by Role (focal first, then companions) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">
              Guild Plants ({orderedRoles.reduce((sum, r) => sum + r.companions.length, 0)} species)
            </h3>
          </div>

          <div className="space-y-4">
            {orderedRoles.map((roleGroup) => {
              const roleInfo: PermacultureRole | undefined = getPermacultureRole(roleGroup.roleCode);
              const isFocal = roleGroup.roleCode === 'focal_plant';
              const isExpanded = expandedRoles.has(roleGroup.roleCode);
              const topN = 2; // Show 2 by default
              const hasMore = !isFocal && roleGroup.companions.length > topN;
              const displayedCompanions = isFocal
                ? roleGroup.companions
                : (isExpanded ? roleGroup.companions : roleGroup.companions.slice(0, topN));

              const allSelected = roleGroup.companions.every(c => selectedSlugs.has(c.companionSlug));

              return (
                <div key={roleGroup.roleCode}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{roleInfo?.icon || '🌿'}</span>
                      <h4 className="font-medium">{roleInfo?.name || roleGroup.roleCode}</h4>
                      {!isFocal && (
                        <Badge variant="secondary" className="text-xs">
                          {roleGroup.companions.length}
                        </Badge>
                      )}
                      {isFocal && (
                        <Badge className="text-xs bg-green-600">Your Main Plant</Badge>
                      )}
                    </div>
                    {!isFocal && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => allSelected
                          ? onDeselectAll(roleGroup.companions)
                          : onSelectAll(roleGroup.companions)
                        }
                        className="text-xs h-7"
                      >
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{roleInfo?.description || ''}</p>
                  {roleInfo?.placement && (
                    <p className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2 flex items-center gap-1">
                      📍 {roleInfo.placement}
                    </p>
                  )}
                  
                  <div className="space-y-2 ml-6">
                    {displayedCompanions.map((companion) => {
                      const isFocalCompanion = companion.role === 'focal_plant';
                      const isSelected = isFocalCompanion || selectedSlugs.has(companion.companionSlug);
                      const isPriority = (companion.rankInRole || 999) <= 2; // Top 2 get priority star

                      return (
                        <Card
                          key={companion.companionSlug}
                          className={`transition-all ${
                            isFocalCompanion
                              ? 'bg-green-100 border-green-400'
                              : isSelected
                                ? 'bg-green-50 border-green-300 cursor-pointer'
                                : 'bg-white hover:border-green-200 cursor-pointer border-gray-200'
                          }`}
                          onClick={() => !isFocalCompanion && onToggle(companion.companionSlug)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              {isFocalCompanion ? (
                                <div className="mt-0.5 flex items-center justify-center size-5 shrink-0 rounded-[4px] bg-green-600 text-white" title="Your plant — always included">
                                  <Lock className="size-3" />
                                </div>
                              ) : (
                                <div
                                  className={`mt-0.5 flex items-center justify-center size-5 shrink-0 rounded-[4px] border transition-colors ${
                                    isSelected
                                      ? 'bg-green-600 border-green-600 text-white'
                                      : 'bg-white border-gray-300'
                                  }`}
                                >
                                  {isSelected && <Sprout className="size-3" />}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">{companion.companionName}</p>
                                      {isFocalCompanion && (
                                        <Badge className="text-[10px] bg-green-600 text-white px-1.5 py-0">
                                          Your plant
                                        </Badge>
                                      )}
                                      {isPriority && !isFocalCompanion && (
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      )}
                                    </div>
                                    {companion.companionCategory && !isFocalCompanion && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        {companion.companionCategory}
                                      </Badge>
                                    )}
                                  </div>
                                  {companion.rankInRole && (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                      #{companion.rankInRole}
                                    </Badge>
                                  )}
                                </div>
                                {companion.notes && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    💡 {companion.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Show More/Less Toggle */}
                    {hasMore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRole(roleGroup.roleCode)}
                        className="w-full text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show {roleGroup.companions.length - topN} more...
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}