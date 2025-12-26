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
// Framer Motion - only imported when needed (native apps)
// Web browsers use StaticCardDeck instead for better performance
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { isNative } from '../../lib/capacitor/platform';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Heart,
  ListChecks,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { useFishingPredictions } from '../../hooks/useFishingPredictions';
import { useFavourites } from '../../hooks/useFavourites';
import { useFindrOfflineInit } from '../../hooks/useFindrOfflineInit';
import { useTideExtremes } from '../../hooks/useTideExtremes';
import { SpeciesVerdictStrip } from '../../components/findr/SpeciesVerdictStrip';
import type { TideExtreme } from '../../lib/findr/conditionHelpers';
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
// EnvironmentalInfo moved to modal only
import { EnvironmentalInfo as _EnvironmentalInfo } from '../../components/findr/EnvironmentalInfo';
// Weather messages moved to modal only
import { getWeatherMessage as _getWeatherMessage } from '../../lib/utils/weatherMessages';
import { GradientFish } from '../../components/GradientFish';
import { PlanSessionSheet } from '../../components/findr/PlanSessionSheet';
import type { PlannedActivity } from '../../components/PlanItSheet';
import { generateShareToken, getShareUrl, type FindrShareData } from '../../lib/share/shareToken';
const FindrFooter = dynamic(() => import('../../components/FindrFooter'), { ssr: false });

// Static card deck for web - CSS-only, no Framer Motion (better CLS/TBT)
const StaticCardDeck = dynamic(
  () => import('../../components/findr/StaticCardDeck').then(mod => ({ default: mod.StaticCardDeck })),
  { ssr: false }
);

