'use client';

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Anchor,
  Fish as FishIcon,
  Heart,
  ListChecks,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { useFishingPredictions } from '../../hooks/useFishingPredictions';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { TranslatedFishName, TranslatedFishBio, TranslatedText } from '../../components/translation/TranslatedFishCard';
import { FindrModal } from '../../components/findr/Modal';
import { FishSpeciesModal } from '../../components/findr/FishSpeciesModal';
import { SettingsForm } from '../../components/findr/SettingsForm';
import { SkeletonCard } from '../../components/findr/SkeletonCard';
import {
  FALLBACK_RECTANGLE_OPTIONS,
  useFindrRectangleOptions,
  type RectangleOption,
} from '../../hooks/useFindrRectangleOptions';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { normalizeRectangleCode } from '../../lib/findr/rectangle';
import { getTodayIso } from '../../lib/date/today';
import { mapPrediction, type CardData } from '../../lib/findr/mapPrediction';

const TODAY_ISO = getTodayIso();

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

interface PredictionCardContentProps {
  card: CardData;
  rectangleCode: string | null;
  regionName?: string;
  isFavorite: boolean;
  interactive: boolean;
  onShowSpeciesInfo?: (card: CardData) => void;
  onToggleFavorite?: (cardId: string) => void;
}

const PredictionCardContent: React.FC<PredictionCardContentProps> = ({
  card,
  rectangleCode: _rectangleCode,
  regionName: _regionName,
  isFavorite: _isFavorite,
  interactive,
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
      <div className="card-body flex h-full flex-col gap-4 sm:gap-5">
        <div className="space-y-4">
          {card.image ? (
            <div className="relative mx-auto w-full max-h-48 sm:max-h-64 overflow-hidden rounded-2xl bg-base-200 aspect-[3/2] sm:aspect-[4/3]">
              <Image
                src={card.image.src}
                alt={card.image.alt}
                fill
                sizes="(min-width: 1024px) 400px, 90vw"
                className="object-contain"
                priority={false}
              />
              {/* Heart indicator for favorites */}
              <button
                type="button"
                className="absolute top-2 right-2 p-3 rounded-full bg-transparent hover:bg-white/20 transition-all duration-200 hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(card.id);
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
          ) : (
            <div className="flex aspect-[3/2] w-full items-center justify-center rounded-2xl bg-base-200 sm:aspect-[4/3] relative">
              <span className="text-6xl" aria-hidden>
                {card.emoji}
              </span>
              {/* Heart indicator for favorites */}
              <button
                type="button"
                className="absolute top-2 right-2 p-3 rounded-full bg-transparent hover:bg-white/20 transition-all duration-200 hover:scale-110 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(card.id);
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
            </div>
            <button
              type="button"
              className={`btn btn-circle ${interactive ? 'btn-ghost border-base-300 btn-lg md:btn-md' : 'btn-ghost border-transparent opacity-60 pointer-events-none btn-sm'}`}
              onClick={interactive ? () => setExpanded((prev) => !prev) : undefined}
              aria-label={expanded ? 'Hide fishing details' : 'Show fishing details'}
            >
              <Info size={18} />
            </button>
          </div>
          {card.summary && (
            <p className="text-base-content/80 text-sm sm:text-base leading-relaxed">{card.summary}</p>
          )}
          {onShowSpeciesInfo && (
            <button
              type="button"
              className="btn btn-xs btn-outline gap-1"
              onClick={() => onShowSpeciesInfo(card)}
            >
              <Sparkles size={14} /> <TranslatedText text="Get to know me" />
            </button>
          )}
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
  onToggleFavorite?: (cardId: string) => void;
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
    },
    ref
  ) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-240, 0, 240], [-18, 0, 18]);
    const catchOpacity = useTransform(x, [80, 140], [0, 1]);
    const nopeOpacity = useTransform(x, [-140, -80], [1, 0]);
    const overlayIntensity = useTransform(x, [-240, 0, 240], [0.35, 0, 0.35]);
    const swiping = useRef(false);

    const swipe = useCallback(
      async (direction: SwipeDirection) => {
        if (!isTop || swiping.current) return;
        swiping.current = true;
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 768;
        const targetX = direction === 'right' ? viewportWidth * 0.75 : -viewportWidth * 0.75;
        const controls = animate(x, targetX, { duration: 0.28, ease: 'easeInOut' });
        await controls.finished;
        if (direction === 'right') {
          onSwipedRight(card);
        } else {
          onSwipedLeft();
        }
        swiping.current = false;
      },
      [card, isTop, onSwipedLeft, onSwipedRight, x]
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
              style={{ opacity: catchOpacity }}
            >
              ADD TO TRIP
            </motion.div>
            <motion.div
              className="pointer-events-none absolute right-6 top-6 rounded-xl border-2 border-error bg-error/20 px-4 py-2 text-2xl font-black uppercase tracking-[0.4rem] text-error"
              style={{ opacity: nopeOpacity }}
            >
              SKIP
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
  <div className="flex flex-wrap items-center justify-center gap-4 pt-3 sm:pt-6 px-3 sm:px-0">
    <button
      type="button"
      className="btn btn-outline btn-lg gap-2 min-h-[56px] px-6 w-full sm:w-auto"
      onClick={onSkip}
      disabled={disabled}
    >
      <X size={20} />
      <TranslatedText text="Next!" />
    </button>
    <button
      type="button"
      className="btn btn-primary btn-lg gap-2 min-h-[56px] px-6 w-full sm:w-auto"
      onClick={onLike}
      disabled={disabled}
    >
      <Heart size={20} />
      <TranslatedText text="Fave" />
    </button>
  </div>
);

