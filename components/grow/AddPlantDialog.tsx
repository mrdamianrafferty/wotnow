import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Badge,
} from '../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import {
  Loader2,
  Search,
  Sprout,
  Filter,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Info,
  Sun,
  Droplets,
  Ruler,
  ExternalLink,
  AlertTriangle,
  Bug,
  Heart,
  Leaf,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/grow/api';
import type { PlantSpecies, PlantSpeciesCategoriesResponse, PlantSpeciesSearchResponse } from '../../lib/grow/species';
import type { SerializedPlant } from '../../lib/grow/server/plants';
import { getPlantImage, PLANT_IMAGE_MAP } from '../../lib/grow/plantImages';

const HEALTH_OPTIONS: Array<{ value: 'excellent' | 'good' | 'fair' | 'poor'; label: string }> = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Needs attention' },
];

const CATEGORY_ICONS: Record<string, string> = {
  vegetable: '🥕',
  vegetables: '🥕',
  herb: '🌿',
  herbs: '🌿',
  fruit: '🍓',
  fruits: '🍓',
  'fruit-tree': '🍎',
  vine: '🌿',
  vines: '🌿',
  flower: '🌸',
  flowers: '🌸',
  tree: '🌳',
  trees: '🌳',
  shrub: '🌱',
  shrubs: '🌱',
};

const SOURCE_OPTIONS = [
  { value: 'nursery', label: 'Garden centre / Nursery' },
  { value: 'online', label: 'Online retailer' },
  { value: 'seeds', label: 'Grown from seed' },
  { value: 'cutting', label: 'Cutting / Division' },
  { value: 'gift', label: 'Gift from friend / neighbor' },
  { value: 'existing', label: 'Already in garden' },
  { value: 'other', label: 'Other' },
];

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCategoryLabel(category: string | null): string {
  if (!category) {
    return 'Uncategorised';
  }
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
}

function buildCategoryIcon(category: string | null): string {
  if (!category) {
    return '🪴';
  }
  return CATEGORY_ICONS[category.toLowerCase()] ?? '🪴';
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getSpeciesImageSrc(species: PlantSpecies | null): string | null {
  if (!species) return null;
  
  // Try imageKey first
  if (species.imageKey && PLANT_IMAGE_MAP[species.imageKey]) {
    return getPlantImage(species.imageKey, 'medium');
  }
  
  // Try slug
  const slugKey = species.slug;
  if (slugKey && PLANT_IMAGE_MAP[slugKey]) {
    return getPlantImage(slugKey, 'medium');
  }
  
  // Try name-based key
  const nameKey = slugify(species.name);
  if (nameKey && PLANT_IMAGE_MAP[nameKey]) {
    return getPlantImage(nameKey, 'medium');
  }
  
  // Try Perenual image
  if (species.perenualImage?.medium_url) {
    return species.perenualImage.medium_url;
  }
  
  return null;
}

function formatUsdaRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `USDA ${min}–${max}`;
  if (min != null) return `USDA ≥ ${min}`;
  return `USDA ≤ ${max}`;
}

interface AddPlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlantAdded: (plant: SerializedPlant) => void;
}

type DialogStep = 'select' | 'details';

type PlantListVariant = 'search' | 'category';

