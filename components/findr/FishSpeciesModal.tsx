'use client';

import Image from 'next/image';
import React, { useEffect, useId, useMemo, useRef } from 'react';
import {
  Anchor,
  AlertTriangle,
  Clock,
  CloudRain,
  Fish as FishIcon,
  Footprints,
  MapPin,
  Ship,
  Shield,
  Sparkles,
  Thermometer,
  UtensilsCrossed,
  Waves,
  X,
  Target,
  Wand2,
  Mountain,
  ExternalLink,
  ArrowDownUp,
} from 'lucide-react';
import type { CardData } from '../../lib/findr/mapPrediction';
import { getSpeciesAdvice } from '../../data/speciesAdvice';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { useSpeciesDetails } from '../../hooks/useSpeciesDetails';
import { getWeatherMessage } from '../../lib/utils/weatherMessages';

const WeatherGuildMessage: React.FC<{ speciesCode: string; scientificName: string; weatherScore: number; windSpeedMS: number; pressureHPA: number; isLoading?: boolean }> = ({ speciesCode, scientificName, weatherScore, windSpeedMS, pressureHPA, isLoading }) => {
  if (isLoading) {
    return (
      <span className="flex items-center gap-2 text-base-content/60">
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
  return <span>{weather.message}</span>;
};

type SpeciesModalContext = 'shore' | 'boat' | 'both';

interface FishSpeciesModalProps {
  card: CardData | null;
  open: boolean;
  onClose: () => void;
}

interface InfoSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

interface DinnerMaterialRating {
  text: string;
  colorClass: string;
}

const InfoSection: React.FC<InfoSectionProps> = ({ icon, title, children }) => (
  <div className="flex items-start gap-3">
    <div className="text-primary flex-shrink-0">{icon}</div>
    <div className="flex-1 space-y-1">
      <h3 className="font-semibold"><TranslatedText text={title} /></h3>
      <div className="text-sm leading-relaxed text-base-content/70">{children}</div>
    </div>
  </div>
);

const ContextBadge: React.FC<{ context: SpeciesModalContext }> = ({ context }) => {
  if (context === 'both') {
    return (
      <div className="flex flex-wrap gap-2">
        <span className="badge badge-info gap-1">
          <Footprints className="h-3 w-3" /> <TranslatedText text="Shore" />
        </span>
        <span className="badge badge-accent gap-1">
          <Ship className="h-3 w-3" /> <TranslatedText text="Boat" />
        </span>
      </div>
    );
  }

  if (context === 'shore') {
    return (
      <span className="badge badge-info gap-1">
        <Footprints className="h-3 w-3" /> <TranslatedText text="Shore" />
      </span>
    );
  }

  return (
    <span className="badge badge-accent gap-1">
      <Ship className="h-3 w-3" /> <TranslatedText text="Boat" />
    </span>
  );
};

const DINNER_MATERIAL_MAP: Record<number, DinnerMaterialRating> = {
  10: { text: 'First date approved 💍', colorClass: 'text-success' },
  9: { text: "Chef's kiss worthy 👨‍🍳", colorClass: 'text-success' },
  8: { text: 'Solid dinner choice 👍', colorClass: 'text-success' },
  7: { text: 'Pretty decent, not gonna lie', colorClass: 'text-success' },
  6: { text: "It's... fine? 🤷", colorClass: 'text-warning' },
  5: { text: 'Meh territory 😐', colorClass: 'text-warning' },
  4: { text: 'Questionable decision 🤔', colorClass: 'text-warning' },
  3: { text: 'Hard pass 🙅', colorClass: 'text-error' },
  2: { text: 'Ghosting incoming 👻', colorClass: 'text-error' },
  1: { text: 'Pretty revolting — trying to get dumped? 🤮', colorClass: 'text-error' },
};

function getDinnerMaterialText(rating: number | null | undefined): DinnerMaterialRating {
  if (!rating || Number.isNaN(rating)) {
    return { text: 'We still need a tasting note for this one.', colorClass: 'text-base-content/60' };
  }

  const rounded = Math.max(1, Math.min(10, Math.round(rating)));
  return DINNER_MATERIAL_MAP[rounded] ?? { text: 'Meh territory 😐', colorClass: 'text-warning' };
}

function buildLocalizedNameLine(localized?: CardData['localizedNames']): string | null {
  if (!localized) return null;
  const entries: Array<[keyof NonNullable<CardData['localizedNames']>, string]> = [
    ['fr', localized.fr ?? ''],
    ['es', localized.es ?? ''],
    ['pt', localized.pt ?? ''],
    ['it', localized.it ?? ''],
    ['de', localized.de ?? ''],
  ].filter(([, value]) => value && value.trim().length > 0) as Array<[keyof NonNullable<CardData['localizedNames']>, string]>;

  if (entries.length === 0) return null;
  return entries.map(([code, value]) => `${code.toUpperCase()}: ${value}`).join(' · ');
}

function sentenceCase(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export const FishSpeciesModal: React.FC<FishSpeciesModalProps> = ({ card, open, onClose }) => {
  const advice = useMemo(() => {
    if (!card) return null;
    return getSpeciesAdvice(card.commonName, card.speciesCode ?? undefined);
  }, [card]);

  // Fetch enhanced species details
  const { details: speciesDetails, loading: detailsLoading } = useSpeciesDetails({
    speciesId: card?.speciesId,
    speciesCode: card?.speciesCode,
    enabled: open && Boolean(card),
  });

  const titleId = useId();
  const contentId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Lock body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  // Use database advice when available, fallback to hardcoded advice
  const dbAdvice = speciesDetails?.advice;
  const hasShore = !!(dbAdvice?.shore && Object.keys(dbAdvice.shore).length > 0);
  const hasBoat = !!(dbAdvice?.boat && Object.keys(dbAdvice.boat).length > 0);

  // Determine context from database advice or hardcoded advice
  const context: SpeciesModalContext = hasShore && hasBoat ? 'both' : hasBoat ? 'boat' : 'shore';
  const currentAdvice = context === 'boat' ? dbAdvice?.boat : dbAdvice?.shore;

  // Prefer database advice, fallback to hardcoded
  const detail = currentAdvice ? {
    regions: currentAdvice.regions ?? advice?.detail?.regions ?? 'Various regions',
    distance: currentAdvice.distance_depth ?? advice?.detail?.distance ?? 'Varies by location',
    bestTime: currentAdvice.best_time ?? advice?.detail?.bestTime ?? 'Varies',
    tideSensitivity: currentAdvice.tide_sensitivity ?? advice?.detail?.tideSensitivity ?? 'Moderate',
    favouriteBaits: currentAdvice.baits_diet ?? advice?.detail?.favouriteBaits ?? 'Various baits',
    naturalDiet: advice?.detail?.naturalDiet,
    temperature: currentAdvice.temperature_effect ?? advice?.detail?.temperature ?? 'Varies',
    weather: currentAdvice.weather_effect ?? advice?.detail?.weather ?? 'Most conditions',
    edibility: speciesDetails?.eating_quality ?? advice?.detail?.edibility ?? null,
    restrictions: currentAdvice.restrictions ?? advice?.detail?.restrictions ?? 'Check local regulations',
    authority: currentAdvice.authority ?? advice?.detail?.authority ?? null,
  } : advice?.detail;

  const dinnerMaterial = getDinnerMaterialText(detail?.edibility ?? null);
  const localizedLine = buildLocalizedNameLine(card?.localizedNames);
  const contextsAvailable = hasShore && hasBoat ? ['shore', 'boat'] : hasBoat ? ['boat'] : ['shore'];

  if (!open || !card) {
    return null;
  }

  return (
    <div className={`modal ${open ? 'modal-open' : ''}`}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contentId}
        tabIndex={-1}
        className="modal-box w-[calc(100%-1.5rem)] max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 sm:max-w-4xl"
      >
        <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-2 md:px-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Species profile
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 id={titleId} className="text-3xl font-bold leading-tight text-base-content flex items-center gap-2">
                <span className="text-3xl" aria-hidden>
                  {card.emoji}
                </span>
                {card.commonName}
              </h1>
              {advice && <ContextBadge context={advice.context} />}
            </div>
            {card.scientificName && (
              <p className="text-sm italic text-base-content/70">{card.scientificName}</p>
            )}
            {localizedLine && (
              <p className="text-xs text-base-content/60">{localizedLine}</p>
            )}
            {contextsAvailable.length > 1 && advice?.alternate && (
              <p className="text-xs text-base-content/60">
                Bonus tips available for {advice.alternate.context === 'shore' ? 'shore anglers' : 'boat crews'} below.
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm h-10 w-10"
            onClick={onClose}
            aria-label="Close species profile"
          >
            <X size={18} />
          </button>
        </div>

        {card && card.image ? (
          <div className="relative aspect-[3/2] w-full bg-white md:aspect-[16/7]">
            <Image
              src={card.image.src}
              alt={card.image.alt}
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-contain"
              priority={false}
              placeholder={card.image.blurDataURL ? "blur" : undefined}
              blurDataURL={card.image.blurDataURL}
            />
          </div>
        ) : (
          <div className="flex aspect-[3/2] w-full items-center justify-center bg-white text-6xl">
            <span aria-hidden>{card.emoji}</span>
          </div>
        )}

        <div id={contentId} className="space-y-4 px-4 pb-6 pt-4 md:px-6">
          {card.summary && (
            <p className="text-base-content/80 text-sm leading-relaxed md:text-base">{card.summary}</p>
          )}
          {card.playfulBio && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-base-content/80">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                <TranslatedText text="findr bio" />
              </p>
              {card.playfulBio}
            </div>
          )}
          
          {/* Guild weather message */}
          {card.weather_score != null && card.current_wind_speed_ms != null && card.current_pressure_hpa != null && (
            <div className="rounded-xl border-l-4 border-info/40 bg-info/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-info mb-2 flex items-center gap-2">
                <CloudRain size={14} />
                <span><TranslatedText text="Weather check" /></span>
              </p>
              <p className="text-sm leading-relaxed text-base-content/80">
                <WeatherGuildMessage 
                  speciesCode={card.speciesCode || ''}
                  scientificName={card.scientificName || ''}
                  weatherScore={card.weather_score}
                  windSpeedMS={card.current_wind_speed_ms}
                  pressureHPA={card.current_pressure_hpa}
                />
              </p>
            </div>
          )}

          {card.rationale && card.rationale.length > 0 && (
            <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-success mb-3 flex items-center gap-2">
                <span>✨</span>
                <TranslatedText text="Why it works right now" />
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-base-content/80">
                {card.rationale.map((item, idx) => (
                  <li key={`rationale-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {!detail && (
            <div className="alert alert-info text-sm">
              <span>
                We’re still polishing a full species profile for this one. Check back soon, and meanwhile lean on the
                deck notes above.
              </span>
            </div>
          )}

          <div className="space-y-5">
            {detail && (
              <>
                <InfoSection icon={<MapPin size={20} />} title="Where to find them">
                  {sentenceCase(detail.regions)}
                </InfoSection>
                <InfoSection icon={<Anchor size={20} />} title="Where they hang out">
                  {sentenceCase(detail.distance)}
                </InfoSection>
                <InfoSection icon={<Clock size={20} />} title="Prime time">
                  {sentenceCase(detail.bestTime)}
                </InfoSection>
                <InfoSection icon={<Waves size={20} />} title="Tide game">
                  {sentenceCase(detail.tideSensitivity)}
                </InfoSection>
                <InfoSection icon={<FishIcon size={20} />} title="What they're into">
                  <span>{sentenceCase(detail.favouriteBaits)}</span>
                  {detail.naturalDiet && (
                    <span className="mt-1 block text-xs italic text-base-content/60">
                      <TranslatedText text={`Natural diet: ${sentenceCase(detail.naturalDiet)}`} />
                    </span>
                  )}
                </InfoSection>
                <InfoSection icon={<Sparkles size={20} />} title="Fun fact about me">
                  {speciesDetails?.fun_fact ?? advice?.funFact ?? "We're still cataloguing this curiosity."}
                </InfoSection>
                <InfoSection icon={<Thermometer size={20} />} title="Temperature vibe">
                  {sentenceCase(detail.temperature)}
                </InfoSection>
                <InfoSection icon={<CloudRain size={20} />} title="Fave weather">
                  {sentenceCase(detail.weather)}
                </InfoSection>
                <InfoSection icon={<UtensilsCrossed size={20} />} title="Dinner material?">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-semibold text-base-content/60">
                      {detail.edibility != null ? `${Math.round(detail.edibility)}/10` : '—'}
                    </span>
                    <span className={`text-sm font-semibold ${dinnerMaterial.colorClass}`}>
                      {dinnerMaterial.text}
                    </span>
                  </div>
                </InfoSection>
                <InfoSection icon={<AlertTriangle size={20} />} title="Play by the rules">
                  <div className="space-y-2">
                    <p>{sentenceCase(detail.restrictions)}</p>
                    {detail.authority && (
                      <p className="text-xs text-base-content/60">{detail.authority}</p>
                    )}
                  </div>
                </InfoSection>
                <InfoSection icon={<Shield size={20} />} title="Looking after them">
                  {sentenceCase(speciesDetails?.conservation_status ?? advice?.conservation ?? 'Check local guidance for conservation status.')}
                </InfoSection>
              </>
            )}

            {/* Enhanced species data from database */}
            {speciesDetails && !detailsLoading && (
              <>
                {/* Fishing Techniques */}
                {speciesDetails.techniques && speciesDetails.techniques.length > 0 && (
                  <InfoSection icon={<Target size={20} />} title="Best fishing techniques">
                    <div className="space-y-3">
                      {speciesDetails.techniques.slice(0, 3).map((technique) => (
                        <div key={technique.technique_id} className="rounded-lg border border-base-200 bg-base-50 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm">{technique.technique_name}</span>
                            <span className="badge badge-sm badge-primary">
                              {Math.round(technique.effectiveness * 100)}% effective
                            </span>
                          </div>
                          {technique.beginner_tips && (
                            <p className="text-xs text-base-content/70 mt-1">{technique.beginner_tips}</p>
                          )}
                          {technique.notes && (
                            <p className="text-xs text-base-content/60 mt-1 italic">{technique.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </InfoSection>
                )}

                {/* Recommended Bait */}
                {speciesDetails.bait && speciesDetails.bait.length > 0 && (
                  <InfoSection icon={<Wand2 size={20} />} title="Top bait recommendations">
                    <div className="space-y-2">
                      {speciesDetails.bait.slice(0, 5).map((baitItem) => (
                        <div key={baitItem.bait_id} className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className="font-medium text-sm">{baitItem.bait_name}</span>
                            {baitItem.notes && (
                              <p className="text-xs text-base-content/60 mt-0.5">{baitItem.notes}</p>
                            )}
                          </div>
                          <span className="badge badge-sm badge-success shrink-0">
                            {Math.round(baitItem.effectiveness * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </InfoSection>
                )}

                {/* Substrate Preferences */}
                {speciesDetails.substrates && (
                  <InfoSection icon={<Mountain size={20} />} title="Preferred habitats">
                    <div className="flex flex-wrap gap-2">
                      {speciesDetails.substrates.has_sand && (
                        <span className="badge badge-lg gap-1">🏖️ Sand</span>
                      )}
                      {speciesDetails.substrates.has_gravel && (
                        <span className="badge badge-lg gap-1">⚪ Gravel</span>
                      )}
                      {speciesDetails.substrates.has_rock && (
                        <span className="badge badge-lg gap-1">🪨 Rock</span>
                      )}
                      {speciesDetails.substrates.has_mud && (
                        <span className="badge badge-lg gap-1">🟤 Mud</span>
                      )}
                      {speciesDetails.substrates.has_mixed && (
                        <span className="badge badge-lg gap-1">🌊 Mixed</span>
                      )}
                    </div>
                  </InfoSection>
                )}

                {/* Depth Range */}
                {(speciesDetails.min_depth !== null || speciesDetails.max_depth !== null) && (
                  <InfoSection icon={<ArrowDownUp size={20} />} title="Depth range">
                    <div className="flex items-center gap-2">
                      {speciesDetails.min_depth !== null && speciesDetails.max_depth !== null ? (
                        <span className="font-semibold">
                          {speciesDetails.min_depth}m - {speciesDetails.max_depth}m
                        </span>
                      ) : speciesDetails.min_depth !== null ? (
                        <span className="font-semibold">From {speciesDetails.min_depth}m</span>
                      ) : (
                        <span className="font-semibold">Up to {speciesDetails.max_depth}m</span>
                      )}
                      <span className="badge badge-sm badge-info">
                        {speciesDetails.max_depth && speciesDetails.max_depth < 20 ? 'Shallow' :
                         speciesDetails.max_depth && speciesDetails.max_depth < 50 ? 'Medium' : 'Deep'}
                      </span>
                    </div>
                  </InfoSection>
                )}

                {/* iNaturalist Link */}
                {speciesDetails.inaturalist_url && (
                  <InfoSection icon={<ExternalLink size={20} />} title="Learn more">
                    <a
                      href={speciesDetails.inaturalist_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:text-primary-focus transition-colors"
                    >
                      <span>View on iNaturalist</span>
                      <ExternalLink size={14} />
                    </a>
                    <p className="text-xs text-base-content/60 mt-1">
                      Explore photos, observations, and identification guides from the community
                    </p>
                  </InfoSection>
                )}
              </>
            )}

            {advice?.alternate && (
              <div className="rounded-xl border border-base-200 bg-base-100/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                  <TranslatedText text={`Also works ${advice.alternate.context === 'shore' ? 'from shore' : 'by boat'}`} />
                </p>
                <div className="mt-2 space-y-2 text-sm text-base-content/70">
                  <p>
                    <strong><TranslatedText text="Hot spot:" /></strong> {sentenceCase(advice.alternate.detail.distance)}
                  </p>
                  <p>
                    <strong><TranslatedText text="Timing:" /></strong> {sentenceCase(advice.alternate.detail.bestTime)}
                  </p>
                  <p>
                    <strong><TranslatedText text="Confidence boosters:" /></strong> {sentenceCase(advice.alternate.detail.tideSensitivity)}
                  </p>
                </div>
              </div>
            )}

            {card.baitSuggestions.length > 0 && (
              <InfoSection icon={<FishIcon size={20} />} title="Top bait calls">
                {card.baitSuggestions.join(', ')}
              </InfoSection>
            )}
            {card.tideTips.length > 0 && (
              <InfoSection icon={<Waves size={20} />} title="Tide timing from the deck">
                {card.tideTips[0]}
              </InfoSection>
            )}
            {card.statusNotes.length > 0 && (
              <InfoSection icon={<Shield size={20} />} title="Status notes">
                <ul className="list-disc space-y-1 pl-5">
                  {card.statusNotes.slice(0, 3).map((note, idx) => (
                    <li key={`${card.id}-modal-status-${idx}`}>{note}</li>
                  ))}
                </ul>
              </InfoSection>
            )}
          </div>
        </div>
      </div>
      <div className="modal-backdrop glass" onClick={onClose} role="button" tabIndex={0} aria-label="Close" onKeyDown={(e) => e.key === 'Enter' && onClose()} />
    </div>
  );
};

export default FishSpeciesModal;
