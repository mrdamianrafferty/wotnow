'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Calendar, TrendingUp, Star, AlertTriangle, X, Fish, Flame } from 'lucide-react';
import { TranslatedText, TranslatedFishName } from '../translation/TranslatedFishCard';
import { SPECIES_IMAGE_MAP } from '../../data/speciesImageMap';
import { getBiteWindows, type BiteWindow } from '../../hooks/useBiteScore';

// Helper to find species image by name
function getSpeciesImageByName(name: string): string | null {
  const entry = Object.values(SPECIES_IMAGE_MAP).find(s => s.name === name);
  return entry?.thumb ?? entry?.image ?? null;
}

interface FavouriteWithForecast {
  name: string;
  confidence: number | null;
  forecast?: number[] | null;
  bestBait?: string;
  image?: { src: string; alt: string } | null;
  card?: {
    environmental_factors?: {
      temperature?: { actual: number };
    };
    diurnal_sensitivity?: 'strong' | 'moderate' | 'weak' | null;
    preferred_tide_stage?: string[] | null;
    temp_opt_c?: [number, number] | null;
    flow_preference?: 'slack_avoid' | 'gentle' | 'moderate' | 'strong' | null;
  } | null;
}

interface WeeklyPlannerCardProps {
  favourites: FavouriteWithForecast[];
  loading?: boolean;
}

interface DayPlan {
  dayName: string;
  date: string;
  dayIndex: number;
  isToday: boolean;
  opportunities: {
    name: string;
    confidence: number;
    biteWindows?: BiteWindow[];
    bestBait?: string;
    image?: { src: string; alt: string } | null;
  }[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  conditions?: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDayQuality(avgConfidence: number, topConfidence: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (topConfidence >= 85 || avgConfidence >= 75) return 'excellent';
  if (topConfidence >= 70 || avgConfidence >= 65) return 'good';
  if (topConfidence >= 60 || avgConfidence >= 55) return 'fair';
  return 'poor';
}

export const WeeklyPlannerCard: React.FC<WeeklyPlannerCardProps> = ({ favourites, loading }) => {
  const weeklyPlan = useMemo((): DayPlan[] => {
    if (!favourites || favourites.length === 0) return [];

    const today = new Date();
    const plans: DayPlan[] = [];

    // Generate plans for next 7 days
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayIndex);

      const dayName = dayIndex === 0 ? 'Today' : dayIndex === 1 ? 'Tomorrow' : DAY_NAMES[date.getDay()];
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Find species with good confidence for this day
      const opportunities = favourites
        .filter(fav => {
          if (!fav.forecast || !Array.isArray(fav.forecast)) return false;
          const forecastConfidence = fav.forecast[dayIndex];
          return forecastConfidence !== undefined && forecastConfidence >= 50;
        })
        .map(fav => {
          // Extract bite score params and generate bite windows
          let biteWindows: BiteWindow[] | undefined;
          if (fav.card) {
            const params = {
              diurnalSensitivity: fav.card.diurnal_sensitivity ?? undefined,
              preferredTideStage: fav.card.preferred_tide_stage ?? undefined,
              tempOptC: fav.card.temp_opt_c ?? undefined,
              flowPreference: fav.card.flow_preference ?? undefined,
            };
            biteWindows = getBiteWindows(params);
          }

          return {
            name: fav.name,
            confidence: fav.forecast![dayIndex],
            biteWindows,
            bestBait: fav.bestBait,
            image: fav.image,
          };
        })
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3); // Top 3 species per day

      const avgConfidence = opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + opp.confidence, 0) / opportunities.length
        : 0;

      const topConfidence = opportunities.length > 0 ? opportunities[0].confidence : 0;

      const quality = getDayQuality(avgConfidence, topConfidence);

      // Generate conditions message
      let conditions: string | undefined;
      if (quality === 'poor') {
        conditions = 'Low confidence - conditions not favorable';
      } else if (quality === 'fair') {
        conditions = 'Moderate conditions - worth a try';
      }

      plans.push({
        dayName,
        date: dateStr,
        dayIndex,
        isToday: dayIndex === 0,
        opportunities,
        quality,
        conditions,
      });
    }

