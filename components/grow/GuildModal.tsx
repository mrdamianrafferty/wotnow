/**
Permaculture Guild Modal
"Make me a guild" - Interactive guild builder
 */

import { useState, useEffect, useCallback } from 'react';
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
import { 
  Search, 
  Trees, 
  Leaf, 
  Info,
  CheckCircle2,
  AlertCircle,
  Sprout,
  Loader2
} from 'lucide-react';
import { 
  getAvailableGuildBlueprints, 
  getGuildCompanions,
  getPermacultureRole,
  type GuildBlueprint,
  type GuildCompanion
} from '../../lib/grow/guild';

interface GuildModalProps {
  open: boolean;
  onClose: () => void;
  climateZone: string;
  onGuildSelected?: (companions: GuildCompanion[]) => void;
}

export function GuildModal({ 
  open, 
  onClose, 
  climateZone,
  onGuildSelected 
}: GuildModalProps) {
  const [step, setStep] = useState<'browse' | 'details'>('browse');
  const [blueprints, setBlueprints] = useState<GuildBlueprint[]>([]);
  const [filteredBlueprints, setFilteredBlueprints] = useState<GuildBlueprint[]>([]);
  const [selectedCompanions, setSelectedCompanions] = useState<GuildCompanion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // 🌟 Use the BLESSED function that filters by blueprint_id correctly
      const companions = await getGuildCompanions(
        blueprint.focal_slug,
        climateZone
      );
      
      if (companions.length > 0) {
        setSelectedCompanions(companions);
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
    setSelectedCompanions([]);
  }

  function handleConfirm() {
    if (selectedCompanions.length > 0 && onGuildSelected) {
      onGuildSelected(selectedCompanions);
    }
    onClose();
  }

  function handleClose() {
    setStep('browse');
    setSelectedCompanions([]);
    setSearchTerm('');
    onClose();
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
                {selectedCompanions[0]?.guildName}
              </DialogTitle>
              <DialogDescription>
                {selectedCompanions[0]?.guildDescription}
              </DialogDescription>
            </DialogHeader>

            {selectedCompanions.length > 0 && <GuildDetails companions={selectedCompanions} />}

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Add This Guild
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuildDetails({ companions }: { companions: GuildCompanion[] }) {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // Toggle expanded state for a role
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

  // 🌟 STEP 1 & 2: Group by role, then deduplicate by species
  const byRole = companions.reduce<Record<string, GuildCompanion[]>>((acc, c) => {
    if (!acc[c.role]) acc[c.role] = [];
    acc[c.role].push(c);
    return acc;
  }, {});

  // Deduplicate each role by companion_slug
  const deduplicatedByRole = Object.fromEntries(
    Object.entries(byRole).map(([role, comps]) => {
      // Group by companion_slug
      const bySlug = comps.reduce<Record<string, GuildCompanion[]>>((acc, c) => {
        if (!acc[c.companionSlug]) acc[c.companionSlug] = [];
        acc[c.companionSlug].push(c);
        return acc;
      }, {});

      // For each slug, take the one with lowest rank_in_role
      const unique = Object.values(bySlug).map(slugGroup => {
        const sorted = slugGroup.sort((a, b) => 
          (a.rankInRole || 999) - (b.rankInRole || 999)
        );
        // Take the first (lowest rank), optionally merge notes
        const primary = sorted[0];
        if (sorted.length > 1) {
          // Merge notes from duplicates
          const allNotes = sorted
            .map(c => c.notes)
            .filter(Boolean)
            .filter((note, idx, arr) => arr.indexOf(note) === idx); // unique notes
          primary.notes = allNotes.join(' • ');
        }
        return primary;
      });

      // Sort by rank_in_role
      return [role, unique.sort((a, b) => 
        (a.rankInRole || 999) - (b.rankInRole || 999)
      )];
    })
  );

  // Get role order for display
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
              const roleInfo = getPermacultureRole(roleGroup.roleCode);
              const isExpanded = expandedRoles.has(roleGroup.roleCode);
              const topN = 5;
              const hasMore = roleGroup.companions.length > topN;
              const displayedCompanions = isExpanded 
                ? roleGroup.companions 
                : roleGroup.companions.slice(0, topN);

              return (
                <div key={roleGroup.roleCode}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{roleInfo?.icon || '🌿'}</span>
                    <h4 className="font-medium">{roleInfo?.name || roleGroup.roleCode}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {roleGroup.companions.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{roleInfo?.description || ''}</p>
                  
                  <div className="space-y-2 ml-6">
                    {displayedCompanions.map((companion) => (
                      <Card key={companion.companionSlug} className="bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{companion.companionName}</p>
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
                        </CardContent>
                      </Card>
                    ))}

                    {/* Show More/Less Toggle */}
                    {hasMore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRole(roleGroup.roleCode)}
                        className="w-full text-xs"
                      >
                        {isExpanded 
                          ? `Show less` 
                          : `Show ${roleGroup.companions.length - topN} more...`
                        }
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