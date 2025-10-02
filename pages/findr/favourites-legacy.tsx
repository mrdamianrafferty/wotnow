'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import {
  Fish,
  Star,
  TrendingUp,
  Calendar,
  Target,
  Trash2,
  Eye,
  Heart,
  Clock,
  Thermometer,
  Flame,
  Trophy,
  HeartOff,
  RefreshCw,
} from 'lucide-react';
import { Montserrat } from 'next/font/google';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { TranslatedFishName, TranslatedFishBio, TranslatedText } from '../../components/translation/TranslatedFishCard';
import { useFishingPredictions } from '../../hooks/useFishingPredictions';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { normalizeRectangleCode } from '../../lib/findr/rectangle';
import { mapPrediction, type CardData, type CardImage } from '../../lib/findr/mapPrediction';
import { getTodayIso } from '../../lib/date/today';
import { useFavouriteInsights } from '../../hooks/useFavouriteInsights';

const TODAY_ISO = getTodayIso();
const FAVORITES_STORAGE_KEY = 'findrFavorites';
const PRIORITY_STORAGE_KEY = 'findrFavoritePriorities';
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const SWIPED_DATE_OPTIONS = [
  'today',
  'yesterday',
  '3 days ago',
  '1 week ago',
  '2 weeks ago',
  '3 weeks ago',
  '1 month ago',
  '6 weeks ago',
  '2 months ago',
  '3 months ago',
];

const LAST_CONDITIONS_OPTIONS = [
  'earlier today',
  'yesterday morning',
  '2 days ago',
  'last weekend',
  'mid-week',
  'last full moon',
  'during the spring tides',
  'around dawn yesterday',
  'at high tide two days back',
  'before the storm rolled through',
];

const RECENT_ACTIVITY_OPTIONS = [
  "Hooked up yesterday!",
  "Remains elusive, don't give up",
  'Showing on sonar but not committing',
  'Landed twice last week',
  'Locals reported a flurry of bites',
  'Tagged fish resurfaced nearby',
  'Still ghosting – maybe switch tactics',
  'Chasing sprats in the shallows',
  'Seen cruising structure at dusk',
  'Surface bust-ups reported at first light',
];

