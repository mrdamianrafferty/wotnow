'use client';

import React from 'react';

import { Flame, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { TranslatedText, TranslatedFishName } from '../translation/TranslatedFishCard';
import type { FavoritesTacticalAdvice } from '../../lib/findr/generateFavouritesAdvice';

interface TacticalFavouritesCardProps {
  advice: FavoritesTacticalAdvice;
  loading?: boolean;
  onSpeciesClick?: (speciesId: string) => void;
}

export const TacticalFavouritesCard: React.FC<TacticalFavouritesCardProps> = ({
  advice,
  loading,
  onSpeciesClick,
}) => {
  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="skeleton h-8 w-48" />
          </div>
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      </div>
    );
  }

  const hasActiveSpecies = advice.activeNow.length > 0;
  const hasUpcoming = advice.upcomingSoon.length > 0;

  return (
    <div className="card bg-gradient-to-br from-primary/10 via-base-100 to-base-100 shadow-xl border border-primary/20">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {hasActiveSpecies ? (
              <Flame className="text-error w-8 h-8 animate-pulse" />
            ) : (
              <Sparkles className="text-primary w-8 h-8" />
            )}
            <div>
              <h2 className="card-title text-2xl">
                <TranslatedText text="Your Fishing Plan Today" />
              </h2>
              <p className="text-sm text-base-content/70">{advice.summary}</p>
            </div>
          </div>
          {advice.currentConditions.nextTideChange && (
            <div className="badge badge-info gap-2">
              <Clock className="w-4 h-4" />
              {advice.currentConditions.nextTideChange}
            </div>
          )}
        </div>

        {/* Active Now Section */}
        {hasActiveSpecies && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-error" />
              <h3 className="font-bold text-lg">
                <TranslatedText text="Active Right Now" /> ({advice.activeNow.length})
              </h3>
              <span className="badge badge-error badge-sm">
                <TranslatedText text="GO FISH" />
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {advice.activeNow.slice(0, 4).map((species, i) => (
                <div
                  key={species.species.code}
                  className={`card bg-error/10 border-2 border-error/30 cursor-pointer hover:bg-error/20 transition-colors ${
                    i === 0 ? 'ring-2 ring-error ring-offset-2 ring-offset-base-100' : ''
                  }`}
                  onClick={() => onSpeciesClick?.(species.species.code)}
                >
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {i === 0 && <span className="badge badge-error badge-xs">TOP PICK</span>}
                          <h4 className="font-semibold">
                            <TranslatedFishName name={species.species.name} />
                          </h4>
                        </div>
                        {species.approach && (
                          <>
                            <p className="text-sm text-base-content/70 mb-1">
                              📍 {species.approach.habitat}
                            </p>
                            <p className="text-sm text-base-content/70 mb-2">
                              🎣 {species.approach.technique}
                            </p>
                            <p className="text-xs text-base-content/60 italic">
                              {species.approach.explanation}
                            </p>
                          </>
                        )}
                      </div>
                      {species.approach && (
                        <div className="badge badge-error badge-lg">
                          {species.approach.score}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Action Plan */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <TranslatedText text="Your Action Plan" />
          </h3>

          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <span className="badge badge-primary">1</span>
              <p className="flex-1 text-sm">{advice.priorityAdvice.topChoice}</p>
            </div>
            {advice.priorityAdvice.secondChoice && (
              <div className="flex items-start gap-2">
                <span className="badge badge-primary badge-outline">2</span>
                <p className="flex-1 text-sm">{advice.priorityAdvice.secondChoice}</p>
              </div>
            )}
          </div>

          {advice.priorityAdvice.whatToBring.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">
                🎒 <TranslatedText text="Pack Today" />:
              </h4>
              <div className="flex flex-wrap gap-2">
                {advice.priorityAdvice.whatToBring.slice(0, 6).map((item, i) => (
                  <span key={i} className="badge badge-primary badge-sm">
                    {item}
                  </span>
                ))}
                {advice.priorityAdvice.whatToBring.length > 6 && (
                  <span className="badge badge-ghost badge-sm">
                    +{advice.priorityAdvice.whatToBring.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Soon */}
        {hasUpcoming && !hasActiveSpecies && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-warning" />
              <h3 className="font-semibold">
                <TranslatedText text="Worth Waiting For" />
              </h3>
            </div>
            <div className="space-y-1">
              {advice.upcomingSoon.slice(0, 3).map((species) => (
                <div
                  key={species.species.code}
                  className="flex items-center justify-between text-sm p-2 bg-base-200 rounded cursor-pointer hover:bg-base-300"
                  onClick={() => onSpeciesClick?.(species.species.code)}
                >
                  <span>
                    <TranslatedFishName name={species.species.name} />
                  </span>
                  <span className="text-xs text-base-content/60">{species.timing}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Conditions Footer */}
        <div className="flex items-center justify-between text-xs text-base-content/50 mt-4 pt-4 border-t border-base-300">
          <div className="flex items-center gap-4">
            <span>⚡ {advice.currentConditions.tideStage}</span>
            <span>🌅 {advice.currentConditions.timeOfDay}</span>
            <span>💨 {advice.currentConditions.windSpeed} kts</span>
            <span>🌊 {advice.currentConditions.waveHeight} m</span>
          </div>
          <span className="text-xs opacity-50">
            {new Date(advice.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};
