/**
 * Hook to calculate real-time bite score using comprehensive environmental data
 * Integrates with the physics-based scoring system
 */

import { useEffect, useState } from 'react';
import { useTideData } from './useTideData';
import { currentFeedingScore } from '../lib/utils/oceanCurrent';

export interface SpeciesParams {
  // weights are "ideal"; we'll reweight to available signals
  tideWeight?: number;
  lightWeight?: number;
  windWeight?: number;
  pressureWeight?: number;
  tempWeight?: number;
  lunarWeight?: number;
  turbidityWeight?: number;
  waterClarityWeight?: number;
  currentSpeedWeight?: number;  // NEW: Ocean current weight (from species table)
  // sensitivities / thresholds
  diurnalSensitivity?: 'strong' | 'moderate' | 'weak';  // Dawn/dusk feeding behavior
  tidalSensitivity?: number;         // 0..1
  preferredTideStage?: string[];     // ["mid_flood","early_ebb","dusk_bias",...]
  flowPreference?: 'slack_avoid'|'gentle'|'moderate'|'strong';
  springNeapBoost?: number;          // -1..+1
  tempOptC?: [number, number];       // [min, max] temperature range
  slackThresholdMs?: number;
  contextBias?: Array<[string, string]>;  // [["surf_estuary","+0.2"]]
}

export interface Conditions {
  tide_stage?: string | null;
  current_speed_ms?: number | null;
  tidal_range_m?: number | null;
  solar_elevation_deg?: number | null;
  cloud_cover_pct?: number | null;
  wind_speed_ms?: number | null;
  pressure_trend_6h?: number | null;
  sst_c?: number | null;
  moon_phase?: number | null;
  wave_hs_m?: number | null;
  turbidity_proxy?: number | null;
  water_clarity_m?: number | null;
  ocean_current_ms?: number | null;  // NEW: Ocean current speed from Copernicus (affects ALL species)
  // Additional environmental factors from Copernicus
  wave_height_m?: number | null;
  salinity_psu?: number | null;
  dissolved_oxygen_mg_l?: number | null;
}

export interface BiteScoreResult {
  score: number; // 0-1
  confidence: number; // 0-100 (score * 100)
  breakdown: {
    tide: number;
    light: number;
    wind: number;
    pressure: number;
    temp: number;
    lunar: number;
    turbidity: number;
    clarity: number;
    current: number;  // NEW: Ocean current contribution
  };
  weights: Record<string, number>;
  availableSignals: string[];
}

/**
 * Calculate bite score for a species given current conditions
 * Returns null if conditions data is not yet available
 */
