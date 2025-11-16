import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
  Loader2,
  Search,
  Sprout,
  Filter,
  ChevronRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/grow/api';
import type { PlantSpecies, PlantSpeciesCategoriesResponse, PlantSpeciesSearchResponse } from '../../lib/grow/species';
import type { SerializedPlant } from '../../lib/grow/server/plants';

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
  vine: '🌿',
  vines: '🌿',
  flower: '🌸',
  flowers: '🌸',
  tree: '🌳',
  trees: '🌳',
  shrub: '🌱',
  shrubs: '🌱',
};

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
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function buildCategoryIcon(category: string | null): string {
  if (!category) {
    return '🪴';
  }
  return CATEGORY_ICONS[category.toLowerCase()] ?? '🪴';
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
  const [health, setHealth] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState('');
  const [plantedDate, setPlantedDate] = useState(formatDateInput(new Date()));
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [listVariant, setListVariant] = useState<PlantListVariant>('search');
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
    setIsSaving(false);
    setIsFetching(false);
    setListVariant('search');
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

          return (
          <button
            key={plant.slug}
            type="button"
            onClick={() => handleSelectSpecies(plant)}
            className="w-full border border-border rounded-xl p-4 text-left hover:border-green-600 hover:bg-green-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{plant.name}</p>
                  <Badge variant="secondary">{buildCategoryIcon(plant.category)} {formatCategoryLabel(plant.category)}</Badge>
                </div>
                {plant.scientificName && (
                  <p className="text-sm text-muted-foreground italic mt-1">{plant.scientificName}</p>
                )}
                  {translationList.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Also known as: {translationList.slice(0, 3).join(', ')}
                      {translationList.length > 3 ? '…' : ''}
                    </p>
                  )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
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
          <div className="space-y-4">
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

              <TabsContent value="search" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    value={searchQuery}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
                    placeholder="Search by common or scientific name"
                    className="pl-10"
                    autoFocus
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
                      className={`px-4 py-2 rounded-full border text-sm transition-colors ${selectedCategory === category ? 'border-green-600 bg-green-50 text-foreground' : 'border-border hover:border-green-200'}`}
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
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    {buildCategoryIcon(selectedSpecies?.category ?? null)} {selectedSpecies?.name}
                  </p>
                  {selectedSpecies?.scientificName && (
                    <p className="text-sm text-muted-foreground italic mt-1">{selectedSpecies.scientificName}</p>
                  )}
                </div>
                <Badge variant="secondary">{formatCategoryLabel(selectedSpecies?.category ?? null)}</Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="plant-nickname">Plant name</Label>
                <Input
                  id="plant-nickname"
                  value={nickname}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNickname(event.target.value)}
                  placeholder="e.g. Cherry Tomato"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plant-location">Location</Label>
                <Input
                  id="plant-location"
                  value={location}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setLocation(event.target.value)}
                  placeholder="e.g. Raised Bed 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plant-date">Planted</Label>
                <Input
                  id="plant-date"
                  type="date"
                  value={plantedDate}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setPlantedDate(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Health</Label>
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
              <Label htmlFor="plant-notes">Notes</Label>
              <Textarea
                id="plant-notes"
                value={notes}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
                rows={4}
                placeholder="Watering schedule, variety details, reminders…"
              />
            </div>

            <div className="flex justify-end gap-2">
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
        )}
      </DialogContent>
    </Dialog>
  );
}
