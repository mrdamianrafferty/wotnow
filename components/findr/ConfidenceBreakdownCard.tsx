'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Minus, Calendar } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

interface EnvironmentalFactors {
  temperature?: { actual: number; match: string; score: number; species_pref?: string };
  salinity?: { actual: number; match: string; score: number; species_pref?: string };
  depth?: { actual: number; match: string; score: number; species_pref?: string };
  substrate?: { actual: string; match: string; score: number; species_pref?: string };
  data_age_hours?: number;
  data_source?: string;
}

interface ConfidenceBreakdownCardProps {
  speciesName?: string; // Optional since not currently used, but may be needed for future features
  confidence: number;
  originalConfidence?: number;
  seasonalMultiplier?: number;
  environmentalFactors?: EnvironmentalFactors;
  dataFreshness?: 'fresh' | 'recent' | 'older' | 'stale';
  defaultExpanded?: boolean;
  compact?: boolean;
}

// Convert confidence percentage to 0-5 star rating
function confidenceToStars(confidence: number): number {
  if (confidence <= 0) return 0;
  if (confidence <= 20) return 1;
  if (confidence <= 40) return 2;
  if (confidence <= 60) return 3;
  if (confidence <= 80) return 4;
  return 5;
}

// Render star rating visually
function StarRating({ stars, size = 16 }: { stars: number; size?: number }) {
  const fullStars = Math.floor(stars);
  const hasHalfStar = stars % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className="text-warning" style={{ fontSize: size }}>★</span>
      ))}
      {hasHalfStar && (
        <span className="text-warning" style={{ fontSize: size }}>⯨</span>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className="text-base-content/20" style={{ fontSize: size }}>★</span>
      ))}
      <span className="ml-1 text-xs text-base-content/60">({stars.toFixed(1)}/5)</span>
    </div>
  );
}

