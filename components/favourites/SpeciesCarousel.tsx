/**
 * SpeciesCarousel Component
 * 
 * Horizontal scrolling carousel of species cards
 * Touch-friendly with overflow scrolling
 */

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SpeciesCard } from './SpeciesCard';
import type { TrackedSpecies } from '../../types/favourites';

interface SpeciesCarouselProps {
  species: TrackedSpecies[];
  title?: string;
  onToggleFavourite?: (speciesId: string) => void;
  onCardClick?: (speciesId: string) => void;
  showStats?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function SpeciesCarousel({
  species,
  title,
  onToggleFavourite,
  onCardClick,
  showStats = true,
  emptyMessage = 'No species to display',
  className = ''
}: SpeciesCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const scrollAmount = 200; // pixels
    const currentScroll = scrollContainerRef.current.scrollLeft;
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
    
    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  };
  
  if (species.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-base-content/50">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-base-content">
          {title}
          <span className="ml-2 text-sm font-normal text-base-content/60">
            ({species.length})
          </span>
        </h3>
      )}
      
      {/* Scroll buttons - hidden on mobile, visible on desktop */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-base-300"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-base-300"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      
      {/* Scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="
          flex gap-4 overflow-x-auto pb-4
          scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent
          md:px-8
          snap-x snap-mandatory
        "
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--fallback-bc,oklch(var(--bc)/0.2)) transparent'
        }}
      >
        {species.map((sp) => (
          <div key={sp.species.id} className="snap-start flex-shrink-0">
            <SpeciesCard
              species={sp}
              onToggleFavourite={onToggleFavourite}
              onCardClick={onCardClick}
              showStats={showStats}
              size="md"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpeciesCarousel;