// WeatherGuildMessage moved to modal only - kept here for potential future use
const _WeatherGuildMessage: React.FC<{ speciesCode: string; scientificName: string; weatherScore: number; windSpeedMS: number; pressureHPA: number; isLoading?: boolean }> = ({ speciesCode, scientificName, weatherScore, windSpeedMS, pressureHPA, isLoading }) => {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2 leading-relaxed text-base-content/60">
        <span className="loading loading-spinner loading-xs" aria-hidden />
        <TranslatedText text="Checking conditions..." />
      </span>
    );
  }

  const weather = _getWeatherMessage(speciesCode, scientificName, {
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
  tideExtremes?: TideExtreme[] | null;
  onShowSpeciesInfo?: (card: CardData) => void;
  onToggleFavorite?: (card: CardData) => void;
}

const PredictionCardContent: React.FC<PredictionCardContentProps> = ({
  card,
  rectangleCode: _rectangleCode,
  regionName: _regionName,
  isFavorite: _isFavorite,
  interactive: _interactive,
  isFirstCard = false,
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
            className="relative w-full max-h-80 sm:max-h-96 overflow-hidden rounded-xl bg-base-200 aspect-[2/1] sm:aspect-[2/1] cursor-pointer hover:opacity-95 transition-opacity"
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
            />
            <button
              type="button"
              className="absolute top-2 right-2 p-2.5 rounded-full bg-black/20 hover:bg-black/40 transition-all duration-200 hover:scale-110 min-w-[40px] min-h-[40px] flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(card);
              }}
              aria-label={_isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              style={{ zIndex: 2 }}
            >
              {_isFavorite ? (
                <Heart size={18} className="fill-red-500 text-red-500" />
              ) : (
                <Heart size={18} className="text-white stroke-2" />
              )}
            </button>
          </div>
        ) : (
          <div
            className="flex aspect-[2/1] w-full items-center justify-center rounded-xl bg-gradient-to-br from-info/10 to-primary/10 relative cursor-pointer"
            onClick={() => onShowSpeciesInfo?.(card)}
            role="button"
            tabIndex={0}
          >
            <GradientFish size={60} />
            <button
              type="button"
              className="absolute top-2 right-2 p-2.5 rounded-full bg-black/20 hover:bg-black/40 transition-all duration-200 hover:scale-110 min-w-[40px] min-h-[40px] flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(card);
              }}
              aria-label={_isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {_isFavorite ? (
                <Heart size={18} className="fill-red-500 text-red-500" />
              ) : (
                <Heart size={18} className="text-white stroke-2" />
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
          className="link link-primary text-sm self-start flex items-center gap-1 pt-1"
          onClick={() => onShowSpeciesInfo?.(card)}
        >
          <TranslatedText text="Get to know me" /> →
        </button>
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
  tideExtremes?: TideExtreme[] | null;
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
      tideExtremes,
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
        layout="position"
        className="absolute inset-0 flex h-full w-full select-none items-stretch justify-center p-0 sm:p-2"
        style={{
          zIndex: total - index,
          pointerEvents: isTop ? 'auto' : 'none',
          x: isTop ? x : undefined,
          rotate: isTop ? rotate : undefined,
        }}
        // Use initial={false} to prevent initial animation that causes CLS
        initial={false}
        animate={{
          opacity: isTop ? 1 : Math.max(0.75, 1 - index * 0.1),
          y: isTop ? 0 : index * 14,
          scale: isTop ? 1 : 1 - index * 0.04,
        }}
        exit={{ opacity: 0, scale: 0.92 }}
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
          tideExtremes={tideExtremes}
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
  onPlan: () => void;
  onShare: () => void;
  disabled?: boolean;
}

const DeckActions: React.FC<DeckActionsProps> = ({ onSkip, onLike, onPlan, onShare, disabled }) => (
  <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2 sm:pt-4" role="group" aria-label="Card actions">
    <button
      type="button"
      className="btn btn-outline gap-1 sm:gap-2 h-10 sm:h-12 px-3 sm:px-5 text-sm sm:text-base"
      onClick={onSkip}
      disabled={disabled}
      aria-label="Skip this fish and see the next prediction"
    >
      <X size={18} aria-hidden="true" />
      <TranslatedText text="Later" />
    </button>
    <button
      type="button"
      className="btn btn-success gap-1 sm:gap-2 h-10 sm:h-12 px-3 sm:px-5 text-sm sm:text-base"
      onClick={onPlan}
      disabled={disabled}
      aria-label="Plan a fishing session for this species"
    >
      <Calendar size={18} aria-hidden="true" />
      <TranslatedText text="Plan it" />
    </button>
    <button
      type="button"
      className="btn btn-primary gap-1 sm:gap-2 h-10 sm:h-12 px-3 sm:px-5 text-sm sm:text-base"
      onClick={onLike}
      disabled={disabled}
      aria-label="Add this fish to my favorites"
    >
      <Heart size={18} aria-hidden="true" />
      <TranslatedText text="Fave" />
    </button>
    <button
      type="button"
      className="btn btn-ghost gap-1 sm:gap-2 h-10 sm:h-12 px-3 sm:px-5 text-sm sm:text-base"
      onClick={onShare}
      disabled={disabled}
      aria-label="Share this prediction"
    >
      <Share2 size={18} aria-hidden="true" />
      <TranslatedText text="Share" />
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

interface FindrPageProps {
  initialRectangle: string | null;
}

const FindrPage: React.FC<FindrPageProps> = ({ initialRectangle: _initialRectangle }) => {
  const router = useRouter();
  const { location: legacyLocation, coastalLocation, findrLocation, updateLocationBySlot, loading: locationLoading } = useUnifiedLocation();

  // Initialize offline storage and preload species for native apps
  const { isReady: offlineReady, speciesCount: offlineSpeciesCount, error: offlineError } = useFindrOfflineInit();

  // Log offline init status (dev only)
  useEffect(() => {
    if (offlineReady) {
      console.log('[Findr] Offline init complete, cached species:', offlineSpeciesCount);
      if (offlineError) {
        console.warn('[Findr] Offline init error:', offlineError);
      }
    }
  }, [offlineReady, offlineSpeciesCount, offlineError]);

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
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const speciesModalOpen = Boolean(speciesModalCard);
  const swipeCardRef = useRef<SwipeCardHandle | null>(null);
  const swipingRef = useRef(false); // Shared swiping state for all cards

  // Platform detection: use static card deck on web for better performance
  // Native apps get the full animated experience with swipe gestures
  const [useAnimatedDeck, setUseAnimatedDeck] = useState(false);

  // Track if initial client-side hydration is complete
  // This prevents CLS from SSR→client layout differences
  // Using a ref to avoid re-renders and ensure immediate availability
  const [isHydrated, setIsHydrated] = useState(false);
  const hydrationRef = useRef(false);

  // Use useLayoutEffect for synchronous execution before paint
  // This ensures isHydrated is true before the browser paints
  useEffect(() => {
    // Check platform after mount (SSR-safe)
    setUseAnimatedDeck(isNative());
    // Mark hydration complete synchronously
    hydrationRef.current = true;
    setIsHydrated(true);
  }, []);

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

  // Fetch tide extremes for peak window calculation
  const tideLocation = useMemo(
    () => activeOption ? { lat: activeOption.centerLat, lon: activeOption.centerLon } : null,
    [activeOption]
  );
  const { extremes: tideExtremes } = useTideExtremes(tideLocation);

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
    // Reset to collapsed view when switching areas
    setShowAllSpecies(false);
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

  const handleOpenPlanSheet = useCallback(() => {
    setPlanSheetOpen(true);
  }, []);

  const handleClosePlanSheet = useCallback(() => {
    setPlanSheetOpen(false);
  }, []);

  const handleSavePlan = useCallback((plan: PlannedActivity) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Findr] Plan saved:', plan);
    }
    // Show success message
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    if (!currentCard || !activeRectangle) return;

    const shareData: Omit<FindrShareData, 'createdAt' | 'expiresAt'> = {
      app: 'findr',
      speciesCode: currentCard.speciesCode || currentCard.id,
      speciesName: currentCard.commonName,
      confidence: currentCard.confidence ?? 0,
      rectangleCode: activeRectangle,
      regionName: activeOption?.region || 'Unknown location',
      date: predictionDate,
    };

    const token = generateShareToken(shareData);
    const shareUrl = getShareUrl(token);

    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentCard.commonName} fishing - ${currentCard.confidence}% confidence`,
          text: `Check out this fishing prediction for ${currentCard.commonName} at ${activeOption?.region}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed, fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          console.error('[Findr] Share failed:', err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (err) {
      console.error('[Findr] Copy failed:', err);
    }
  }, [currentCard, activeRectangle, activeOption?.region, predictionDate]);

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

  // JSON-LD FAQ structured data to help AI and search engines surface concise answers
  const findrFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What's biting today in my area?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Findr shows the top species predicted to be active for your selected fishing area and date. Open the Findr deck to see bite scores, confidence, and quick bait & timing tips."
        }
      },
      {
        "@type": "Question",
        "name": "How is the bite score calculated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Bite scores combine environmental signals (tides, light, temperature, lunar phase, weather) with species-specific models and historical catch data to indicate likely activity."
        }
      },
      {
        "@type": "Question",
        "name": "What bait should I use for a species?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Each species card lists recommended baits and presentation tips. Check the species card for targeted bait suggestions and local advice for your selected area."
        }
      },
      {
        "@type": "Question",
        "name": "When are the best tide times to fish?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Findr highlights tide timing advice on each card. Good fishing often coincides with tide change windows; use the tide tips and local peak windows provided for best timing."
        }
      },
      {
        "@type": "Question",
        "name": "What does the confidence percentage mean?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Confidence expresses how strongly the model expects activity: roughly, 80%+ is high confidence, 60–79% moderate, below 60% lower likelihood. Use it together with the bite score and local conditions."
        }
      },
      {
        "@type": "Question",
        "name": "Can I share a prediction with others?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes — use the Share action on a card to generate a shareable link or use your device's native share dialog to send predictions to friends."
        }
      },
      {
        "@type": "Question",
        "name": "How fresh are the predictions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Predictions include a data freshness indicator; when live data is available we surface cache timestamps and live updates to prioritise the freshest results."
        }
      }
    ]
  };

  // HowTo schema: guide users to plan a session using Findr
  const findrHowTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to plan a fishing session with Findr",
    "description": "Step-by-step guide to pick an area, view predictions, check bite scores and plan your session.",
    "step": [
      {
        "@type": "HowToStep",
        "position": 1,
        "name": "Select your fishing area",
        "text": "Choose a coastal rectangle or saved location in Findr to load local predictions."
      },
      {
        "@type": "HowToStep",
        "position": 2,
        "name": "Check the Catch of the Day",
        "text": "Open the top prediction card to see the species, bite score, confidence and quick bait tips."
      },
      {
        "@type": "HowToStep",
        "position": 3,
        "name": "Review timing and tide advice",
        "text": "Consult the tide tips, best times and environmental indicators to pick the best window."
      },
      {
        "@type": "HowToStep",
        "position": 4,
        "name": "Plan or share",
        "text": "Use the Plan action to save a session or Share to send a prediction link to friends."
      }
    ]
  };

  // Speakable schema: highlight content suitable for voice readouts
  const findrSpeakable = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": "https://fishfindr.eu/findr",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["#main-heading", ".card-title", ".species-quick-answer"]
    }
  };

  return (
    <>
      <SEO
        title="Fish Findr — Catch of the Day | Fishing Predictions UK & Europe"
        description="AI-powered fishing predictions with live environmental data for UK and European coastal waters. Get bite scores, species recommendations, and optimal fishing conditions."
        url="https://fishfindr.eu"
      />
      {/* JSON-LD FAQ for better AI/search answers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(findrFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(findrHowTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(findrSpeakable) }}
      />
      {/* Network status indicator - outside main to avoid CSS containment issues */}
      <NetworkStatusIndicator position="top" />
      {/* Navigation component outside main to avoid CSS containment affecting fixed positioning */}
      <FindrNavigation />
      <main className="min-h-screen bg-base-200 pb-16">

        {/* Content container - minimal spacing on mobile */}
        <div className="sm:mx-auto pt-0 sm:pt-2 lg:max-w-6xl px-0">
          {/* Success message */}
          {showSuccessMessage && (
            <div className="alert alert-success mb-2 mx-2 sm:mx-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm">Password updated!</span>
              <button className="btn btn-xs btn-ghost" onClick={() => setShowSuccessMessage(false)}>
                <X size={14} />
              </button>
            </div>
          )}

          <section className="space-y-0 sm:space-y-2 px-0 sm:px-4" aria-labelledby="main-heading">
            {/* Compact header with subtitle - always rendered to keep consistent title */}
            <div className="px-3 sm:px-0 py-1">
              <h1 id="main-heading" className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Sparkles size={18} aria-hidden="true" /> <TranslatedText text="findr" />
                <span className="text-sm text-base-content/70 ml-2 hidden sm:inline">— <TranslatedText text="Catch of the day" /></span>
              </h1>
            </div>

            {/* Status alerts - only shown when there's an error */}
            {rectangleOptionsError && (
              <div className="alert alert-warning text-xs sm:text-sm mx-2 sm:mx-0 py-2">
                <span>
                  <TranslatedText text="Couldn't reach the live fishing areas service, so we're showing a trusted offline list instead." />
                </span>
              </div>
            )}

            {/* Action prompt - only show when needed, no fixed height reservation */}
            {isHydrated && !activeRectangle && (
              <div className="px-2 sm:px-0">
                <div className="alert alert-info py-2 text-sm">
                  <span><TranslatedText text="Pick a fishing area to see today's activity." /></span>
                </div>
              </div>
            )}

              {/* Card deck area - compact on mobile to ensure bottom nav is visible */}
              <div className="space-y-1 sm:space-y-2 max-w-full sm:max-w-4xl mx-0 sm:mx-auto px-0 sm:px-4" style={{ contain: 'layout' }}>
                {(!isHydrated || loading || (!activeRectangle && !error)) ? (
                  /* Skeleton state - shown during hydration, loading, or no rectangle */
                  <>
                    {/* Card counter placeholder */}
                    <div className="flex items-center justify-between px-2 h-[24px]">
                      <div className="skeleton h-3 w-14"></div>
                      <div className="flex gap-2">
                        <div className="skeleton h-7 w-7 rounded-full"></div>
                        <div className="skeleton h-7 w-7 rounded-full"></div>
                      </div>
                    </div>
                    {/* Card skeleton - shorter on mobile */}
                    <div className="relative findr-deck-height w-full" style={{ contain: 'layout size' }}>
                      <SkeletonCard />
                    </div>
                    {/* Action buttons placeholder - compact */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1 sm:pt-2">
                      <div className="skeleton h-10 w-20 sm:w-24 rounded-btn"></div>
                      <div className="skeleton h-10 w-20 sm:w-24 rounded-btn"></div>
                      <div className="skeleton h-10 w-20 sm:w-24 rounded-btn"></div>
                      <div className="skeleton h-10 w-20 sm:w-24 rounded-btn"></div>
                    </div>
                  </>
                ) : activeRectangle && !error && currentCard ? (
                  /* Actual content */
                  <>
                    {/* Conditional deck: animated for native apps, static for web */}
                    {useAnimatedDeck ? (
                      <>
                        {/* Animated deck with swipe gestures (native apps only) */}
                        <div className="relative findr-deck-height w-full" style={{ contain: 'layout' }}>
                          <AnimatePresence initial={false} mode="popLayout">
                            {visibleCards.map((card, index) => (
                              <SwipeableCard
                                key={card.id}
                                card={card}
                                index={index}
                                isTop={index === 0}
                                total={visibleCards.length}
                                rectangleCode={activeRectangle}
                                regionName={activeOption?.region}
                                tideExtremes={tideExtremes}
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
                          onPlan={handleOpenPlanSheet}
                          onShare={handleShare}
                          disabled={!currentCard}
                        />
                      </>
                    ) : (
                      /* Static deck for web browsers - better CLS, no Framer Motion animations */
                      <StaticCardDeck
                        cards={cards}
                        favoritesSet={favoritesSet}
                        getFavouriteKey={getFavouriteKeyFromCard}
                        tideExtremes={tideExtremes}
                        onToggleFavorite={handleToggleFavorite}
                        onShowSpeciesInfo={handleShowSpeciesInfo}
                      />
                    )}
                  </>
                ) : null}
              </div>

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

            {isHydrated && activeRectangle && !loading && !error && totalPredictions === 0 && (
                <div className="px-4 sm:px-0">
                  <div className="alert alert-warning">
                    <span>
                      The fish are quiet here for {predictionDate}. Try different waters or shift the day.
                    </span>
                  </div>
                </div>
              )}
          </section>

          {/* Species lineup section - always show during hydration to prevent CLS */}
          {(!isHydrated || (activeRectangle && !error && (totalPredictions > 0 || loading))) && (
            <section
              className="space-y-5 px-4 sm:px-4 mt-6"
              aria-labelledby="species-lineup-heading"
            >
              {(!isHydrated || loading) ? (
                /* Skeleton header and grid during loading */
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="skeleton h-7 w-48"></div>
                    <div className="skeleton h-5 w-32"></div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="card bg-base-100 shadow-md border border-base-200/60 min-h-[320px]">
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
                          {/* Summary placeholder */}
                          <div className="space-y-2">
                            <div className="skeleton h-3 w-full"></div>
                            <div className="skeleton h-3 w-5/6"></div>
                          </div>
                          {/* Bio placeholder */}
                          <div className="skeleton h-16 w-full rounded-lg"></div>
                          {/* Rationale placeholder */}
                          <div className="space-y-2">
                            <div className="skeleton h-4 w-1/3"></div>
                            <div className="skeleton h-3 w-full"></div>
                            <div className="skeleton h-3 w-4/5"></div>
                          </div>
                          {/* Bite score placeholder */}
                          <div className="skeleton h-12 w-full rounded-lg"></div>
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
                    {/* Show 6 cards by default, all cards when expanded */}
                    {(showAllSpecies ? cards : cards.slice(0, 6)).map((card) => (
                  <article key={card.id} className="card bg-base-100 shadow-md border border-base-200/60 min-h-[320px]" data-testid="species-card">
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

                  {/* Plenty more fish... / Show less button */}
                  {cards.length > 6 && (
                    <div className="flex justify-center pt-4">
                      <button
                        type="button"
                        className="btn btn-outline btn-primary gap-2"
                        onClick={() => setShowAllSpecies((prev) => !prev)}
                        aria-expanded={showAllSpecies}
                        aria-controls="species-lineup"
                      >
                        {showAllSpecies ? (
                          <>
                            <ChevronUp size={18} aria-hidden="true" />
                            <TranslatedText text="Show less" />
                          </>
                        ) : (
                          <>
                            <ChevronDown size={18} aria-hidden="true" />
                            <TranslatedText text="Plenty more fish..." /> ({cards.length - 6})
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

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

      {/* Plan Session Sheet */}
      {currentCard && (
        <PlanSessionSheet
          open={planSheetOpen}
          onClose={handleClosePlanSheet}
          onSave={handleSavePlan}
          spotName={activeOption?.region || 'Unknown location'}
          rectangleCode={activeRectangle || ''}
          speciesName={currentCard.commonName}
          speciesCode={currentCard.speciesCode || currentCard.id}
          confidence={currentCard.confidence ?? undefined}
        />
      )}

      {/* Share link copied toast */}
      {shareLinkCopied && (
        <div className="toast toast-bottom toast-center z-50">
          <div className="alert alert-success shadow-lg">
            <Share2 className="h-5 w-5" aria-hidden="true" />
            <span>Link copied to clipboard!</span>
          </div>
        </div>
      )}

      {/* Cache/refresh status - moved to bottom to not obstruct main content */}
      {isFromCache && cacheTimestamp && freshness && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-base-200/50">
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

      <FindrFooter />
    </>
  );
};

export default FindrPage;

// Server-side props to provide initial rectangle for CLS prevention
export async function getServerSideProps({ query }: { query: { rectangle?: string } }) {
  // If rectangle is in URL, pass it to avoid CLS
  const initialRectangle = typeof query.rectangle === 'string' ? query.rectangle : null;

  return {
    props: {
      initialRectangle
    }
  };
}
