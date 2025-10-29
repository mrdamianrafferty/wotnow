'use client';

import React, { useMemo } from 'react';
import { Calendar, TrendingUp, Star, AlertTriangle, X } from 'lucide-react';
import { TranslatedText, TranslatedFishName } from '../translation/TranslatedFishCard';

interface FavouriteWithForecast {
  name: string;
  confidence: number | null;
  forecast?: number[] | null;
  bestBait?: string;
  card?: {
    environmental_factors?: {
      temperature?: { actual: number };
    };
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
    timeWindow: string;
    bestBait?: string;
  }[];
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  conditions?: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getTimeWindow(confidence: number, dayIndex: number): string {
  // Higher confidence species get prime times
  if (confidence >= 80) {
    return dayIndex % 2 === 0 ? '6-8 AM' : '5-7 PM';
  } else if (confidence >= 70) {
    return dayIndex % 2 === 0 ? '7-9 AM' : '4-6 PM';
  } else if (confidence >= 60) {
    return 'Dawn/Dusk';
  }
  return 'Variable';
}

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
          return forecastConfidence !== undefined && forecastConfidence >= 60;
        })
        .map(fav => ({
          name: fav.name,
          confidence: fav.forecast![dayIndex],
          timeWindow: getTimeWindow(fav.forecast![dayIndex], dayIndex),
          bestBait: fav.bestBait,
        }))
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
                      {day.opportunities.map((opp, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-base-200/50 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-2xl">🎣</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                <TranslatedFishName name={opp.name} />
                              </p>
                              <p className="text-xs text-base-content/60">
                                {opp.timeWindow}
                                {opp.bestBait && (
                                  <>
                                    {' • '}
                                    <TranslatedText text={opp.bestBait} />
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="badge badge-sm badge-outline font-bold">
                            {opp.confidence}%
                          </div>
                        </div>
                      ))}
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
