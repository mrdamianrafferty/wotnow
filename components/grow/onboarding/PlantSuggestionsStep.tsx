'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../ui/utils';
import { Alert, AlertDescription } from '../../ui/alert';
import { Loader2, Search, X, Sprout } from 'lucide-react';
import { api } from '../../../lib/grow/api';

export interface SelectedPlant {
  slug: string;
  name: string;
  type: string;
}

interface SuggestionItem {
  slug: string;
  name: string;
  category: string;
  careLevel: string;
  sunRequirements?: string;
  description?: string;
  imageKey?: string;
}

interface PlantSuggestionsStepProps {
  interests: string[];
  climateZone?: string;
  selectedPlants: SelectedPlant[];
  onSelectionChange: (plants: SelectedPlant[]) => void;
}

const CATEGORY_DISPLAY: Record<string, string> = {
  herb: 'Herb',
  vegetable: 'Vegetable',
  fruit_tree: 'Fruit Tree',
  ornamental: 'Ornamental',
  flower: 'Flower',
  indoor: 'Indoor Plant',
  shrub: 'Shrub',
  climber: 'Climber',
};

const CARE_LABELS: Record<string, string> = {
  low: 'Easy care',
  medium: 'Moderate care',
  high: 'Needs attention',
};

export function PlantSuggestionsStep({
  interests,
  climateZone,
  selectedPlants,
  onSelectionChange,
}: PlantSuggestionsStepProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch initial suggestions
  useEffect(() => {
    let isMounted = true;

    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await api.getOnboardingSuggestions(interests, climateZone);
        if (!isMounted) return;
        setSuggestions(response.suggestions || []);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Failed to load suggestions';
        setLoadError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void fetchSuggestions();

    return () => {
      isMounted = false;
    };
  }, [interests, climateZone]);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/grow/species?q=${encodeURIComponent(query.trim())}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        if (!isMountedRef.current) return;
        setSearchResults(
          (data.species || []).map((s: Record<string, unknown>) => ({
            slug: s.slug as string,
            name: s.name as string,
            category: (s.category as string) || 'unknown',
            careLevel: (s.care_level as string) || 'medium',
            sunRequirements: s.sun_requirements as string | undefined,
            description: s.description as string | undefined,
          }))
        );
      } catch {
        if (!isMountedRef.current) return;
        setSearchResults([]);
      } finally {
        if (isMountedRef.current) setIsSearching(false);
      }
    }, 350);
  }, []);

  const togglePlant = useCallback(
    (plant: SuggestionItem) => {
      const isSelected = selectedPlants.some((p) => p.slug === plant.slug);
      if (isSelected) {
        onSelectionChange(selectedPlants.filter((p) => p.slug !== plant.slug));
      } else {
        onSelectionChange([
          ...selectedPlants,
          { slug: plant.slug, name: plant.name, type: plant.category },
        ]);
      }
    },
    [selectedPlants, onSelectionChange]
  );

  const displayPlants = useMemo(
    () => (searchQuery.trim() ? searchResults : suggestions),
    [searchQuery, searchResults, suggestions]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-sm text-muted-foreground">Finding plants that suit your garden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        Pick a plant or two to get started. You can always add more later.
      </p>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search for a specific plant..."
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => handleSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Error state */}
      {loadError && !searchQuery && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Loading search */}
      {isSearching && (
        <div className="flex items-center gap-2 py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      )}

      {/* Plant grid */}
      {!isSearching && displayPlants.length > 0 && (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3">
          {displayPlants.map((plant) => {
            const isSelected = selectedPlants.some((p) => p.slug === plant.slug);
            return (
              <button
                key={plant.slug}
                type="button"
                aria-label={`${isSelected ? 'Remove' : 'Add'} ${plant.name}`}
                onClick={() => togglePlant(plant)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all duration-200',
                  'hover:scale-[1.02] hover:shadow-md',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                    : 'border-border hover:border-primary'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block font-medium text-sm truncate">{plant.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {CATEGORY_DISPLAY[plant.category] || plant.category}
                      {plant.careLevel && ` · ${CARE_LABELS[plant.careLevel] || plant.careLevel}`}
                    </span>
                  </div>
                  {isSelected && (
                    <Sprout className="h-4 w-4 shrink-0 text-emerald-500 motion-safe:animate-scale-in" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* No results */}
      {!isSearching && searchQuery && displayPlants.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6 motion-safe:animate-fade-in">
          No plants found for &ldquo;{searchQuery}&rdquo;. Try a different name or skip this step.
        </p>
      )}

      {/* Selection count */}
      {selectedPlants.length > 0 && (
        <p className="text-xs text-emerald-700 font-medium">
          {selectedPlants.length} plant{selectedPlants.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

export default PlantSuggestionsStep;