export function useBiteScore(
  location: { lat: number; lon: number } | null,
  speciesParams?: SpeciesParams
): BiteScoreResult | null {
  const [conditions, setConditions] = useState<Conditions | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Get tide data (already have this hook)
  const tideInfo = useTideData(location);

  useEffect(() => {
    if (!location) {
      setConditions(null);
      return;
    }

    // Fetch comprehensive environmental conditions from findr API
    const fetchConditions = async () => {
      setLoading(true);
      try {
        // Step 1: Look up rectangle code from coordinates
        const rectangleLookupRes = await fetch(
          `/api/findr/rectangle-lookup?lat=${location.lat}&lon=${location.lon}`
        );
        
        if (!rectangleLookupRes.ok) {
          console.warn('[useBiteScore] Failed to look up rectangle code, using tide data only');
          throw new Error('Rectangle lookup failed');
        }
        
        const rectangleData = await rectangleLookupRes.json();
        const rectangleCode = rectangleData.rectangleCode;
        
        // Step 2: Fetch marine conditions for that rectangle
        // Pass user's precise location for accurate weather data (4dp precision)
        const conditionsRes = await fetch(
          `/api/findr/conditions?rectangleCode=${rectangleCode}&lat=${location.lat}&lon=${location.lon}`
        );
        
        if (!conditionsRes.ok) {
          console.warn('[useBiteScore] Failed to fetch conditions, using tide data only');
          throw new Error('Conditions fetch failed');
        }
        
        const data = await conditionsRes.json();
        
        // Step 3: Construct Conditions object from API response
        const cond: Conditions = {
          tide_stage: tideInfo?.currentPhase ? mapTidePhaseToStage(tideInfo.currentPhase) : null,
          current_speed_ms: tideInfo?.currentStrength ? mapStrengthToSpeed(tideInfo.currentStrength) : null,
          solar_elevation_deg: getSolarElevation(location.lat, location.lon),
          
          // Marine data from API (Phase 2 Copernicus integration)
          sst_c: data.snapshot?.marine?.seaTemperatureC ?? null,
          ocean_current_ms: data.snapshot?.marine?.currentSpeedSurface ?? null,  // ✨ NEW: Ocean current
          water_clarity_m: data.snapshot?.marine?.waterClarityIndex ?? null,
          
          // Additional environmental factors
          wind_speed_ms: data.snapshot?.marine?.windSpeedKts ? data.snapshot.marine.windSpeedKts * 0.514444 : null, // Convert knots to m/s
          wave_height_m: data.snapshot?.marine?.waveHeightM ?? null,
          salinity_psu: data.snapshot?.marine?.salinityPsu ?? null,
          dissolved_oxygen_mg_l: data.snapshot?.marine?.dissolvedOxygenMgL ?? null,
        };
        
        setConditions(cond);
      } catch (error) {
        console.error('[useBiteScore] Failed to fetch conditions, falling back to tide-only data:', error);
        
        // Fallback: Use tide data only if API fails
        const fallbackCond: Conditions = {
          tide_stage: tideInfo?.currentPhase ? mapTidePhaseToStage(tideInfo.currentPhase) : null,
          current_speed_ms: tideInfo?.currentStrength ? mapStrengthToSpeed(tideInfo.currentStrength) : null,
          solar_elevation_deg: getSolarElevation(location.lat, location.lon),
        };
        
        setConditions(fallbackCond);
      } finally {
        setLoading(false);
      }
    };

    fetchConditions();
  }, [location, tideInfo]);

  if (!conditions || loading) {
    return null;
  }

  // Calculate bite score
  return getBiteScore(speciesParams ?? {}, conditions);
}

/**
 * Main bite score calculation - your physics-based algorithm
 */
