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
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Anchor,
  Fish as FishIcon,
  Heart,
  ListChecks,
  Settings,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { useFishingPredictions } from '../../hooks/useFishingPredictions';
import { FindrNavigation } from '../../components/findr/FindrNavigation';
import { FindrModal } from '../../components/findr/Modal';
import { SettingsForm } from '../../components/findr/SettingsForm';
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
}

const PredictionCardContent: React.FC<PredictionCardContentProps> = ({
  card,
  rectangleCode,
  regionName,
  isFavorite,
  interactive,
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!interactive && expanded) {
      setExpanded(false);
    }
  }, [interactive, expanded]);

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
    displayItems: expanded || !interactive ? section.items : section.items.slice(0, 3),
  }));

  return (
    <div className="card h-full bg-base-100 shadow-xl">
      <div className="card-body space-y-5">
        <div className="space-y-4">
          {card.image ? (
            <div
              className="relative w-full overflow-hidden rounded-2xl bg-base-200"
              style={{ aspectRatio: '4 / 3' }}
            >
              <Image
                src={card.image.src}
                alt={card.image.alt}
                fill
                sizes="(min-width: 1024px) 480px, 100vw"
                className="object-contain"
                priority={false}
              />
            </div>
          ) : (
            <div
              className="flex w-full items-center justify-center rounded-2xl bg-base-200"
              style={{ aspectRatio: '4 / 3' }}
            >
              <span className="text-7xl" aria-hidden>
                {card.emoji}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-base-content/60">
                {regionName ?? 'Prediction summary'}
                {rectangleCode ? ` • ${rectangleCode}` : ''}
              </p>
              <div className="space-y-1">
                <h2 className="card-title text-2xl sm:text-3xl">{card.commonName}</h2>
                {card.speciesCode && (
                  <p className="text-xs uppercase tracking-wide text-base-content/50">{card.speciesCode}</p>
                )}
              </div>
              {card.scientificName && (
                <p className="text-sm italic text-base-content/70">{card.scientificName}</p>
              )}
              {isFavorite && (
                <span className="badge badge-sm badge-primary text-primary-content">Saved</span>
              )}
            </div>
            <button
              type="button"
              className={`btn btn-circle ${interactive ? 'btn-ghost border-base-300 btn-md md:btn-sm' : 'btn-ghost border-transparent opacity-60 pointer-events-none btn-sm'}`}
              onClick={interactive ? () => setExpanded((prev) => !prev) : undefined}
              aria-label={expanded ? 'Hide fishing details' : 'Show fishing details'}
            >
              <Info size={18} />
            </button>
          </div>
        </div>

        {card.confidence !== null && (
          <div className={confidenceBadgeClasses(card.confidence)}>{card.confidence}% fish activity</div>
        )}

        {card.summary && (
          <p className="text-base-content/80 text-sm sm:text-base leading-relaxed">{card.summary}</p>
        )}

        {card.playfulBio && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-2">
              <Heart size={14} /> Findr bio
            </p>
            <p className="text-sm leading-relaxed text-base-content/80">{card.playfulBio}</p>
          </div>
        )}

        {displaySections.map((section) => {
          if (section.items.length === 0) return null;
          return (
            <div key={section.title} className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2 text-base">
                {section.icon}
                <span>{section.title}</span>
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
                    + {section.items.length - section.displayItems.length} more insight
                    {section.items.length - section.displayItems.length === 1 ? '' : 's'}
                  </p>
                )}
            </div>
          );
        })}

        {interactive && !expanded && hasHiddenSections && (
          <p className="text-xs text-base-content/60 pt-1">Tap the info button to reveal full guidance.</p>
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
        className="absolute inset-0 flex h-full w-full select-none items-stretch justify-center p-1 sm:p-2"
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
  <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
    <button
      type="button"
      className="btn btn-outline btn-lg gap-2 min-h-[56px] px-6 w-full sm:w-auto"
      onClick={onSkip}
      disabled={disabled}
    >
      <X size={20} />
      Not interested
    </button>
    <button
      type="button"
      className="btn btn-primary btn-lg gap-2 min-h-[56px] px-6 w-full sm:w-auto"
      onClick={onLike}
      disabled={disabled}
    >
      <Heart size={20} />
      Add to trip
    </button>
  </div>
);

interface QueuePreviewProps {
  cards: CardData[];
  rectangleCode: string | null;
}

const QueuePreview: React.FC<QueuePreviewProps> = ({ cards, rectangleCode }) => {
  if (cards.length === 0) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body text-sm text-base-content/70">
          <p>Swipe right to stash the fish you want to chase. We’ll list upcoming cards here once the deck fills.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body space-y-4">
        <h3 className="card-title text-base flex items-center gap-2">
          <Sparkles size={18} /> Up next
        </h3>
        <ul className="space-y-3">
          {cards.map((card) => (
            <li key={card.id} className="rounded-lg border border-base-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <span className="text-lg" aria-hidden>
                      {card.emoji}
                    </span>
                    {card.commonName}
                  </p>
                  {card.scientificName && (
                    <p className="text-xs italic text-base-content/60">{card.scientificName}</p>
                  )}
                  <p className="text-xs text-base-content/50 mt-1">{rectangleCode ?? 'Fishing area TBD'}</p>
                </div>
                {card.confidence !== null && (
                  <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
                    {card.confidence}%
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface FavoritesListProps {
  cards: CardData[];
  onToggleFavorite: (cardId: string) => void;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ cards, onToggleFavorite }) => {
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
                {card.commonName}
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
  const swipeCardRef = useRef<SwipeCardHandle | null>(null);

  const manualNormalized = useMemo(() => normalizeRectangleCode(manualCode), [manualCode]);
  const activeRectangle = manualNormalized ?? (selectedCode || null);
  const activeOption = useMemo<RectangleOption | null>(
    () => rectangleOptions.find((option) => option.code === (manualNormalized ?? selectedCode)) ?? null,
    [manualNormalized, rectangleOptions, selectedCode]
  );

  useEffect(() => {
    if (selectedCode || manualNormalized) return;
    if (rectangleOptions.length === 0) return;
    setSelectedCode(rectangleOptions[0].code);
  }, [manualNormalized, rectangleOptions, selectedCode, setSelectedCode]);

  useEffect(() => {
    if (!selectedCode || manualNormalized) return;
    if (rectangleOptions.some((option) => option.code === selectedCode)) return;
    if (rectangleOptions.length === 0) return;
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
  const upNext = useMemo(() => cardQueue.slice(1, 4), [cardQueue]);
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
    setCardQueue((queue) => queue.slice(1));
  }, []);

  const handleLike = useCallback((card: CardData) => {
    setFavorites((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));
    setCardQueue((queue) => queue.slice(1));
  }, []);

  const handleToggleFavorite = useCallback((cardId: string) => {
    setFavorites((prev) =>
      prev.includes(cardId) ? prev.filter((item) => item !== cardId) : [...prev, cardId]
    );
  }, []);

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
        <title>Findr predictions | WotNow</title>
      </Head>
      <main className="min-h-screen bg-base-200 pb-16">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          <FindrNavigation />

          <header className="text-center space-y-3">
            <div className="flex justify-center">
              <FishIcon size={42} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Findr fishing predictions</h1>
            <p className="text-base-content/70 max-w-3xl mx-auto">
              Swipe through live Supabase predictions for the fishing spots around you. Save the species you love,
              refresh as conditions shift, and keep a shortlist of targets ready for your next session.
            </p>
            {rectangleOptionsError && (
              <div className="alert alert-warning max-w-3xl mx-auto text-sm">
                <span>
                  Couldn’t reach the live fishing areas service, so we’re showing a trusted offline list instead.
                </span>
              </div>
            )}
            {activeRectangle && (
              <p className="text-sm text-base-content/60">
                Fishing area: <strong>{activeRectangle}</strong>
                {activeOption ? ` • ${activeOption.region}` : manualNormalized ? ' • Custom area' : ''}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3 pt-3">
              <button
                type="button"
                className="btn btn-outline btn-sm gap-2"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings size={16} /> Area settings
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm gap-2"
                onClick={() => setFavoritesOpen(true)}
              >
                <Heart size={16} /> Saved fish
              </button>
            </div>
          </header>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles size={20} /> Today’s fish lineup
              </h2>
              <span className="text-sm text-base-content/60">
                {activeRectangle ? `Fishing area ${activeRectangle}` : 'Choose a fishing area to begin'}
              </span>
            </div>

            {!activeRectangle && (
              <div className="alert alert-info">
                <span>Pick a fishing area to see today’s activity.</span>
              </div>
            )}

            {activeRectangle && loading && (
              <div className="alert alert-info">
                <span className="loading loading-spinner loading-sm" aria-hidden />
                <span>
                  Looking for fish activity near {regionLabel ?? `area ${activeRectangle}`}…
                </span>
              </div>
            )}

            {activeRectangle && !loading && error && (
              <div className="alert alert-error">
                <div>
                  <p>We couldn’t reel in today’s predictions. Try refreshing in a moment.</p>
                  <details className="mt-1 text-xs opacity-80">
                    <summary className="cursor-pointer">View technical details</summary>
                    <pre className="whitespace-pre-wrap break-words">{error}</pre>
                  </details>
                </div>
              </div>
            )}

            {activeRectangle && !loading && !error && currentCard && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),minmax(0,260px)]">
                <div className="space-y-4">
                  <div className="relative h-[520px] w-full">
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
                <QueuePreview cards={upNext} rectangleCode={activeRectangle} />
              </div>
            )}

            {activeRectangle && !loading && !error && !currentCard && totalPredictions > 0 && (
              <div className="alert alert-success">
                <span>You’ve scouted every fish for this spot today. Reset or refresh to check again later.</span>
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
                  <ListChecks size={18} /> Full species lineup
                </h3>
                <span className="text-sm text-base-content/60">
                  Sorted by confidence for {regionLabel ?? `area ${activeRectangle}`}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card, index) => (
                  <article key={card.id} className="card bg-base-100 shadow-md border border-base-200/60">
                    <div className="card-body space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="flex items-center gap-2 text-sm text-base-content/70">
                            <span className="text-2xl" aria-hidden>
                              {card.emoji}
                            </span>
                            <span className="font-semibold text-base-content">{card.commonName}</span>
                          </p>
                          {card.scientificName && (
                            <p className="text-xs italic text-base-content/60">{card.scientificName}</p>
                          )}
                          {card.speciesCode && (
                            <p className="text-xs uppercase tracking-wide text-base-content/50">{card.speciesCode}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {card.confidence !== null ? (
                            <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
                              {card.confidence}%
                            </span>
                          ) : (
                            <span className="badge badge-outline badge-sm">n/a</span>
                          )}
                          <span className="text-xs text-base-content/50">#{index + 1}</span>
                        </div>
                      </div>
                      {card.summary && (
                        <p className="text-sm leading-relaxed text-base-content/80">
                          {card.summary}
                        </p>
                      )}
                      {card.playfulBio && (
                        <p className="text-xs text-base-content/60 bg-base-200/60 rounded-lg p-3">
                          {card.playfulBio}
                        </p>
                      )}
                      <div className="grid gap-2 text-xs text-base-content/70">
                        {card.rationale.length > 0 && (
                          <div>
                            <p className="font-semibold text-base-content/80">Why they’re active</p>
                            <ul className="list-disc pl-4 space-y-1">
                              {card.rationale.slice(0, 3).map((item, idx) => (
                                <li key={`${card.id}-rationale-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {card.baitSuggestions.length > 0 && (
                          <div>
                            <p className="font-semibold text-base-content/80">Bait & presentation</p>
                            <p>{card.baitSuggestions.slice(0, 2).join(', ')}</p>
                          </div>
                        )}
                        {card.tideTips.length > 0 && (
                          <div>
                            <p className="font-semibold text-base-content/80">Tide & timing</p>
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
                <option value="activity">Sort by activity</option>
                <option value="recent">Sort by newest</option>
                <option value="name">Sort alphabetically</option>
              </select>
              <button type="button" className="btn btn-sm btn-outline gap-1" disabled>
                <Sparkles size={14} /> Plan trip
              </button>
            </div>
          </div>
          <FavoritesList cards={favoriteCards} onToggleFavorite={handleToggleFavorite} />
        </div>
      </FindrModal>
    </>
  );
};

export default FindrPage;
