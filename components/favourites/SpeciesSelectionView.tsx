/**
 * SpeciesSelectionView Component
 * 
 * Initial empty state view with smart suggestions
 * Helps users discover and track their first species
 */

import React, { useState } from 'react';
import { Fish, TrendingUp, Users, MapPin, Plus } from 'lucide-react';
import { SpeciesCarousel } from './SpeciesCarousel';
import { LoadingSpinner } from './shared/LoadingSpinner';
import type { TrackedSpecies } from '../../types/favourites';

interface SpeciesSelectionViewProps {
  suggestions: {
    youveCaught: TrackedSpecies[];
    hotRightNow: TrackedSpecies[];
    localFavorites: TrackedSpecies[];
    allRegional: TrackedSpecies[];
  };
  onAddSpecies: (speciesId: string) => void;
  isLoading?: boolean;
  userLocation?: string;
}

export function SpeciesSelectionView({
  suggestions,
  onAddSpecies,
  isLoading = false,
  userLocation
}: SpeciesSelectionViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('hot');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" message="Finding species for your area..." />
      </div>
    );
  }
  
  // Count suggestions
  const counts = {
    youveCaught: suggestions.youveCaught.length,
    hotRightNow: suggestions.hotRightNow.length,
    localFavorites: suggestions.localFavorites.length,
    allRegional: suggestions.allRegional.length
  };
  
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <Fish className="w-16 h-16 text-base-content/30 mb-4" />
        <h3 className="text-xl font-bold text-base-content mb-2">
          No species found
        </h3>
        <p className="text-base-content/60 max-w-md">
          We couldn&apos;t find any species data for your location. 
          Try adjusting your location settings or check back later.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-base-content">
          Start Tracking Species
        </h2>
        <p className="text-base-content/70 max-w-2xl mx-auto">
          Select species you want to track. We&apos;ll monitor conditions and alert you 
          when it&apos;s the perfect time to go fishing.
        </p>
        {userLocation && (
          <div className="flex items-center justify-center gap-2 text-sm text-base-content/60">
            <MapPin className="w-4 h-4" />
            <span>{userLocation}</span>
          </div>
        )}
      </div>
      
      {/* Category Tabs */}
      <div className="tabs tabs-boxed bg-base-200 p-1 max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedCategory('hot')}
          className={`tab ${selectedCategory === 'hot' ? 'tab-active' : ''}`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Hot Right Now
          <span className="ml-2 badge badge-sm">{counts.hotRightNow}</span>
        </button>
        
        {counts.youveCaught > 0 && (
          <button
            onClick={() => setSelectedCategory('caught')}
            className={`tab ${selectedCategory === 'caught' ? 'tab-active' : ''}`}
          >
            <Fish className="w-4 h-4 mr-2" />
            You&apos;ve Caught
            <span className="ml-2 badge badge-sm">{counts.youveCaught}</span>
          </button>
        )}
        
        <button
          onClick={() => setSelectedCategory('local')}
          className={`tab ${selectedCategory === 'local' ? 'tab-active' : ''}`}
        >
          <Users className="w-4 h-4 mr-2" />
          Local Favorites
          <span className="ml-2 badge badge-sm">{counts.localFavorites}</span>
        </button>
        
        <button
          onClick={() => setSelectedCategory('all')}
          className={`tab ${selectedCategory === 'all' ? 'tab-active' : ''}`}
        >
          All Species
          <span className="ml-2 badge badge-sm">{counts.allRegional}</span>
        </button>
      </div>
      
      {/* Category Content */}
      <div className="animate-in fade-in duration-300">
        {selectedCategory === 'hot' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-success flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Hot Right Now
              </h3>
              <p className="text-sm text-base-content/60">
                Species with excellent conditions right now
              </p>
            </div>
            
            {counts.hotRightNow > 0 ? (
              <SpeciesCarousel
                species={suggestions.hotRightNow}
                onToggleFavourite={onAddSpecies}
                showStats={false}
              />
            ) : (
              <div className="text-center py-8 text-base-content/50">
                No species have high confidence scores right now. Check the other categories!
              </div>
            )}
          </div>
        )}
        
        {selectedCategory === 'caught' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-primary flex items-center justify-center gap-2">
                <Fish className="w-5 h-5" />
                Species You&apos;ve Caught
              </h3>
              <p className="text-sm text-base-content/60">
                Track species from your catch history
              </p>
            </div>
            
            <SpeciesCarousel
              species={suggestions.youveCaught}
              onToggleFavourite={onAddSpecies}
              showStats={true}
            />
          </div>
        )}
        
        {selectedCategory === 'local' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-info flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Local Favorites
              </h3>
              <p className="text-sm text-base-content/60">
                Popular species in your area
              </p>
            </div>
            
            {counts.localFavorites > 0 ? (
              <SpeciesCarousel
                species={suggestions.localFavorites}
                onToggleFavourite={onAddSpecies}
                showStats={false}
              />
            ) : (
              <div className="text-center py-8 text-base-content/50">
                No community data available yet. Be the first to log catches!
              </div>
            )}
          </div>
        )}
        
        {selectedCategory === 'all' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-base-content flex items-center justify-center gap-2">
                <MapPin className="w-5 h-5" />
                All Regional Species
              </h3>
              <p className="text-sm text-base-content/60">
                Every species found in your area
              </p>
            </div>
            
            {counts.allRegional > 0 ? (
              <div className="space-y-2">
                <SpeciesCarousel
                  species={suggestions.allRegional}
                  onToggleFavourite={onAddSpecies}
                  showStats={false}
                />
                
                {/* Pagination hint for large lists */}
                {counts.allRegional > 20 && (
                  <div className="text-center text-sm text-base-content/50">
                    Showing {Math.min(20, counts.allRegional)} of {counts.allRegional} species
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-base-content/50">
                No species data available for this region
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Quick Add Button (floating) */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <button className="btn btn-circle btn-lg btn-primary shadow-lg">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export default SpeciesSelectionView;
