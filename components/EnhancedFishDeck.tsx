// components/EnhancedFishDeck.tsx
// Type-safe AI-enhanced fish deck with personalization
// Drop-in replacement for your existing FishDeck component

import React, { useState, useEffect, useMemo } from 'react';
import { Brain, Sparkles, TrendingUp, Heart } from 'lucide-react';
import {
  buildUserProfile,
  personalizeRecommendations,
  loadUserProfile,
  saveUserProfile,
} from '../utils/aiRecommendations';
import type {
  UserProfile,
  BaseFishMatch,
} from '../types/aiRecommendations';

// ============================================================================
// TYPES - Match your existing Findr types
// ============================================================================

interface FishMatch {
  id: string;
  name: string;
  commonName: string;
  habitat: string;
  seasonalAvailability: string[];
  depthRange: { min: number; max: number };
  preferences: Record<string, unknown>;
  confidence: number;
  bioScore: number;
  seasonScore: number;
  reasoning: string[];
}

interface EnhancedFishMatch extends FishMatch {
  personalScore?: number;
  personalizedReasons?: string[];
  isHotForYou?: boolean;
  yourBestBait?: string;
  finalScore?: number;
}

interface CatchEntry {
  id: string;
  fishId: string;
  fishName: string;
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  icesGrid: string;
  date: string;
  bait: string;
  marineBio: Record<string, number>;
  weatherSummary: string;
  notes?: string;
}

interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface ICESGrid {
  rectangle: string;
  lat: number;
  lon: number;
  area: string;
  subdivision?: string;
}

