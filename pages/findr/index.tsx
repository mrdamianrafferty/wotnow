'use client';

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import SEO from '../../components/SEO';
import { useRouter } from 'next/router';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Anchor,
  Fish as FishIcon,
  Heart,
  ListChecks,
  Sparkles,
  X,
  Info,
} from 'lucide-react';
import { useFishingPredictions } from '../../hooks/useFishingPredictions';
import { useFavourites } from '../../hooks/useFavourites';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { TranslatedFishName, TranslatedFishBio, TranslatedText } from '../../components/translation/TranslatedFishCard';
import { NetworkStatusIndicator } from '../../components/findr/NetworkStatusIndicator';

// Dynamically import non-critical components
const FishingAreaInfo = dynamic(
  () => import('../../components/findr/FishingAreaInfo').then(mod => ({ default: mod.FishingAreaInfo })),
  { ssr: false }
);
const DataFreshnessIndicator = dynamic(
  () => import('../../components/findr/DataFreshnessIndicator').then(mod => ({ default: mod.DataFreshnessIndicator })),
  { ssr: false }
);
const ConfidenceBreakdownCard = dynamic(
  () => import('../../components/findr/ConfidenceBreakdownCard').then(mod => ({ default: mod.ConfidenceBreakdownCard })),
  { ssr: false }
);

// Code-split modals - only loaded when opened (saves ~30KB from initial bundle)
const FindrModal = dynamic(
  () => import('../../components/findr/Modal').then(mod => ({ default: mod.FindrModal })),
  { ssr: false, loading: () => null }
);

const FishSpeciesModal = dynamic(
  () => import('../../components/findr/FishSpeciesModal').then(mod => ({ default: mod.FishSpeciesModal })),
  { ssr: false, loading: () => null }
);
import { SkeletonCard } from '../../components/findr/SkeletonCard';
import {
  FALLBACK_RECTANGLE_OPTIONS,
  useFindrRectangleOptions,
  type RectangleOption,
} from '../../hooks/useFindrRectangleOptions';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';
import { useMigrateFindrSettings } from '../../hooks/useMigrateFindrSettings';
import { getTodayIso } from '../../lib/date/today';
import { mapPrediction, type CardData } from '../../lib/findr/mapPrediction';
import '../../lib/buildInfo'; // Log build metadata on mount
import { CatchEntry as _CatchEntry } from '../../types/aiRecommendations';
import { EnhancedFishDeck as _EnhancedFishDeck } from '@/components/EnhancedFishDeck';
import { GuildBadge } from '../../components/findr/GuildBadge';
import { EnvironmentalInfo } from '../../components/findr/EnvironmentalInfo';
import { getWeatherMessage } from '../../lib/utils/weatherMessages';
import { GradientFish } from '../../components/GradientFish';
const FindrFooter = dynamic(() => import('../../components/FindrFooter'), { ssr: false });

const WeatherGuildMessage: React.FC<{ speciesCode: string; scientificName: string; weatherScore: number; windSpeedMS: number; pressureHPA: number; isLoading?: boolean }> = ({ speciesCode, scientificName, weatherScore, windSpeedMS, pressureHPA, isLoading }) => {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2 leading-relaxed text-base-content/60">
        <span className="loading loading-spinner loading-xs" aria-hidden />
        <TranslatedText text="Checking conditions..." />
      </span>
    );
  }
  
  const weather = getWeatherMessage(speciesCode, scientificName, { 
    windSpeedMS, 
    pressureHPA, 
    weatherScore 
  });
  return <span className="leading-relaxed">{weather.message}</span>;
};