export function getBiteScore(p: SpeciesParams, c: Conditions): BiteScoreResult {
  // Declare ideal weights (fallbacks if missing in params)
  const ideal = {
    tide: p.tideWeight ?? 0.30,
    light: p.lightWeight ?? 0.30,
    wind: p.windWeight ?? 0.15,
    pressure: p.pressureWeight ?? 0.10,
    temp: p.tempWeight ?? 0.10,
    lunar: p.lunarWeight ?? 0.05,
    turbidity: p.turbidityWeight ?? 0,
    clarity: p.waterClarityWeight ?? 0,
    current: p.currentSpeedWeight ?? 0  // NEW: Ocean current weight (default 0 for backwards compat)
  };

  // Check which signals we actually have
  const availableSignals: string[] = [];
  const usable = new Set<string>();
  
  if (c.current_speed_ms != null || c.tide_stage) { usable.add('tide'); availableSignals.push('tide'); }
  if (c.solar_elevation_deg != null || c.cloud_cover_pct != null) { usable.add('light'); availableSignals.push('light'); }
  if (c.wind_speed_ms != null) { usable.add('wind'); availableSignals.push('wind'); }
  if (c.pressure_trend_6h != null) { usable.add('pressure'); availableSignals.push('pressure'); }
  if (c.sst_c != null) { usable.add('temp'); availableSignals.push('temp'); }
  if (c.moon_phase != null || c.tidal_range_m != null) { usable.add('lunar'); availableSignals.push('lunar'); }
  if (c.turbidity_proxy != null) { usable.add('turbidity'); availableSignals.push('turbidity'); }
  if (c.water_clarity_m != null) { usable.add('clarity'); availableSignals.push('clarity'); }
  if (c.ocean_current_ms != null) { usable.add('current'); availableSignals.push('current'); }  // NEW

  const w = reweight(ideal, usable);

  // Sub-scores (each returns 0..1; must handle null safely)
  const tideSubScore = w.tide ? tideScore(c.current_speed_ms, c.tide_stage, c.tidal_range_m, p) : 0;
  const lightSubScore = w.light ? lightScore(c.solar_elevation_deg, c.cloud_cover_pct) : 0;
  const windSubScore = w.wind ? windScore(c.wind_speed_ms, p.flowPreference) : 0;
  const pressureSubScore = w.pressure ? pressureTrendScore(c.pressure_trend_6h) : 0;
  const tempSubScore = w.temp ? tempCycleScore(c.sst_c, p.tempOptC) : 0;
  const lunarSubScore = w.lunar ? lunarScore(c.moon_phase, c.tidal_range_m) : 0;
  const turbSubScore = w.turbidity ? turbidityScore(c.turbidity_proxy) : 0;
  const claritySubScore = w.clarity ? clarityScore(c.water_clarity_m) : 0;
  const currentSubScore = w.current ? oceanCurrentScore(c.ocean_current_ms) : 0;  // NEW

  const score =
    (tideSubScore * (w.tide ?? 0)) +
    (lightSubScore * (w.light ?? 0)) +
    (windSubScore * (w.wind ?? 0)) +
    (pressureSubScore * (w.pressure ?? 0)) +
    (tempSubScore * (w.temp ?? 0)) +
    (lunarSubScore * (w.lunar ?? 0)) +
    (turbSubScore * (w.turbidity ?? 0)) +
    (claritySubScore * (w.clarity ?? 0)) +
    (currentSubScore * (w.current ?? 0));  // NEW

  // Clamp 0..1
  const finalScore = Math.max(0, Math.min(1, score));

  return {
    score: finalScore,
    confidence: Math.round(finalScore * 100),
    breakdown: {
      tide: tideSubScore,
      light: lightSubScore,
      wind: windSubScore,
      pressure: pressureSubScore,
      temp: tempSubScore,
      lunar: lunarSubScore,
      turbidity: turbSubScore,
      clarity: claritySubScore,
      current: currentSubScore,  // NEW
    },
    weights: w,
    availableSignals,
  };
}

/* Helper functions */

function reweight(weights: Record<string, number>, usable: Set<string>) {
  const filtered = Object.fromEntries(
    Object.entries(weights).filter(([k, v]) => usable.has(k) && v > 0)
  ) as Record<string, number>;
  const sum = Object.values(filtered).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(Object.entries(filtered).map(([k, v]) => [k, v / sum]));
}

/* Score calculation functions (all null-tolerant) */

function tideScore(current?: number | null, stage?: string | null, range?: number | null, p?: SpeciesParams) {
  if (current == null && !stage) return 0.5; // neutral if nothing
  const sensitivity = p?.tidalSensitivity ?? 0.6;
  const flow = current != null ? sigmoid(current, 0.4, 2.0) : 0.6;
  const stageBoost = stage && (p?.preferredTideStage?.includes(stage) ? 1 : 0.7) || 0.7;
  const rangeBoost = range != null ? Math.min(1, range / 4) : 0.5; // simple normaliser
  return clamp01(0.4*flow + 0.4*stageBoost + 0.2*rangeBoost) * (0.5 + 0.5*sensitivity);
}

function lightScore(elev?: number | null, cloud?: number | null) {
  if (elev == null) return 0.5;
  const duskiness = 1 - Math.abs((elev ?? 0) - 10) / 10; // peak near 10°
  const cloudBoost = cloud != null ? (0.5 + 0.5 * (cloud/100)) : 0.5;
  return clamp01(0.7*duskiness + 0.3*cloudBoost);
}