export const ConfidenceBreakdownCard: React.FC<ConfidenceBreakdownCardProps> = ({
  confidence,
  originalConfidence,
  seasonalMultiplier,
  environmentalFactors,
  dataFreshness,
  defaultExpanded = false,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const stars = confidenceToStars(confidence);

  // Calculate environmental contribution
  const hasEnvironmentalData = environmentalFactors && (
    environmentalFactors.temperature ||
    environmentalFactors.salinity ||
    environmentalFactors.depth ||
    environmentalFactors.substrate
  );

  const getMatchIcon = (match: string, score: number) => {
    if (match === 'optimal' || score >= 15) {
      return <CheckCircle size={14} className="text-success" />;
    } else if (match === 'acceptable' || score >= 5) {
      return <Minus size={14} className="text-warning" />;
    } else {
      return <AlertCircle size={14} className="text-error" />;
    }
  };

  const getMatchLabel = (match: string, score: number) => {
    if (match === 'optimal' || score >= 15) return 'Optimal';
    if (match === 'acceptable' || score >= 5) return 'Acceptable';
    return 'Suboptimal';
  };

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'text-success';
    if (score >= 5) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className={`card bg-base-200 ${compact ? 'border border-base-300' : 'shadow-md'}`}>
      <div className="card-body p-3">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-base-content">
              <TranslatedText text="Score Breakdown" />
            </span>
            <StarRating stars={stars} size={compact ? 14 : 16} />
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Overall Confidence */}
            <div className="flex items-center justify-between p-2 bg-base-100 rounded">
              <span className="text-sm font-bold text-base-content"><TranslatedText text="Final Confidence" /></span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{confidence}%</span>
              </div>
            </div>

            {/* Environmental Factors */}
            {hasEnvironmentalData && (
              <div>
                <h4 className="text-xs font-semibold text-base-content/70 mb-2 flex items-center gap-1">
                  <TrendingUp size={12} />
                  <TranslatedText text="Environmental Conditions" />
                </h4>
                <div className="space-y-2">
                  {environmentalFactors.temperature && (
                    <div className="flex items-start justify-between p-2 bg-base-100 rounded text-xs">
                      <div className="flex items-start gap-2 flex-1">
                        {getMatchIcon(environmentalFactors.temperature.match, environmentalFactors.temperature.score)}
                        <div>
                          <p className="font-medium">
                            <TranslatedText text="Water Temperature" />
                          </p>
                          <p className="text-base-content/60">
                            {environmentalFactors.temperature.actual.toFixed(1)}°C
                            {environmentalFactors.temperature.species_pref && (
                              <> {' (prefers '}{environmentalFactors.temperature.species_pref}{'°C)'}</>
                            )}
                            {' - '}
                            <TranslatedText text={getMatchLabel(environmentalFactors.temperature.match, environmentalFactors.temperature.score)} />
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${getScoreColor(environmentalFactors.temperature.score)}`}>
                        {environmentalFactors.temperature.score > 0 ? '+' : ''}{environmentalFactors.temperature.score}
                      </span>
                    </div>
                  )}

                  {environmentalFactors.salinity && (
                    <div className="flex items-start justify-between p-2 bg-base-100 rounded text-xs">
                      <div className="flex items-start gap-2 flex-1">
                        {getMatchIcon(environmentalFactors.salinity.match, environmentalFactors.salinity.score)}
                        <div>
                          <p className="font-medium">
                            <TranslatedText text="Salinity" />
                          </p>
                          <p className="text-base-content/60">
                            {environmentalFactors.salinity.actual.toFixed(1)} PSU
                            {environmentalFactors.salinity.species_pref && (
                              <> {' (prefers '}{environmentalFactors.salinity.species_pref}{' PSU)'}</>
                            )}
                            {' - '}
                            <TranslatedText text={getMatchLabel(environmentalFactors.salinity.match, environmentalFactors.salinity.score)} />
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${getScoreColor(environmentalFactors.salinity.score)}`}>
                        {environmentalFactors.salinity.score > 0 ? '+' : ''}{environmentalFactors.salinity.score}
                      </span>
                    </div>
                  )}

                  {environmentalFactors.depth && (
                    <div className="flex items-start justify-between p-2 bg-base-100 rounded text-xs">
                      <div className="flex items-start gap-2 flex-1">
                        {getMatchIcon(environmentalFactors.depth.match, environmentalFactors.depth.score)}
                        <div>
                          <p className="font-medium">
                            <TranslatedText text="Depth" />
                          </p>
                          <p className="text-base-content/60">
                            {environmentalFactors.depth.actual.toFixed(0)}m
                            {environmentalFactors.depth.species_pref && (
                              <> {' (prefers '}{environmentalFactors.depth.species_pref}{'m)'}</>
                            )}
                            {' - '}
                            <TranslatedText text={getMatchLabel(environmentalFactors.depth.match, environmentalFactors.depth.score)} />
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${getScoreColor(environmentalFactors.depth.score)}`}>
                        {environmentalFactors.depth.score > 0 ? '+' : ''}{environmentalFactors.depth.score}
                      </span>
                    </div>
                  )}

                  {environmentalFactors.substrate && (
                    <div className="flex items-start justify-between p-2 bg-base-100 rounded text-xs">
                      <div className="flex items-start gap-2 flex-1">
                        {getMatchIcon(environmentalFactors.substrate.match, environmentalFactors.substrate.score)}
                        <div>
                          <p className="font-medium">
                            <TranslatedText text="Substrate Type" />
                          </p>
                          <p className="text-base-content/60">
                            <TranslatedText text={environmentalFactors.substrate.actual} />
                            {environmentalFactors.substrate.species_pref && (
                              <> {' (prefers '}<TranslatedText text={environmentalFactors.substrate.species_pref} />{')'}</>
                            )}
                            {' - '}
                            <TranslatedText text={getMatchLabel(environmentalFactors.substrate.match, environmentalFactors.substrate.score)} />
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold ${getScoreColor(environmentalFactors.substrate.score)}`}>
                        {environmentalFactors.substrate.score > 0 ? '+' : ''}{environmentalFactors.substrate.score}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seasonal Adjustment */}
            {seasonalMultiplier !== undefined && seasonalMultiplier !== 1.0 && originalConfidence && (
              <div>
                <h4 className="text-xs font-semibold text-base-content/70 mb-2 flex items-center gap-1">
                  <Calendar size={12} />
                  <TranslatedText text="Seasonal Adjustment" />
                </h4>
                <div className="flex items-center justify-between p-2 bg-base-100 rounded text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    {seasonalMultiplier >= 0.9 ? (
                      <TrendingUp size={14} className="text-success" />
                    ) : seasonalMultiplier >= 0.6 ? (
                      <Minus size={14} className="text-warning" />
                    ) : (
                      <TrendingDown size={14} className="text-error" />
                    )}
                    <div>
                      <p className="font-medium">
                        {seasonalMultiplier >= 0.9 ? (
                          <TranslatedText text="Peak Season" />
                        ) : seasonalMultiplier >= 0.6 ? (
                          <TranslatedText text="Shoulder Season" />
                        ) : (
                          <TranslatedText text="Off Season" />
                        )}
                      </p>
                      <p className="text-base-content/60">
                        {Math.round(originalConfidence)}% × {seasonalMultiplier.toFixed(1)} = {confidence}%
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${seasonalMultiplier >= 0.9 ? 'text-success' : seasonalMultiplier >= 0.6 ? 'text-warning' : 'text-error'}`}>
                    {seasonalMultiplier >= 1.0 ? '+' : ''}{Math.round((seasonalMultiplier - 1.0) * originalConfidence)}
                  </span>
                </div>
              </div>
            )}

            {/* Data Freshness */}
            {dataFreshness && (
              <div className="alert alert-sm">
                <AlertCircle size={14} />
                <span className="text-xs">
                  <TranslatedText text="Data freshness" />:{' '}
                  {dataFreshness === 'fresh' && <span className="text-success font-semibold"><TranslatedText text="Fresh" /> (&lt;6h)</span>}
                  {dataFreshness === 'recent' && <span className="text-info font-semibold"><TranslatedText text="Recent" /> (6-24h)</span>}
                  {dataFreshness === 'older' && <span className="text-warning font-semibold"><TranslatedText text="Older" /> (1-3d)</span>}
                  {dataFreshness === 'stale' && <span className="text-error font-semibold"><TranslatedText text="Stale" /> (&gt;3d)</span>}
                </span>
              </div>
            )}

            {/* Calculation Summary */}
            <div className="text-xs text-base-content/60 space-y-1 p-2 bg-base-100 rounded">
              <p className="font-medium text-base-content"><TranslatedText text="How this score was calculated:" /></p>

              {/* Base calculation - always show */}
              <p>
                • <TranslatedText text="Base score from species habitat preferences, historical catch patterns, and typical behavior" />
              </p>

              {/* Environmental factors explanation with species preferences */}
              {hasEnvironmentalData && (
                <>
                  {environmentalFactors.temperature && (
                    <p>
                      • <TranslatedText text="Water temp" />: {environmentalFactors.temperature.actual.toFixed(1)}°C
                      {environmentalFactors.temperature.species_pref && (
                        <> (species prefers {environmentalFactors.temperature.species_pref}°C)</>
                      )}
                      {' → '}
                      <span className={getScoreColor(environmentalFactors.temperature.score)}>
                        {environmentalFactors.temperature.score > 0 ? '+' : ''}{environmentalFactors.temperature.score} points
                      </span>
                    </p>
                  )}
                  {environmentalFactors.salinity && (
                    <p>
                      • <TranslatedText text="Salinity" />: {environmentalFactors.salinity.actual.toFixed(1)} PSU
                      {environmentalFactors.salinity.species_pref && (
                        <> (species prefers {environmentalFactors.salinity.species_pref} PSU)</>
                      )}
                      {' → '}
                      <span className={getScoreColor(environmentalFactors.salinity.score)}>
                        {environmentalFactors.salinity.score > 0 ? '+' : ''}{environmentalFactors.salinity.score} points
                      </span>
                    </p>
                  )}
                  {environmentalFactors.depth && (
                    <p>
                      • <TranslatedText text="Depth" />: {environmentalFactors.depth.actual.toFixed(0)}m
                      {environmentalFactors.depth.species_pref && (
                        <> (species prefers {environmentalFactors.depth.species_pref}m)</>
                      )}
                      {' → '}
                      <span className={getScoreColor(environmentalFactors.depth.score)}>
                        {environmentalFactors.depth.score > 0 ? '+' : ''}{environmentalFactors.depth.score} points
                      </span>
                    </p>
                  )}
                  {environmentalFactors.substrate && (
                    <p>
                      • <TranslatedText text="Substrate" />: <TranslatedText text={environmentalFactors.substrate.actual} />
                      {environmentalFactors.substrate.species_pref && (
                        <> (species prefers <TranslatedText text={environmentalFactors.substrate.species_pref} />)</>
                      )}
                      {' → '}
                      <span className={getScoreColor(environmentalFactors.substrate.score)}>
                        {environmentalFactors.substrate.score > 0 ? '+' : ''}{environmentalFactors.substrate.score} points
                      </span>
                    </p>
                  )}
                </>
              )}

              {/* Seasonal adjustment explanation */}
              {seasonalMultiplier !== undefined && seasonalMultiplier !== 1.0 && originalConfidence && (
                <p>
                  • <TranslatedText text="Seasonal adjustment" />:{' '}
                  {Math.round(originalConfidence)}%{' × '}
                  {seasonalMultiplier >= 0.9 ? (
                    <TranslatedText text="peak season" />
                  ) : seasonalMultiplier >= 0.6 ? (
                    <TranslatedText text="shoulder season" />
                  ) : (
                    <TranslatedText text="off-season" />
                  )}
                  {' '}
                  ({seasonalMultiplier.toFixed(1)})
                  {' = '}
                  {confidence}%
                </p>
              )}

              {/* Data source */}
              <p>
                • <TranslatedText text="Real-time marine data" />:{' '}
                {environmentalFactors?.data_source || 'Copernicus Marine Service'}
                {environmentalFactors?.data_age_hours !== undefined && (
                  <span>
                    {' ('}
                    {environmentalFactors.data_age_hours < 24
                      ? `${Math.round(environmentalFactors.data_age_hours)}h ago`
                      : `${Math.round(environmentalFactors.data_age_hours / 24)}d ago`
                    }
                    {')'}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfidenceBreakdownCard;
