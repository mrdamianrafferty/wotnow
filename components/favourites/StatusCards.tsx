/**
 * StatusCard Components
 * 
 * Different card styles for each confidence band:
 * - ActiveSpeciesCard: 85%+ confidence (green, urgent)
 * - GoodSpeciesCard: 60-84% confidence (blue, encouraging)
 * - WaitingSpeciesCard: <60% confidence (amber, informative)
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Target, ThumbsUp, Clock, Heart, Bell, BellOff, 
  ChevronDown, ChevronUp
} from 'lucide-react';
import { ConfidenceRing } from './shared/ConfidenceRing';
import { MiniCalendar, generateMockForecast } from './shared/MiniCalendar';
import type { TrackedSpecies } from '../../types/favourites';

interface StatusCardBaseProps {
  species: TrackedSpecies;
  onToggleFavourite?: (speciesId: string) => void;
  onToggleNotifications?: (speciesId: string) => void;
  onCardClick?: (speciesId: string) => void;
  className?: string;
}

/**
 * Active Now Card (85%+ confidence)
 * Large, prominent, encourages immediate action
 */
export function ActiveSpeciesCard({
  species,
  onToggleFavourite,
  onToggleNotifications,
  onCardClick,
  className = ''
}: StatusCardBaseProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      className={`
        card bg-success/10 border-2 border-success shadow-lg
        hover:shadow-xl transition-all duration-200
        ${className}
      `}
    >
      <div className="card-body p-4">
        {/* Header Row */}
        <div className="flex items-start gap-4">
          {/* Species Image */}
          <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
            {species.species.imageUrl ? (
              <Image
                src={species.species.imageUrl}
                alt={species.species.commonName}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full bg-base-300 flex items-center justify-center">
                <span className="text-3xl">🐟</span>
              </div>
            )}
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-5 h-5 text-success flex-shrink-0" />
                  <span className="text-xs font-semibold text-success uppercase tracking-wide">
                    Active Now
                  </span>
                </div>
                <h3 
                  className="text-xl font-bold text-base-content cursor-pointer hover:text-success transition-colors"
                  onClick={() => onCardClick?.(species.species.id)}
                >
                  {species.species.commonName}
                </h3>
                {species.species.scientificName && (
                  <p className="text-sm text-base-content/60 italic">
                    {species.species.scientificName}
                  </p>
                )}
              </div>
              
              {/* Confidence Ring */}
              <ConfidenceRing score={species.confidenceScore} size="md" />
            </div>
            
            {/* Top Reasons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {species.reasonCodes.slice(0, 3).map((reason) => (
                <span key={reason} className="badge badge-success badge-sm">
                  {reason.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onToggleFavourite?.(species.species.id)}
              className="btn btn-circle btn-sm btn-ghost"
              aria-label="Toggle favourite"
            >
              <Heart 
                className={`w-4 h-4 ${species.isFavourite ? 'fill-error text-error' : 'text-base-content/50'}`}
              />
            </button>
            <button
              onClick={() => onToggleNotifications?.(species.species.id)}
              className="btn btn-circle btn-sm btn-ghost"
              aria-label="Toggle notifications"
            >
              {species.notificationsEnabled ? (
                <Bell className="w-4 h-4 text-primary" />
              ) : (
                <BellOff className="w-4 h-4 text-base-content/50" />
              )}
            </button>
          </div>
        </div>
        
        {/* Current Conditions */}
        {species.currentConditions && (
          <div className="mt-4 p-3 bg-success/5 rounded-lg border border-success/20">
            <h4 className="text-sm font-semibold text-success mb-2">Current Conditions</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-base-content/70">
              <div>
                <span className="font-medium">Temp:</span> {species.currentConditions.temperature}°C
              </div>
              <div>
                <span className="font-medium">Wind:</span> {species.currentConditions.windSpeed}mph
              </div>
              <div>
                <span className="font-medium">Tide:</span> {species.currentConditions.tidePhase}
              </div>
              <div>
                <span className="font-medium">Wave:</span> {species.currentConditions.waveHeight}m
              </div>
            </div>
          </div>
        )}
        
        {/* Expand/Collapse for 7-day forecast */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn btn-sm btn-ghost mt-2 w-full"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide Forecast
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show 7-Day Forecast
            </>
          )}
        </button>
        
        {isExpanded && (
          <div className="mt-4">
            <MiniCalendar forecasts={generateMockForecast(species.confidenceScore)} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Good Conditions Card (60-84% confidence)
 * Medium prominence, encouraging but not urgent
 */
export function GoodSpeciesCard({
  species,
  onToggleFavourite,
  onToggleNotifications,
  onCardClick,
  className = ''
}: StatusCardBaseProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div 
      className={`
        card bg-info/5 border border-info/30 shadow-md
        hover:shadow-lg transition-all duration-200
        ${className}
      `}
    >
      <div className="card-body p-4">
        <div className="flex items-start gap-3">
          {/* Species Image */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            {species.species.imageUrl ? (
              <Image
                src={species.species.imageUrl}
                alt={species.species.commonName}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full bg-base-300 flex items-center justify-center">
                <span className="text-2xl">🐟</span>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ThumbsUp className="w-4 h-4 text-info flex-shrink-0" />
                  <span className="text-xs font-semibold text-info uppercase tracking-wide">
                    Good Conditions
                  </span>
                </div>
                <h3 
                  className="text-lg font-bold text-base-content cursor-pointer hover:text-info transition-colors"
                  onClick={() => onCardClick?.(species.species.id)}
                >
                  {species.species.commonName}
                </h3>
              </div>
              
              <ConfidenceRing score={species.confidenceScore} size="sm" />
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {species.reasonCodes.slice(0, 2).map((reason) => (
                <span key={reason} className="badge badge-info badge-xs">
                  {reason.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={() => onToggleFavourite?.(species.species.id)}
              className="btn btn-circle btn-xs btn-ghost"
            >
              <Heart 
                className={`w-3 h-3 ${species.isFavourite ? 'fill-error text-error' : 'text-base-content/50'}`}
              />
            </button>
            <button
              onClick={() => onToggleNotifications?.(species.species.id)}
              className="btn btn-circle btn-xs btn-ghost"
            >
              {species.notificationsEnabled ? (
                <Bell className="w-3 h-3 text-primary" />
              ) : (
                <BellOff className="w-3 h-3 text-base-content/50" />
              )}
            </button>
          </div>
        </div>
        
        {/* Expand for forecast */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn btn-xs btn-ghost mt-2"
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {isExpanded ? 'Hide' : 'Show'} Forecast
        </button>
        
        {isExpanded && (
          <div className="mt-3">
            <MiniCalendar forecasts={generateMockForecast(species.confidenceScore)} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Waiting Card (<60% confidence)
 * Compact, informative, no urgency
 */
export function WaitingSpeciesCard({
  species,
  onToggleFavourite,
  onCardClick,
  className = ''
}: Omit<StatusCardBaseProps, 'onToggleNotifications'>) {
  return (
    <div 
      className={`
        card bg-base-100 border border-base-300 shadow-sm
        hover:shadow-md transition-all duration-200
        ${className}
      `}
    >
      <div className="card-body p-3">
        <div className="flex items-center gap-3">
          {/* Small Image */}
          <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
            {species.species.imageUrl ? (
              <Image
                src={species.species.imageUrl}
                alt={species.species.commonName}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full bg-base-300 flex items-center justify-center opacity-70">
                <span className="text-xl">🐟</span>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 text-warning flex-shrink-0" />
              <span className="text-[10px] font-semibold text-warning uppercase tracking-wide">
                Waiting
              </span>
            </div>
            <h4 
              className="text-sm font-bold text-base-content/80 cursor-pointer hover:text-warning transition-colors"
              onClick={() => onCardClick?.(species.species.id)}
            >
              {species.species.commonName}
            </h4>
          </div>
          
          {/* Confidence */}
          <ConfidenceRing score={species.confidenceScore} size="sm" showLabel={false} />
          
          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={() => onToggleFavourite?.(species.species.id)}
              className="btn btn-circle btn-xs btn-ghost"
            >
              <Heart 
                className={`w-3 h-3 ${species.isFavourite ? 'fill-error text-error' : 'text-base-content/50'}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
