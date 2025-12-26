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
 */

'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Anchor,
  Fish as FishIcon,
  Heart,
  ListChecks,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TranslatedFishName, TranslatedFishBio, TranslatedText } from '../translation/TranslatedFishCard';
import { GuildBadge } from './GuildBadge';
import { EnvironmentalInfo } from './EnvironmentalInfo';
import { SpeciesVerdictStrip } from './SpeciesVerdictStrip';
import { GradientFish } from '../GradientFish';
import type { TideExtreme } from '../../lib/findr/conditionHelpers';
import { getWeatherMessage } from '../../lib/utils/weatherMessages';
import type { CardData } from '../../lib/findr/mapPrediction';
import dynamic from 'next/dynamic';

// Lazy load heavy components
const ConfidenceBreakdownCard = dynamic(
  () => import('./ConfidenceBreakdownCard').then(mod => ({ default: mod.ConfidenceBreakdownCard })),
  { ssr: false }
);

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

interface BiteScoreBreakdown {
  biteScore: number;
  confidence: number;
  tempScore?: number;
  tideScore?: number;
  lightScore?: number;
  lunarScore?: number;
  weatherScore?: number;
  bioBandScore?: number;
  habitatBonus?: number;
}

function buildScoreBreakdown(card: CardData): BiteScoreBreakdown | undefined {
  if (card.biteScore == null || card.confidence == null) {
    return undefined;
  }
  return {
    biteScore: card.biteScore,
    confidence: card.confidence,
    tempScore: card.temp_score ?? undefined,
    tideScore: card.tide_score ?? undefined,
    lightScore: card.light_score ?? undefined,
    lunarScore: card.lunar_score ?? undefined,
    weatherScore: card.weather_score ?? undefined,
    bioBandScore: card.bio_band_score ?? undefined,
    habitatBonus: card.habitat_bonus ?? undefined,
  };
}

const WeatherGuildMessage: React.FC<{
  speciesCode: string;
  scientificName: string;
  weatherScore: number;
  windSpeedMS: number;
  pressureHPA: number;
}> = ({ speciesCode, scientificName, weatherScore, windSpeedMS, pressureHPA }) => {
  const weather = getWeatherMessage(speciesCode, scientificName, {
    windSpeedMS,
    pressureHPA,
    weatherScore,
  });
  return <span className="leading-relaxed">{weather.message}</span>;
};

interface StaticCardContentProps {
  card: CardData;
  isFavorite: boolean;
  tideExtremes?: TideExtreme[] | null;
  onShowSpeciesInfo: (card: CardData) => void;
  onToggleFavorite: (card: CardData) => void;
}

