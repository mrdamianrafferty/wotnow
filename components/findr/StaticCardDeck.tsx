/**
 * Static Card Deck Component for Web
 *
 * A CSS-only alternative to the animated Framer Motion card deck.
 * Used on web browsers for better performance (reduced CLS, TBT, bundle size).
 * Native apps continue to use the full animated experience.
 *
 * Key differences from animated version:
 * - No drag-to-swipe gestures (buttons only)
 * - CSS transitions instead of Framer Motion spring animations
 * - No AnimatePresence for enter/exit
 * - Significantly smaller bundle impact
 *
 * Phase 1 simplified cards:
 * - Image, name, confidence, guild badge
 * - Verdict strip with timing advice
 * - Summary and bio (clamped to 2 lines each)
 * - "Get to know me" link to modal
 * - All detailed sections moved to modal only
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Heart,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TranslatedFishName, TranslatedFishBio, TranslatedText } from '../translation/TranslatedFishCard';
import { GuildBadge } from './GuildBadge';
import { SpeciesVerdictStrip } from './SpeciesVerdictStrip';
import { GradientFish } from '../GradientFish';
import type { TideExtreme } from '../../lib/findr/conditionHelpers';
import type { CardData } from '../../lib/findr/mapPrediction';

function confidenceBadgeClasses(confidence: number | null, size: 'lg' | 'sm' = 'lg'): string {
  const base = size === 'lg' ? 'badge badge-lg py-3 px-4' : 'badge badge-sm px-2';
  if (confidence === null) {
    return `${base} badge-outline border-base-300 text-base-content/70`;
  }
  if (confidence >= 80) {
    return `${base} badge-success text-success-content`;
  }
  if (confidence >= 60) {
    return `${base} badge-warning text-warning-content`;
  }
  return `${base} badge-info text-info-content`;
}

interface StaticCardContentProps {
  card: CardData;
  isFavorite: boolean;
  tideExtremes?: TideExtreme[] | null;
  onShowSpeciesInfo: (card: CardData) => void;
  onToggleFavorite: (card: CardData) => void;
}

/**
 * Simplified card content for Phase 1.
 * Shows: image, name, confidence, guild, verdict strip, summary (clamped), bio (clamped), "Get to know me" link.
 * All detailed sections (rationale, bait tips, environmental data, score breakdowns) are in the modal.
 */
const StaticCardContent: React.FC<StaticCardContentProps> = ({
  card,
  isFavorite,
  tideExtremes,
  onShowSpeciesInfo,
  onToggleFavorite,
}) => {
  return (
    <div className="card h-full bg-base-100 shadow-xl">
      <div className="card-body !p-2.5 sm:!p-4 flex h-full flex-col gap-2 justify-start">
        {/* Image with favorite heart */}
        {card.image ? (
          <div
            className="relative w-full max-h-40 sm:max-h-56 overflow-hidden rounded-xl bg-base-200 aspect-[4/1] sm:aspect-[5/1.2] cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => onShowSpeciesInfo(card)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onShowSpeciesInfo(card);
              }
            }}
            aria-label={`View details for ${card.commonName}`}
          >
            <Image
              src={card.image.src}
              alt={card.image.alt}
              fill
              sizes="(min-width: 1024px) 500px, 95vw"
              className="object-contain"
              priority
              placeholder={card.image.blurDataURL ? 'blur' : undefined}
              blurDataURL={card.image.blurDataURL}
            />
            <button
              type="button"
              className="absolute top-2 right-2 p-3 rounded-full bg-transparent hover:bg-white/20 transition-all duration-200 hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(card);
              }}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              style={{ zIndex: 2 }}
            >
              {isFavorite ? (
                <Heart size={20} className="fill-red-500 text-red-500" />
              ) : (
                <Heart size={20} className="text-gray-700 stroke-2" />
              )}
            </button>
          </div>
        ) : (
          <div
            className="flex aspect-[4/1] sm:aspect-[5/1.2] w-full items-center justify-center rounded-xl bg-gradient-to-br from-info/10 to-primary/10 relative cursor-pointer"
            onClick={() => onShowSpeciesInfo(card)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onShowSpeciesInfo(card);
              }
            }}
          >
            <GradientFish size={60} />
            <button
              type="button"
              className="absolute top-2 right-2 p-3 rounded-full bg-transparent hover:bg-white/20 transition-all duration-200 hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(card);
              }}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? (
                <Heart size={20} className="fill-red-500 text-red-500" />
              ) : (
                <Heart size={20} className="text-gray-700 stroke-2" />
              )}
            </button>
          </div>
        )}

        {/* Name + confidence + guild */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="card-title text-xl sm:text-2xl leading-tight">
              <TranslatedFishName name={card.commonName} />
            </h2>
            {card.scientificName && (
              <span className="text-xs italic text-base-content/50">({card.scientificName})</span>
            )}
            {card.confidence !== null && (
              <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
                {card.confidence}%
              </span>
            )}
          </div>
          {card.weight_profile && <GuildBadge guild={card.weight_profile} size="sm" />}
        </div>

        {/* Verdict strip */}
        <SpeciesVerdictStrip
          confidence={card.confidence}
          bestTimes={card.bestTimes}
          tideTips={card.tideTips}
          tideScore={card.tide_score}
          lightScore={card.light_score}
          lunarScore={card.lunar_score}
          tideExtremes={tideExtremes}
        />

        {/* Summary - clamped to 2 lines */}
        {card.summary && (
          <p className="text-base-content/80 text-sm leading-snug line-clamp-2">{card.summary}</p>
        )}

        {/* Bio - clamped to 2 lines */}
        {card.playfulBio && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5">
            <p className="text-xs font-medium text-primary flex items-center gap-1 mb-0.5">
              <Heart size={10} /> <TranslatedText text="Findr bio" />
            </p>
            <div className="text-xs leading-snug text-base-content/70 line-clamp-2">
              <TranslatedFishBio bio={card.playfulBio} />
            </div>
          </div>
        )}

        {/* Get to know me link */}
        <button
          type="button"
          className="link link-primary text-sm self-start flex items-center gap-1 mt-auto"
          onClick={() => onShowSpeciesInfo(card)}
        >
          <TranslatedText text="Get to know me" /> →
        </button>
      </div>
    </div>
  );
};