export function AddPlantDialog({ open, onOpenChange, onPlantAdded }: AddPlantDialogProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'browse'>('search');
  const [step, setStep] = useState<DialogStep>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlantSpecies[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<PlantSpecies[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<PlantSpecies | null>(null);
  
  // Basic fields
  const [health, setHealth] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [plantedDate, setPlantedDate] = useState(formatDateInput(new Date()));
  const [notes, setNotes] = useState('');
  
  // Enhanced fields
  const [variety, setVariety] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [source, setSource] = useState('');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [listVariant, setListVariant] = useState<PlantListVariant>('search');
  const [showCareInfo, setShowCareInfo] = useState(false);
  const requestIdRef = useRef(0);

  const resetState = () => {
    requestIdRef.current += 1;
    setActiveTab('search');
    setStep('select');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCategory(null);
    setCategoryResults([]);
    setSelectedSpecies(null);
    setHealth('good');
    setNickname('');
    setLocation('');
    setPlantedDate(formatDateInput(new Date()));
    setNotes('');
    setVariety('');
    setQuantity(1);
    setSource('');
    setIsSaving(false);
    setIsFetching(false);
    setListVariant('search');
    setShowCareInfo(false);
  };

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    let cancelled = false;

    const loadCategories = async () => {
      try {
        const response: PlantSpeciesCategoriesResponse = await api.getPlantCategories();
        if (!cancelled) {
          setCategories(response.categories);
        }
      } catch (error) {
        console.error('Failed to load plant categories:', error);
        if (!cancelled) {
          setCategories([]);
        }
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!selectedSpecies) {
      return;
    }

    setNickname(selectedSpecies.name);
    setHealth('good');
    setLocation('Garden');
    setPlantedDate(formatDateInput(new Date()));
    setNotes('');
    setVariety('');
    setQuantity(1);
    setSource('');
  }, [selectedSpecies]);

  useEffect(() => {
    if (!open || step !== 'select' || activeTab !== 'search') {
      return;
    }

    setListVariant('search');

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      requestIdRef.current += 1;
      setSearchResults([]);
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    const currentRequestId = ++requestIdRef.current;

    const timeoutId = window.setTimeout(() => {
      api.searchPlantSpecies({ query: trimmed, limit: 30 })
        .then((response: PlantSpeciesSearchResponse) => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }
          setSearchResults(response.species);
        })
        .catch((error: unknown) => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }
          console.error('Plant search failed:', error);
          setSearchResults([]);
        })
        .finally(() => {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }
          setIsFetching(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [searchQuery, open, step, activeTab]);

  useEffect(() => {
    if (!open || step !== 'select' || activeTab !== 'browse' || !selectedCategory) {
      if (activeTab === 'browse') {
        setCategoryResults([]);
        setIsFetching(false);
      }
      return;
    }

    setListVariant('category');
    setIsFetching(true);
    const currentRequestId = ++requestIdRef.current;

    api.searchPlantSpecies({ category: selectedCategory, limit: 40 })
      .then((response: PlantSpeciesSearchResponse) => {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        setCategoryResults(response.species);
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        console.error('Category listing failed:', error);
        setCategoryResults([]);
      })
      .finally(() => {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        setIsFetching(false);
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [open, step, activeTab, selectedCategory]);

  const plantList = useMemo(() => {
    return listVariant === 'category' ? categoryResults : searchResults;
  }, [categoryResults, searchResults, listVariant]);

  const handleSelectSpecies = (species: PlantSpecies) => {
    setSelectedSpecies(species);
    setStep('details');
  };

  const handleBackToSearch = () => {
    setStep('select');
    setSelectedSpecies(null);
    setShowCareInfo(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSpecies) {
      return;
    }

    const nameToStore = nickname.trim().length > 0 ? nickname.trim() : selectedSpecies.name;
    const payload = {
      name: nameToStore,
      type: selectedSpecies.category ?? 'garden-plant',
      location: location.trim().length > 0 ? location.trim() : null,
      health,
      planted: plantedDate ? new Date(`${plantedDate}T00:00:00`).toISOString() : null,
      notes: notes.trim().length > 0 ? notes.trim() : null,
      // Enhanced fields
      speciesSlug: selectedSpecies.slug,
      variety: variety.trim().length > 0 ? variety.trim() : null,
      quantity: quantity > 0 ? quantity : 1,
      source: source.length > 0 ? source : null,
    };

    setIsSaving(true);

    try {
      const response = await api.addPlant(payload);
      const plant = response?.plant as SerializedPlant | undefined;
      if (!plant) {
        throw new Error('Unexpected response from server');
      }

      onPlantAdded(plant);
      toast.success(`${nameToStore} added to your garden`);
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Could not add plant', {
        description: message,
      });
      setIsSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  // Get species image for preview
  const speciesImageSrc = useMemo(() => getSpeciesImageSrc(selectedSpecies), [selectedSpecies]);
  const usda = selectedSpecies ? formatUsdaRange(selectedSpecies.usdaZoneMin, selectedSpecies.usdaZoneMax) : null;

  const renderPlantList = () => {
    if (activeTab === 'browse' && !selectedCategory) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center space-y-2">
          <Filter className="h-8 w-8" />
          <p className="font-medium">Choose a category to browse plants</p>
          <p className="text-sm">Pick a category above to see suggestions.</p>
        </div>
      );
    }

    if (isFetching) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Searching plants...
        </div>
      );
    }

    if (plantList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-center space-y-2">
          <Sprout className="h-10 w-10" />
          <p className="font-medium">No plants found</p>
          <p className="text-sm">Try a different search or pick another category.</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {plantList.map((plant) => {
          const translationList = Object.values(plant.translations).filter((value): value is string => Boolean(value));
          const imageSrc = getSpeciesImageSrc(plant);

          return (
          <button
            key={plant.slug}
            type="button"
            onClick={() => handleSelectSpecies(plant)}
            className="w-full border border-border rounded-xl p-4 text-left hover:border-green-600 hover:bg-green-50 transition-colors focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 outline-none"
            aria-label={`Select ${plant.name}${plant.scientificName ? `, ${plant.scientificName}` : ''}`}
          >
            <div className="flex items-start gap-3">
              {/* Thumbnail */}
              {imageSrc ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-white">
                  <Image 
                    src={imageSrc} 
                    alt={`${plant.name}${plant.scientificName ? ` (${plant.scientificName})` : ''}`} 
                    fill 
                    className="object-contain p-1" 
                    sizes="48px"
                  />
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-2xl">
                  {buildCategoryIcon(plant.category)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground">{plant.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {buildCategoryIcon(plant.category)} {formatCategoryLabel(plant.category)}
                  </Badge>
                </div>
                {plant.scientificName && (
                  <p className="text-sm text-muted-foreground italic mt-0.5 truncate">{plant.scientificName}</p>
                )}
                {translationList.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    Also: {translationList.slice(0, 3).join(', ')}
                    {translationList.length > 3 ? '…' : ''}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
            </div>
          </button>
          );
        })}
      </div>
    );
  };

  const renderCareInfoSection = () => {
    if (!selectedSpecies) return null;

    // Only show watering if we have actual text OR a valid benchmark with both value and unit
    const hasWatering = selectedSpecies.watering || 
      (selectedSpecies.wateringBenchmark?.value && selectedSpecies.wateringBenchmark?.unit);
    const hasSunlight = selectedSpecies.sunlight?.length > 0;
    const hasSoil = selectedSpecies.soil?.length > 0;
    const hasSize = selectedSpecies.maximumHeightCm || selectedSpecies.maximumSpreadCm;
    const hasToxicity = selectedSpecies.poisonousToHumans > 0 || selectedSpecies.poisonousToPets > 0;
    const hasPests = selectedSpecies.pestSusceptibility?.length > 0;
    const hasAttracts = selectedSpecies.attracts?.length > 0;

    const hasAnyInfo = hasWatering || hasSunlight || hasSoil || hasSize || hasToxicity || hasPests || hasAttracts;

    if (!hasAnyInfo) return null;

    return (
      <Collapsible open={showCareInfo} onOpenChange={setShowCareInfo}>
        <CollapsibleTrigger asChild>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full justify-between h-auto py-3 px-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              View species care info
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showCareInfo ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Watering */}
            {hasWatering && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Droplets className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-blue-900">Watering</div>
                  <div className="text-sm text-blue-800">
                    {selectedSpecies.watering || 'Regular'}
                    {selectedSpecies.wateringBenchmark?.value && selectedSpecies.wateringBenchmark?.unit && (
                      <span className="text-xs block mt-0.5">
                        (every {selectedSpecies.wateringBenchmark.value} {selectedSpecies.wateringBenchmark.unit})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sunlight */}
            {hasSunlight && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                <Sun className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-yellow-900">Light</div>
                  <div className="text-sm text-yellow-800">
                    {selectedSpecies.sunlight.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
            )}

            {/* Size */}
            {hasSize && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
                <Ruler className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-green-900">Size</div>
                  <div className="text-sm text-green-800">
                    {selectedSpecies.maximumHeightCm && `H: ${selectedSpecies.maximumHeightCm}cm`}
                    {selectedSpecies.maximumHeightCm && selectedSpecies.maximumSpreadCm && ' • '}
                    {selectedSpecies.maximumSpreadCm && `W: ${selectedSpecies.maximumSpreadCm}cm`}
                  </div>
                </div>
              </div>
            )}

            {/* Soil */}
            {hasSoil && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <Leaf className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-amber-900">Soil</div>
                  <div className="text-sm text-amber-800 truncate">
                    {selectedSpecies.soil.slice(0, 2).join(', ')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Warnings */}
          {hasToxicity && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium text-red-900">Toxicity Warning</div>
                <div className="text-sm text-red-800">
                  {selectedSpecies.poisonousToHumans > 0 && 'Toxic to humans'}
                  {selectedSpecies.poisonousToHumans > 0 && selectedSpecies.poisonousToPets > 0 && ' • '}
                  {selectedSpecies.poisonousToPets > 0 && 'Toxic to pets'}
                </div>
              </div>
            </div>
          )}

          {/* Pests */}
          {hasPests && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 border border-orange-100">
              <Bug className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium text-orange-900">Common Pests</div>
                <div className="text-sm text-orange-800">
                  {selectedSpecies.pestSusceptibility.slice(0, 3).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Attracts wildlife */}
          {hasAttracts && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 border border-purple-100">
              <Heart className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium text-purple-900">Attracts Wildlife</div>
                <div className="text-sm text-purple-800">
                  {selectedSpecies.attracts.slice(0, 3).join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Link to full species page */}
          <Link 
            href={`/grow/species/${selectedSpecies.slug}`}
            target="_blank"
            className="flex items-center justify-center gap-2 text-sm text-green-700 hover:text-green-800 hover:underline py-2"
          >
            <ExternalLink className="h-4 w-4" />
            View full species page
          </Link>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'details' && (
              <button
                type="button"
                onClick={handleBackToSearch}
                className="flex items-center text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </button>
            )}
            <span>{step === 'select' ? 'Add a Plant' : `Add ${selectedSpecies?.name ?? 'plant'}`}</span>
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'browse')}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="browse" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Browse categories
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-4 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" aria-hidden="true" />
                  <Input
                    id="plant-search"
                    value={searchQuery}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
                    placeholder="Search by common or scientific name"
                    className="pl-10"
                    autoFocus
                    aria-label="Search plants"
                    role="searchbox"
                  />
                </div>

                <ScrollArea className="h-[360px] pr-4">
                  {renderPlantList()}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="browse" className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory((current) => (current === category ? null : category))}
                      className={`px-4 py-2 rounded-full border text-sm transition-colors focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 outline-none ${selectedCategory === category ? 'border-green-600 bg-green-50 text-foreground' : 'border-border hover:border-green-200'}`}
                      aria-pressed={selectedCategory === category}
                    >
                      {buildCategoryIcon(category)} {formatCategoryLabel(category)}
                    </button>
                  ))}
                </div>

                {selectedCategory && (
                  <div className="rounded-lg border bg-muted/40 p-3 flex items-start gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5" />
                    Showing {formatCategoryLabel(selectedCategory)} plants
                  </div>
                )}

                <ScrollArea className="h-[320px] pr-4">
                  {renderPlantList()}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <form className="space-y-6 pb-4" onSubmit={handleSubmit}>
              {/* Species Header with Image */}
              <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <div className="flex gap-4">
                  {/* Species Image - clickable to species page */}
                  <Link 
                    href={`/grow/species/${selectedSpecies?.slug}`}
                    target="_blank"
                    className="block shrink-0 group"
                    aria-label={`View full ${selectedSpecies?.name ?? 'species'} page`}
                  >
                    {speciesImageSrc ? (
                      <div className="relative h-24 w-24 overflow-hidden rounded-xl border bg-white shadow-sm transition-all group-hover:ring-2 group-hover:ring-green-500 group-hover:shadow-md">
                        <Image 
                          src={speciesImageSrc} 
                          alt={`${selectedSpecies?.name ?? 'Plant'}${selectedSpecies?.scientificName ? ` (${selectedSpecies.scientificName})` : ''}`} 
                          fill 
                          className="object-contain p-2" 
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-xl border bg-white text-4xl shadow-sm transition-all group-hover:ring-2 group-hover:ring-green-500 group-hover:shadow-md">
                        {buildCategoryIcon(selectedSpecies?.category ?? null)}
                      </div>
                    )}
                  </Link>
                  
                  {/* Species Info */}
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/grow/species/${selectedSpecies?.slug}`}
                      target="_blank"
                      className="hover:underline hover:text-green-700 transition-colors"
                    >
                      <p className="text-xl font-semibold text-foreground">
                        {selectedSpecies?.name}
                      </p>
                    </Link>
                    {selectedSpecies?.scientificName && (
                      <p className="text-sm text-muted-foreground italic">{selectedSpecies.scientificName}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">
                        {buildCategoryIcon(selectedSpecies?.category ?? null)} {formatCategoryLabel(selectedSpecies?.category ?? null)}
                      </Badge>
                      {usda && <Badge variant="outline">{usda}</Badge>}
                      {selectedSpecies?.careLevel && (
                        <Badge variant="outline">Care: {selectedSpecies.careLevel}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedSpecies?.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {selectedSpecies.description}
                  </p>
                )}
              </div>

              {/* Care Info Collapsible */}
              <div className="rounded-lg border">
                {renderCareInfoSection()}
              </div>

              {/* Your Plant Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Plant Details
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plant-nickname">Plant name</Label>
                    <Input
                      id="plant-nickname"
                      value={nickname}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setNickname(event.target.value)}
                      placeholder="e.g. Kitchen Window Basil"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Give it a memorable name</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plant-variety">Variety / Cultivar</Label>
                    <Input
                      id="plant-variety"
                      value={variety}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setVariety(event.target.value)}
                      placeholder="e.g. Genovese, Bramley, Roma"
                    />
                    <p className="text-xs text-muted-foreground">Specific variety if known</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plant-location">Location</Label>
                    <Input
                      id="plant-location"
                      value={location}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setLocation(event.target.value)}
                      placeholder="e.g. Back garden, Raised bed 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plant-quantity">Quantity</Label>
                    <Input
                      id="plant-quantity"
                      type="number"
                      min={1}
                      max={999}
                      value={quantity}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setQuantity(Math.max(1, parseInt(event.target.value) || 1))}
                    />
                    <p className="text-xs text-muted-foreground">How many plants/seeds</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plant-date">Planted date</Label>
                    <Input
                      id="plant-date"
                      type="date"
                      value={plantedDate}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setPlantedDate(event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Current health</Label>
                    <Select value={health} onValueChange={(value) => setHealth(value as typeof health)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select health" />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTH_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Where did you get it?</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plant-notes">Notes</Label>
                  <Textarea
                    id="plant-notes"
                    value={notes}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="Watering schedule, special care needs, reminders…"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={handleBackToSearch} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Sprout className="h-4 w-4 mr-2" />
                      Add plant
                    </>
                  )}
                </Button>
              </div>
            </form>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
