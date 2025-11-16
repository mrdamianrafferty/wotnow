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
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
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
  ChevronUp
} from 'lucide-react';
import { 
  getAvailableGuildBlueprints, 
  getGuildCompanions,
  getPermacultureRole,
  type GuildBlueprint,
  type GuildCompanion,
  type PermacultureRole
} from '../../lib/grow/guild';

interface GuildModalProps {
  open: boolean;
  onClose: () => void;
  climateZone: string;
  onGuildSelected?: (companions: GuildCompanion[]) => void;
}

export function GuildModalEnhanced({ 
  open, 
  onClose, 
  climateZone,
  onGuildSelected 
}: GuildModalProps) {
  const [step, setStep] = useState<'browse' | 'details'>('browse');
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
        
        // Auto-select top 2 per role (smart defaults)
        const autoSelected = new Set<string>();
        const byRole = groupAndDeduplicateByRole(companions);
        
        Object.values(byRole).forEach(comps => {
          comps.slice(0, 2).forEach(c => autoSelected.add(c.companionSlug));
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
    if (selectedSlugs.size > 0 && onGuildSelected) {
      // Deduplicate by role first (same logic as UI display)
      const deduped = groupAndDeduplicateByRole(allCompanions);
      
      // Flatten all roles and filter by selected slugs
      const allDedupedCompanions = Object.values(deduped).flat();
      const selected = allDedupedCompanions.filter(c => selectedSlugs.has(c.companionSlug));
      
      onGuildSelected(selected);
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
                Make Me a Guild
              </DialogTitle>
              <DialogDescription>
                Choose a focal species to build a permaculture companion planting guild
              </DialogDescription>
            </DialogHeader>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fruit trees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Climate Zone Info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Showing guilds for <strong>{climateZone}</strong> climate zone
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
                  Add {actualSelectedCount} Plants
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
        {/* Focal Species */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trees className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Focal Species</h3>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="font-medium">{companions[0]?.focalName}</p>
              <Badge variant="secondary" className="mt-2">
                {companions[0]?.climateZoneCode}
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Companion Plants by Role */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">
              Companion Plants ({orderedRoles.reduce((sum, r) => sum + r.companions.length, 0)} unique species)
            </h3>
          </div>

          <div className="space-y-4">
            {orderedRoles.map((roleGroup) => {
              const roleInfo: PermacultureRole | undefined = getPermacultureRole(roleGroup.roleCode);
              const isExpanded = expandedRoles.has(roleGroup.roleCode);
              const topN = 2; // Show 2 by default
              const hasMore = roleGroup.companions.length > topN;
              const displayedCompanions = isExpanded 
                ? roleGroup.companions 
                : roleGroup.companions.slice(0, topN);
              
              const allSelected = roleGroup.companions.every(c => selectedSlugs.has(c.companionSlug));

              return (
                <div key={roleGroup.roleCode}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{roleInfo?.icon || '🌿'}</span>
                      <h4 className="font-medium">{roleInfo?.name || roleGroup.roleCode}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {roleGroup.companions.length}
                      </Badge>
                    </div>
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
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{roleInfo?.description || ''}</p>
                  
                  <div className="space-y-2 ml-6">
                    {displayedCompanions.map((companion) => {
                      const isSelected = selectedSlugs.has(companion.companionSlug);
                      const isPriority = (companion.rankInRole || 999) <= 2; // Top 2 get priority star
                      
                      return (
                        <Card 
                          key={companion.companionSlug} 
                          className={`cursor-pointer transition-all ${
                            isSelected ? 'bg-green-50 border-green-300' : 'bg-muted/50 hover:border-green-200'
                          }`}
                          onClick={() => onToggle(companion.companionSlug)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                checked={isSelected}
                                onCheckedChange={() => onToggle(companion.companionSlug)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">{companion.companionName}</p>
                                      {isPriority && (
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      )}
                                    </div>
                                    {companion.companionCategory && (
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