const TODAY_ISO = getTodayIso();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeFavouriteKey(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (UUID_PATTERN.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed.toUpperCase();
}

function getFavouriteKeyFromCard(card: CardData): string {
  if (card.speciesCode && card.speciesCode.trim().length > 0) {
    return normalizeFavouriteKey(card.speciesCode);
  }
  if (card.speciesId && card.speciesId.trim().length > 0) {
    return normalizeFavouriteKey(card.speciesId);
  }
  return normalizeFavouriteKey(card.id);
}

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
  // Only build if we have bite score data
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

interface PredictionCardContentProps {
  card: CardData;
  rectangleCode: string | null;
  regionName?: string;
  isFavorite: boolean;
  interactive: boolean;
  isFirstCard?: boolean;
  onShowSpeciesInfo?: (card: CardData) => void;
  onToggleFavorite?: (card: CardData) => void;
}

const PredictionCardContent: React.FC<PredictionCardContentProps> = ({
  card,
  rectangleCode: _rectangleCode,
  regionName: _regionName,
  isFavorite: _isFavorite,
  interactive,
  isFirstCard = false,
  onShowSpeciesInfo,
  onToggleFavorite,
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!interactive && expanded) {
      setExpanded(false);
    }
  }, [interactive, expanded]);

  const sections = useMemo(
    () => [
      { title: 'Why it works', translationKey: 'why-it-works', items: card.rationale, icon: <Sparkles size={16} /> },
      { title: 'Bait & presentation', translationKey: 'bait-presentation', items: card.baitSuggestions, icon: <FishIcon size={16} /> },
      { title: 'Tide & timing', translationKey: 'tide-timing', items: card.tideTips, icon: <Anchor size={16} /> },
      { title: 'Status & notes', translationKey: 'status-notes', items: card.statusNotes, icon: <ListChecks size={16} /> },
    ],
    [card.baitSuggestions, card.rationale, card.statusNotes, card.tideTips]
  );



  const hasHiddenSections = sections.some((section) => section.items.length > 3);
  const displaySections = sections.map((section) => ({
    ...section,
    displayItems: expanded || !interactive ? section.items : section.items.slice(0, 3),
  }));

  const detailStackClass = interactive
    ? 'flex-1 overflow-y-auto pr-1 space-y-4'
    : 'space-y-4';

  return (
    <div className="card h-full bg-base-100 shadow-xl">
      <div className="card-body !p-3 sm:!p-4 flex h-full flex-col gap-3 sm:gap-4 justify-start">
        <div className="space-y-3 sm:space-y-4">
          {card.image ? (
            <div
              className="relative w-full max-h-80 sm:max-h-96 overflow-hidden rounded-2xl bg-base-200 aspect-[3/1.2] sm:aspect-[4/1.5] p-0 cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => onShowSpeciesInfo?.(card)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onShowSpeciesInfo?.(card);
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
                priority={isFirstCard}
                placeholder={card.image.blurDataURL ? "blur" : undefined}
                blurDataURL={card.image.blurDataURL}
                style={{ padding: 0 }}
              />
              {/* Heart indicator for favorites */}
              <button
                type="button"
                className="absolute top-2 right-2 p-3 rounded-full bg-transparent hover:bg-white/20 transition-all duration-200 hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(card);
                }}
                aria-label={_isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                style={{ zIndex: 2 }}
              >
                {_isFavorite ? (
                  <Heart size={20} className="fill-red-500 text-red-500" />
                ) : (
                  <Heart size={20} className="text-gray-700 stroke-2" />
                )}
              </button>
              {/* Info button absolutely positioned bottom right over image */}
              {onShowSpeciesInfo && (
                <button
                  type="button"
                  className="absolute bottom-2 right-2 btn btn-circle btn-ghost btn-lg"
                  onClick={() => onShowSpeciesInfo(card)}
                  aria-label="Show info"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', zIndex: 3 }}
                >
                  <Info size={32} />
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex aspect-[3/2] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-info/10 to-primary/10 sm:aspect-[4/3] relative">
                <GradientFish size={80} />
                {/* Heart indicator for favorites */}
                <button
                  type="button"
                  className="absolute top-2 right-2 p-3 rounded-full bg-transparent hover:bg-white/20 transition-all duration-200 hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(card);
                  }}
                  aria-label={_isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {_isFavorite ? (
                    <Heart size={20} className="fill-red-500 text-red-500" />
                  ) : (
                    <Heart size={20} className="text-gray-700 stroke-2" />
                  )}
                </button>
              </div>
              {onShowSpeciesInfo && (
                <div className="flex justify-end mt-2" style={{ position: 'relative', zIndex: 2 }}>
                  <button
                    type="button"
                    className="btn btn-circle btn-ghost btn-sm"
                    onClick={() => onShowSpeciesInfo(card)}
                    aria-label="Show info"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', zIndex: 2, position: 'relative' }}
                  >
                    <Info size={24} />
                  </button>
                </div>
              )}
            </>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="card-title text-2xl sm:text-3xl leading-tight">
                  <TranslatedFishName name={card.commonName} />
                  {card.scientificName && (
                    <span className="text-base italic font-normal text-base-content/70 ml-2">({card.scientificName})</span>
                  )}
                </h2>
                {card.confidence !== null && (
                  <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
                    {card.confidence}% <TranslatedText text="biting" />
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
              </div>
              <div style={{ position: 'relative', width: '100%' }}>
                {card.weight_profile && (
                  <GuildBadge guild={card.weight_profile} size="sm" />
                )}
              </div>
            </div>
          </div>
          {card.summary && (
            <p className="text-base-content/80 text-sm sm:text-base leading-relaxed">{card.summary}</p>
          )}
          
          {/* Guild weather message */}
          {(card.weather_score != null && card.current_wind_speed_ms != null && card.current_pressure_hpa != null) && (
            <div className="rounded-xl border-l-4 border-primary/40 bg-primary/10 px-3 py-2 text-sm">
              <WeatherGuildMessage 
                speciesCode={card.speciesCode || ''}
                scientificName={card.scientificName || ''}
                weatherScore={card.weather_score}
                windSpeedMS={card.current_wind_speed_ms}
                pressureHPA={card.current_pressure_hpa}
                isLoading={false}
              />
            </div>
          )}
        </div>

        <div className={detailStackClass}>
          {/* Why it works - shown first when expanded */}
          {(expanded || !interactive) && card.rationale.length > 0 && (
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
          
          {/* Environmental Conditions - shown in expanded view */}
          {card.environmental_factors && (expanded || !interactive) && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2 flex items-center gap-2">
                <span role="img" aria-label="Conditions">🌊</span>
                <span><TranslatedText text="Current Conditions" /></span>
              </p>
              <EnvironmentalInfo factors={card.environmental_factors} />
            </div>
          )}

          {/* Bite Score Breakdown - shown in expanded view */}
          {(expanded || !interactive) && (() => {
            const scoreBreakdown = buildScoreBreakdown(card);
            if (!scoreBreakdown) return null;

            return (
              <div className="rounded-xl border border-success/20 bg-success/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-success mb-2 flex items-center gap-2">
                  <Sparkles size={14} />
                  <span><TranslatedText text="Bite Score Breakdown" /></span>
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

        <div className={detailStackClass}>
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
                {interactive &&
                  !expanded &&
                  section.items.length > section.displayItems.length && (
                    <p className="text-xs text-base-content/60">
                      + {section.items.length - section.displayItems.length} <TranslatedText text={section.items.length - section.displayItems.length === 1 ? 'more insight' : 'more insights'} />
                    </p>
                  )}
              </div>
            );
          })}
        </div>

        {interactive && !expanded && hasHiddenSections && (
          <p className="text-xs text-base-content/60 pt-1"><TranslatedText text="Tap the info button to reveal full guidance." /></p>
        )}
      </div>
    </div>
  );
};

type SwipeDirection = 'left' | 'right';

interface SwipeableCardProps {
  card: CardData;
  index: number;
  isTop: boolean;
  total: number;
  rectangleCode: string | null;
  regionName?: string;
  onSwipedLeft: () => void;
  onSwipedRight: (card: CardData) => void;
  isFavorite: boolean;
  onShowSpeciesInfo?: (card: CardData) => void;
  onToggleFavorite?: (card: CardData) => void;
  swipingRef: React.MutableRefObject<boolean>; // Shared swiping state
}

interface SwipeCardHandle {
  swipeLeft: () => void;
  swipeRight: () => void;
}

const SwipeableCard = React.forwardRef<SwipeCardHandle, SwipeableCardProps>(
  (
    {
      card,
      index,
      isTop,
      total,
      rectangleCode,
      regionName,
      onSwipedLeft,
      onSwipedRight,
      isFavorite,
      onShowSpeciesInfo,
      onToggleFavorite,
      swipingRef, // Use shared swiping ref from parent
    },
    ref
  ) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-240, 0, 240], [-18, 0, 18]);
    const catchOpacity = useTransform(x, [80, 140], [0, 1]);
    const nopeOpacity = useTransform(x, [-140, -80], [1, 0]);
    const overlayIntensity = useTransform(x, [-240, 0, 240], [0.35, 0, 0.35]);

    // Cleanup: reset swiping flag when component unmounts
    useEffect(() => {
      return () => {
        swipingRef.current = false;
      };
    }, [swipingRef]);

    const swipe = useCallback(
      async (direction: SwipeDirection) => {
        if (!isTop || swipingRef.current) return;
        swipingRef.current = true;
        try {
          const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 768;
          const targetX = direction === 'right' ? viewportWidth * 0.75 : -viewportWidth * 0.75;
          const controls = animate(x, targetX, { duration: 0.28, ease: 'easeInOut' });
          await controls.finished;
          // Trigger handlers which update card queue
          if (direction === 'right') {
            onSwipedRight(card);
          } else {
            onSwipedLeft();
          }
          // Small delay to allow React to process the state update
          // This ensures the next card is properly positioned before allowing interaction
          await new Promise(resolve => setTimeout(resolve, 50));
        } finally {
          // Always reset the flag, even if there's an error or component unmounts
          swipingRef.current = false;
        }
      },
      [card, isTop, onSwipedLeft, onSwipedRight, swipingRef, x]
    );

    useImperativeHandle(
      ref,
      () => ({
        swipeLeft: () => {
          void swipe('left');
        },
        swipeRight: () => {
          void swipe('right');
        },
      }),
      [swipe]
    );

    const handleDragEnd = useCallback(
      (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
        const { offset, velocity } = info;
        const swipeVelocity = velocity.x;
        if (offset.x > 120 || swipeVelocity > 800) {
          void swipe('right');
          return;
        }
        if (offset.x < -120 || swipeVelocity < -800) {
          void swipe('left');
          return;
        }
        animate(x, 0, { type: 'spring', stiffness: 320, damping: 32 });
      },
      [swipe, x]
    );

    return (
      <motion.div
        layout
        className="absolute inset-0 flex h-full w-full select-none items-stretch justify-center p-0 sm:p-2"
        style={{
          zIndex: total - index,
          pointerEvents: isTop ? 'auto' : 'none',
          x: isTop ? x : undefined,
          rotate: isTop ? rotate : undefined,
        }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{
          opacity: isTop ? 1 : Math.max(0.75, 1 - index * 0.1),
          y: isTop ? 0 : index * 14,
          scale: isTop ? 1 : 1 - index * 0.04,
        }}
        exit={{ opacity: 0, y: -80, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        drag={isTop ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={isTop ? handleDragEnd : undefined}
      >
        {isTop && (
          <>
            <motion.div
              className="pointer-events-none absolute left-6 top-6 rounded-xl border-2 border-success bg-success/20 px-4 py-2 text-2xl font-black uppercase tracking-[0.4rem] text-success"
              style={{ opacity: catchOpacity, zIndex: 9999 }}
            >
              Like
            </motion.div>
            <motion.div
              className="pointer-events-none absolute right-6 top-6 rounded-xl border-2 border-base-content/30 bg-base-content/10 px-4 py-2 text-2xl font-black uppercase tracking-[0.4rem] text-base-content/70"
              style={{ opacity: nopeOpacity, zIndex: 9999 }}
            >
              Later
            </motion.div>
          </>
        )}
        {!isTop && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl bg-base-200"
            style={{ opacity: overlayIntensity }}
          />
        )}
        <PredictionCardContent
          card={card}
          rectangleCode={rectangleCode}
          regionName={regionName}
          isFavorite={isFavorite}
          interactive={isTop}
          isFirstCard={index === 0}
          onShowSpeciesInfo={isTop ? onShowSpeciesInfo : undefined}
          onToggleFavorite={isTop ? onToggleFavorite : undefined}
        />
      </motion.div>
    );
  }
);

SwipeableCard.displayName = 'SwipeableCard';

interface DeckActionsProps {
  onSkip: () => void;
  onLike: () => void;
  disabled?: boolean;
}

const DeckActions: React.FC<DeckActionsProps> = ({ onSkip, onLike, disabled }) => (
  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-3 sm:pt-6" role="group" aria-label="Card actions">
    <button
      type="button"
      className="btn btn-outline btn-lg gap-2 min-h-[48px] px-4 sm:min-h-[56px] sm:px-6 w-full sm:w-auto"
      onClick={onSkip}
      disabled={disabled}
      aria-label="Skip this fish and see the next prediction"
    >
      <X size={20} aria-hidden="true" />
      <TranslatedText text="Next!" />
    </button>
    <button
      type="button"
      className="btn btn-primary btn-lg gap-2 min-h-[48px] px-4 sm:min-h-[56px] sm:px-6 w-full sm:w-auto"
      onClick={onLike}
      disabled={disabled}
      aria-label="Add this fish to my favorites"
    >
      <Heart size={20} aria-hidden="true" />
      <TranslatedText text="Fave" />
    </button>
  </div>
);

interface FavoritesListProps {
  cards: CardData[];
  onToggleFavorite: (card: CardData) => void;
  onShowSpeciesInfo?: (card: CardData) => void;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ cards, onToggleFavorite, onShowSpeciesInfo }) => {
  if (cards.length === 0) {
    return <p className="text-sm text-base-content/70">No saved fish yet. Swipe right on the deck to add some.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <div key={card.id} className="rounded-lg border border-base-200 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {card.emoji}
                </span>
                <TranslatedFishName name={card.commonName} />
              </p>
              {card.scientificName && (
                <p className="text-xs italic text-base-content/70">{card.scientificName}</p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm text-error"
              onClick={() => onToggleFavorite(card)}
              aria-label="Remove from favourites"
            >
              <Heart size={14} fill="currentColor" />
            </button>
          </div>
          {card.summary && <p className="text-sm text-base-content/70 leading-snug">{card.summary}</p>}
          {onShowSpeciesInfo && (
            <button
              type="button"
              className="btn btn-xs btn-outline gap-1"
              onClick={() => onShowSpeciesInfo(card)}
            >
              <Sparkles size={14} /> <TranslatedText text="Get to know me" />
            </button>
          )}
          {card.rationale.length > 0 && (
            <ul className="list-disc pl-4 text-xs space-y-1 text-base-content/60">
              {card.rationale.slice(0, 2).map((item, idx) => (
                <li key={`${card.id}-fav-${idx}`}>{item}</li>
              ))}
            </ul>
          )}
          {card.confidence !== null && (
            <span className="badge badge-outline badge-sm">{card.confidence}% <TranslatedText text="activity" /></span>
          )}
        </div>
      ))}
    </div>
  );
};

const FindrPage: React.FC = () => {
  const router = useRouter();
  const { location: legacyLocation, coastalLocation, findrLocation, updateLocationBySlot, loading: locationLoading } = useUnifiedLocation();

  // Migrate old findrSettings localStorage to UnifiedLocationContext
  useMigrateFindrSettings();

  const {
    options: rectangleOptions,
    loading: _rectangleOptionsLoading,
    error: rectangleOptionsError,
    isFallback: rectangleOptionsUsingFallback,
  } = useFindrRectangleOptions(FALLBACK_RECTANGLE_OPTIONS);

  // State for prediction settings (no longer using usePersistentFindrSettings)
  const [predictionDate, setPredictionDate] = useState(TODAY_ISO);
  const [language] = useState('en'); // Language handled by LanguageContext
  
  // Use favourites hook for hybrid localStorage + Supabase sync
  const {
    favourites: favorites,
    toggleFavourite,
    isFavourited: _isFavourited,
    loading: _favouritesLoading,
  } = useFavourites({ autoSync: true });
  
  const [cardQueue, setCardQueue] = useState<CardData[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [speciesModalCard, setSpeciesModalCard] = useState<CardData | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const speciesModalOpen = Boolean(speciesModalCard);
  const swipeCardRef = useRef<SwipeCardHandle | null>(null);
  const swipingRef = useRef(false); // Shared swiping state for all cards

  // Check for password_updated query param
  useEffect(() => {
    if (router.query.password_updated === 'true') {
      setShowSuccessMessage(true);
      // Remove query param from URL
      router.replace('/findr', undefined, { shallow: true });
      // Hide message after 5 seconds
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [router]);

  // Rectangle selection priority:
  // 1. Rectangle from URL query parameter (explicit user navigation)
  // 2. Rectangle from findrLocation (Findr-specific saved location)
  // 3. Rectangle from coastalLocation (fallback to Go Daisy coastal location)
  // 4. Rectangle from legacyLocation (legacy location system)
  const rectangleFromQuery = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;
  const rectangleFromFindr = findrLocation?.rectangleCode ?? null;
  const rectangleFromCoastal = coastalLocation?.rectangleCode ?? null;
  const rectangleFromLegacy = legacyLocation?.rectangleCode ?? null;
  const effectiveSelectedCode = rectangleFromQuery ?? rectangleFromFindr ?? rectangleFromCoastal ?? rectangleFromLegacy;
  
  const activeRectangle = effectiveSelectedCode ?? null;
  const activeOption = useMemo<RectangleOption | null>(
    () => rectangleOptions.find((option) => option.code === activeRectangle) ?? null,
    [rectangleOptions, activeRectangle]
  );

  // Auto-select first rectangle if none selected (fallback only)
  useEffect(() => {
    // Don't auto-select while location data is still loading from database
    if (locationLoading) {
      console.log('[Findr] Auto-select skipped: locationLoading=true');
      return;
    }
    // Don't auto-select if we have any rectangle from any source
    if (rectangleFromQuery || rectangleFromFindr || rectangleFromCoastal || rectangleFromLegacy) {
      console.log('[Findr] Auto-select skipped: user has saved location', {
        rectangleFromQuery,
        rectangleFromFindr,
        rectangleFromCoastal,
        rectangleFromLegacy,
      });
      return;
    }
    // Don't auto-select if rectangles not loaded yet
    if (rectangleOptions.length === 0) {
      console.log('[Findr] Auto-select skipped: rectangleOptions empty');
      return;
    }

    // Auto-select first rectangle and save to findr slot
    const firstOption = rectangleOptions[0];
    console.log('[Findr] Auto-selecting first rectangle (no saved location found):', firstOption.code);

    void updateLocationBySlot({
      slot: 'findr',
      coordinates: { lat: firstOption.centerLat, lon: firstOption.centerLon },
      rectangleCode: firstOption.code,
      rectangleRegion: firstOption.region,
      name: firstOption.label,
      source: 'auto',
      makeActive: true,
    });
  }, [locationLoading, rectangleFromQuery, rectangleFromFindr, rectangleFromCoastal, rectangleFromLegacy, rectangleOptions, updateLocationBySlot]);

  const {
    predictions,
    loading,
    error,
    lastUpdated,
    reload,
    isFromCache,
    cacheTimestamp,
    freshness,
  } = useFishingPredictions({
    rectangleCode: activeRectangle,
    predictionDate,
    language,
    enabled: Boolean(activeRectangle),
    latitude: findrLocation?.lat ?? coastalLocation?.lat ?? legacyLocation?.lat ?? null,
    longitude: findrLocation?.lon ?? coastalLocation?.lon ?? legacyLocation?.lon ?? null,
  });

  // Debug: Log when predictions finish loading (not during loading state)
  const prevPredictionsRef = useRef<typeof predictions>(null);
  useEffect(() => {
    // Only log when loading completes with new data
    if (!loading && predictions && predictions !== prevPredictionsRef.current) {
      console.log('[Findr] Predictions loaded:', {
        rectangleCode: activeRectangle,
        count: predictions.length,
        topSpecies: predictions[0]?.species_common_name || predictions[0]?.common_name,
      });
      prevPredictionsRef.current = predictions;
    }
  }, [predictions, activeRectangle, loading]);

  useEffect(() => {
    if (!rectangleOptionsUsingFallback) return;
    console.info('[Findr] Using fallback ICES rectangle options. Wire up Supabase rectangles data.', {
      fallbackCount: FALLBACK_RECTANGLE_OPTIONS.length,
      sampleCodes: FALLBACK_RECTANGLE_OPTIONS.slice(0, 3).map((option) => option.code),
    });
  }, [rectangleOptionsUsingFallback]);

  useEffect(() => {
    if (loading) return;
    if (predictions && predictions.length > 0) return;
    // Only log if we have a rectangle selected (otherwise fetch is disabled)
    if (!activeRectangle) return;
    console.info('[Findr] No dynamic predictions available yet. Replace placeholder deck with Supabase/weather output.', {
      rectangleCode: activeRectangle,
      predictionDate,
      hasError: Boolean(error),
    });
  }, [activeRectangle, error, loading, predictionDate, predictions]);

  const cards = useMemo(() => {
    if (!predictions) return [];

    const defaultRegionCode =
      coastalLocation?.rectangleRegion ??
      legacyLocation?.rectangleRegion ??
      null;
    const locationLabelFromContext =
      coastalLocation?.name ??
      legacyLocation?.rectangleLabel ??
      null;
    const fallbackLocationLabel = activeOption?.region ?? activeOption?.label ?? (activeRectangle ? `ICES ${activeRectangle}` : 'Selected waters');
    const effectiveLocationLabel = locationLabelFromContext ?? fallbackLocationLabel;

    const mapped = predictions
      .map((prediction, index) => {
        const card = mapPrediction(prediction, index);
        if (!card) {
          return null;
        }

        const predictionRegionCode = typeof prediction.region_code === 'string' && prediction.region_code.trim().length > 0
          ? prediction.region_code.trim().toUpperCase()
          : defaultRegionCode;

        return {
          ...card,
          rectangleCode: activeRectangle,
          regionCode: predictionRegionCode ?? null,
          locationLabel: effectiveLocationLabel,
        };
      })
      .filter((card): card is NonNullable<typeof card> => card !== null)
      .sort((a, b) => {
        const scoreB = b.biteScore ?? b.confidence ?? -Infinity;
        const scoreA = a.biteScore ?? a.confidence ?? -Infinity;
        return scoreB - scoreA;
      });

    return mapped;
  }, [predictions, activeRectangle, legacyLocation, coastalLocation, activeOption]);

  useEffect(() => {
    setCardQueue(cards);
  }, [cards]);

  // Favorites are now managed by useFavourites hook
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const currentCard = cardQueue[0] ?? null;
  const visibleCards = useMemo(() => cardQueue.slice(0, 3), [cardQueue]);
  const favoriteCards = useMemo(
    () => cards.filter((card) => favoritesSet.has(getFavouriteKeyFromCard(card))),
    [cards, favoritesSet]
  );

  const totalPredictions = cards.length;
  const deckResetDisabled = loading || cardQueue.length === cards.length;

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPredictionDate(event.target.value);
    },
    [setPredictionDate]
  );

  const handleSetToday = useCallback(() => {
    setPredictionDate(TODAY_ISO);
  }, [setPredictionDate]);

  const handleSkip = useCallback(() => {
    // Move card to back of queue for infinite looping
    setCardQueue((queue) => (queue.length === 0 ? queue : [...queue.slice(1), queue[0]]));
  }, []);

  const handleLike = useCallback((card: CardData) => {
    const favouriteKey = getFavouriteKeyFromCard(card);
    toggleFavourite(favouriteKey, { speciesCode: card.speciesCode, speciesName: card.commonName });
    // Move card to back of queue for infinite looping
    setCardQueue((queue) => (queue.length === 0 ? queue : [...queue.slice(1), queue[0]]));
  }, [toggleFavourite]);

  const handleToggleFavorite = useCallback((card: CardData) => {
    const favouriteKey = getFavouriteKeyFromCard(card);
    toggleFavourite(favouriteKey, { speciesCode: card.speciesCode, speciesName: card.commonName });
  }, [toggleFavourite]);

  const handleShowSpeciesInfo = useCallback(
    (card: CardData) => {
      setSpeciesModalCard(card);
      setFavoritesOpen(false);
    },
    [setFavoritesOpen, setSpeciesModalCard]
  );

  const handleCloseSpeciesModal = useCallback(() => {
    setSpeciesModalCard(null);
  }, [setSpeciesModalCard]);

  const resetDeck = useCallback(() => {
    setCardQueue(cards);
  }, [cards]);

  const handleProgrammaticSkip = useCallback(() => {
    if (!currentCard) return;
    // Directly update queue instead of triggering animation to avoid race conditions
    // This is simpler and more reliable than programmatic swipe animation
    handleSkip();
  }, [currentCard, handleSkip]);

  const handleProgrammaticLike = useCallback(() => {
    if (!currentCard) return;
    // Just toggle favorite without swiping the card away
    handleToggleFavorite(currentCard);
  }, [currentCard, handleToggleFavorite]);

  const formattedLastUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <>
      <SEO
        title="findr"
        description="AI-powered fishing predictions with live environmental data for UK and European coastal waters. Get bite scores, species recommendations, and optimal fishing conditions."
        url="https://fishfindr.eu"
      />
      <main className="min-h-screen bg-base-200 pb-16">
        {/* Network status indicator */}
        <NetworkStatusIndicator position="top" />

        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="sm:mx-auto pt-2 sm:pt-6 lg:max-w-6xl px-0">
          {/* Success message */}
          {showSuccessMessage && (
            <div className="alert alert-success mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Password updated successfully!</span>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowSuccessMessage(false)}>
                <X size={16} />
              </button>
            </div>
          )}

          <section className="space-y-1 sm:space-y-6 px-0 sm:px-4" aria-labelledby="main-heading">
            <div className="space-y-1 sm:space-y-4 px-4 sm:px-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h1 id="main-heading" className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles size={20} aria-hidden="true" /> <TranslatedText text="findr - catch of the day" />
                  </h1>

                </div>
              </div>
              {rectangleOptionsError && (
                <div className="alert alert-warning max-w-3xl text-sm mx-auto md:mx-0">
                  <span>
                    <TranslatedText text="Couldn't reach the live fishing areas service, so we're showing a trusted offline list instead." />
                  </span>
                </div>
              )}
              {isFromCache && cacheTimestamp && freshness && (
                <div className="flex items-center gap-2 px-4 sm:px-0">
                  <DataFreshnessIndicator
                    timestamp={cacheTimestamp}
                    freshness={freshness}
                  />
                  {freshness === 'stale' || freshness === 'very-stale' ? (
                    <span className="text-xs text-base-content/70">
                      <TranslatedText text="Connect to refresh predictions" />
                    </span>
                  ) : (
                    <span className="text-xs text-base-content/70">
                      <TranslatedText text="Offline mode" />
                    </span>
                  )}
                </div>
              )}
            </div>

            {!activeRectangle && (
              <div className="px-4 sm:px-0">
                <div className="alert alert-info">
                  <span><TranslatedText text="Pick a fishing area to see today's activity." /></span>
                </div>
              </div>
            )}

            {activeRectangle && loading && (
              <div className="space-y-4 px-4 sm:px-0">
                <div className="alert alert-info">
                  <span className="loading loading-ring loading-sm text-blue-500" aria-hidden />
                  <span>
                    <TranslatedText text="Looking for fish activity near" /> {activeOption?.region ?? `area ${activeRectangle}`}…
                  </span>
                </div>
                <div className="relative h-[460px] sm:h-[520px] w-full">
                  <SkeletonCard />
                </div>
              </div>
            )}

            {activeRectangle && !loading && error && (
              <div className="px-4 sm:px-0">
                <div className="alert alert-error">
                <div>
                  <p><TranslatedText text="We couldn't reel in today's predictions. Try refreshing in a moment." /></p>
                  <details className="mt-1 text-xs opacity-80">
                    <summary className="cursor-pointer"><TranslatedText text="View technical guff if you must" /></summary>
                    <pre className="whitespace-pre-wrap break-words">{error}</pre>
                  </details>
                </div>
                </div>
              </div>
            )}

            {activeRectangle && !loading && !error && currentCard && (
              <div className="space-y-4 max-w-full sm:max-w-4xl mx-0 sm:mx-auto px-0 sm:px-4">
                  <div className="relative h-[460px] sm:h-[520px] w-full">
                    <AnimatePresence initial={false}>
                      {visibleCards.map((card, index) => (
                        <SwipeableCard
                          key={card.id}
                          card={card}
                          index={index}
                          isTop={index === 0}
                          total={visibleCards.length}
                          rectangleCode={activeRectangle}
                          regionName={activeOption?.region}
                          onSwipedLeft={handleSkip}
                          onSwipedRight={handleLike}
                          isFavorite={favoritesSet.has(getFavouriteKeyFromCard(card))}
                          onShowSpeciesInfo={handleShowSpeciesInfo}
                          onToggleFavorite={handleToggleFavorite}
                          swipingRef={swipingRef}
                          ref={index === 0 ? swipeCardRef : undefined}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                  <DeckActions
                    onSkip={handleProgrammaticSkip}
                    onLike={handleProgrammaticLike}
                    disabled={!currentCard}
                  />
              </div>
            )}


            {activeRectangle && !loading && !error && totalPredictions === 0 && (
              <div className="px-4 sm:px-0">
                <div className="alert alert-warning">
                  <span>
                    The fish are quiet here for {predictionDate}. Try different waters or shift the day.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Species lineup section - always render wrapper with min-height to prevent CLS */}
          <section
            className="space-y-5 px-4 sm:px-4"
            aria-labelledby="species-lineup-heading"
            style={{ minHeight: '600px' }}
          >
            {activeRectangle && !error && (totalPredictions > 0 || loading) && (
              <>
              {loading ? (
                /* Skeleton header and grid during loading */
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="skeleton h-7 w-48"></div>
                    <div className="skeleton h-5 w-32"></div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="card bg-base-100 shadow-md border border-base-200/60">
                        <div className="card-body space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="skeleton w-12 h-12 sm:w-14 sm:h-14 rounded-lg shrink-0" />
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="skeleton h-5 w-24"></div>
                                  <div className="skeleton h-5 w-10 rounded-full"></div>
                                </div>
                                <div className="skeleton h-3 w-20"></div>
                              </div>
                            </div>
                            <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                          </div>
                          <div className="space-y-2">
                            <div className="skeleton h-3 w-full"></div>
                            <div className="skeleton h-3 w-5/6"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Real header and cards */
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 id="species-lineup-heading" className="text-lg font-semibold flex items-center gap-2">
                      <ListChecks size={18} aria-hidden="true" /> <TranslatedText text="Full species lineup" />
                    </h3>
                    <span className="text-sm text-base-content/60">
                      <TranslatedText text="Sorted by confidence for" /> {activeOption?.region ?? (
                        <>
                          <TranslatedText text="area" /> {activeRectangle}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => (
                  <article key={card.id} className="card bg-base-100 shadow-md border border-base-200/60" data-testid="species-card">
                    <div className="card-body space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Species thumbnail - clickable to open modal */}
                          <button
                            type="button"
                            onClick={() => handleShowSpeciesInfo(card)}
                            className="flex-shrink-0 focus:outline-none hover:opacity-90 transition-opacity"
                            aria-label={`View ${card.commonName} details`}
                          >
                            {card.image?.thumb || card.image?.src ? (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 relative rounded-lg overflow-hidden bg-base-200 ring-2 ring-base-300 hover:ring-primary transition-all">
                                <Image
                                  src={card.image.thumb || card.image.src}
                                  alt={card.image.alt}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-lg bg-gradient-to-br from-info/10 to-primary/10 ring-2 ring-base-300 hover:ring-primary transition-all">
                                <span className="text-2xl" aria-hidden>
                                  {card.emoji}
                                </span>
                              </div>
                            )}
                          </button>

                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 text-base-content flex-wrap">
                              <span className="font-semibold"><TranslatedFishName name={card.commonName} /></span>
                            {card.confidence !== null ? (
                              <span className={confidenceBadgeClasses(card.confidence, 'sm')} data-testid="confidence-score">
                                {card.confidence}%
                              </span>
                            ) : (
                              <span className="badge badge-outline badge-sm">n/a</span>
                            )}
                            {card.weight_profile && (
                              <GuildBadge guild={card.weight_profile} size="xs" />
                            )}
                          </div>
                          {card.scientificName && (
                            <p className="text-xs italic text-base-content/60">{card.scientificName}</p>
                          )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`btn btn-ghost btn-sm ${
                            favoritesSet.has(getFavouriteKeyFromCard(card))
                              ? 'text-error hover:text-error'
                              : 'text-base-content/60 hover:text-error'
                          }`}
                          onClick={() => handleToggleFavorite(card)}
                          aria-label={
                            favoritesSet.has(getFavouriteKeyFromCard(card))
                              ? 'Remove from favourites'
                              : 'Add to favourites'
                          }
                        >
                          <Heart
                            size={16}
                            fill={favoritesSet.has(getFavouriteKeyFromCard(card)) ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>
                      {card.summary && (
                        <p className="text-sm leading-relaxed text-base-content/80">
                          {card.summary}
                        </p>
                      )}
                      {card.playfulBio && (
                        <div className="text-xs text-base-content/60 bg-base-200/60 rounded-lg p-3">
                          <TranslatedFishBio bio={card.playfulBio} />
                        </div>
                      )}
                      <div className="grid gap-2 text-xs text-base-content/70">
                        {card.rationale.length > 0 && (
                          <div>
                                                        <p className="font-semibold text-base-content/80"><TranslatedText text="How are you today, hun?" /></p>
                            <ul className="list-disc pl-4 space-y-1">
                              {card.rationale.slice(0, 3).map((item, idx) => (
                                <li key={`${card.id}-rationale-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {card.baitSuggestions.length > 0 && (
                          <div>
                            <p className="font-semibold text-base-content/80"><TranslatedText text="Bait & presentation" /></p>
                            <p>{card.baitSuggestions.slice(0, 2).join(', ')}</p>
                          </div>
                        )}
                        {card.tideTips.length > 0 && (
                          <div>
                            <p className="font-semibold text-base-content/80"><TranslatedText text="Tide & timing" /></p>
                            <p>{card.tideTips[0]}</p>
                          </div>
                        )}
                      </div>
                      {/* Bite Score Breakdown */}
                      {(() => {
                        const scoreBreakdown = buildScoreBreakdown(card);
                        if (!scoreBreakdown) return null;

                        return (
                          <div className="pt-2 border-t border-base-200">
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
                  </article>
                    ))}
                  </div>
                </>
              )}
              </>
            )}
          </section>

        </div>
      </main>

      <FindrModal title="Your fishing area" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <div className="space-y-6">
          <FishingAreaInfo
            activeOption={activeOption}
            activeRectangle={activeRectangle}
          />
          
          {/* Prediction Settings */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h3 className="text-lg font-semibold mb-4">
                <TranslatedText text="Prediction settings" />
              </h3>
              
              <div className="space-y-6">
                {/* Prediction Date */}
                <div className="space-y-3">
                  <label className="font-semibold text-sm">
                    <TranslatedText text="Prediction date" />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={predictionDate}
                      onChange={handleDateChange}
                      className="input input-bordered"
                      aria-label="Prediction date"
                    />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleSetToday}>
                      <TranslatedText text="Today" />
                    </button>
                  </div>
                </div>

                <div className="divider my-4"></div>

                {/* Tools */}
                <div className="space-y-3">
                  <label className="font-semibold text-sm">
                    <TranslatedText text="Prediction tools" />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={reload}
                      disabled={!activeRectangle || loading}
                    >
                      <TranslatedText text="Refresh predictions" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={resetDeck}
                      disabled={deckResetDisabled}
                    >
                      <TranslatedText text="Reset lineup" />
                    </button>
                  </div>
                  <p className="text-xs text-base-content/70">
                    <TranslatedText text="Last checked" />: {formattedLastUpdated || <TranslatedText text="Waiting on the latest cast" />}
                  </p>
                  <p className="text-xs text-base-content/60">
                    <TranslatedText text="Species loaded" />: {totalPredictions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FindrModal>

      <FindrModal title="Saved fish" open={favoritesOpen} onClose={() => setFavoritesOpen(false)}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-base-content/70">
              Keep an eye on these species before your next trip.
            </p>
            <div className="flex flex-wrap gap-2">
              <select className="select select-bordered select-sm" aria-label="Sort saved fish">
                <option value="activity"><TranslatedText text="Sort by activity" /></option>
                <option value="recent"><TranslatedText text="Sort by newest" /></option>
                <option value="name"><TranslatedText text="Sort alphabetically" /></option>
              </select>
              <button type="button" className="btn btn-sm btn-outline gap-1" disabled>
                <Sparkles size={14} /> Plan trip
              </button>
            </div>
          </div>
          <FavoritesList
            cards={favoriteCards}
            onToggleFavorite={handleToggleFavorite}
            onShowSpeciesInfo={handleShowSpeciesInfo}
          />
        </div>
      </FindrModal>

      <FishSpeciesModal
        open={speciesModalOpen}
        card={speciesModalCard}
        onClose={handleCloseSpeciesModal}
      />

      <FindrFooter />
    </>
  );
};

export default FindrPage;

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