interface StaticCardDeckProps {
  cards: CardData[];
  favoritesSet: Set<string>;
  getFavouriteKey: (card: CardData) => string;
  tideExtremes?: TideExtreme[] | null;
  onToggleFavorite: (card: CardData) => void;
  onShowSpeciesInfo: (card: CardData) => void;
}

/**
 * Static Card Deck - CSS-only version for web browsers
 *
 * Shows one card at a time with simple previous/next navigation.
 * No drag gestures, no spring animations - just smooth CSS transitions.
 */
export const StaticCardDeck: React.FC<StaticCardDeckProps> = ({
  cards,
  favoritesSet,
  getFavouriteKey,
  tideExtremes,
  onToggleFavorite,
  onShowSpeciesInfo,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentCard = cards[currentIndex] ?? null;
  const hasNext = currentIndex < cards.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Loop back to start
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      // Loop to end
      setCurrentIndex(cards.length - 1);
    }
  };

  const handleLike = () => {
    if (currentCard) {
      onToggleFavorite(currentCard);
    }
  };

  if (!currentCard) {
    return null;
  }

  const isFavorite = favoritesSet.has(getFavouriteKey(currentCard));

  return (
    <div className="space-y-1 sm:space-y-2">
      {/* Card counter - fixed height to match skeleton */}
      <div className="flex items-center justify-between px-2 h-[24px]">
        <span className="text-sm text-base-content/60">
          {currentIndex + 1} / {cards.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-circle btn-ghost btn-sm"
            onClick={handlePrev}
            aria-label="Previous species"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="btn btn-circle btn-ghost btn-sm"
            onClick={handleNext}
            aria-label="Next species"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Card display - responsive height container to prevent CLS */}
      <div
        className="relative findr-deck-height w-full overflow-hidden"
        style={{ contain: 'layout' }}
      >
        <div className="absolute inset-0 flex h-full w-full items-stretch justify-center p-0 sm:p-2">
          <StaticCardContent
            card={currentCard}
            isFavorite={isFavorite}
            tideExtremes={tideExtremes}
            onShowSpeciesInfo={onShowSpeciesInfo}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      </div>

      {/* Action buttons - compact on mobile */}
      <div
        className="flex items-center justify-center gap-2 sm:gap-3 pt-1 sm:pt-2"
        role="group"
        aria-label="Card actions"
      >
        <button
          type="button"
          className="btn btn-outline gap-1 sm:gap-2 h-10 sm:h-12 px-3 sm:px-5 text-sm sm:text-base transition-transform hover:scale-105"
          onClick={handleNext}
          aria-label="Skip this fish and see the next prediction"
        >
          <X size={18} aria-hidden="true" />
          <TranslatedText text="Later" />
        </button>
        <button
          type="button"
          className={`btn gap-1 sm:gap-2 h-10 sm:h-12 px-3 sm:px-5 text-sm sm:text-base transition-transform hover:scale-105 ${
            isFavorite ? 'btn-error' : 'btn-primary'
          }`}
          onClick={handleLike}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
          <TranslatedText text={isFavorite ? 'Unfave' : 'Fave'} />
        </button>
      </div>
    </div>
  );
};

export default StaticCardDeck;
