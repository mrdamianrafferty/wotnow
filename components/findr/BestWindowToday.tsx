'use client';

import React, { useMemo } from 'react';
import { Clock, Fish, MapPin, TrendingUp, Calendar, Zap, AlertCircle } from 'lucide-react';
import { TranslatedText, TranslatedFishName } from '../translation/TranslatedFishCard';

interface FishingWindow {
  timeRange: string;
  species: string[];
  bestBait: string;
  location: string;
  confidence: number;
  reasons: string[];
  isNow: boolean;
  dayLabel?: string;
}

interface BestWindowTodayProps {
  favourites: {
    name: string;
    confidence: number | null;
    biteScore?: number | null;
    bestBait: string;
    card?: {
      environmental_factors?: {
        temperature?: { actual: number; match: string; score: number };
        salinity?: { actual: number; match: string; score: number };
      };
      seasonal_multiplier?: number;
      original_confidence?: number;
    } | null;
    season: string;
    nextBestDay: string;
  }[];
  loading?: boolean;
}

export const BestWindowToday: React.FC<BestWindowTodayProps> = ({ favourites, loading }) => {
  const bestWindow = useMemo((): FishingWindow | null => {
    if (!favourites || favourites.length === 0) return null;

    // Sort by best score (bite score > confidence)
    const scored = favourites
      .map(fav => ({
        ...fav,
        score: fav.biteScore ?? fav.confidence ?? 0
      }))
      .filter(fav => fav.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const topFish = scored.slice(0, 3);
    const bestScore = topFish[0].score;

    // Determine time window based on current hour
    const now = new Date();
    const currentHour = now.getHours();

    let timeRange = '';
    let isNow = false;

    // Dawn: 6-8 AM
    if (currentHour >= 5 && currentHour < 9) {
      timeRange = '6:00-8:00 AM';
      isNow = true;
    }
    // Morning: 9-11 AM
    else if (currentHour >= 9 && currentHour < 12) {
      timeRange = '9:00-11:00 AM';
      isNow = true;
    }
    // Afternoon: 12-4 PM
    else if (currentHour >= 12 && currentHour < 16) {
      timeRange = '12:00-4:00 PM';
      isNow = true;
    }
    // Dusk: 4-7 PM
    else if (currentHour >= 16 && currentHour < 19) {
      timeRange = '4:00-7:00 PM';
      isNow = true;
    }
    // Evening: 7-10 PM
    else if (currentHour >= 19 && currentHour < 22) {
      timeRange = '7:00-10:00 PM';
      isNow = true;
    }
    // Night or early morning - recommend dawn
    else {
      timeRange = 'Tomorrow 6:00-8:00 AM';
      isNow = false;
    }

    // Build reasons based on environmental data
    const reasons: string[] = [];

    if (bestScore >= 70) {
      reasons.push('Good confidence score');
    }

    if (topFish[0].card?.environmental_factors?.temperature) {
      const tempData = topFish[0].card.environmental_factors.temperature;
      if (tempData.match === 'optimal' || tempData.score >= 15) {
        reasons.push(`Water temp: ${tempData.actual.toFixed(1)}°C (ideal)`);
      } else if (tempData.match === 'acceptable') {
        reasons.push(`Water temp: ${tempData.actual.toFixed(1)}°C (okay)`);
      }
    }

    if (topFish[0].card?.seasonal_multiplier && topFish[0].card.seasonal_multiplier >= 0.9) {
      reasons.push('Peak season');
    } else if (topFish[0].card?.seasonal_multiplier && topFish[0].card.seasonal_multiplier >= 0.6) {
      reasons.push('Good season');
    }

    // Add tide info placeholder (will be enhanced with real tide data later)
    if (currentHour >= 5 && currentHour < 9) {
      reasons.push('Dawn feeding time');
    } else if (currentHour >= 16 && currentHour < 19) {
      reasons.push('Dusk feeding time');
    }

    // Determine fishing location based on species preferences
    // This is a simplification - can be enhanced with species-specific data
    let location = 'Pier, breakwater, or harbor';

    const speciesNames = topFish.map(f => f.name.toLowerCase());
    if (speciesNames.some(n => n.includes('bass') || n.includes('mackerel') || n.includes('bonito'))) {
      location = 'Open water or surf (boat or kayak recommended)';
    } else if (speciesNames.some(n => n.includes('mullet') || n.includes('bream'))) {
      location = 'Pier, breakwater, or harbor';
    } else if (speciesNames.some(n => n.includes('flatfish') || n.includes('plaice') || n.includes('flounder'))) {
      location = 'Sandy beaches or shallow bays';
    }

    return {
      timeRange,
      species: topFish.map(f => f.name),
      bestBait: topFish[0].bestBait,
      location,
      confidence: bestScore,
      reasons,
      isNow,
      dayLabel: topFish[0].nextBestDay
    };
  }, [favourites]);

  if (loading) {
    return (
      <div className="card bg-gradient-to-br from-info/20 to-primary/10 border-2 border-info/30 shadow-xl mb-8">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="loading loading-spinner loading-lg text-info"></div>
            <span className="text-lg"><TranslatedText text="Calculating best fishing window..." /></span>
          </div>
        </div>
      </div>
    );
  }

  if (!bestWindow) {
    return (
      <div className="card bg-gradient-to-br from-base-200 to-base-300 border border-base-300 shadow-lg mb-8">
        <div className="card-body">
          <div className="flex items-start gap-3">
            <AlertCircle size={32} className="text-warning flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold mb-2">
                <TranslatedText text="No fishing opportunities right now" />
              </h3>
              <p className="text-sm text-base-content/70">
                <TranslatedText text="Add some favourites or wait for better conditions. We'll let you know when it's time to fish!" />
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { timeRange, species, bestBait, location, confidence, reasons, isNow } = bestWindow;

  // Determine card styling based on confidence
  const getCardStyle = () => {
    if (confidence >= 85) {
      return 'bg-gradient-to-br from-success/20 via-success/10 to-base-100 border-2 border-success shadow-2xl';
    } else if (confidence >= 70) {
      return 'bg-gradient-to-br from-warning/20 via-warning/10 to-base-100 border-2 border-warning shadow-xl';
    } else if (confidence >= 60) {
      return 'bg-gradient-to-br from-info/20 via-info/10 to-base-100 border-2 border-info shadow-lg';
    } else {
      return 'bg-gradient-to-br from-base-200 to-base-300 border border-base-300 shadow-md';
    }
  };

  const getActionText = () => {
    if (confidence >= 85) {
      return isNow ? 'GO FISHING NOW!' : 'GO FISHING TOMORROW';
    } else if (confidence >= 70) {
      return isNow ? 'Good time to fish' : 'Plan your trip';
    } else if (confidence >= 60) {
      return 'Conditions improving soon';
    } else {
      return 'Wait for better conditions';
    }
  };

  const getActionIcon = () => {
    if (confidence >= 85) {
      return <Zap size={24} className="text-success" fill="currentColor" />;
    } else if (confidence >= 70) {
      return <TrendingUp size={24} className="text-warning" />;
    } else {
      return <Calendar size={24} className="text-info" />;
    }
  };

  // For low confidence (<60%), show different layout
  if (confidence < 60) {
    return (
      <div className={`card ${getCardStyle()} mb-8`}>
        <div className="card-body p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-warning" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-base-content">
                  <TranslatedText text="Wait for better conditions" />
                </h2>
                <p className="text-sm text-base-content/60">
                  <TranslatedText text="Based on your favourites" />
                </p>
              </div>
            </div>
            <div className="badge badge-lg badge-outline gap-2 text-base-content border-base-content">
              <span className="font-bold">{confidence}%</span>
              <span className="text-xs opacity-75"><TranslatedText text="confidence" /></span>
            </div>
          </div>

          {/* Target species (still show what we're tracking) */}
          <div className="flex items-start gap-3 p-3 bg-base-100/50 rounded-lg mb-4">
            <Fish size={20} className="text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-base-content"><TranslatedText text="Tracking" /></p>
              <p className="font-bold text-base text-base-content">
                {species.slice(0, 2).map((name, idx) => (
                  <span key={idx}>
                    <TranslatedFishName name={name} />
                    {idx < species.slice(0, 2).length - 1 && ', '}
                  </span>
                ))}
                {species.length > 2 && (
                  <span className="text-xs opacity-75"> +{species.length - 2} more</span>
                )}
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="alert alert-warning">
            <AlertCircle size={20} />
            <div>
              <p className="font-semibold">
                <TranslatedText text="Conditions are suboptimal right now" />
              </p>
              <p className="text-sm">
                <TranslatedText text="Check the weekly planner below to see when conditions improve, or add different species that are more active now." />
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Good confidence (≥60%) - show full recommendations
  return (
    <div className={`card ${getCardStyle()} mb-8 transition-all duration-300 hover:scale-[1.01]`}>
      <div className="card-body p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getActionIcon()}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-base-content">
                <TranslatedText text={getActionText()} />
              </h2>
              <p className="text-sm text-base-content/60">
                <TranslatedText text="Based on your favourites" />
              </p>
            </div>
          </div>
          <div className="badge badge-lg badge-outline gap-2">
            <span className="font-bold">{confidence}%</span>
            <span className="text-xs opacity-75"><TranslatedText text="confidence" /></span>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Time window */}
          <div className="flex items-start gap-3 p-3 bg-base-100/50 rounded-lg">
            <Clock size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-base-content/70"><TranslatedText text="Best window" /></p>
              <p className="font-bold text-base">{timeRange}</p>
            </div>
          </div>

          {/* Target species */}
          <div className="flex items-start gap-3 p-3 bg-base-100/50 rounded-lg">
            <Fish size={20} className="text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-base-content/70"><TranslatedText text="Target species" /></p>
              <p className="font-bold text-base">
                {species.slice(0, 2).map((name, idx) => (
                  <span key={idx}>
                    <TranslatedFishName name={name} />
                    {idx < species.slice(0, 2).length - 1 && ', '}
                  </span>
                ))}
                {species.length > 2 && (
                  <span className="text-xs opacity-75"> +{species.length - 2} more</span>
                )}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3 p-3 bg-base-100/50 rounded-lg">
            <MapPin size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-base-content/70"><TranslatedText text="Where to fish" /></p>
              <p className="font-bold text-base"><TranslatedText text={location} /></p>
            </div>
          </div>

          {/* Bait recommendation */}
          <div className="flex items-start gap-3 p-3 bg-base-100/50 rounded-lg">
            <Fish size={20} className="text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-base-content/70"><TranslatedText text="Recommended bait" /></p>
              <p className="font-bold text-base"><TranslatedText text={bestBait} /></p>
            </div>
          </div>
        </div>

        {/* Why this recommendation */}
        {reasons.length > 0 && (
          <div className="p-3 bg-base-100/50 rounded-lg">
            <p className="font-semibold text-sm text-base-content/70 mb-2">
              <TranslatedText text="Why this recommendation:" />
            </p>
            <ul className="space-y-1">
              {reasons.map((reason, idx) => (
                <li key={idx} className="text-sm text-base-content flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <TranslatedText text={reason} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Call to action */}
        {isNow && confidence >= 70 && (
          <div className="alert alert-success mt-4">
            <Zap size={20} />
            <span className="font-bold">
              <TranslatedText text="Conditions are good right now - grab your gear!" />
            </span>
          </div>
        )}

        {!isNow && confidence >= 70 && (
          <div className="alert alert-info mt-4">
            <Calendar size={20} />
            <span>
              <TranslatedText text="Set an alarm for tomorrow morning's fishing window" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestWindowToday;