function windScore(speed?: number | null, pref?: SpeciesParams['flowPreference']) {
  if (speed == null) return 0.5;
  const centre = pref === 'strong' ? 8 : pref === 'moderate' ? 5 : 3;
  return Math.exp(-(Math.pow((speed - centre), 2) / 18)); // bell curve
}

function pressureTrendScore(dp?: number | null) {
  if (dp == null) return 0.5;
  // modest falls positive, steep drops/raises negative
  return clamp01(0.6 + 0.1 * Math.tanh(-(dp/2)));
}

function tempCycleScore(sst?: number | null, band?: [number,number]) {
  if (sst == null) return 0.5;
  const [lo, hi] = band ?? [11, 17];
  const mid = (lo + hi)/2;
  const span = (hi - lo)/2 || 1;
  return clamp01(Math.exp(-Math.pow((sst - mid)/span, 2)));
}

function lunarScore(phase?: number | null, range?: number | null) {
  const spring = phase == null ? 0.5 : (phase < 0.1 || phase > 0.9 || (phase > 0.4 && phase < 0.6)) ? 1 : 0.6;
  const rangeNorm = range != null ? Math.min(1, range/4) : 0.5;
  return clamp01(0.6*spring + 0.4*rangeNorm);
}

function turbidityScore(t?: number | null) { 
  return t == null ? 0.5 : clamp01(1 - Math.abs(t - 0.4)); 
}

function clarityScore(secchi?: number | null) { 
  return secchi == null ? 0.5 : clamp01(Math.tanh(secchi/3)); 
}

/**
 * Ocean current score using Copernicus current speed data
 * Uses the scientifically-validated currentFeedingScore from oceanCurrent.ts
 * Optimal range: 0.2-0.5 m/s (moderate flow = best feeding conditions)
 */
function oceanCurrentScore(currentSpeedMs?: number | null): number {
  if (currentSpeedMs == null) return 0.5; // Neutral if no data
  
  // Use our validated current feeding score algorithm
  // Returns 0-1 score based on optimal current speed for fishing
  return currentFeedingScore(currentSpeedMs);
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function sigmoid(x: number, mid=0.4, k=6) { 
  return 1/(1+Math.exp(-k*(x-mid))); 
}

/* Mapping functions to convert between data formats */

function mapTidePhaseToStage(phase: 'rising' | 'falling' | 'high_slack' | 'low_slack'): string {
  switch (phase) {
    case 'rising': return 'mid_flood';
    case 'high_slack': return 'high_slack';
    case 'falling': return 'early_ebb';
    case 'low_slack': return 'low_slack';
    default: return 'mid_flood';
  }
}

function mapStrengthToSpeed(strength: 'weak' | 'moderate' | 'strong'): number {
  switch (strength) {
    case 'weak': return 0.2;
    case 'moderate': return 0.5;
    case 'strong': return 0.8;
    default: return 0.5;
  }
}

function getSolarElevation(lat: number, _lon: number): number {
  // Simplified solar elevation calculation
  // TODO: Replace with proper solar position calculation
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  
  // Simple approximation: peak at noon, negative at night
  const solarNoon = 12;
  const hourAngle = (hour - solarNoon) * 15; // 15 degrees per hour
  
  // Very rough approximation - replace with proper calculation
  const declination = -23.44 * Math.cos((360/365) * (now.getMonth() * 30 + now.getDate() + 10));
  const elevation = Math.asin(
    Math.sin(lat * Math.PI / 180) * Math.sin(declination * Math.PI / 180) +
    Math.cos(lat * Math.PI / 180) * Math.cos(declination * Math.PI / 180) * Math.cos(hourAngle * Math.PI / 180)
  ) * 180 / Math.PI;
  
  return elevation;
}