const StaticCardContent: React.FC<StaticCardContentProps> = ({
  card,
  isFavorite,
  tideExtremes,
  onShowSpeciesInfo,
  onToggleFavorite,
}) => {
  const [expanded, setExpanded] = useState(false);

  const sections = useMemo(
    () => [
      { title: 'Why it works', items: card.rationale, icon: <Sparkles size={16} /> },
      { title: 'Bait & presentation', items: card.baitSuggestions, icon: <FishIcon size={16} /> },
      { title: 'Tide & timing', items: card.tideTips, icon: <Anchor size={16} /> },
      { title: 'Status & notes', items: card.statusNotes, icon: <ListChecks size={16} /> },
    ],
    [card.baitSuggestions, card.rationale, card.statusNotes, card.tideTips]
  );

  const hasHiddenSections = sections.some((section) => section.items.length > 3);
  const displaySections = sections.map((section) => ({
    ...section,
    displayItems: expanded ? section.items : section.items.slice(0, 3),
  }));

  return (
    <div className="card h-full bg-base-100 shadow-xl">
      <div className="card-body !p-3 sm:!p-4 flex h-full flex-col gap-3 sm:gap-4 justify-start">
        <div className="space-y-3 sm:space-y-4">
          {card.image ? (
            <div
              className="relative w-full max-h-48 sm:max-h-64 overflow-hidden rounded-2xl bg-base-200 aspect-[4/1] sm:aspect-[5/1.2] p-0 cursor-pointer hover:opacity-95 transition-opacity"
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
                style={{ padding: 0 }}
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
            <>
              <div className="flex aspect-[3/2] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-info/10 to-primary/10 sm:aspect-[4/3] relative">
                <GradientFish size={80} />
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
            </>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="card-title text-2xl sm:text-3xl leading-tight">
                  <TranslatedFishName name={card.commonName} />
                  {card.scientificName && (
                    <span className="text-base italic font-normal text-base-content/70 ml-2">
                      ({card.scientificName})
                    </span>
                  )}
                </h2>
                {card.confidence !== null && (
                  <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
                    {card.confidence}% <TranslatedText text="biting" />
                  </span>
                )}
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                {card.weight_profile && <GuildBadge guild={card.weight_profile} size="sm" />}
              </div>
            </div>
          </div>

          {/* Species-specific verdict strip with timing advice */}
          <SpeciesVerdictStrip
            confidence={card.confidence}
            bestTimes={card.bestTimes}
            tideTips={card.tideTips}
            tideScore={card.tide_score}
            lightScore={card.light_score}
            lunarScore={card.lunar_score}
            tideExtremes={tideExtremes}
          />

          {card.summary && (
            <p className="text-base-content/80 text-sm sm:text-base leading-relaxed">{card.summary}</p>
          )}

          {card.weather_score != null &&
            card.current_wind_speed_ms != null &&
            card.current_pressure_hpa != null && (
              <div className="rounded-xl border-l-4 border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                <WeatherGuildMessage
                  speciesCode={card.speciesCode || ''}
                  scientificName={card.scientificName || ''}
                  weatherScore={card.weather_score}
                  windSpeedMS={card.current_wind_speed_ms}
                  pressureHPA={card.current_pressure_hpa}
                />
              </div>
            )}
        </div>

        {/* Expandable content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {expanded && card.rationale.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-base">
                <Sparkles size={16} />
                <TranslatedText text="Why it works" />
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-base-content/80">
                {card.rationale.map((item, idx) => (
                  <li key={`rationale-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {card.environmental_factors && expanded && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2 flex items-center gap-2">
                <span role="img" aria-label="Conditions">
                  🌊
                </span>
                <span>
                  <TranslatedText text="Current Conditions" />
                </span>
              </p>
              <EnvironmentalInfo factors={card.environmental_factors} />
            </div>
          )}

          {expanded &&
            (() => {
              const scoreBreakdown = buildScoreBreakdown(card);
              if (!scoreBreakdown) return null;
              return (
                <div className="rounded-xl border border-success/20 bg-success/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-success mb-2 flex items-center gap-2">
                    <Sparkles size={14} />
                    <span>
                      <TranslatedText text="Bite Score Breakdown" />
                    </span>
                  </p>
                  <ConfidenceBreakdownCard
                    confidence={scoreBreakdown.confidence}
                    biteScore={scoreBreakdown.biteScore}
                    biteScoreFactors={{
                      tempScore: scoreBreakdown.tempScore,
                      tideScore: scoreBreakdown.tideScore,
                      lightScore: scoreBreakdown.lightScore,
                      lunarScore: scoreBreakdown.lunarScore,
                      weatherScore: scoreBreakdown.weatherScore,
                      bioBandScore: scoreBreakdown.bioBandScore,
                      habitatBonus: scoreBreakdown.habitatBonus,
                    }}
                    weatherConditions={
                      card.current_wind_speed_ms !== undefined || card.current_pressure_hpa !== undefined
                        ? {
                            windSpeedMS: card.current_wind_speed_ms ?? undefined,
                            pressureHPA: card.current_pressure_hpa ?? undefined,
                          }
                        : undefined
                    }
                    environmentalFactors={card.environmental_factors}
                    dataFreshness={card.data_freshness}
                    defaultExpanded={false}
                    compact={true}
                  />
                </div>
              );
            })()}
        </div>

        {card.playfulBio && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
              <Heart size={14} /> <TranslatedText text="Findr bio" />
            </p>
            <TranslatedFishBio bio={card.playfulBio} className="text-sm leading-relaxed text-base-content/80" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {displaySections.map((section) => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.title} className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2 text-base">
                  {section.icon}
                  <TranslatedText text={section.title} />
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-base-content/80">
                  {section.displayItems.map((item, idx) => (
                    <li key={`${section.title}-${idx}`}>{item}</li>
                  ))}
                </ul>
                {!expanded && section.items.length > section.displayItems.length && (
                  <p className="text-xs text-base-content/60">
                    + {section.items.length - section.displayItems.length}{' '}
                    <TranslatedText
                      text={section.items.length - section.displayItems.length === 1 ? 'more insight' : 'more insights'}
                    />
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!expanded && hasHiddenSections && (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-primary"
            onClick={() => setExpanded(true)}
          >
            <TranslatedText text="Show more details" />
          </button>
        )}
        {expanded && (
          <button
            type="button"
            className="btn btn-ghost btn-sm text-base-content/60"
            onClick={() => setExpanded(false)}
          >
            <TranslatedText text="Show less" />
          </button>
        )}
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

      {/* Card display - fixed height container to prevent CLS */}
      <div
        className="relative h-[520px] sm:h-[600px] w-full overflow-hidden"
        style={{ contain: 'layout size' }}
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
