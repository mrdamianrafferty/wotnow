'use client';

import React, { useState } from 'react';
import { Calendar, ShoppingCart, MapPin, TrendingUp, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { TranslatedText, TranslatedFishName } from '../translation/TranslatedFishCard';
import type { FavoritesStrategicAdvice } from '../../lib/findr/generateFavouritesAdvice';

interface StrategicFavouritesViewProps {
  advice: FavoritesStrategicAdvice;
  loading?: boolean;
  onSpeciesClick?: (speciesId: string) => void;
}

export const StrategicFavouritesView: React.FC<StrategicFavouritesViewProps> = ({
  advice,
  loading,
  onSpeciesClick: _onSpeciesClick,
}) => {
  const [expandedSpecies, setExpandedSpecies] = useState<Set<string>>(new Set());

  const toggleSpecies = (speciesCode: string) => {
    setExpandedSpecies((prev) => {
      const next = new Set(prev);
      if (next.has(speciesCode)) {
        next.delete(speciesCode);
      } else {
        next.add(speciesCode);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Overview Card */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <h2 className="card-title text-2xl">
                <TranslatedText text="Week Ahead" />
              </h2>
              <p className="text-sm text-base-content/70">
                {advice.timeframe} • {advice.summary}
              </p>
            </div>
          </div>

          {/* Best Days */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" />
              <TranslatedText text="Best Days This Week" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {advice.weekOverview.bestDays.slice(0, 3).map((day, i) => (
                <div
                  key={day.date}
                  className={`card ${
                    i === 0
                      ? 'bg-primary/20 border-2 border-primary'
                      : 'bg-base-200 border border-base-300'
                  }`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">{day.dayOfWeek}</p>
                        <p className="text-sm text-base-content/70">{day.date}</p>
                      </div>
                      <div className="badge badge-primary badge-lg">{day.score}</div>
                    </div>
                    <p className="text-xs text-base-content/60">
                      {day.species.length} species: {day.species.slice(0, 2).join(', ')}
                      {day.species.length > 2 && ` +${day.species.length - 2}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shopping List */}
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-success" />
              <TranslatedText text="Shopping List" />
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  🪱 <TranslatedText text="Baits" /> ({advice.weekOverview.shoppingList.baits.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {advice.weekOverview.shoppingList.baits.slice(0, 8).map((bait, i) => (
                    <span key={i} className="badge badge-success badge-sm">
                      {bait}
                    </span>
                  ))}
                  {advice.weekOverview.shoppingList.baits.length > 8 && (
                    <span className="badge badge-ghost badge-sm">
                      +{advice.weekOverview.shoppingList.baits.length - 8}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  🎣 <TranslatedText text="Techniques" /> ({advice.weekOverview.shoppingList.techniques.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {advice.weekOverview.shoppingList.techniques.map((tech, i) => (
                    <span key={i} className="badge badge-info badge-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {advice.weekOverview.shoppingList.habitats.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <TranslatedText text="Locations to Access" />
                </h4>
                <div className="flex flex-wrap gap-2">
                  {advice.weekOverview.shoppingList.habitats.map((habitat, i) => (
                    <span key={i} className="badge badge-outline badge-sm">
                      📍 {habitat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Planning Tips */}
          {advice.planningTips.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">💡 Planning Tips:</h4>
              <ul className="space-y-1">
                {advice.planningTips.map((tip, i) => (
                  <li key={i} className="text-sm text-base-content/70 flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Species-by-Species Breakdown */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <TranslatedText text="Species-by-Species Forecast" />
          </h2>

          <div className="space-y-3">
            {advice.weeklyForecasts.slice(0, 10).map((forecast) => {
              const isExpanded = expandedSpecies.has(forecast.species.code);
              const hasWindows = forecast.bestWindows.length > 0;

              return (
                <div
                  key={forecast.species.code}
                  className="collapse collapse-arrow bg-base-200 border border-base-300"
                >
                  <input
                    type="checkbox"
                    checked={isExpanded}
                    onChange={() => toggleSpecies(forecast.species.code)}
                  />
                  <div
                    className="collapse-title flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSpecies(forecast.species.code)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div>
                        <h3 className="font-semibold">
                          <TranslatedFishName name={forecast.species.name} />
                        </h3>
                        <p className="text-xs text-base-content/60">{forecast.outlook}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-primary">{forecast.averageScore}/100</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  <div className="collapse-content">
                    {hasWindows ? (
                      <div className="space-y-3 pt-2">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">
                            ⏰ <TranslatedText text="Best Windows" /> ({forecast.bestWindows.length})
                          </h4>
                          <div className="space-y-2">
                            {forecast.bestWindows.slice(0, 5).map((window, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-sm bg-base-100 p-3 rounded"
                              >
                                <div>
                                  <p className="font-medium">
                                    {window.dayOfWeek} {window.date} at {window.time}
                                  </p>
                                  <p className="text-xs text-base-content/60">
                                    {window.habitat} + {window.technique}
                                  </p>
                                </div>
                                <span className="badge badge-success badge-sm">{window.score}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {forecast.recommendedBaits.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">
                              🪱 <TranslatedText text="Recommended Baits" />:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {forecast.recommendedBaits.map((bait, i) => (
                                <span key={i} className="badge badge-outline badge-sm">
                                  {bait}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-base-content/60 pt-2">
                        <TranslatedText text="No good windows for this species this week" />
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
