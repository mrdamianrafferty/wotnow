'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '../../ui/utils';
import { Sprout, Search, X } from 'lucide-react';

export interface SelectedPlant {
  slug: string;
  name: string;
  type: string;
}

/* ------------------------------------------------------------------ */
/*  Curated plant data — plain-language, beginner-friendly             */
/* ------------------------------------------------------------------ */

interface PlantEntry {
  slug: string;
  name: string;
}

interface PlantCategory {
  id: string;
  label: string;
  emoji: string;
  /** Maps to onboarding interest IDs */
  interestIds: string[];
  plants: PlantEntry[];
}

const CATEGORIES: PlantCategory[] = [
  {
    id: 'vegetables',
    label: 'Vegetables',
    emoji: '🥕',
    interestIds: ['vegetables'],
    plants: [
      { slug: 'potato', name: 'Potato' },
      { slug: 'tomato', name: 'Tomato' },
      { slug: 'lettuce', name: 'Lettuce' },
      { slug: 'carrot', name: 'Carrot' },
      { slug: 'onion', name: 'Onion' },
      { slug: 'garlic', name: 'Garlic' },
      { slug: 'courgette', name: 'Courgette' },
      { slug: 'pea', name: 'Pea' },
      { slug: 'broad-bean', name: 'Broad bean' },
      { slug: 'cabbage', name: 'Cabbage' },
      { slug: 'spinach', name: 'Spinach' },
      { slug: 'beetroot', name: 'Beetroot' },
    ],
  },
  {
    id: 'herbs',
    label: 'Herbs',
    emoji: '🌿',
    interestIds: ['herbs'],
    plants: [
      { slug: 'parsley', name: 'Parsley' },
      { slug: 'basil', name: 'Basil' },
      { slug: 'mint', name: 'Mint' },
      { slug: 'coriander', name: 'Coriander' },
      { slug: 'chives', name: 'Chives' },
      { slug: 'dill', name: 'Dill' },
    ],
  },
  {
    id: 'flowers',
    label: 'Flowers',
    emoji: '🌸',
    interestIds: ['flowers'],
    plants: [
      { slug: 'sunflower', name: 'Sunflower' },
      { slug: 'rose', name: 'Rose' },
      { slug: 'lavender', name: 'Lavender' },
      { slug: 'dahlia', name: 'Dahlia' },
      { slug: 'marigold', name: 'Marigold' },
      { slug: 'sweet-pea', name: 'Sweet pea' },
    ],
  },
  {
    id: 'ornamental_trees',
    label: 'Ornamental Trees',
    emoji: '🌳',
    interestIds: ['ornamental_trees'],
    plants: [
      { slug: 'japanese-maple', name: 'Japanese maple' },
      { slug: 'magnolia', name: 'Magnolia' },
      { slug: 'birch', name: 'Birch' },
      { slug: 'rowan', name: 'Rowan' },
      { slug: 'cherry-blossom', name: 'Cherry blossom' },
      { slug: 'olive', name: 'Olive' },
    ],
  },
  {
    id: 'fruit_trees',
    label: 'Fruit Trees',
    emoji: '🍎',
    interestIds: ['fruit_trees'],
    plants: [
      { slug: 'apple', name: 'Apple' },
      { slug: 'pear', name: 'Pear' },
      { slug: 'plum', name: 'Plum' },
      { slug: 'cherry', name: 'Cherry' },
      { slug: 'peach', name: 'Peach' },
      { slug: 'fig', name: 'Fig' },
    ],
  },
  {
    id: 'wildlife',
    label: 'Wildlife & Pollinators',
    emoji: '🦋',
    interestIds: ['wildlife'],
    plants: [
      { slug: 'lavender-wildlife', name: 'Lavender' },
      { slug: 'sunflower-wildlife', name: 'Sunflower' },
      { slug: 'foxglove', name: 'Foxglove' },
      { slug: 'buddleja', name: 'Buddleja' },
      { slug: 'cosmos', name: 'Cosmos' },
      { slug: 'wildflower-mix', name: 'Wildflower mix' },
    ],
  },
  {
    id: 'indoor_plants',
    label: 'Indoor Plants',
    emoji: '🪴',
    interestIds: ['indoor_plants'],
    plants: [
      { slug: 'spider-plant', name: 'Spider plant' },
      { slug: 'monstera', name: 'Monstera' },
      { slug: 'peace-lily', name: 'Peace lily' },
      { slug: 'aloe-vera', name: 'Aloe vera' },
      { slug: 'snake-plant', name: 'Snake plant' },
      { slug: 'pothos', name: 'Pothos' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface PlantSuggestionsStepProps {
  interests: string[];
  climateZone?: string;
  selectedPlants: SelectedPlant[];
  onSelectionChange: (plants: SelectedPlant[]) => void;
}

export function PlantSuggestionsStep({
  interests,
  selectedPlants,
  onSelectionChange,
}: PlantSuggestionsStepProps) {
  // Pick initial tab: first category matching user interests, or 'vegetables'
  const initialTab = useMemo(() => {
    for (const cat of CATEGORIES) {
      if (cat.interestIds.some((id) => interests.includes(id))) {
        return cat.id;
      }
    }
    return 'vegetables';
  }, [interests]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Order tabs: user-relevant categories first, rest after
  const orderedCategories = useMemo(() => {
    const relevant: PlantCategory[] = [];
    const other: PlantCategory[] = [];
    for (const cat of CATEGORIES) {
      if (cat.interestIds.some((id) => interests.includes(id))) {
        relevant.push(cat);
      } else {
        other.push(cat);
      }
    }
    return [...relevant, ...other];
  }, [interests]);

  const activeCategory = CATEGORIES.find((c) => c.id === activeTab) || CATEGORIES[0];

  // Search across all categories
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    const results: (PlantEntry & { categoryId: string; categoryLabel: string })[] = [];
    for (const cat of CATEGORIES) {
      for (const plant of cat.plants) {
        if (plant.name.toLowerCase().includes(q)) {
          results.push({ ...plant, categoryId: cat.id, categoryLabel: cat.label });
        }
      }
    }
    return results;
  }, [searchQuery]);

  const togglePlant = useCallback(
    (plant: PlantEntry, categoryId: string) => {
      const isSelected = selectedPlants.some((p) => p.slug === plant.slug);
      if (isSelected) {
        onSelectionChange(selectedPlants.filter((p) => p.slug !== plant.slug));
      } else {
        onSelectionChange([
          ...selectedPlants,
          { slug: plant.slug, name: plant.name, type: categoryId },
        ]);
      }
    },
    [selectedPlants, onSelectionChange]
  );

  const isSearchMode = Boolean(searchQuery.trim());

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pick a few plants to get started. You can always add more later.
      </p>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for a plant..."
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Category tabs — hidden during search */}
      {!isSearchMode && (
        <div className="flex flex-wrap gap-1.5">
          {orderedCategories.map((cat) => {
            const isActive = activeTab === cat.id;
            const isRelevant = cat.interestIds.some((id) => interests.includes(id));
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isRelevant
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Plant grid — normal mode */}
      {!isSearchMode && (
        <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 lg:grid-cols-4">
          {activeCategory.plants.map((plant) => {
            const isSelected = selectedPlants.some((p) => p.slug === plant.slug);
            return (
              <button
                key={plant.slug}
                type="button"
                aria-label={`${isSelected ? 'Remove' : 'Add'} ${plant.name}`}
                onClick={() => togglePlant(plant, activeCategory.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all duration-200',
                  'hover:scale-[1.02] hover:shadow-md',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                    : 'border-border hover:border-primary'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm truncate">{plant.name}</span>
                  {isSelected && (
                    <Sprout className="h-4 w-4 shrink-0 text-emerald-500 motion-safe:animate-scale-in" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search results */}
      {isSearchMode && searchResults && searchResults.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3 lg:grid-cols-4">
          {searchResults.map((plant) => {
            const isSelected = selectedPlants.some((p) => p.slug === plant.slug);
            return (
              <button
                key={plant.slug}
                type="button"
                aria-label={`${isSelected ? 'Remove' : 'Add'} ${plant.name}`}
                onClick={() => togglePlant(plant, plant.categoryId)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all duration-200',
                  'hover:scale-[1.02] hover:shadow-md',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                    : 'border-border hover:border-primary'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-sm truncate">{plant.name}</span>
                  {isSelected && (
                    <Sprout className="h-4 w-4 shrink-0 text-emerald-500 motion-safe:animate-scale-in" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{plant.categoryLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* No search results */}
      {isSearchMode && searchResults && searchResults.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No plants found for &ldquo;{searchQuery}&rdquo;. Try a different name or browse the categories above.
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
