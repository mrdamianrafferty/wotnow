/**
 * RecentCatchesWidget Component
 *
 * Displays a horizontal scrollable row of recent catches at the top of the log page.
 * Shows user photos or falls back to stock species images.
 * Clicking opens the full photo gallery.
 */

'use client';

import React, { useMemo } from 'react';
import { Camera, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { useMyCatchPhotos } from '@/hooks/useMyCatchPhotos';
import type { PhotoData } from '@/components/findr/TrophyPhotoCarousel';
import { getFishingEncouragement } from '@/lib/findr/encouragementMessages';

export function RecentCatchesWidget() {
  const { data, isLoading } = useMyCatchPhotos();
  const photos = data?.photos || [];
  const sessions = data?.sessions || [];

  // Calculate total fish caught
  const totalFishCaught = useMemo(() => {
    return sessions.reduce((sum, s) => sum + (s.quantity || 0), 0);
  }, [sessions]);

  // Calculate unique species count
  const uniqueSpeciesCount = useMemo(() => {
    const uniqueSpecies = new Set(sessions.map(s => s.species_common_name));
    return uniqueSpecies.size;
  }, [sessions]);

  // Only show widget if there are photos
  if (isLoading || photos.length === 0) {
    return null;
  }

  // Show max 5 most recent photos
  const recentPhotos = photos.slice(0, 5);

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">
            <TranslatedText text="Recent Catches" />
          </h3>
        </div>
        <Link
          href="/findr/my-catches"
          className="btn btn-ghost btn-xs gap-1 text-primary hover:bg-primary/10"
        >
          <TranslatedText text="View All" />
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stats Display */}
      <div className="flex gap-4 mb-3">
        <div className="flex-1">
          <div className="text-2xl font-bold text-secondary">
            {totalFishCaught}
          </div>
          <div className="text-xs opacity-70"><TranslatedText text="Fish Caught" /></div>
          <div className="text-xs opacity-60 mt-1 leading-tight">
            {getFishingEncouragement(totalFishCaught)}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-2xl font-bold text-primary">
            {uniqueSpeciesCount}
          </div>
          <div className="text-xs opacity-70"><TranslatedText text="Species" /></div>
        </div>
      </div>

      {/* Horizontal scrollable photo strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        {recentPhotos.map((photo: PhotoData) => {
          const isStockPhoto = photo.metadata?.photographer === 'Stock photo';

          return (
            <Link
              key={photo.id}
              href="/findr/my-catches"
              className="flex-shrink-0 group relative"
            >
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-base-200 border-2 border-transparent group-hover:border-primary transition-all duration-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnail || photo.url}
                  alt={photo.caption || 'Catch photo'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                />

                {/* Stock photo indicator */}
                {isStockPhoto && (
                  <div className="absolute top-1 right-1 badge badge-xs bg-black/50 text-white border-none">
                    Stock
                  </div>
                )}
              </div>

              {/* Species name tooltip on hover */}
              {photo.metadata?.speciesName && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                  <span className="text-xs font-medium text-primary bg-base-100 px-2 py-1 rounded shadow-md">
                    {photo.metadata.speciesName}
                  </span>
                </div>
              )}
            </Link>
          );
        })}

        {/* Add catch prompt if less than 5 */}
        {recentPhotos.length < 5 && (
          <div className="flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-1 text-primary/60 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-default">
            <Camera className="w-6 h-6" />
            <span className="text-[10px] font-medium">
              <TranslatedText text="Log more" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