interface FavoritesListProps {
  cards: CardData[];
  onToggleFavorite: (cardId: string) => void;
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
              onClick={() => onToggleFavorite(card.id)}
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
            <span className="badge badge-outline badge-sm">{card.confidence}% activity</span>
          )}
        </div>
      ))}
    </div>
  );
};

const FindrPage: React.FC = () => {
  const router = useRouter();
  const {
    options: rectangleOptions,
    loading: rectangleOptionsLoading,
    error: rectangleOptionsError,
    isFallback: rectangleOptionsUsingFallback,
  } = useFindrRectangleOptions(FALLBACK_RECTANGLE_OPTIONS);

  const {
    selectedCode,
    setSelectedCode,
    manualCode,
    setManualCode,
    predictionDate,
    setPredictionDate,
    language,
    setLanguage,
  } = usePersistentFindrSettings({ predictionDate: TODAY_ISO, language: 'en' });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cardQueue, setCardQueue] = useState<CardData[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [speciesModalCard, setSpeciesModalCard] = useState<CardData | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const speciesModalOpen = Boolean(speciesModalCard);
  const swipeCardRef = useRef<SwipeCardHandle | null>(null);

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

  const manualNormalized = useMemo(() => normalizeRectangleCode(manualCode), [manualCode]);
  const activeRectangle = manualNormalized ?? (selectedCode || null);
  const activeOption = useMemo<RectangleOption | null>(
    () => rectangleOptions.find((option) => option.code === (manualNormalized ?? selectedCode)) ?? null,
    [manualNormalized, rectangleOptions, selectedCode]
  );

  // Auto-select first rectangle if none selected
  useEffect(() => {
    // Don't auto-select if manual code is being used
    if (manualNormalized) return;
    // Don't auto-select if valid rectangle already selected
    if (selectedCode && rectangleOptions.some(opt => opt.code === selectedCode)) return;
    // Don't auto-select if rectangles not loaded yet
    if (rectangleOptions.length === 0) return;
    // Auto-select first rectangle
    setSelectedCode(rectangleOptions[0].code);
  }, [manualNormalized, rectangleOptions, selectedCode, setSelectedCode]);

  const { predictions, loading, error, lastUpdated, reload } = useFishingPredictions({
    rectangleCode: activeRectangle,
    predictionDate,
    language,
    enabled: Boolean(activeRectangle),
  });

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
    console.info('[Findr] No dynamic predictions available yet. Replace placeholder deck with Supabase/weather output.', {
      rectangleCode: activeRectangle,
      predictionDate,
      hasError: Boolean(error),
    });
  }, [activeRectangle, error, loading, predictionDate, predictions]);

  const cards = useMemo(() => {
    if (!predictions) return [];
    return predictions
      .map((prediction, index) => mapPrediction(prediction, index))
      .filter((card): card is CardData => card !== null)
      .sort((a, b) => (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity));
  }, [predictions]);

  useEffect(() => {
    setCardQueue(cards);
  }, [cards]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('findrFavorites');
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFavorites(parsed.filter((item): item is string => typeof item === 'string'));
      }
    } catch (err) {
      console.warn('Unable to load saved Findr favourites', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('findrFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const currentCard = cardQueue[0] ?? null;
  const visibleCards = useMemo(() => cardQueue.slice(0, 3), [cardQueue]);
  const regionLabel = activeOption?.region ?? (manualNormalized ? 'Custom area' : undefined);

  const favoriteCards = useMemo(
    () => cards.filter((card) => favoritesSet.has(card.id)),
    [cards, favoritesSet]
  );

  const manualInvalid = manualCode.trim().length > 0 && !manualNormalized;
  const totalPredictions = cards.length;
  const deckResetDisabled = loading || cardQueue.length === cards.length;

  const handleSelectOption = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCode(event.target.value);
      setManualCode('');
    },
    [setManualCode, setSelectedCode]
  );

  const handleManualCodeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setManualCode(event.target.value.toUpperCase());
    },
    [setManualCode]
  );

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPredictionDate(event.target.value);
    },
    [setPredictionDate]
  );

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setLanguage(event.target.value);
    },
    [setLanguage]
  );

  const handleSetToday = useCallback(() => {
    setPredictionDate(TODAY_ISO);
  }, [setPredictionDate]);

  const handleSkip = useCallback(() => {
    // Move card to back of queue for infinite looping
    setCardQueue((queue) => (queue.length === 0 ? queue : [...queue.slice(1), queue[0]]));
  }, []);

  const handleLike = useCallback((card: CardData) => {
    setFavorites((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));
    // Move card to back of queue for infinite looping
    setCardQueue((queue) => (queue.length === 0 ? queue : [...queue.slice(1), queue[0]]));
  }, []);

  const handleToggleFavorite = useCallback((cardId: string) => {
    setFavorites((prev) =>
      prev.includes(cardId) ? prev.filter((item) => item !== cardId) : [...prev, cardId]
    );
  }, []);

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
    swipeCardRef.current?.swipeLeft();
  }, [currentCard]);

  const handleProgrammaticLike = useCallback(() => {
    if (!currentCard) return;
    swipeCardRef.current?.swipeRight();
  }, [currentCard]);

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
      <Head>
        <title>findr | catch the fish of your life</title>
      </Head>
      <main className="min-h-screen bg-base-200 pb-16">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="sm:mx-auto px-0 pt-2 sm:px-4 sm:pt-6 md:px-6 lg:max-w-6xl">
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

          <section className="space-y-1 sm:space-y-6">
            <div className="space-y-1 sm:space-y-4 px-3 sm:px-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles size={20} /> <TranslatedText text="Catch of the day" />
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
            </div>

            {!activeRectangle && (
                            <div className="alert alert-info">
                <span><TranslatedText text="Pick a fishing area to see today's activity." /></span>
              </div>
            )}

            {activeRectangle && loading && (
              <div className="space-y-4">
                <div className="alert alert-info">
                  <span className="loading loading-ring loading-sm text-blue-500" aria-hidden />
                  <span>
                    <TranslatedText text="Looking for fish activity near" /> {regionLabel ?? `area ${activeRectangle}`}…
                  </span>
                </div>
                <div className="relative h-[460px] sm:h-[520px] w-full">
                  <SkeletonCard />
                </div>
              </div>
            )}

            {activeRectangle && !loading && error && (
              <div className="alert alert-error">
                <div>
                  <p><TranslatedText text="We couldn't reel in today's predictions. Try refreshing in a moment." /></p>
                  <details className="mt-1 text-xs opacity-80">
                    <summary className="cursor-pointer"><TranslatedText text="View technical guff if you must" /></summary>
                    <pre className="whitespace-pre-wrap break-words">{error}</pre>
                  </details>
                </div>
              </div>
            )}

            {activeRectangle && !loading && !error && currentCard && (
              <div className="space-y-4 max-w-xl mx-auto">
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
                          regionName={regionLabel}
                          onSwipedLeft={handleSkip}
                          onSwipedRight={handleLike}
                          isFavorite={favoritesSet.has(card.id)}
                          onShowSpeciesInfo={handleShowSpeciesInfo}
                          onToggleFavorite={handleToggleFavorite}
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
              <div className="alert alert-warning">
                <span>
                  The fish are quiet here for {predictionDate}. Try different waters or shift the day.
                </span>
              </div>
            )}
          </section>

          {activeRectangle && !loading && !error && totalPredictions > 0 && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ListChecks size={18} /> <TranslatedText text="Full species lineup" />
                </h3>
                <span className="text-sm text-base-content/60">
                  <TranslatedText text="Sorted by confidence for" /> {regionLabel ?? (
                    <>
                      <TranslatedText text="area" /> {activeRectangle}
                    </>
                  )}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card, index) => (
                  <article key={card.id} className="card bg-base-100 shadow-md border border-base-200/60">
                    <div className="card-body space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-base-content">
                            <span className="text-2xl" aria-hidden>
                              {card.emoji}
                            </span>
                            <span className="font-semibold"><TranslatedFishName name={card.commonName} /></span>
                            {card.confidence !== null ? (
                              <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
                                {card.confidence}%
                              </span>
                            ) : (
                              <span className="badge badge-outline badge-sm">n/a</span>
                            )}
                          </div>
                          {card.scientificName && (
                            <p className="text-xs italic text-base-content/60">{card.scientificName}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-base-content/50">#{index + 1}</span>
                        </div>
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
                                                        <p className="font-semibold text-base-content/80"><TranslatedText text="Why they're active" /></p>
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
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>

      <FindrModal title="Area settings" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <SettingsForm
          rectangleOptions={rectangleOptions}
          optionsLoading={rectangleOptionsLoading}
          optionsError={rectangleOptionsError}
          usingFallback={rectangleOptionsUsingFallback}
          selectedCode={selectedCode}
          manualCode={manualCode}
          manualNormalized={manualNormalized}
          manualInvalid={manualInvalid}
          predictionDate={predictionDate}
          language={language}
          loading={loading}
          deckResetDisabled={deckResetDisabled}
          activeOption={activeOption}
          activeRectangle={activeRectangle}
          formattedLastUpdated={formattedLastUpdated}
          totalPredictions={totalPredictions}
          onSelectOption={handleSelectOption}
          onManualCodeChange={handleManualCodeChange}
          onDateChange={handleDateChange}
          onSetToday={handleSetToday}
          onLanguageChange={handleLanguageChange}
          onReload={reload}
          onResetDeck={resetDeck}
        />
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
    </>
  );
};

export default FindrPage;
