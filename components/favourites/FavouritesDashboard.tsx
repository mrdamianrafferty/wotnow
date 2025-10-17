/**
 * FavouritesDashboard Component
 * 
 * Main dashboard view showing tracked species grouped by confidence bands
 * Shows active (85%+), good (60-84%), and waiting (<60%) species
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Plus } from 'lucide-react';
import { ActiveSpeciesCard, GoodSpeciesCard, WaitingSpeciesCard } from './StatusCards';
import { LoadingSpinner } from './shared/LoadingSpinner';
import type { TrackedSpecies } from '../../types/favourites';
import { getConfidenceBand, STATUS_CONFIGS } from '../../types/favourites';

interface FavouritesDashboardProps {
  favourites: TrackedSpecies[];
  onToggleFavourite: (speciesId: string) => void;
  onToggleNotifications: (speciesId: string) => void;
  onCardClick: (speciesId: string) => void;
  onAddMore: () => void;
  onSettings?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function FavouritesDashboard({
  favourites,
  onToggleFavourite,
  onToggleNotifications,
  onCardClick,
  onAddMore,
  onSettings,
  isLoading = false,
  className = ''
}: FavouritesDashboardProps) {
  // Group species by confidence band
  const groupedSpecies = favourites.reduce((acc, species) => {
    const band = getConfidenceBand(species.confidenceScore);
    if (!acc[band]) acc[band] = [];
    acc[band].push(species);
    return acc;
  }, {} as Record<string, TrackedSpecies[]>);
  
  // Sort within each band by confidence score
  Object.values(groupedSpecies).forEach(group => {
    group.sort((a, b) => b.confidenceScore - a.confidenceScore);
  });
  
  // Collapsed state for each section
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    active: false,
    good: false,
    waiting: true // Waiting section starts collapsed
  });
  
  const toggleSection = (band: string) => {
    setCollapsed(prev => ({
      ...prev,
      [band]: !prev[band]
    }));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" message="Loading the good shit..." />
      </div>
    );
  }
  
  if (favourites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="text-6xl mb-4">🎣</div>
        <h3 className="text-2xl font-bold text-base-content mb-2">
          No Species Tracked Yet
        </h3>
        <p className="text-base-content/60 max-w-md mb-6">
          Start tracking species to get live conditions, forecasts, and alerts 
          when it&apos;s the perfect time to fish.
        </p>
        <button onClick={onAddMore} className="btn btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Your First Species
        </button>
      </div>
    );
  }
  
  const activeCount = groupedSpecies.active?.length || 0;
  const goodCount = groupedSpecies.good?.length || 0;
  const waitingCount = groupedSpecies.waiting?.length || 0;
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-base-content">
            Your Tracked Species
          </h2>
          <p className="text-base-content/60 mt-1">
            {favourites.length} species • Live conditions updated
          </p>
        </div>
        
        <div className="flex gap-2">
          {onSettings && (
            <button onClick={onSettings} className="btn btn-ghost btn-sm">
              <Settings className="w-4 h-4" />
            </button>
          )}
          <button onClick={onAddMore} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add More
          </button>
        </div>
      </div>
      
      {/* Active Now Section (85%+) */}
      {activeCount > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => toggleSection('active')}
            className="flex items-center justify-between w-full p-3 bg-success/10 rounded-lg hover:bg-success/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-1 h-8 rounded bg-success ${collapsed.active ? 'opacity-50' : ''}`} />
              <div className="text-left">
                <h3 className="text-lg font-bold text-success flex items-center gap-2">
                  {STATUS_CONFIGS.active.label}
                  <span className="badge badge-success badge-sm">{activeCount}</span>
                </h3>
                <p className="text-sm text-base-content/60">
                  {STATUS_CONFIGS.active.description}
                </p>
              </div>
            </div>
            {collapsed.active ? (
              <ChevronDown className="w-5 h-5 text-success" />
            ) : (
              <ChevronUp className="w-5 h-5 text-success" />
            )}
          </button>
          
          {!collapsed.active && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {groupedSpecies.active.map(species => (
                <ActiveSpeciesCard
                  key={species.species.id}
                  species={species}
                  onToggleFavourite={onToggleFavourite}
                  onToggleNotifications={onToggleNotifications}
                  onCardClick={onCardClick}
                />
              ))}
            </div>
          )}
        </section>
      )}
      
      {/* Good Conditions Section (60-84%) */}
      {goodCount > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => toggleSection('good')}
            className="flex items-center justify-between w-full p-3 bg-info/10 rounded-lg hover:bg-info/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-1 h-8 rounded bg-info ${collapsed.good ? 'opacity-50' : ''}`} />
              <div className="text-left">
                <h3 className="text-lg font-bold text-info flex items-center gap-2">
                  {STATUS_CONFIGS.good.label}
                  <span className="badge badge-info badge-sm">{goodCount}</span>
                </h3>
                <p className="text-sm text-base-content/60">
                  {STATUS_CONFIGS.good.description}
                </p>
              </div>
            </div>
            {collapsed.good ? (
              <ChevronDown className="w-5 h-5 text-info" />
            ) : (
              <ChevronUp className="w-5 h-5 text-info" />
            )}
          </button>
          
          {!collapsed.good && (
            <div className="grid gap-3 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {groupedSpecies.good.map(species => (
                <GoodSpeciesCard
                  key={species.species.id}
                  species={species}
                  onToggleFavourite={onToggleFavourite}
                  onToggleNotifications={onToggleNotifications}
                  onCardClick={onCardClick}
                />
              ))}
            </div>
          )}
        </section>
      )}
      
      {/* Waiting Section (<60%) */}
      {waitingCount > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => toggleSection('waiting')}
            className="flex items-center justify-between w-full p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-1 h-8 rounded bg-warning ${collapsed.waiting ? 'opacity-50' : ''}`} />
              <div className="text-left">
                <h3 className="text-lg font-bold text-warning flex items-center gap-2">
                  {STATUS_CONFIGS.waiting.label}
                  <span className="badge badge-warning badge-sm">{waitingCount}</span>
                </h3>
                <p className="text-sm text-base-content/60">
                  {STATUS_CONFIGS.waiting.description}
                </p>
              </div>
            </div>
            {collapsed.waiting ? (
              <ChevronDown className="w-5 h-5 text-warning" />
            ) : (
              <ChevronUp className="w-5 h-5 text-warning" />
            )}
          </button>
          
          {!collapsed.waiting && (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {groupedSpecies.waiting.map(species => (
                <WaitingSpeciesCard
                  key={species.species.id}
                  species={species}
                  onToggleFavourite={onToggleFavourite}
                  onCardClick={onCardClick}
                />
              ))}
            </div>
          )}
        </section>
      )}
      
      {/* Empty state for when all species are tracked but none match criteria */}
      {activeCount === 0 && goodCount === 0 && waitingCount === 0 && favourites.length > 0 && (
        <div className="text-center py-12 text-base-content/50">
          <p>No species data available. Check back soon!</p>
        </div>
      )}
    </div>
  );
}

export default FavouritesDashboard;