const BAIT_FALLBACKS = [
  'Bring the flash: silver spinners at mid-tide',
  'Lugworm cocktails just off the bottom',
  'Feather rigs on a gentle retrieve',
  'Live prawns around the pylons',
  'Slow jigging with 40g metals',
  'Soft plastics in pilchard colours',
  'Crab baits near rocky structure',
  'Sand-eel imitations drifted downtide',
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type SortOption = 'confidence' | 'catches' | 'recent';

interface MockDetail {
  swipedDate: string;
  catches: number;
  lastPerfectConditions: string;
  seasonFallback: string;
  recentActivity: string;
  nextBestDay: string;
  recencyScore: number;
}

interface FavouriteEntry {
  id: string;
  card: CardData | null;
  name: string;
  scientificName?: string;
  emoji: string;
  confidence: number | null;
  bestBait: string;
  bestBaitSource: 'prediction' | 'mock' | 'supabase';
  season: string;
  lastPerfectConditions: string;
  swipedDate: string;
  catches: number;
  recentActivity: string;
  nextBestDay: string;
  isPriority: boolean;
  isMockOnly: boolean;
  playfulBio?: string;
  image?: CardImage;
  imageSource: 'prediction' | 'fallback';
  recencyScore: number;
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function pickFrom<T>(items: T[], seed: string, salt: string): T {
  if (items.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  const hash = hashString(`${seed}:${salt}`);
  return items[hash % items.length];
}

function generateMockDetail(id: string): MockDetail {
  // Mock metrics until we have real catch + session history APIs available.
  const catchesOptions = [0, 0, 1, 1, 2, 3, 4, 5];
  return {
    swipedDate: pickFrom(SWIPED_DATE_OPTIONS, id, 'swiped'),
    catches: catchesOptions[hashString(`${id}:catches`) % catchesOptions.length],
    lastPerfectConditions: pickFrom(LAST_CONDITIONS_OPTIONS, id, 'conditions'),
    seasonFallback: pickFrom(['Hot right now', 'In the mood', 'Playing hard to get', 'Left the country'], id, 'season'),
    recentActivity: pickFrom(RECENT_ACTIVITY_OPTIONS, id, 'activity'),
    nextBestDay: pickFrom(DAY_NAMES, id, 'day'),
    recencyScore: hashString(`${id}:recent`) % 100,
  };
}

function deriveSeasonLabel(confidence: number | null, fallback: string): string {
  if (confidence === null) return fallback;
  if (confidence >= 90) return 'Hot right now';
  if (confidence >= 80) return 'In the mood';
  if (confidence >= 70) return 'Playing hard to get';
  return fallback;
}

function getPreferredImageUrl(image?: CardImage | null): string | null {
  if (!image) return null;
  return image.thumb ?? image.mobile ?? image.src ?? null;
}

const FavouriteThumbnail: React.FC<{ entry: FavouriteEntry; size?: number; className?: string }> = ({
  entry,
  size = 72,
  className,
}) => {
  const imageUrl = getPreferredImageUrl(entry.image ?? entry.card?.image ?? null);
  const altText = entry.image?.alt ?? entry.card?.image?.alt ?? `${entry.name} illustration`;

  // Use consistent width but flexible height to avoid cropping
  const widthClass = size === 72 ? 'w-18' : size === 64 ? 'w-16' : size === 80 ? 'w-20' : 'w-18';
  const heightClass = 'h-auto min-h-12'; // Flexible height with minimum

  if (imageUrl) {
    return (
      <div
        className={`avatar relative flex-none ${widthClass} ${className ?? ''}`.trim()}
      >
        <div className={`rounded-2xl border border-base-300 overflow-hidden ${heightClass} flex items-center justify-center bg-base-100`}>
          <Image
            src={imageUrl}
            alt={altText}
            width={size}
            height={0}
            sizes={`(min-width: 1280px) ${size}px, (min-width: 768px) ${size}px, 30vw`}
            className="object-contain w-full h-auto"
            style={{ height: 'auto' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`avatar placeholder flex-none ${widthClass} ${heightClass} ${className ?? ''}`.trim()}
      role="img"
      aria-label={`${entry.name} illustration placeholder`}
    >
      <div className="bg-base-200 text-base-content rounded-2xl border border-base-300 flex items-center justify-center">
        <Fish size={size > 64 ? 24 : 20} className="text-primary" />
      </div>
    </div>
  );
};

const ConfidenceRing: React.FC<{ confidence: number; size?: number }> = ({ confidence, size = 80 }) => {
  const getColorClass = (value: number): string => {
    if (value >= 90) return 'text-success';
    if (value >= 80) return 'text-warning';
    if (value >= 70) return 'text-info';
    return 'text-error';
  };

  const sizeClass = size === 80 ? 'w-20 h-20' : size === 72 ? 'w-18 h-18' : size === 64 ? 'w-16 h-16' : 'w-20 h-20';

  return (
    <div className={`relative ${sizeClass}`}>
      <div 
        className={`radial-progress ${getColorClass(confidence)}`}
        style={{"--value": confidence, "--size": `${size}px`, "--thickness": "4px"} as React.CSSProperties}
        role="progressbar"
        aria-label={`${confidence}% confidence`}
      >
        <div className="text-center">
          <div className={`text-lg font-bold ${getColorClass(confidence)}`}>{confidence}%</div>
          <p className="text-xs uppercase tracking-wide text-base-content/60"><TranslatedText text="confidence" /></p>
        </div>
      </div>
    </div>
  );
};

function getConfidenceCardClass(confidence: number | null): string {
  if (confidence === null) return 'bg-base-200/20 border-base-300';
  if (confidence >= 90) return 'bg-success/10 border-success/30';
  if (confidence >= 80) return 'bg-warning/10 border-warning/30';
  if (confidence >= 70) return 'bg-info/10 border-info/30';
  return 'bg-error/10 border-error/30';
}

const FindrFavouritesPage: React.FC = () => {
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [selectedFish, setSelectedFish] = useState<FavouriteEntry | null>(null);
  const [swipeStates, setSwipeStates] = useState<Record<string, { x: number; y: number; swiping: boolean }>>({});
  const [favorites, setFavorites] = useState<string[] | null>(null);
  const [priorityIds, setPriorityIds] = useState<string[]>([]);

  const { selectedCode, manualCode, predictionDate, language } = usePersistentFindrSettings({
    predictionDate: TODAY_ISO,
    language: 'en',
  });

  const manualNormalized = useMemo(() => normalizeRectangleCode(manualCode), [manualCode]);
  const activeRectangle = manualNormalized ?? (selectedCode || null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((item): item is string => typeof item === 'string'));
        } else {
          setFavorites([]);
        }
      } else {
        setFavorites([]);
      }

      const storedPriorities = window.localStorage.getItem(PRIORITY_STORAGE_KEY);
      if (storedPriorities) {
        const parsed = JSON.parse(storedPriorities);
        if (Array.isArray(parsed)) {
          setPriorityIds(parsed.filter((item): item is string => typeof item === 'string'));
        }
      }
    } catch (error) {
      console.warn('Unable to hydrate Findr favourites data', error);
      setFavorites([]);
      setPriorityIds([]);
    }
  }, []);

  useEffect(() => {
    if (favorites === null) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRIORITY_STORAGE_KEY, JSON.stringify(priorityIds));
  }, [priorityIds]);

  const favoritesList = favorites ?? [];
  const prioritySet = useMemo(() => new Set(priorityIds), [priorityIds]);

  const { insights, loading: _insightsLoading, error: insightsError, source: insightsSource } = useFavouriteInsights(favoritesList);
  const insightMap = useMemo(() => new Map(insights.map((insight) => [insight.id, insight])), [insights]);

  useEffect(() => {
    if (favoritesList.length === 0) return;

    if (insightsSource === 'supabase') {
      console.info('[Findr Favourites] Supabase insights loaded', { count: insights.length });
    } else if (insightsSource === 'fallback' && insightsError) {
      console.info('[Findr Favourites] Using fallback favourite insights', { error: insightsError });
    }
  }, [favoritesList.length, insightsSource, insights.length, insightsError]);

  const { predictions, loading, error, lastUpdated, reload } = useFishingPredictions({
    rectangleCode: activeRectangle,
    predictionDate,
    language,
    enabled: Boolean(activeRectangle),
  });

  const cards = useMemo(() => {
    if (!predictions) return [];
    return predictions
      .map((prediction, index) => mapPrediction(prediction, index))
      .filter((card): card is CardData => card !== null)
      .sort((a, b) => (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity));
  }, [predictions]);

  const favouriteEntries = useMemo<FavouriteEntry[]>(() => {
    const list = favorites ?? [];

    return list.map((id) => {
      const card = cards.find((item) => item.id === id) ?? null;
      const insight = insightMap.get(id);
      const mock = generateMockDetail(id);
      const bestBaitFromPrediction = card?.baitSuggestions.find((item) => item.trim().length > 0);
      const bestBaitFromInsights = insight?.bestBait?.trim();
      const bestBait =
        bestBaitFromPrediction ??
        (bestBaitFromInsights && bestBaitFromInsights.length > 0 ? bestBaitFromInsights : pickFrom(BAIT_FALLBACKS, id, 'bait'));
      const bestBaitSource: FavouriteEntry['bestBaitSource'] = bestBaitFromPrediction
        ? 'prediction'
        : bestBaitFromInsights
          ? insight?.bestBaitSource ?? 'supabase'
          : 'mock';

      return {
        id,
        card,
        name: card?.commonName ?? 'Saved fish',
        scientificName: card?.scientificName,
        emoji: card?.emoji ?? '🐟',
        confidence: card?.confidence ?? null,
        bestBait,
        bestBaitSource,
        season: deriveSeasonLabel(card?.confidence ?? null, insight?.seasonLabel ?? mock.seasonFallback),
        lastPerfectConditions: insight?.lastPerfectConditions ?? mock.lastPerfectConditions,
        swipedDate: insight?.swipedDateLabel ?? mock.swipedDate,
        catches: insight?.catches ?? mock.catches,
        recentActivity: insight?.recentActivity ?? card?.summary ?? mock.recentActivity,
        nextBestDay: insight?.nextBestDay ?? mock.nextBestDay,
        isPriority: prioritySet.has(id),
        isMockOnly: card === null,
        playfulBio: card?.playfulBio,
        image: card?.image,
        imageSource: card?.image ? 'prediction' : 'fallback',
        recencyScore: insight?.recencyScore ?? mock.recencyScore,
      } satisfies FavouriteEntry;
    });
  }, [favorites, cards, prioritySet, insightMap]);

  useEffect(() => {
    console.info('[Findr Favourites] Using hard-coded engagement datasets until Supabase integrations land.', {
      swipedDateSamples: SWIPED_DATE_OPTIONS.slice(0, 3),
      lastConditionsSamples: LAST_CONDITIONS_OPTIONS.slice(0, 3),
      activitySamples: RECENT_ACTIVITY_OPTIONS.slice(0, 3),
      baitFallbackCount: BAIT_FALLBACKS.length,
    });
  }, []);

  useEffect(() => {
    const mockDependent = favouriteEntries.filter(
      (entry) => entry.bestBaitSource === 'mock' || entry.isMockOnly
    ).length;
    if (mockDependent === 0) return;
    console.info('[Findr Favourites] Mocked favourite entries detected – replace with analytics from Supabase/weather.', {
      mockDependent,
      totalEntries: favouriteEntries.length,
    });
  }, [favouriteEntries]);

  const sortedFavourites = useMemo(() => {
    const entries = [...favouriteEntries];
    switch (sortBy) {
      case 'catches':
        entries.sort((a, b) => b.catches - a.catches);
        break;
      case 'recent':
        entries.sort((a, b) => b.recencyScore - a.recencyScore);
        break;
      case 'confidence':
      default:
        entries.sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1));
        break;
    }
    return entries;
  }, [favouriteEntries, sortBy]);

  const hotRightNow = useMemo(
    () => sortedFavourites.filter((entry) => entry.confidence !== null).slice(0, 3),
    [sortedFavourites]
  );

  const priorityFish = useMemo(
    () => favouriteEntries.filter((entry) => entry.isPriority),
    [favouriteEntries]
  );

  const totalCatches = useMemo(
    () => favouriteEntries.reduce((sum, entry) => sum + entry.catches, 0),
    [favouriteEntries]
  );

  const missingLiveDataCount = useMemo(
    () => favouriteEntries.filter((entry) => entry.isMockOnly).length,
    [favouriteEntries]
  );

  const missingImageCount = useMemo(
    () => favouriteEntries.filter((entry) => !getPreferredImageUrl(entry.image ?? entry.card?.image ?? null)).length,
    [favouriteEntries]
  );

  const handleSortChange = useCallback((sortOption: SortOption) => {
    setSortBy(sortOption);
  }, []);

  const handleFishClick = useCallback((entry: FavouriteEntry) => {
    setSelectedFish(entry);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedFish(null);
  }, []);

  const showSwipeAction = useCallback((message: string, type: 'success' | 'remove' | 'info') => {
    // Placeholder feedback: swap for toast once shared notification system lands.
    console.info(`[findr favourites:${type}] ${message}`);
  }, []);

  const removeFavourite = useCallback((fishId: string) => {
    setFavorites((prev) => {
      if (prev === null) return prev;
      return prev.filter((item) => item !== fishId);
    });
    setPriorityIds((prev) => prev.filter((item) => item !== fishId));
  }, []);

  const togglePriority = useCallback((fishId: string) => {
    setPriorityIds((prev) =>
      prev.includes(fishId) ? prev.filter((item) => item !== fishId) : [...prev, fishId]
    );
  }, []);

  const stopPropagation = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  }, []);

  const handleTouchStart = useCallback((fishId: string, event: React.TouchEvent) => {
    const touch = event.touches[0];
    setSwipeStates((prev) => ({
      ...prev,
      [fishId]: { x: touch.clientX, y: touch.clientY, swiping: true },
    }));
  }, []);

  const handleTouchMove = useCallback(
    (fishId: string, event: React.TouchEvent) => {
      const state = swipeStates[fishId];
      if (!state?.swiping) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - state.x;
      const deltaY = touch.clientY - state.y;
      const card = event.currentTarget as HTMLElement;
      card.style.transform = `translateX(${deltaX * 0.5}px) translateY(${deltaY * 0.3}px) rotate(${deltaX * 0.1}deg)`;

      if (Math.abs(deltaX) > 50) {
        card.style.borderColor = deltaX > 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      } else if (Math.abs(deltaY) > 50 && deltaY < 0) {
        card.style.borderColor = 'rgba(59, 130, 246, 0.5)';
      } else {
        card.style.borderColor = '';
      }
    },
    [swipeStates]
  );

  const handleTouchEnd = useCallback(
    (fishId: string, event: React.TouchEvent) => {
      const state = swipeStates[fishId];
      if (!state?.swiping) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - state.x;
      const deltaY = touch.clientY - state.y;
      const card = event.currentTarget as HTMLElement;

      card.style.transform = '';
      card.style.borderColor = '';
      card.style.transition = 'all 0.3s ease';

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
        if (deltaX > 0) {
          togglePriority(fishId);
          showSwipeAction('Marked as priority fish', 'success');
        } else {
          removeFavourite(fishId);
          showSwipeAction('Removed from favourites', 'remove');
        }
      } else if (deltaY < -100) {
        const entry = favouriteEntries.find((item) => item.id === fishId);
        if (entry) {
          handleFishClick(entry);
          showSwipeAction('Opening details…', 'info');
        }
      }

      setSwipeStates((prev) => ({
        ...prev,
        [fishId]: { x: 0, y: 0, swiping: false },
      }));

      window.setTimeout(() => {
        card.style.transition = '';
      }, 300);
    },
    [favouriteEntries, handleFishClick, removeFavourite, showSwipeAction, swipeStates, togglePriority]
  );

  const getPullMessage = useCallback((entry: FavouriteEntry): string => {
    if (entry.isMockOnly) {
      return 'We need a fresh prediction in this area to forecast their vibe.';
    }
    if (entry.confidence !== null && entry.confidence < 70) {
      return "No hard feelings but they are just not into you right now";
    }
    const day = entry.nextBestDay;
    return `Most likely to pull on ${day}`;
  }, []);

  const handleReloadPredictions = useCallback(() => {
    reload();
  }, [reload]);

  const hasFavourites = favoritesList.length > 0;

  return (
    <>
      <Head>
        <title>Findr favourites | WotNow</title>
      </Head>
      <main className={`${montserrat.className} min-h-screen bg-base-100`}>
        <style jsx>{`
          @keyframes swim {
            0% { transform: translateX(0) rotate(0deg); }
            12.5% { transform: translateX(0.5px) rotate(0.2deg); }
            25% { transform: translateX(2px) rotate(1deg); }
            37.5% { transform: translateX(1.5px) rotate(0.7deg); }
            50% { transform: translateX(0) rotate(0deg); }
            62.5% { transform: translateX(-1.5px) rotate(-0.7deg); }
            75% { transform: translateX(-2px) rotate(-1deg); }
            87.5% { transform: translateX(-0.5px) rotate(-0.2deg); }
            100% { transform: translateX(0) rotate(0deg); }
          }

          @keyframes float {
            0% { transform: translateY(0px); }
            25% { transform: translateY(-1.5px); }
            50% { transform: translateY(-3px); }
            75% { transform: translateY(-1.5px); }
            100% { transform: translateY(0px); }
          }

          @keyframes shimmer {
            0% { background-position: -150% 0; }
            25% { background-position: -75% 0; }
            50% { background-position: 0% 0; }
            75% { background-position: 75% 0; }
            100% { background-position: 150% 0; }
          }

          .fish-combo {
            animation: swim 8s cubic-bezier(0.4, 0, 0.6, 1) infinite,
              float 6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          }

          .fish-shimmer {
            position: relative;
            animation: float 5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          }

          .fish-shimmer::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(
              110deg,
              transparent 20%,
              transparent 40%,
              rgba(192, 192, 192, 0.8) 50%,
              rgba(255, 255, 255, 0.9) 55%,
              rgba(192, 192, 192, 0.8) 60%,
              transparent 70%,
              transparent 80%
            );
            animation: shimmer 5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
            border-radius: 50%;
            pointer-events: none;
            mix-blend-mode: overlay;
          }

          .swipeable-card {
            touch-action: none;
            user-select: none;
            transition: all 0.2s ease;
          }

          .swipeable-card:active {
            cursor: grabbing;
          }

          .swipe-hint {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .swipeable-card:hover .swipe-hint {
            opacity: 1;
          }
        `}</style>

      {/* Navigation component handles responsive display internally */}
      <FindrNavigation />        {/* Content container */}
        <div className="mx-auto px-3 pt-6 sm:px-4 md:px-6 lg:max-w-6xl">
          <div className="container mx-auto px-0 lg:px-4 pb-8">
            <header className="text-center mb-8">
              <div className="flex justify-center items-center mb-4">
                <Heart size={32} className="text-pink-400 mr-3 fish-shimmer" />
                <h1 className="text-3xl font-bold text-base-content"><TranslatedText text="Your findr faves" /></h1>
              </div>
              <p className="text-base-content/70 max-w-2xl mx-auto">
                Plan your next session
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-6 text-sm text-base-content/60">
                <div className="badge badge-outline">
                  <Calendar size={14} className="text-primary mr-2" />
                  <span><TranslatedText text="Forecast day" />: {predictionDate}</span>
                </div>
                <div className="badge badge-outline">
                  <RefreshCw size={14} className="text-secondary mr-2" />
                  <span>
                    {lastUpdated ? (
                      <>
                        <TranslatedText text="Refreshed" /> {new Date(lastUpdated).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </>
                    ) : (
                      <TranslatedText text="Awaiting live predictions" />
                    )}
                  </span>
                  <button
                    onClick={handleReloadPredictions}
                    className="btn btn-ghost btn-xs ml-2"
                    type="button"
                    aria-label="Reload predictions"
                  >
                    ↻
                  </button>
                </div>
              </div>
              {missingLiveDataCount > 0 && (
                <div className="alert alert-warning mt-3">
                  <span className="text-xs">
                    {missingLiveDataCount} favourite
                    {missingLiveDataCount === 1 ? ' is' : 's are'} waiting for live predictions in this area. We&apos;ll
                    swap in real data as soon as it arrives.
                  </span>
                </div>
              )}
            </header>            {activeRectangle && loading && (
              <div className="alert alert-info mb-6">
                <span className="loading loading-ring loading-xs text-blue-400" aria-hidden />
                <span><TranslatedText text="Fetching live activity for" /> {activeRectangle}…</span>
              </div>
            )}

            {activeRectangle && error && (
                            <div className="alert alert-error mb-6">
                <span>
                  We couldn&apos;t refresh predictions for this area just now. Your favourites are still saved locally — try
                  again in a moment.
                </span>
              </div>
            )}

            {!activeRectangle && (
              <div className="alert alert-info mb-6">
                <span>
                  Pick a fishing area from Findr Home to sync confidence scores for your favourites.
                </span>
              </div>
            )}

            {/* Stats Dashboard */}
            <div className="stats stats-vertical lg:stats-horizontal shadow mb-8">
                            <div className="stat">
                <div className="stat-figure text-error">
                  <TrendingUp size={32} />
                </div>
                <div className="stat-title"><TranslatedText text="Hot Right Now" /></div>
                <div className="stat-value text-error">{hotRightNow.length}</div>
                <div className="stat-desc text-error">
                  <Flame size={12} className="inline mr-1" />
                  <TranslatedText text="fish ready to catch" />
                </div>
              </div>

              <div className="stat">
                <div className="stat-figure text-success">
                  <Fish size={32} className="fish-shimmer" />
                </div>
                <div className="stat-title"><TranslatedText text="Total Catches" /></div>
                <div className="stat-value text-success">{totalCatches}</div>
                <div className="stat-desc text-success">
                  <Trophy size={12} className="inline mr-1" />
                  <TranslatedText text="from your favourites (placeholder)" />
                </div>
              </div>

              <div className="stat">
                <div className="stat-figure text-primary">
                  <Heart size={32} />
                </div>
                <div className="stat-title"><TranslatedText text="Total favourites" /></div>
                <div className="stat-value text-primary">{favoritesList.length}</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-warning">
                  <Target size={32} />
                  {priorityFish.length > 0 && <Star size={16} className="absolute -top-1 -right-1" />}
                </div>
                <div className="stat-title"><TranslatedText text="Priority fish" /></div>
                <div className="stat-value text-warning">{priorityFish.length}</div>
              </div>
            </div>

            {/* Hot Right Now */}
            {hasFavourites && (
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <TrendingUp className="mr-3 text-red-300" />
                  <Flame className="mr-2 text-red-300" size={20} />
                  <TranslatedText text="Hot Right Now" />
                  <span className="ml-2 text-sm font-normal text-gray-400">(<TranslatedText text="top picks by confidence" />)</span>
                </h2>

                {hotRightNow.length === 0 ? (
                  <p className="text-sm text-gray-300"><TranslatedText text="No favourites have live confidence scores yet. Refresh predictions to update." /></p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {hotRightNow.map((entry) => (
                      <div
                        key={entry.id}
                        className={`card ${getConfidenceCardClass(entry.confidence)} cursor-pointer hover:scale-105 transition-transform swipeable-card shadow-md`}
                        onClick={() => handleFishClick(entry)}
                        onTouchStart={(e) => handleTouchStart(entry.id, e)}
                        onTouchMove={(e) => handleTouchMove(entry.id, e)}
                        onTouchEnd={(e) => handleTouchEnd(entry.id, e)}
                      >
                        <div className="card-body p-4">
                        <div className="swipe-hint">← Remove | Priority → | ↑ Details</div>
                        <div className="flex items-center justify-between mb-3 gap-3">
                          <FavouriteThumbnail entry={entry} size={68} />
                          {entry.confidence !== null && <ConfidenceRing confidence={entry.confidence} size={60} />}
                        </div>
                        <h3 className="text-white font-semibold"><TranslatedFishName name={entry.name} /></h3>
                        <p className="text-base-content/70 text-sm"><TranslatedText text={entry.season} /></p>
                        <div className="mt-2 text-xs text-base-content/60">
                          🎣
                          {entry.catches > 0
                            ? <> <TranslatedText text={`Hooked up ${entry.catches} time${entry.catches === 1 ? '' : 's'}`} /></>
                            : <> <TranslatedText text="Still waiting for first catch log" /></>}
                        </div>
                        <div
                          className={`mt-1 text-xs ${entry.confidence !== null && entry.confidence < 70 ? 'text-error' : 'text-info'}`}
                        >
                          <TranslatedText text={getPullMessage(entry)} />
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Sorting Controls */}
            {hasFavourites && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-4 sm:mb-0 flex items-center">
                  <Star className="mr-3 text-yellow-300 fish-combo" />
                  <TranslatedText text="All Your Favourites" /> ({favoritesList.length})
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSortChange('confidence')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      sortBy === 'confidence'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    type="button"
                  >
                    <TranslatedText text="By Confidence" />
                  </button>
                  <button
                    onClick={() => handleSortChange('catches')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      sortBy === 'catches'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    type="button"
                  >
                    <TranslatedText text="By Catches" />
                  </button>
                  <button
                    onClick={() => handleSortChange('recent')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      sortBy === 'recent'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                    type="button"
                  >
                    <TranslatedText text="Recently Added" />
                  </button>
                </div>
              </div>
            )}

            {/* Favourites Grid */}
            {favorites === null ? (
              <div className="text-center text-gray-300 py-16">
                <span className="loading loading-ring loading-md text-blue-400 mb-4 block mx-auto" aria-hidden />
                <TranslatedText text="Loading your favourites…" />
              </div>
            ) : hasFavourites ? (
              <div className="space-y-4">
                {sortedFavourites.map((entry) => (
                  <div
                    key={entry.id}
                    className="card bg-base-200/50 hover:bg-base-200/70 transition-all cursor-pointer swipeable-card shadow-md"
                    onClick={() => handleFishClick(entry)}
                    onTouchStart={(e) => handleTouchStart(entry.id, e)}
                    onTouchMove={(e) => handleTouchMove(entry.id, e)}
                    onTouchEnd={(e) => handleTouchEnd(entry.id, e)}
                  >
                    <div className="card-body p-6">
                      <div className="swipe-hint">← Remove | Priority → | ↑ Details</div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <FavouriteThumbnail entry={entry} size={96} className="shadow-lg" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-xl font-bold text-white"><TranslatedFishName name={entry.name} /></h3>
                            {entry.isPriority && (
                              <span className="inline-flex items-center text-yellow-300" title="Priority fish" aria-label="Priority fish">
                                <Target size={16} />
                              </span>
                            )}
                            {entry.isMockOnly && (
                              <span className="badge badge-xs border border-white/20 text-white/70 bg-white/10">
                                <TranslatedText text="Awaiting live data" />
                              </span>
                            )}
                          </div>
                          {entry.scientificName && (
                            <p className="text-base-content/60 text-sm mb-2 italic">{entry.scientificName}</p>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center text-sm text-base-content/70">
                              <Clock size={14} className="mr-2 text-primary" /> <TranslatedText text="Swiped right" /> {entry.swipedDate}
                            </div>
                            <div className="flex items-center text-sm text-base-content/70">
                              <Fish size={14} className="mr-2 text-success" /> <TranslatedText text={entry.recentActivity} />
                            </div>
                            <div className="flex items-center text-sm text-base-content/70">
                              <Calendar size={14} className="mr-2 text-secondary" /> <TranslatedText text={entry.season} />
                            </div>
                            <div className="flex items-center text-sm text-base-content/70">
                              <Thermometer size={14} className="mr-2 text-warning" /> <TranslatedText text="Perfect conditions" /> {entry.lastPerfectConditions}
                            </div>
                          </div>

                          <div className="bg-primary/20 rounded-lg p-3 mb-3">
                            <div className="text-primary font-medium mb-1 text-sm">
                              🪱 <TranslatedText text="Very attracted to" /> {entry.bestBaitSource === 'mock' && <span className="text-xs uppercase tracking-wide ml-2"><TranslatedText text="placeholder" /></span>}
                            </div>
                            <div className="text-base-content text-sm"><TranslatedText text={entry.bestBait} /></div>
                          </div>
                          
                          <div
                            className={`text-sm font-medium ${
                              entry.confidence !== null && entry.confidence < 70
                                ? 'text-red-200 italic'
                                : 'text-blue-200'
                            }`}
                          >
                            <TranslatedText text={getPullMessage(entry)} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2 ml-4">
                        {entry.confidence !== null ? (
                          <ConfidenceRing confidence={entry.confidence} size={80} />
                        ) : (
                          <div className="text-xs text-gray-300 uppercase tracking-wide"><TranslatedText text="Awaiting data" /></div>
                        )}

                        <div className="flex space-x-2 mt-4">
                          <button
                            onClick={(event) => {
                              stopPropagation(event);
                              togglePriority(entry.id);
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              entry.isPriority
                                ? 'bg-yellow-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                            title={entry.isPriority ? 'Remove from priority' : 'Make priority fish'}
                            type="button"
                          >
                            <Target size={16} />
                          </button>
                          <button
                            onClick={(event) => {
                              stopPropagation(event);
                              handleFishClick(entry);
                            }}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            title="View details"
                            type="button"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(event) => {
                              stopPropagation(event);
                              removeFavourite(entry.id);
                            }}
                            className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Remove from favourites"
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <HeartOff size={64} className="text-base-content/40 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-base-content mb-4"><TranslatedText text="No favourites yet" /></h3>
                <p className="text-base-content/70 mb-6">
                  <TranslatedText text="Start swiping right on fish you want to catch to build your favourites collection!" />
                </p>
                <Link
                  className="btn btn-primary"
                  href="/findr"
                >
                  <Heart size={16} /> <TranslatedText text="Start swiping fish" />
                </Link>
              </div>
            )}

            {/* Footnote about placeholder fields */}
            <p className="text-xs text-gray-400 mt-8 text-center max-w-3xl mx-auto">
              <TranslatedText text="Catch totals, swipe dates, and condition history are placeholders until the catch-logging service ships. Confidence scores, species bios, and bait tips update live from Findr predictions." />
            </p>
            {missingImageCount > 0 && (
              <p className="text-xs text-base-content/40 mt-2 text-center">
                <TranslatedText text={`${missingImageCount} favourite${missingImageCount === 1 ? '' : 's'} are still using emoji stand-ins while we source artwork.`} />
              </p>
            )}
          </div>
        </div>

        {/* Fish Detail Modal */}
        {selectedFish && (() => {
          const heroImageUrl = getPreferredImageUrl(selectedFish.image ?? selectedFish.card?.image ?? null);
          const heroAltText =
            selectedFish.image?.alt ?? selectedFish.card?.image?.alt ?? `${selectedFish.name} illustration`;

          return (
            <div className="modal modal-open">
              <div className="modal-box bg-base-200 space-y-4 max-w-md">
                {heroImageUrl && (
                  <div
                    className="relative overflow-hidden rounded-xl border border-base-300 bg-base-100 flex items-center justify-center min-h-48"
                  >
                    <Image
                      src={heroImageUrl}
                      alt={heroAltText}
                      width={400}
                      height={300}
                      sizes="(min-width: 768px) 420px, 90vw"
                      className="object-contain max-w-full max-h-full"
                    />
                  </div>
                )}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-base-content flex items-center gap-2">
                    <Fish size={24} className="text-primary" aria-hidden />
                    <TranslatedFishName name={selectedFish.name} />
                  </h3>
                  {selectedFish.scientificName && (
                    <p className="text-base-content/70 italic text-sm">{selectedFish.scientificName}</p>
                  )}
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white"
                  type="button"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm text-gray-200">
                {selectedFish.confidence !== null ? (
                  <div><TranslatedText text="Confidence today" />: {selectedFish.confidence}%</div>
                ) : (
                  <div><TranslatedText text="Awaiting live confidence for this area." /></div>
                )}
                <div><TranslatedText text="Best bait" />: <TranslatedText text={selectedFish.bestBait} /></div>
                <div><TranslatedText text="Pull forecast" />: <TranslatedText text={getPullMessage(selectedFish)} /></div>
                {selectedFish.playfulBio && (
                  <div className="bg-base-300/20 border border-base-300 rounded-lg p-3 text-base-content">
                    <TranslatedFishBio bio={selectedFish.playfulBio} />
                  </div>
                )}
                {selectedFish.card?.summary && (
                  <div className="text-base-content/80 leading-relaxed">{selectedFish.card.summary}</div>
                )}
                {selectedFish.isMockOnly && (
                  <div className="alert alert-warning">
                    <span className="text-xs">
                      This favourite doesn&apos;t have live predictions for the current fishing area yet. Refresh or change
                      area to check back soon.
                    </span>
                  </div>
                )}
              </div>

                <div className="modal-action">
                  <button 
                    className="btn btn-primary flex-1" 
                    type="button"
                  >
                    <TranslatedText text="View full profile" />
                  </button>
                  <button 
                    className="btn btn-success flex-1" 
                    type="button"
                  >
                    <TranslatedText text="Log a catch (soon)" />
                  </button>
                </div>
              </div>
              <div className="modal-backdrop" onClick={() => setSelectedFish(null)}>
                <button><TranslatedText text="close" /></button>
              </div>
            </div>
          );
        })()}
      </main>
    </>
  );
};

export default FindrFavouritesPage;
