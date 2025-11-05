// Added offline detection and UI warning for conditions page
import { AlertTriangle, Eye, EyeOff, Maximize2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
// Offline detection hook
function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(typeof window !== 'undefined' ? !navigator.onLine : false);
  useEffect(() => {
    function handleOnline() { setIsOffline(false); }
    function handleOffline() { setIsOffline(true); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return isOffline;
}
import dynamic from 'next/dynamic';
import type { ConditionsSource } from '../../hooks/useFindrConditions';
import type { FallbackConditionPayload } from '../../lib/findr/fallbackConditions';
import { useFindrEnvironmentalSignals } from '../../hooks/useFindrEnvironmentalSignals';
import { useFindrMarineWeather } from '../../hooks/useFindrMarineWeather';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';
import WindSummaryCard from './weather/WindSummaryCard';
import WaveSummaryCard from './weather/WaveSummaryCard';
import TideSummaryCard from './weather/TideSummaryCard';
import MoonSummaryCardCompact from './weather/MoonSummaryCardCompact';
import MarineBioIndicatorsCard from './weather/MarineBioIndicatorsCard';
import HourlyMarineCarousel from './weather/HourlyMarineCarousel';
import FindrNextFewDaysCard from './weather/FindrNextFewDaysCard';
import {
  buildMarineBioIndicators,
  calculateStealthIndex,
  calculateTargetDepth,
  calculateFeedingPotential,
  calculateBaitfishActivity,
} from '../../utils/bioMarineLevels';
import type { MarineHourlyPoint, TideEvent } from '../../types/weather';
import { TranslatedText } from '../translation/TranslatedFishCard';

const ConditionsMap = dynamic(() => import('./ConditionsMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-base-200/40 rounded-xl animate-pulse border border-base-200">
      <div className="aspect-video flex items-center justify-center text-base-content/60"><TranslatedText text="Loading map..." /></div>
    </div>
  ),
});

interface ConditionsDashboardProps {
  data: FallbackConditionPayload;
  loading: boolean;
  error: string | null;
  source: ConditionsSource;
  onRetry?: () => void;
  rectangleCode?: string | null;
}

interface FishingSpot {
  id: string;
  lat: number;
  lon: number;
  status: 'hot' | 'ok' | 'poor';
  species?: string[];
  depth?: number;
}

interface MapLocation {
  lat: number;
  lon: number;
  name: string;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    // Use UTC to avoid hydration mismatches
    const day = date.getUTCDate();
    const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${day} ${month}, ${hours}:${minutes}`;
  } catch (error) {
    console.warn('Failed to format datetime', { value, error });
    return value;
  }
}

const _sourceBadgeStyles: Record<ConditionsSource, string> = {
  supabase: 'badge-success',
  fallback: 'badge-warning',
};

const DEFAULT_MAP_LOCATION: MapLocation = {
  lat: 43.48,
  lon: -5.27,
  name: 'Asturias Coast',
};

const KTS_TO_MS = 0.514444;
const HOUR_MS = 60 * 60 * 1000;

const toFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normaliseHourlyIso = (raw: unknown, baseUtc: Date, index: number): string => {
  if (typeof raw === 'string') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})/);
    if (hhmmMatch) {
      const [, hh, mm] = hhmmMatch;
      const guess = new Date(baseUtc.getTime());
      guess.setUTCHours(Number.parseInt(hh, 10), Number.parseInt(mm, 10), 0, 0);
      const dayOffset = Math.floor(index / 24);
      guess.setUTCDate(guess.getUTCDate() + dayOffset);
      return guess.toISOString();
    }
  } else if (typeof raw === 'number') {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const fallback = new Date(baseUtc.getTime() + index * HOUR_MS);
  return fallback.toISOString();
};

/**
 * ConditionsDashboard Component
 * 
 * ==============================================================================
 * 🚨 CRITICAL DATA ARCHITECTURE - READ BEFORE MODIFYING
 * ==============================================================================
 * 
 * This component displays marine fishing conditions using TWO SEPARATE data sources:
 * 
 * 1️⃣ LIVE WEATHER DATA (useFindrMarineWeather hook)
 *    Source: MET Norway → Open-Meteo APIs (priority fallback)
 *    Contains: Wave height, wind speed/direction, hourly/daily forecasts
 *    Update frequency: Fetched fresh on every page load (changes hourly)
 *    Why live: Weather changes rapidly - cached data is dangerous for maritime safety
 *    
 *    Usage: marineWeather.current, marineWeather.hourly, marineWeather.daily
 * 
 * 2️⃣ MARINE BIO + TIDE DATA (data.snapshot from Supabase)
 *    Source: Copernicus Marine Service (via ingestion script)
 *    Contains: Chlorophyll, oxygen, nutrients, salinity, tides
 *    Update frequency: Daily ingestion (slow-changing data, safe to cache)
 *    Why cached: These indicators change slowly and don't affect immediate safety
 *    
 *    Usage: data.snapshot.marine (bio indicators), data.snapshot.tides
 * 
 * ⚠️  IMPORTANT RULES:
 * ✅ USE marineWeather FOR: waves, wind, hourly forecasts, daily forecasts
 * ✅ USE data.snapshot FOR: marine bio (chlorophyll, oxygen), tides, water temp
 * ❌ NEVER USE data.snapshot.hourly or data.snapshot.daily for wave/wind display
 * ❌ DO NOT revert to marine.windSpeedKts or marine.waveHeightM directly
 * 
 * 🐛 HISTORICAL BUG FIXED:
 * - fetchMetNoMarineSeries/fetchOpenMeteoMarineSeries defaulted to maxHours:24
 * - This limited data to ~2 days instead of 7
 * - Fixed by passing maxHours:192 in the API endpoint
 * - DO NOT remove maxHours parameter without understanding this bug
 * 
 * 📚 Related Documentation:
 * - LIVE_MARINE_WEATHER_IMPLEMENTATION.md - Implementation details
 * - CRITICAL_DATA_ARCHITECTURE_FIX.md - Architecture explanation
 * - hooks/useFindrMarineWeather.ts - Live weather hook
 * - pages/api/findr/marine-weather.ts - Weather API endpoint
 * ==============================================================================
 */
export function ConditionsDashboard({ data, loading, error, source: _source, onRetry, rectangleCode }: ConditionsDashboardProps) {
  const isOffline = useOfflineStatus();
  const router = useRouter();
  const [showMap, setShowMap] = useState(true);
  const { location } = useUnifiedLocation();
  
  // Extract user's location name from rectangleLabel
  // Format can be either "LocationName" or "CODE - LocationName"
  const userLocationName = useMemo(() => {
    if (!location?.rectangleLabel) return null;
    const parts = location.rectangleLabel.split(' - ');
    // If there's a " - " separator, take everything after it; otherwise use the whole string
    return parts.length > 1 ? parts.slice(1).join(' - ') : location.rectangleLabel;
  }, [location?.rectangleLabel]);
  const [_capturedDisplay, setCapturedDisplay] = useState('—');
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (loading) {
      setCapturedDisplay('—');
      return;
    }
    // Only format time on client to avoid hydration mismatch
    if (isClient) {
      setCapturedDisplay(formatDateTime(data.snapshot.capturedAt));
    }
  }, [data.snapshot.capturedAt, loading, isClient]);

  // ==================================================================================
  // LIVE MARINE WEATHER DATA
  // ==================================================================================
  // Prefer exact user coordinates when available; fall back to rectangle center
  const chosenLat =
    Number.isFinite(location?.lat)
      ? (location!.lat as number)
      : (Number.isFinite(data.rectangle.centerLat) ? data.rectangle.centerLat : null);

  const chosenLon =
    Number.isFinite(location?.lon)
      ? (location!.lon as number)
      : (Number.isFinite(data.rectangle.centerLon) ? data.rectangle.centerLon : null);

  const marineWeather = useFindrMarineWeather(chosenLat, chosenLon);

  // Debug logging
  console.log('[ConditionsDashboard] marineWeather state:', {
    loading: marineWeather.loading,
    error: marineWeather.error,
    source: marineWeather.source,
    hasCurrent: !!marineWeather.current,
    hourlyCount: marineWeather.hourly?.length ?? 0,
    dailyCount: marineWeather.daily?.length ?? 0,
    dailySample: marineWeather.daily?.[0],
    hourlySample: marineWeather.hourly?.[0],
  });

  const environmentalSignals = useFindrEnvironmentalSignals(chosenLat, chosenLon);

  const marine = data.snapshot.marine;
  const marineBio = data.snapshot.marineBio;
  
  // ==================================================================================
  // HOURLY & DAILY FORECASTS - NOW USING LIVE WEATHER DATA
  // ==================================================================================
  // 🔵 Uses marineWeather.hourly and marineWeather.daily (live from APIs)
  // ✅ Provides accurate real-time wave/wind/temperature data
  // ⚠️ Falls back to data.snapshot if live weather API fails
  // ⚠️ tideMeters still comes from Supabase (not in marine weather API)
  // ==================================================================================
  
  const hourly = useMemo(() => {
    // Prefer live weather data from marine-weather API
    if (marineWeather.hourly && marineWeather.hourly.length > 0) {
      const mapped = marineWeather.hourly.slice(0, 12).map(h => ({
        time: h.time,
        waveHeightM: h.waveHeightM ?? null,
        windSpeedKts: typeof h.windSpeedMS === 'number' ? h.windSpeedMS * 1.94384 : null,
        seaTemperatureC: h.seaTemperatureC ?? null,
        waveDirectionDeg: h.waveDirectionDeg,
        wavePeriodS: h.wavePeriodS,
        windDirectionDeg: h.windDirectionDeg,
        tideMeters: null, // Not available in marine weather API
        airTempC: h.airTempC ?? null,
        weatherIcon: h.weatherIcon ?? null,
        precipMM: h.precipMM ?? null,
        precipProbability: h.precipProbability ?? null,
      }));
      console.log('[ConditionsDashboard] Mapped hourly data (first 3):', mapped.slice(0, 3));
      return mapped;
    }
    // Fallback to cached Supabase snapshot (with safety check)
    if (data.snapshot?.hourly && Array.isArray(data.snapshot.hourly)) {
      console.log('[ConditionsDashboard] Using fallback Supabase hourly data');
      return data.snapshot.hourly.slice(0, 12);
    }
    // Return empty array if no data available
    console.log('[ConditionsDashboard] No hourly data available');
    return [];
  }, [marineWeather.hourly, data.snapshot?.hourly]);

  const _daily = useMemo(() => {
    // Prefer live weather data from marine-weather API
    if (marineWeather.daily && marineWeather.daily.length > 0) {
      return marineWeather.daily.slice(0, 7).map(d => ({
        label: d.label,
        dateLabel: d.dateLabel || d.label,
        waveHeightM: d.waveHeightM ?? 0,
        seaTemperatureC: d.seaTemperatureC ?? 0,
        windSpeedKts: typeof d.windSpeedMS === 'number' ? d.windSpeedMS * 1.94384 : 0,
        windDirectionDeg: d.windDirectionDeg,
        fishingScore: d.fishingScore ?? 0,
        summary: d.summary || '',
      }));
    }
    // Fallback to cached Supabase snapshot (with safety check)
    if (data.snapshot?.daily && Array.isArray(data.snapshot.daily)) {
      return data.snapshot.daily.slice(0, 7);
    }
    // Return empty array if no data available
    return [];
  }, [marineWeather.daily, data.snapshot?.daily]);
  
  // Note: Tide data still comes from Supabase hourly (slow-changing, safe to cache)
  const tideExtrema = useMemo(() => {
    // Safety check for snapshot.hourly
    if (!data.snapshot?.hourly || !Array.isArray(data.snapshot.hourly)) {
      return { max: null, min: null } as const;
    }
    
    const heights = data.snapshot.hourly
      .map((entry) => entry.tideMeters)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    if (heights.length === 0) {
      return { max: null, min: null } as const;
    }

    return {
      max: Math.max(...heights),
      min: Math.min(...heights),
    } as const;
  }, [data.snapshot?.hourly]);

  // ==================================================================================
  // TIDE EVENTS - NOW USING 7-DAY WORLDTIDES DATA
  // ==================================================================================
  // 🔵 Uses marineWeather.tides (7 days of high/low tides from WorldTides API)
  // ✅ Provides complete tide schedule for the week
  // ⚠️ Falls back to data.snapshot.tides if live tide data fails
  // ==================================================================================
  const tideEvents = useMemo<TideEvent[]>(() => {
    // Prefer live tide data from WorldTides (7 days of high/low)
    if (marineWeather.tides && marineWeather.tides.length > 0) {
      return marineWeather.tides.map(tide => ({
        timeISO: tide.timeISO,
        type: tide.type,
        heightM: tide.height,
      }));
    }
    
    // Fallback to Supabase snapshot (just next high/low)
    const events: TideEvent[] = [];
    if (data.snapshot.tides.nextHighIso) {
      events.push({ timeISO: data.snapshot.tides.nextHighIso, type: 'HIGH' });
    }
    if (data.snapshot.tides.nextLowIso) {
      events.push({ timeISO: data.snapshot.tides.nextLowIso, type: 'LOW' });
    }
    return events;
  }, [marineWeather.tides, data.snapshot.tides.nextHighIso, data.snapshot.tides.nextLowIso]);

  // ==================================================================================
  // DAILY FORECAST - NOW USING LIVE WEATHER DATA
  // ==================================================================================
  // 🔵 Uses marineWeather.daily (live from MET Norway/Open-Meteo)
  // ✅ Provides accurate 7-day forecasts with real wave/wind data
  // ⚠️ Falls back to data.snapshot.daily if live weather API fails
  // ==================================================================================

  // Extract next high and low tides from tideEvents for the TideSummaryCard
  const nextTides = useMemo(() => {
    const now = Date.now();
    const upcoming = tideEvents
      .filter(event => new Date(event.timeISO).getTime() > now)
      .sort((a, b) => new Date(a.timeISO).getTime() - new Date(b.timeISO).getTime());
    
    const nextHigh = upcoming.find(event => event.type === 'HIGH');
    const nextLow = upcoming.find(event => event.type === 'LOW');
    
    return {
      nextHighIso: nextHigh?.timeISO ?? null,
      nextLowIso: nextLow?.timeISO ?? null,
    };
  }, [tideEvents]);

  const nextFewDaysDaily = useMemo(() => {
    // Prefer live weather data
    if (marineWeather.daily && marineWeather.daily.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const mapped = marineWeather.daily.map((day, index) => ({
        dateISO: new Date(today.getTime() + index * 24 * 60 * 60 * 1000).toISOString(),
        icon: day.icon ?? undefined,
        minC: day.minTempC ?? undefined,
        maxC: day.maxTempC ?? undefined,
        pop: day.precipProbability ?? undefined,
        precipMM: day.precipMM ?? undefined,
        summary: day.summary,
        windMS: day.windSpeedMS ?? undefined,
        windDeg: day.windDirectionDeg ?? undefined,
        uvi: undefined,
      }));
      
      return mapped;
    }

    // Fallback to Supabase data if live weather unavailable
    const entries = data.snapshot.daily || [];
    if (!entries.length) return [];
    const captured = new Date(data.snapshot.capturedAt);
    const baseUtc = Number.isNaN(captured.getTime())
      ? new Date()
      : new Date(Date.UTC(captured.getUTCFullYear(), captured.getUTCMonth(), captured.getUTCDate()));

    return entries.map((entry, index) => {
      const seaTemp = toFiniteNumber(entry.seaTemperatureC);
      const windKts = toFiniteNumber(entry.windSpeedKts);
      return {
        dateISO: new Date(baseUtc.getTime() + index * 24 * HOUR_MS).toISOString(),
        icon: undefined,
        minC: seaTemp,
        maxC: seaTemp,
        pop: undefined,
        precipMM: undefined,
        summary: entry.summary,
        windMS: windKts !== undefined ? windKts * KTS_TO_MS : undefined,
        windDeg: undefined,
        uvi: undefined,
      };
    });
  }, [marineWeather.daily, data.snapshot.daily, data.snapshot.capturedAt]);

  // ==================================================================================
  // 🌊 MARINE HOURLY DATA FOR NEXT FEW DAYS CARD
  // ==================================================================================
  // ✅ Uses LIVE weather data from marineWeather.hourly (real-time wave heights)
  // ⚠️ Falls back to cached Supabase data if live weather fails
  // 📊 NextFewDaysCard uses this to show wave heights for each day
  // ==================================================================================
  const marineHourlyForCard = useMemo<MarineHourlyPoint[]>(() => {
    // Prefer live marine weather data
    if (marineWeather.hourly && marineWeather.hourly.length > 0) {
      return marineWeather.hourly.map((hour) => ({
        timeISO: hour.time,
        waveM: hour.waveHeightM ?? null,
        waterTempC: hour.seaTemperatureC ?? null,
        windKts: typeof hour.windSpeedMS === 'number' ? hour.windSpeedMS * 1.94384 : null,
        waveHeightM: hour.waveHeightM ?? null, // NextFewDaysCard expects this field
        swellHeightM: hour.waveHeightM ?? null,
        wavePeriodS: hour.wavePeriodS ?? null,
        swellPeriodS: hour.wavePeriodS ?? null,
      } as MarineHourlyPoint));
    }

    // Fallback to Supabase cached data
    const entries = data.snapshot.hourly || [];
    if (!entries.length) return [];
    const captured = new Date(data.snapshot.capturedAt);
    const baseUtc = Number.isNaN(captured.getTime())
      ? new Date()
      : new Date(Date.UTC(captured.getUTCFullYear(), captured.getUTCMonth(), captured.getUTCDate()));

    return entries.map((entry, index) => {
      const rawTime = (entry as { timeISO?: string; time?: string }).timeISO ?? (entry as { time?: string }).time;
      const timeISO = normaliseHourlyIso(rawTime, baseUtc, index);
      const waveHeight = toFiniteNumber(entry.waveHeightM);
      return {
        timeISO,
        waveM: waveHeight ?? null,
        waterTempC: toFiniteNumber(entry.seaTemperatureC) ?? null,
        windKts: toFiniteNumber(entry.windSpeedKts),
      } as MarineHourlyPoint;
    });
  }, [marineWeather.hourly, data.snapshot.hourly, data.snapshot.capturedAt]);

  const mapLocation = useMemo<MapLocation>(() => {
    const { centerLat, centerLon, name } = data.rectangle;
    if (Number.isFinite(centerLat) && Number.isFinite(centerLon)) {
      return {
        lat: centerLat,
        lon: centerLon,
        name: name ?? 'Fishing area',
      };
    }
    return DEFAULT_MAP_LOCATION;
  }, [data.rectangle]);

  // ==================================================================================
  // DATA SOURCE MAPPING
  // ==================================================================================
  // 🔵 LIVE WEATHER DATA (from marineWeather hook - MET Norway/Open-Meteo)
  // These values change hourly and MUST be fetched live for safety:
  // 
  // Fallback chain (only used if live API fails):
  // 1. marineWeather.current (LIVE from MET Norway/Open-Meteo) ← PREFERRED
  // 2. marine.* (cached in Supabase from last ingestion) ← EMERGENCY FALLBACK ONLY
  //
  // The fallback is INTENTIONAL but should rarely happen. If it does, users see
  // slightly stale data rather than no data. This is acceptable for safety.
  const waveHeightM = marineWeather.current?.waveHeightM ?? marine.waveHeightM ?? null;
  const windSpeedKts = typeof marineWeather.current?.windSpeedMS === 'number' 
    ? marineWeather.current.windSpeedMS * 1.94384 
    : (marine.windSpeedKts ?? null);
  const windDirectionDeg = marineWeather.current?.windDirectionDeg ?? marine.windDirectionDeg ?? null;
  
  // Log when falling back to database values
  if (!marineWeather.current && (marine.waveHeightM || marine.windSpeedKts)) {
    console.warn('[ConditionsDashboard] Using fallback database values:', {
      wave: marine.waveHeightM,
      wind: marine.windSpeedKts,
      reason: marineWeather.loading ? 'Still loading' : 'API failed'
    });
  }
  
  // 🟢 MARINE BIO DATA (from data.snapshot - Supabase/Copernicus)
  // These values change daily and are safely cached in database:
  const {
    seaTemperatureC, // From Copernicus (daily update)
    chlorophyllMgM3, // From Copernicus (daily update)
    dissolvedOxygenMgL, // From Copernicus (daily update)
    nitrateUmolL, // From Copernicus (daily update)
    phosphateUmolL, // From Copernicus (daily update)
    salinityPsu, // From Copernicus (daily update)
  } = marine;
  // ==================================================================================

  const marineBioIndicators = useMemo(
    () =>
      buildMarineBioIndicators({
        // Existing indicators
        chlorophyll: marineBio?.chlorophyllAvg ?? chlorophyllMgM3,
        oxygen: marineBio?.dissolvedOxygenAvg ?? dissolvedOxygenMgL,
        nitrate: marineBio?.nitrateAvg ?? nitrateUmolL,
        phosphate: marineBio?.phosphateAvg ?? phosphateUmolL,
        salinity: marineBio?.salinityAvg ?? salinityPsu,
        surfaceTemperature: marineBio?.seaSurfaceTemperatureAvg ?? seaTemperatureC,
        phytoplankton: marineBio?.phytoplanktonAvg ?? marine.phytoplanktonSurface ?? null,
        stealth: calculateStealthIndex(
          data.rectangle.centerLat,
          data.rectangle.centerLon,
          environmentalSignals.cloudCover ?? null,
          marine.waterClarityIndex ?? null
        ),
        // New indicators - use raw data for calculations
        mixedLayerDepth: marine.mixedLayerDepth ?? null,
        zooplankton: marine.zooplanktonSurface ?? null,
        primaryProduction: marine.primaryProductionSurface ?? null,
        // Calculate new composite indicators
        targetDepth: calculateTargetDepth(
          marine.mixedLayerDepth ?? null,
          marineBio?.dissolvedOxygenAvg ?? dissolvedOxygenMgL ?? null,
          marineBio?.seaSurfaceTemperatureAvg ?? seaTemperatureC ?? null
        ),
        feedingPotential: calculateFeedingPotential(
          marineBio?.chlorophyllAvg ?? chlorophyllMgM3 ?? null,
          marineBio?.phytoplanktonAvg ?? marine.phytoplanktonSurface ?? null,
          marine.zooplanktonSurface ?? null,
          marine.primaryProductionSurface ?? null
        ),
        baitfishActivity: calculateBaitfishActivity(
          marine.zooplanktonSurface ?? null
        ),
      }),
    [
      marineBio,
      chlorophyllMgM3,
      dissolvedOxygenMgL,
      nitrateUmolL,
      phosphateUmolL,
      salinityPsu,
      seaTemperatureC,
      data.rectangle.centerLat,
      data.rectangle.centerLon,
      environmentalSignals.cloudCover,
      marine.waterClarityIndex,
      marine.mixedLayerDepth,
      marine.zooplanktonSurface,
      marine.phytoplanktonSurface,
      marine.primaryProductionSurface,
    ]
  );

  const fishingSpots = useMemo<FishingSpot[]>(() => {
    return [];
  }, []);

  return (
    <section className="space-y-6">
      {isOffline && (
        <div className="alert alert-error flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-sm">You are offline</h3>
            <p className="text-sm">Latest available conditions are shown, but live weather data may be outdated or unavailable. Some features may not work until you reconnect.</p>
          </div>
        </div>
      )}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">
                <TranslatedText text="Conditions for" /> {userLocationName || data.rectangle.name}
              </h1>
              
            </div>
            
          </div>

          {error ? (
            <div className="alert alert-warning mt-4">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm"><TranslatedText text="Live conditions unavailable" /></h3>
                <p className="text-sm">{error}</p>
              </div>
              {onRetry ? (
                <button className="btn btn-sm" onClick={onRetry} type="button">
                  <TranslatedText text="Try again" />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="divider" />

          <div className="flex items-center justify-between mb-4">
            
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-outline !text-neutral !border-neutral hover:!bg-neutral hover:!text-neutral-content"
                onClick={() => {
                  const lat = mapLocation.lat;
                  const lon = mapLocation.lon;
                  router.push(`/findr/map?lat=${lat}&lon=${lon}&zoom=10&layer=depth`);
                }}
                type="button"
                title="Open full-screen marine data map"
              >
                <Maximize2 className="h-4 w-4" />
                <TranslatedText text="Full Screen" />
              </button>
              <button className="btn btn-sm btn-outline !text-neutral !border-neutral hover:!bg-neutral hover:!text-neutral-content" onClick={() => setShowMap((value) => !value)} type="button">
                {showMap ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showMap ? <TranslatedText text="Hide Map" /> : <TranslatedText text="Show Map" />}
              </button>
            </div>
          </div>

          {showMap ? (
            <div className="rounded-xl border border-base-200 overflow-hidden">
              <ConditionsMap
                centerLocation={{ lat: mapLocation.lat, lon: mapLocation.lon }}
                fishingSpots={fishingSpots}
                showDepthContours
                showICESRectangle
                className="h-80"
                rectangleCode={rectangleCode ?? undefined}
                rectangleBounds={data.rectangle.bounds ?? null}
              />

              <div className="px-2 py-2 bg-base-200/20 border-t border-base-200">
                <div className="text-sm text-base-content/70">
                  <span className="font-medium"><TranslatedText text="Area:" /></span> {data.rectangle.name} ({data.rectangle.region}{rectangleCode && rectangleCode !== data.rectangle.region ? ` ${rectangleCode}` : ''})
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] w-full items-center justify-center rounded-xl border border-dashed border-base-300 bg-base-200/40 text-sm text-base-content/60">
              <TranslatedText text="Map view loads once area metadata is available." />
            </div>
          )}

          <div className="divider" />

          {/* ========================================================================
              SUMMARY CARDS - LIVE DATA ONLY
              ========================================================================
              These three cards show the most critical marine conditions for anglers:
              
              1️⃣ WIND (Live)
                 🔵 Source: marineWeather.current (MET Norway → Open-Meteo)
                 🔄 Updated: Every page load (hourly data)
                 📊 Shows: Speed (kts), Direction (deg), Current conditions
              
              2️⃣ WAVES (Live)
                 🔵 Source: marineWeather.current (MET Norway → Open-Meteo)
                 🔄 Updated: Every page load (hourly data)
                 📊 Shows: Wave height (m), Chlorophyll (mg/m³ from DB)
              
              3️⃣ TIDES (Live)
                 � Source: marineWeather.tides (WorldTides API via unified-weather)
                 🔄 Updated: Every page load (7-day forecast)
                 📊 Shows: Next high/low times from live tide data
              
              ⚠️ SAFETY: Wind & wave data MUST be live - stale data endangers lives!
              ⚠️ NEVER revert to marine.windSpeedKts or marine.waveHeightM directly!
              ✅ Always use the variables with fallback logic (windSpeedKts, waveHeightM)
              
              Environmental card (pollen/AQI/UV) removed - not relevant for marine fishing.
              ======================================================================== */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WindSummaryCard
              speedKts={windSpeedKts}
              directionDeg={windDirectionDeg}
              updatedAt={marineWeather.updatedAt ?? data.snapshot.capturedAt}
            />
            <WaveSummaryCard
              waveHeightM={waveHeightM}
              wavePeriodS={marineWeather.current?.wavePeriodS ?? marine.wavePeriod ?? null}
              waveDirectionDeg={marineWeather.current?.waveDirectionDeg ?? marine.waveDirection ?? null}
              chlorophyllMgM3={marine.chlorophyllMgM3}
              currentSpeedMS={marine.currentSpeedSurface ?? null}
              currentDirectionDeg={marine.currentDirectionSurface ?? null}
              updatedAt={marineWeather.updatedAt ?? data.snapshot.capturedAt}
            />
            <TideSummaryCard
              nextHighIso={nextTides.nextHighIso}
              nextLowIso={nextTides.nextLowIso}
              lastTideHeight={tideExtrema.max}
              upcomingTideHeight={tideExtrema.min}
            />
            <MoonSummaryCardCompact
              lat={mapLocation.lat}
              lon={mapLocation.lon}
            />
            <MarineBioIndicatorsCard
              indicators={marineBioIndicators}
              loading={loading}
              updatedAt={data.snapshot.capturedAt}
              className="md:col-span-2 xl:col-span-4"
            />
          </div>

          <div className="mt-4">
            {hourly.length > 0 ? (
              <HourlyMarineCarousel entries={hourly} tideEvents={tideEvents} />
            ) : (
              <div className="card bg-base-200/40 border border-base-200 shadow-sm">
                <div className="card-body text-sm text-base-content/70">
                  <TranslatedText text="Hourly marine data unavailable for this rectangle. Live ingestions will populate rolling conditions here." />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            {nextFewDaysDaily.length > 0 ? (
              <FindrNextFewDaysCard
                daily={nextFewDaysDaily}
                marineHourly={marineHourlyForCard}
                tide={tideEvents}
                isMarine={true}
              />
            ) : (
              <div className="card bg-base-200/40 border border-base-200 shadow-sm">
                <div className="card-body text-sm text-base-content/70">
                  <TranslatedText text="Daily marine outlooks are still generating for this rectangle. Fresh ingestions will surface once available." />
                </div>
              </div>
            )}
          </div>

          {rectangleCode ? null : (
            <div className="alert alert-info mt-6">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold text-sm"><TranslatedText text="Select a fishing rectangle" /></h3>
                <p className="text-sm"><TranslatedText text="Pick an ICES rectangle in the panel below to request fresh conditions from the live API." /></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ConditionsDashboard;