    return plans;
  }, [favourites]);

  const bestDay = useMemo(() => {
    if (weeklyPlan.length === 0) return null;
    return weeklyPlan.reduce((best, day) => {
      const bestScore = best.opportunities[0]?.confidence ?? 0;
      const dayScore = day.opportunities[0]?.confidence ?? 0;
      return dayScore > bestScore ? day : best;
    }, weeklyPlan[0]);
  }, [weeklyPlan]);

  if (loading) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <span className="text-lg"><TranslatedText text="Loading weekly forecast..." /></span>
          </div>
        </div>
      </div>
    );
  }

  if (weeklyPlan.length === 0 || weeklyPlan.every(day => day.opportunities.length === 0)) {
    return (
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <AlertTriangle size={32} className="text-warning" />
            <div>
              <h3 className="text-lg font-bold"><TranslatedText text="No good fishing days this week" /></h3>
              <p className="text-sm text-base-content/70">
                <TranslatedText text="Conditions aren't favorable for your favourites. Check back later or try different species." />
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-gradient-to-br from-primary/10 to-secondary/5 shadow-xl">
      <div className="card-body p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar size={28} className="text-primary" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-base-content">
                <TranslatedText text="Your Fishing Week" />
              </h2>
              <p className="text-sm text-base-content/60">
                <TranslatedText text="7-day forecast for your favourites" />
              </p>
            </div>
          </div>
          {bestDay && bestDay.dayIndex > 0 && (
            <div className="badge badge-lg badge-success gap-2">
              <Star size={14} fill="currentColor" />
              <TranslatedText text="Best day" />: {bestDay.dayName}
            </div>
          )}
        </div>

        {/* Weekly Grid */}
        <div className="space-y-3">
          {weeklyPlan.map((day) => {
            const isBestDay = bestDay?.dayIndex === day.dayIndex && day.dayIndex > 0;

            return (
              <div
                key={day.dayIndex}
                className={`card ${
                  day.quality === 'excellent'
                    ? 'bg-gradient-to-r from-success/20 to-success/10 border-2 border-success'
                    : day.quality === 'good'
                    ? 'bg-gradient-to-r from-warning/20 to-warning/10 border-2 border-warning'
                    : day.quality === 'fair'
                    ? 'bg-base-100 border border-info'
                    : 'bg-base-100 border border-base-300 opacity-60'
                } ${isBestDay ? 'ring-2 ring-success ring-offset-2' : ''}`}
              >
                <div className="card-body p-3 sm:p-4">
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                          {day.dayName}
                          {day.isToday && <span className="badge badge-sm badge-primary">Today</span>}
                          {isBestDay && <Star size={16} className="text-success" fill="currentColor" />}
                        </h3>
                        <p className="text-xs text-base-content/60">{day.date}</p>
                      </div>
                    </div>

                    {/* Quality Indicator */}
                    {day.quality === 'excellent' && (
                      <div className="badge badge-success gap-1">
                        <TrendingUp size={12} />
                        <TranslatedText text="Excellent" />
                      </div>
                    )}
                    {day.quality === 'good' && (
                      <div className="badge badge-warning gap-1">
                        <TrendingUp size={12} />
                        <TranslatedText text="Good" />
                      </div>
                    )}
                    {day.quality === 'fair' && (
                      <div className="badge badge-info gap-1">
                        <TranslatedText text="Fair" />
                      </div>
                    )}
                    {day.quality === 'poor' && (
                      <div className="badge badge-ghost gap-1">
                        <X size={12} />
                        <TranslatedText text="Poor" />
                      </div>
                    )}
                  </div>

                  {/* Opportunities */}
                  {day.opportunities.length > 0 ? (
                    <div className="space-y-2">
                      {day.opportunities.map((opp, idx) => {
                        const imagePath = getSpeciesImageByName(opp.name);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-base-200/50 rounded">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Species Thumbnail */}
                              {imagePath ? (
                                <div className="w-8 h-8 relative rounded overflow-hidden bg-base-200 flex-shrink-0">
                                  <Image
                                    src={imagePath}
                                    alt={opp.name}
                                    fill
                                    className="object-contain"
                                    sizes="32px"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 flex items-center justify-center rounded overflow-hidden bg-gradient-to-br from-info/10 to-primary/10 flex-shrink-0">
                                  <Fish size={20} className="text-primary" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate text-base-content flex items-center gap-1">
                                  <TranslatedFishName name={opp.name} />
                                  {opp.confidence >= 85 && (
                                    <Flame size={14} className="text-orange-500 flex-shrink-0" fill="currentColor" />
                                  )}
                                </p>
                                <p className="text-xs text-base-content/60">
                                  {opp.biteWindows && opp.biteWindows.length > 0 ? (
                                    <>
                                      {opp.biteWindows[0].description}
                                      {opp.bestBait && (
                                        <>
                                          {' • '}
                                          <TranslatedText text={opp.bestBait} />
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      Active
                                      {opp.bestBait && (
                                        <>
                                          {' • '}
                                          <TranslatedText text={opp.bestBait} />
                                        </>
                                      )}
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="badge badge-sm badge-outline font-bold">
                              {opp.confidence}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-base-content/50 italic">
                      <TranslatedText text={day.conditions ?? 'No opportunities'} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Tip */}
        <div className="alert alert-info mt-4">
          <Calendar size={16} />
          <span className="text-xs">
            <TranslatedText text="Tip: Forecasts based on historical patterns and environmental data. Check conditions closer to your trip!" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlannerCard;
