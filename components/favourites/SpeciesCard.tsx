/**
 * SpeciesCard Component
 * 
 * Reusable card showing species information with confidence score
 * Used in both selection view and dashboard view
 */

import React from 'react';
import Image from 'next/image';
import { Heart, TrendingUp, Calendar, MapPin, Clock } from 'lucide-react';
import { ConfidenceRing } from './shared/ConfidenceRing';
import type { TrackedSpecies } from '../../types/favourites';
import { getImmediateFishingTimes } from '../../utils/fishingTimeDataService';

interface SpeciesCardProps {
  species: TrackedSpecies;
  onToggleFavourite?: (speciesId: string) => void;
  onCardClick?: (speciesId: string) => void;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SpeciesCard({
  species,
  onToggleFavourite,
  onCardClick,
  showStats = true,
  size = 'md',
  className = ''
}: SpeciesCardProps) {
  
  // Calculate real fishing time based on species preferences
  // Note: Converting species to advice format for compatibility
  const speciesAdvice = {
    name: species.species.commonName,
    normalized: species.species.commonName.toLowerCase().replace(/\s+/g, '-'),
    contexts: {} // Will use defaults for now
  };
  const fishingTimeResult = getImmediateFishingTimes([speciesAdvice], 'good');
  const bestFishingTime = fishingTimeResult.primaryWindow ? 
    `Best: ${fishingTimeResult.primaryWindow.startHour}:00-${fishingTimeResult.primaryWindow.endHour}:00 (${fishingTimeResult.primaryWindow.reason})` :
    'Best: 6-8am (Dawn + Rising tide)';
  
  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-40',
      image: 'h-32',
      title: 'text-sm',
      text: 'text-xs'
    },
    md: {
      container: 'w-48',
      image: 'h-40',
      title: 'text-base',
      text: 'text-sm'
    },
    lg: {
      container: 'w-64',
      image: 'h-48',
      title: 'text-lg',
      text: 'text-base'
    }
  }[size];
  
  // Top reason for score
  const topReason = species.reasonCodes[0];
  const reasonLabels: Record<string, string> = {
    seasonal_peak: 'Peak Season',
    optimal_tide: 'Perfect Tide',
    good_moon: 'Moon Phase',
    temperature_ideal: 'Ideal Temp',
    local_favorite: 'Popular Here',
    recent_catch: 'Recently Caught'
  };
  
  return (
    <div 
      className={`
        card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-200
        ${onCardClick ? 'cursor-pointer hover:-translate-y-1' : ''}
        ${sizeConfig.container}
        ${className}
      `}
      onClick={() => onCardClick?.(species.species.id)}
    >
      {/* Species Image */}
      <figure className={`relative ${sizeConfig.image} overflow-hidden`}>
        {species.species.imageUrl ? (
          <Image
            src={species.species.imageUrl}
            alt={species.species.commonName}
            fill
            className="object-contain"
          />
        ) : (
          <div className="w-full h-full bg-base-300 flex items-center justify-center">
            <span className="text-base-content/30 text-2xl">🐟</span>
          </div>
        )}
        
        {/* Confidence Badge */}
        <div className="absolute top-2 right-2">
          <ConfidenceRing 
            score={species.confidenceScore}
            size={size === 'sm' ? 'sm' : 'md'}
            showLabel={false}
          />
        </div>
        
        {/* Favourite Heart */}
        {onToggleFavourite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavourite(species.species.id);
            }}
            className="absolute top-2 left-2 btn btn-circle btn-sm bg-base-100/80 hover:bg-base-100 border-none"
            aria-label={species.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Heart 
              className={`w-4 h-4 ${species.isFavourite ? 'fill-error text-error' : 'text-base-content/50'}`}
            />
          </button>
        )}
        
        {/* Top Reason Badge */}
        {topReason && (
          <div className="absolute bottom-2 left-2 badge badge-sm bg-base-100/90 border-none">
            <TrendingUp className="w-3 h-3 mr-1" />
            {reasonLabels[topReason] || topReason}
          </div>
        )}
      </figure>
      
      {/* Card Body */}
      <div className="card-body p-3">
        <h3 className={`${sizeConfig.title} font-bold line-clamp-1`}>
          {species.species.commonName}
        </h3>
        
        {species.species.scientificName && (
          <p className={`${sizeConfig.text} text-base-content/60 italic line-clamp-1`}>
            {species.species.scientificName}
          </p>
        )}

        {/* Best Fishing Time */}
        <div className="flex items-center gap-1 mt-2">
          <Clock size={12} className="text-info" />
          <span className={`${sizeConfig.text} text-info`}>
            {bestFishingTime}
          </span>
        </div>
        
        {/* Stats */}
        {showStats && species.userStats && (
          <div className={`${sizeConfig.text} space-y-1 text-base-content/70 mt-2`}>
            {species.userStats.totalCaught > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{species.userStats.totalCaught} caught</span>
              </div>
            )}
            
            {species.userStats.lastCaughtDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  Last: {new Date(species.userStats.lastCaughtDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
              </div>
            )}
            
            {species.userStats.favoriteLocation && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{species.userStats.favoriteLocation}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Current Conditions Summary (if available) */}
        {species.currentConditions && (
          <div className={`${sizeConfig.text} mt-2 p-2 bg-base-200 rounded text-base-content/70`}>
            <div className="grid grid-cols-2 gap-1">
              <span>Temp: {species.currentConditions.temperature}°C</span>
              <span>Wind: {species.currentConditions.windSpeed}mph</span>
              <span>Tide: {species.currentConditions.tidePhase}</span>
              <span>Wave: {species.currentConditions.waveHeight}m</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpeciesCard;
