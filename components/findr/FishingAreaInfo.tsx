'use client';

import React from 'react';
import { MapPin, Waves, Fish as FishIcon, Calendar, Thermometer } from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';
import type { RectangleOption } from '../../hooks/useFindrRectangleOptions';

export interface EnvironmentalConditions {
  temperature?: number | null;      // Sea temperature in °C
  salinity?: number | null;         // Salinity in PSU
  speciesCount?: number | null;     // Number of species predicted in area
  dataSource?: string | null;       // Data source (e.g., "CMEMS")
  dataAgeHours?: number | null;     // Age of data in hours
}

export interface FishingAreaInfoProps {
  activeOption: RectangleOption | null;
  activeRectangle: string | null;
  rectangleRegion?: string;
  conditions?: EnvironmentalConditions | null;
}

export const FishingAreaInfo: React.FC<FishingAreaInfoProps> = ({
  activeOption,
  activeRectangle,
  rectangleRegion,
  conditions,
}) => {
  if (!activeOption && !activeRectangle) {
    return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-lg">
              <MapPin size={24} className="text-cyan-500" />
            </div>
            <h2 className="text-xl font-semibold">
              <TranslatedText text="Your Fishing Area" />
            </h2>
          </div>
          <div className="text-center py-8">
            <p className="text-base-content/60 mb-4">
              <TranslatedText text="No location selected" />
            </p>
            <p className="text-sm text-info">
              <TranslatedText text="Use the location button at the top to set your fishing area" />
            </p>
          </div>
        </div>
      </div>
    );
  }

  const displayCode = activeRectangle || '';
  const displayName = activeOption?.label || displayCode;
  // Use rectangleRegion from conditions API if available, otherwise fall back to activeOption
  const region = rectangleRegion || activeOption?.region || 'Unknown region';

  // Determine water type based on coordinates (simplified)
  const getWaterType = () => {
    if (!activeOption) return null;
    // Rough heuristic: if close to land (within certain latitude ranges), likely coastal
    // This is simplified - real data would come from rectangle metadata
    const lat = Math.abs(activeOption.centerLat);
    if (lat > 55 || lat < 40) return 'Open sea';
    return 'Coastal waters';
  };

  const waterType = getWaterType();

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-cyan-500/10 rounded-lg">
            <MapPin size={24} className="text-cyan-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{displayName}</h2>
            <p className="text-sm text-base-content/60">{region}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Location Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg mt-1">
                <MapPin size={18} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-base-content/80">
                  <TranslatedText text="Coordinates" />
                </p>
                {activeOption ? (
                  <p className="text-sm text-base-content/60">
                    {activeOption.centerLat.toFixed(2)}°N, {Math.abs(activeOption.centerLon).toFixed(2)}°
                    {activeOption.centerLon >= 0 ? 'E' : 'W'}
                  </p>
                ) : (
                  <p className="text-sm text-base-content/60">{displayCode}</p>
                )}
              </div>
            </div>

            {waterType && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg mt-1">
                  <Waves size={18} className="text-cyan-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-base-content/80">
                    <TranslatedText text="Water type" />
                  </p>
                  <p className="text-sm text-base-content/60">{waterType}</p>
                </div>
              </div>
            )}
          </div>

          {/* Area Code (Technical) */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg mt-1">
                <FishIcon size={18} className="text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-base-content/80">
                  <TranslatedText text="ICES rectangle" />
                </p>
                <p className="text-sm text-base-content/60 font-mono">{displayCode}</p>
                {region && region !== 'Unknown region' && (
                  <p className="text-sm text-base-content/70 mt-1">{region}</p>
                )}
                <p className="text-xs text-base-content/50 mt-1">
                  <TranslatedText text="International fishing area identifier" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Environmental conditions (shown when data is available) */}
        {conditions && (conditions.temperature != null || conditions.salinity != null || conditions.speciesCount != null) && (
          <>
            <div className="divider my-4"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {conditions.temperature != null && (
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-figure text-cyan-500">
                    <Thermometer size={24} />
                  </div>
                  <div className="stat-title text-xs"><TranslatedText text="Sea Temperature" /></div>
                  <div className="stat-value text-2xl">{conditions.temperature.toFixed(1)}°C</div>
                  <div className="stat-desc">
                    {conditions.dataSource ? (
                      <TranslatedText text={`Source: ${conditions.dataSource}`} />
                    ) : (
                      <TranslatedText text="Current conditions" />
                    )}
                  </div>
                </div>
              )}

              {conditions.salinity != null && (
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-figure text-blue-500">
                    <Waves size={24} />
                  </div>
                  <div className="stat-title text-xs"><TranslatedText text="Salinity" /></div>
                  <div className="stat-value text-2xl">{conditions.salinity.toFixed(1)} PSU</div>
                  <div className="stat-desc">
                    {conditions.dataAgeHours != null ? (
                      <TranslatedText text={`Updated ${conditions.dataAgeHours < 1 ? 'just now' : `${Math.round(conditions.dataAgeHours)}h ago`}`} />
                    ) : (
                      <TranslatedText text="Current reading" />
                    )}
                  </div>
                </div>
              )}

              {conditions.speciesCount != null && conditions.speciesCount > 0 && (
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-figure text-purple-500">
                    <FishIcon size={24} />
                  </div>
                  <div className="stat-title text-xs"><TranslatedText text="Species" /></div>
                  <div className="stat-value text-2xl">{conditions.speciesCount}+</div>
                  <div className="stat-desc"><TranslatedText text="Predicted in area" /></div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="divider my-4"></div>

        {/* Help Text */}
        <div className="flex items-center gap-2 text-sm text-info">
          <Calendar size={16} />
          <span>
            <TranslatedText text="Change location using the button at the top of the page" />
          </span>
        </div>
      </div>
    </div>
  );
};

export default FishingAreaInfo;