interface MarineBioData {
  chlorophyllAvg?: number;
  dissolvedOxygenAvg?: number;
  sstAvg?: number;
  salinityAvg?: number;
  [key: string]: number | undefined;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface EnhancedFishDeckProps {
  matches: FishMatch[];
  favorites: string[];
  onToggleFavorite: (fishId: string) => void;
  location?: Location;
  icesGrid?: ICESGrid;
  marineBio?: MarineBioData;
  onLogCatch?: (catchEntry: CatchEntry) => void;
  catches: CatchEntry[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedFishDeck({
  matches,
  favorites,
  onToggleFavorite,
  location,
  icesGrid,
  marineBio,
  onLogCatch,
  catches,
}: EnhancedFishDeckProps): React.ReactElement {
  const [enhancedMatches, setEnhancedMatches] = useState<EnhancedFishMatch[]>([]);
  const [hasPersonalization, setHasPersonalization] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Build user profile whenever catches change
  const userProfile = useMemo<UserProfile | null>(() => {
    if (catches.length < 3) return null;

    try {
      let profile = loadUserProfile();

      // Rebuild if catches changed
      if (!profile || profile.totalCatches !== catches.length) {
        profile = buildUserProfile('current-user', catches, favorites);
        saveUserProfile(profile);
      }

      return profile;
    } catch (error) {
      console.error('Failed to build user profile:', error);
      return null;
    }
  }, [catches, favorites]);

  // Apply AI personalization
  useEffect(() => {
    setIsProcessing(true);

    try {
      if (!userProfile || matches.length === 0) {
        // No personalization - use original matches
        setEnhancedMatches(matches as EnhancedFishMatch[]);
        setHasPersonalization(false);
        return;
      }

      // Convert to base match format
      const baseMatches: BaseFishMatch[] = matches.map(match => ({
        id: match.id,
        commonName: match.commonName,
        scientificName: match.name,
        confidence: match.confidence,
        bestBait: 'Live bait',
        bioScore: match.bioScore,
        seasonScore: match.seasonScore,
      }));

      // Apply personalization
      const personalizedMatches = personalizeRecommendations(
        baseMatches,
        userProfile,
        {
          location: icesGrid?.rectangle,
          marineBio: marineBio as Record<string, number> | undefined,
          currentHour: new Date().getHours(),
        }
      );

      // Merge back with original matches
      const enhanced: EnhancedFishMatch[] = matches.map(original => {
        const personal = personalizedMatches.find((p: BaseFishMatch) => p.id === original.id);

        if (!personal) return original as EnhancedFishMatch;

        // Calculate composite score: 60% scientific, 40% personal
        const scientificScore = original.confidence;
        const personalScoreValue = personal.personalScore ?? 50;
        const finalScore = scientificScore * 0.6 + personalScoreValue * 0.4;

        return {
          ...original,
          personalScore: personal.personalScore,
          personalizedReasons: personal.personalizedReasons,
          isHotForYou: personal.isHotRightNow,
          yourBestBait: personal.recommendedBait,
          finalScore: Math.round(finalScore),
        };
      });

      // Sort by final score (or personal score if available)
      enhanced.sort((a, b) => {
        const scoreA = a.finalScore ?? a.confidence;
        const scoreB = b.finalScore ?? b.confidence;
        return scoreB - scoreA;
      });

      setEnhancedMatches(enhanced);
      setHasPersonalization(true);
    } catch (error) {
      console.error('Failed to apply personalization:', error);
      setEnhancedMatches(matches as EnhancedFishMatch[]);
      setHasPersonalization(false);
    } finally {
      setIsProcessing(false);
    }
  }, [matches, userProfile, icesGrid, marineBio]);

  if (isProcessing && enhancedMatches.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-3">Loading recommendations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Status Badge */}
      {hasPersonalization && (
        <div className="alert alert-success shadow-lg">
          <Brain className="w-5 h-5" />
          <div>
            <h3 className="font-bold">🤖 AI Personalized</h3>
            <div className="text-sm">
              Based on your {catches.length} catches
            </div>
          </div>
        </div>
      )}

      {/* Fish Cards */}
      {enhancedMatches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No fish matches found for this location</p>
        </div>
      ) : (
        <div className="space-y-4">
          {enhancedMatches.slice(0, 10).map((fish, index) => (
            <EnhancedFishCard
              key={fish.id}
              fish={fish}
              rank={index + 1}
              isFavorite={favorites.includes(fish.id)}
              onToggleFavorite={onToggleFavorite}
              hasPersonalization={hasPersonalization}
              location={location}
              icesGrid={icesGrid}
              marineBio={marineBio}
              onLogCatch={onLogCatch}
            />
          ))}
        </div>
      )}

      {/* Unlock AI Prompt */}
      {!hasPersonalization && catches.length < 3 && (
        <div className="alert alert-info shadow-lg">
          <Sparkles className="w-5 h-5" />
          <div>
            <h3 className="font-bold">Unlock AI Recommendations</h3>
            <div className="text-sm">
              Log {3 - catches.length} more {catches.length === 2 ? 'catch' : 'catches'} to
              get personalized predictions!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENHANCED FISH CARD
// ============================================================================

interface EnhancedFishCardProps {
  fish: EnhancedFishMatch;
  rank: number;
  isFavorite: boolean;
  onToggleFavorite: (fishId: string) => void;
  hasPersonalization: boolean;
  location?: Location;
  icesGrid?: ICESGrid;
  marineBio?: MarineBioData;
  onLogCatch?: (catchEntry: CatchEntry) => void;
}

function EnhancedFishCard({
  fish,
  rank,
  isFavorite,
  onToggleFavorite,
  hasPersonalization,
}: EnhancedFishCardProps): React.ReactElement {
  const [showDetails, setShowDetails] = useState(false);
  const hasAIData = Boolean(fish.personalizedReasons && fish.personalizedReasons.length > 0);

  return (
    <div
      className={`card bg-base-100 shadow-lg hover:shadow-xl transition-shadow ${
        hasAIData ? 'border-2 border-green-400' : ''
      }`}
    >
      <div className="card-body">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-400">#{rank}</span>
              <h2 className="card-title text-xl">
                {fish.commonName}
                {fish.isHotForYou && (
                  <span className="badge badge-error badge-sm gap-1">
                    <TrendingUp className="w-3 h-3" />
                    HOT
                  </span>
                )}
              </h2>
            </div>
            <p className="text-sm text-gray-500 italic">{fish.name}</p>
          </div>

          {/* Score Display */}
          <div className="text-right">
            {hasPersonalization && fish.finalScore !== undefined ? (
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {fish.finalScore}%
                </div>
                <div className="text-xs space-x-2 mt-1">
                  <span className="badge badge-sm badge-outline" title="Scientific score">
                    🔬 {Math.round(fish.confidence)}%
                  </span>
                  <span className="badge badge-sm badge-success" title="Personal score">
                    🤖 {Math.round(fish.personalScore ?? 50)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-3xl font-bold text-blue-600">
                {Math.round(fish.confidence)}%
              </div>
            )}
          </div>
        </div>

        {/* AI Personalization Section */}
        {hasAIData && fish.personalizedReasons && (
          <div className="bg-green-50 rounded-lg p-3 border border-green-200 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-green-700" />
              <span className="text-sm font-bold text-green-800">For You</span>
            </div>
            <div className="space-y-1">
              {fish.personalizedReasons.slice(0, 3).map((reason, i) => (
                <p key={i} className="text-sm text-green-700">
                  {reason}
                </p>
              ))}
              {fish.yourBestBait && (
                <p className="text-sm font-semibold text-green-800 mt-2">
                  💡 Your best bait: {fish.yourBestBait}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Standard Reasoning */}
        {!showDetails && fish.reasoning && fish.reasoning.length > 0 && (
          <div className="mt-3 space-y-1">
            {fish.reasoning.slice(0, 3).map((reason, i) => (
              <p key={i} className="text-sm text-gray-600">
                {reason}
              </p>
            ))}
          </div>
        )}

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 space-y-3">
            <div className="divider my-2">Details</div>
            
            {/* All reasoning */}
            {fish.reasoning && fish.reasoning.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Conditions:</h4>
                <div className="space-y-1">
                  {fish.reasoning.map((reason, i) => (
                    <p key={i} className="text-sm text-gray-600">
                      • {reason}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Habitat */}
            <div>
              <h4 className="font-semibold text-sm mb-1">Habitat:</h4>
              <p className="text-sm text-gray-600">{fish.habitat}</p>
            </div>

            {/* Depth */}
            <div>
              <h4 className="font-semibold text-sm mb-1">Depth Range:</h4>
              <p className="text-sm text-gray-600">
                {fish.depthRange.min}m - {fish.depthRange.max}m
              </p>
            </div>

            {/* Season */}
            <div>
              <h4 className="font-semibold text-sm mb-1">Season:</h4>
              <div className="flex gap-2 flex-wrap">
                {fish.seasonalAvailability.map(season => (
                  <span key={season} className="badge badge-sm">
                    {season}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="card-actions justify-end mt-4">
          <button
            onClick={() => onToggleFavorite(fish.id)}
            className={`btn btn-sm ${isFavorite ? 'btn-primary' : 'btn-outline'}`}
            type="button"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Favorited' : 'Favorite'}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn btn-sm btn-ghost"
            type="button"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default EnhancedFishDeck;