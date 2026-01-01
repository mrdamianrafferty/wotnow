/**
 * /api/cron/weekly-forecast
 *
 * Weekly forecast cron job that sends 7-day fishing predictions to users
 * Runs every Wednesday at 8 AM
 *
 * Email Strategy:
 * - Sends to users with weekly_forecast_enabled: true
 * - Shows 7-day confidence forecast for each favorite species
 * - Highlights best fishing day of the week
 * - Includes species images for visual appeal
 * - One email per user per week
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import {
  generateWeeklyForecastHTMLV2,
  generateWeeklyForecastTextV2,
  type WeeklyForecastDay,
  type WeeklyForecastSpeciesEnhanced,
  type EnvironmentalSummary,
  type TacticalSummary,
  type WeeklyForecastDataEnhanced,
  type Guild,
  type SpeciesBadge,
  type NearbyTackleShop,
} from '../../../lib/findr/emailTemplates';
import { generateUnsubscribeToken } from '../findr/unsubscribe';
import { SPECIES_IMAGE_MAP } from '../../../data/speciesImageMap';
import { BADGE_META, type BadgeKey } from '../../../lib/findr/speciesBadges';
import speciesAdviceData from '../../../data/speciesAdviceData.json';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration for weekly forecast cron');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/** Type for species advice data from JSON */
interface SpeciesAdviceEntry {
  name: string;
  normalized: string;
  contexts: Record<string, {
    regions?: string;
    bestTime?: string;
    tideSensitivity?: string;
    favouriteBaits?: string;
    naturalDiet?: string;
    temperature?: string;
    weather?: string;
    distance?: string;
    edibility?: number;
    restrictions?: string;
    authority?: string;
  }>;
  conservation?: string;
  funFact?: string;
}

/** Type for species data from database */
interface SpeciesDbRecord {
  species_code: string;
  name_en: string;
  scientific_name: string | null;
  playful_bio_en: string | null;
  guild: string | null;
  species_badges: string[] | null;
  recommended_baits: string[] | null;
  effective_techniques: string[] | null;
  preferred_tide_stage: string[] | null;
  diurnal_sensitivity: string | null;
}

/** Type for environmental conditions */
interface EnvironmentalConditions {
  sea_temp_c: number | null;
  salinity_psu: number | null;
  air_pressure_hpa: number | null;
  wave_height_m: number | null;
  kd490: number | null;
  cloud_cover_pct: number | null;
  chlorophyll_mg_m3: number | null;
  current_speed_ms: number | null;
  captured_at: string | null;
}

/** Type for moon data */
interface MoonData {
  moon_phase_name: string | null;
  moon_illumination_pct: number | null;
}

/**
 * Fetch enhanced species data from database
 */
async function fetchSpeciesDetails(speciesCodes: string[]): Promise<Map<string, SpeciesDbRecord>> {
  const { data, error } = await supabase
    .from('species')
    .select(`
      species_code,
      name_en,
      scientific_name,
      playful_bio_en,
      guild,
      species_badges,
      recommended_baits,
      effective_techniques,
      preferred_tide_stage,
      diurnal_sensitivity
    `)
    .in('species_code', speciesCodes);

  if (error || !data) {
    console.error('[Weekly Forecast] Error fetching species details:', error);
    return new Map();
  }

  const map = new Map<string, SpeciesDbRecord>();
  for (const record of data) {
    map.set(record.species_code, record as SpeciesDbRecord);
  }
  return map;
}

/**
 * Fetch environmental conditions for a rectangle
 */
async function fetchEnvironmentalConditions(rectangleCode: string): Promise<EnvironmentalConditions | null> {
  const { data, error } = await supabase
    .from('findr_conditions_latest')
    .select(`
      sea_temp_c,
      salinity_psu,
      air_pressure_hpa,
      wave_height_m,
      kd490,
      cloud_cover_pct,
      chlorophyll_mg_m3,
      current_speed_ms,
      captured_at
    `)
    .eq('rectangle_code', rectangleCode)
    .single();

  if (error || !data) {
    console.warn('[Weekly Forecast] No environmental data for rectangle:', rectangleCode, error);
    return null;
  }

  return data as EnvironmentalConditions;
}

/**
 * Fetch moon data for the week
 */
async function fetchMoonData(lat: number, lon: number): Promise<MoonData | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('moon_cache')
    .select('moon_phase_name, moon_illumination_pct')
    .eq('local_date', today)
    .gte('lat_bucket', Math.floor(lat) - 1)
    .lte('lat_bucket', Math.ceil(lat) + 1)
    .gte('lon_bucket', Math.floor(lon) - 1)
    .lte('lon_bucket', Math.ceil(lon) + 1)
    .order('cached_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.warn('[Weekly Forecast] No moon data available:', error);
    return null;
  }

  return data as MoonData;
}

/**
 * Get tactical advice for a species from JSON data
 */
function getSpeciesAdvice(speciesCode: string): SpeciesAdviceEntry | null {
  const normalized = speciesCode.toLowerCase().replace(/_/g, '-');
  return (speciesAdviceData as SpeciesAdviceEntry[]).find(
    entry => entry.normalized === normalized
  ) || null;
}

/** Google Places API response types */
interface GooglePlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  user_ratings_total?: number;
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[];
  status: string;
}

/**
 * Calculate distance between two coordinates in km
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Fetch nearby tackle shops using Google Places API
 * Returns up to 3 closest shops within 25km radius
 */
async function fetchNearbyTackleShops(lat: number, lon: number): Promise<NearbyTackleShop[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[Weekly Forecast] Google Maps API key not configured for tackle shop lookup');
    return [];
  }

  try {
    const allResults: NearbyTackleShop[] = [];
    const seenPlaceIds = new Set<string>();

    // Search for tackle shops and bait suppliers
    const searchQueries = ['tackle shop', 'fishing bait'];

    for (const query of searchQueries) {
      const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      url.searchParams.set('location', `${lat},${lon}`);
      url.searchParams.set('radius', '25000'); // 25km radius
      url.searchParams.set('keyword', query);
      url.searchParams.set('key', apiKey);

      const response = await fetch(url.toString());
      if (!response.ok) {
        console.warn(`[Weekly Forecast] Places API search failed for "${query}":`, response.status);
        continue;
      }

      const data: GooglePlacesResponse = await response.json();
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.warn(`[Weekly Forecast] Google Places returned status: ${data.status}`);
        continue;
      }

      for (const place of (data.results || [])) {
        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        const distance = calculateDistance(lat, lon, place.geometry.location.lat, place.geometry.location.lng);

        allResults.push({
          name: place.name,
          address: place.vicinity || place.formatted_address || '',
          distance: formatDistance(distance),
          rating: place.rating,
          totalRatings: place.user_ratings_total,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
        });
      }
    }

    // Sort by distance and return top 3
    allResults.sort((a, b) => {
      const distA = parseFloat(a.distance.replace(/[^\d.]/g, '') || '999');
      const distB = parseFloat(b.distance.replace(/[^\d.]/g, '') || '999');
      return distA - distB;
    });

    return allResults.slice(0, 3);
  } catch (error) {
    console.error('[Weekly Forecast] Error fetching tackle shops:', error);
    return [];
  }
}

/**
 * Convert DB badges to SpeciesBadge format
 */
function convertBadges(dbBadges: string[] | null): SpeciesBadge[] {
  if (!dbBadges || dbBadges.length === 0) return [];

  const badges: SpeciesBadge[] = [];
  for (const key of dbBadges) {
    if (key in BADGE_META) {
      const meta = BADGE_META[key as BadgeKey];
      badges.push({
        key: meta.key,
        emoji: meta.emoji,
        label: meta.label,
      });
    }
  }
  return badges;
}

/**
 * Calculate water clarity from kd490
 */
function calculateWaterClarity(kd490: number | null): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (kd490 === null) return 'moderate';
  if (kd490 < 0.1) return 'excellent';
  if (kd490 < 0.2) return 'good';
  if (kd490 < 0.5) return 'moderate';
  return 'poor';
}

/**
 * Calculate pressure trend (would need historical data - placeholder)
 */
function calculatePressureTrend(_currentPressure: number | null): 'rising' | 'falling' | 'stable' {
  // For now, return stable - would need historical comparison
  return 'stable';
}

/**
 * Calculate sea temp trend (would need historical data - placeholder)
 */
function calculateSeaTempTrend(_currentTemp: number | null): 'warming' | 'cooling' | 'stable' {
  // For now, return stable - would need historical comparison
  return 'stable';
}

/**
 * Determine tide pattern from moon phase
 */
function getTidePattern(moonPhase: string | null): 'spring' | 'neap' {
  if (!moonPhase) return 'neap';
  const lower = moonPhase.toLowerCase();
  if (lower.includes('new') || lower.includes('full')) return 'spring';
  return 'neap';
}

/**
 * Calculate overall fishing conditions rating
 */
function calculateOverallRating(
  env: EnvironmentalConditions | null,
  moon: MoonData | null
): 'exceptional' | 'good' | 'fair' | 'challenging' {
  if (!env) return 'fair';

  let score = 50; // Start neutral

  // Wave height factor
  if (env.wave_height_m !== null) {
    if (env.wave_height_m < 1) score += 10;
    else if (env.wave_height_m < 2) score += 5;
    else if (env.wave_height_m > 3) score -= 15;
  }

  // Pressure factor (1010-1020 is ideal)
  if (env.air_pressure_hpa !== null) {
    if (env.air_pressure_hpa >= 1010 && env.air_pressure_hpa <= 1020) score += 10;
    else if (env.air_pressure_hpa < 1000 || env.air_pressure_hpa > 1030) score -= 10;
  }

  // Water clarity factor
  const clarity = calculateWaterClarity(env.kd490);
  if (clarity === 'excellent' || clarity === 'good') score += 10;
  else if (clarity === 'poor') score -= 10;

  // Moon phase factor (spring tides = more activity)
  if (moon?.moon_phase_name) {
    const pattern = getTidePattern(moon.moon_phase_name);
    if (pattern === 'spring') score += 5;
  }

  if (score >= 70) return 'exceptional';
  if (score >= 55) return 'good';
  if (score >= 40) return 'fair';
  return 'challenging';
}

/**
 * Find best days of the week based on forecast data
 */
function findBestDays(speciesForecasts: WeeklyForecastSpeciesEnhanced[]): string[] {
  // Aggregate scores by day across all species
  const dayScores = new Map<string, number[]>();

  for (const species of speciesForecasts) {
    for (const day of species.forecast) {
      const existing = dayScores.get(day.date) || [];
      existing.push(day.confidence);
      dayScores.set(day.date, existing);
    }
  }

  // Calculate average score per day
  const dayAverages: { date: string; avg: number }[] = [];
  for (const [date, scores] of dayScores) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    dayAverages.push({ date, avg });
  }

  // Sort by average and return top 2 days
  dayAverages.sort((a, b) => b.avg - a.avg);
  return dayAverages.slice(0, 2).map(d => d.date.split(' ')[0]); // Just day names
}

/**
 * Generate conditions summary text
 */
function generateConditionsSummary(
  env: EnvironmentalConditions | null,
  moon: MoonData | null,
  rating: 'exceptional' | 'good' | 'fair' | 'challenging'
): string {
  const parts: string[] = [];

  if (rating === 'exceptional') {
    parts.push('Outstanding conditions for fishing this week!');
  } else if (rating === 'good') {
    parts.push('Good conditions expected this week.');
  } else if (rating === 'fair') {
    parts.push('Reasonable conditions with some limitations.');
  } else {
    parts.push('Challenging conditions - pick your windows carefully.');
  }

  if (env?.wave_height_m != null && env.wave_height_m < 1.5) {
    parts.push('Calm seas expected.');
  } else if (env?.wave_height_m != null && env.wave_height_m > 2.5) {
    parts.push('Rough seas - shore fishing may be affected.');
  }

  if (moon?.moon_phase_name) {
    const pattern = getTidePattern(moon.moon_phase_name);
    if (pattern === 'spring') {
      parts.push('Spring tides bring stronger water movement.');
    }
  }

  return parts.join(' ');
}

/**
 * Aggregate top baits across all species
 */
function aggregateTopBaits(speciesForecasts: WeeklyForecastSpeciesEnhanced[]): string[] {
  const baitCounts = new Map<string, number>();

  for (const species of speciesForecasts) {
    if (species.recommendedBaits) {
      for (const bait of species.recommendedBaits) {
        baitCounts.set(bait, (baitCounts.get(bait) || 0) + 1);
      }
    }
  }

  // Sort by frequency and return top 5
  return Array.from(baitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([bait]) => bait);
}

/**
 * Aggregate top techniques across all species
 */
function aggregateTopTechniques(speciesForecasts: WeeklyForecastSpeciesEnhanced[]): string[] {
  const techniqueCounts = new Map<string, number>();

  for (const species of speciesForecasts) {
    if (species.effectiveTechnique) {
      techniqueCounts.set(species.effectiveTechnique,
        (techniqueCounts.get(species.effectiveTechnique) || 0) + 1);
    }
  }

  // Sort by frequency and return top 3
  return Array.from(techniqueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tech]) => tech);
}

/**
 * Generate tide advice based on species preferences
 */
function generateTideAdvice(speciesForecasts: WeeklyForecastSpeciesEnhanced[]): string {
  const tidePrefs = new Map<string, number>();

  for (const species of speciesForecasts) {
    if (species.tideSensitivity) {
      const lower = species.tideSensitivity.toLowerCase();
      if (lower.includes('flood')) tidePrefs.set('flood', (tidePrefs.get('flood') || 0) + 1);
      if (lower.includes('ebb')) tidePrefs.set('ebb', (tidePrefs.get('ebb') || 0) + 1);
      if (lower.includes('slack')) tidePrefs.set('slack', (tidePrefs.get('slack') || 0) + 1);
    }
  }

  if (tidePrefs.size === 0) return 'Moving water generally best.';

  const sorted = Array.from(tidePrefs.entries()).sort((a, b) => b[1] - a[1]);
  const topPref = sorted[0][0];

  if (topPref === 'flood') return 'Focus on flooding tides for most species.';
  if (topPref === 'ebb') return 'Ebbing tides look promising for these species.';
  return 'Slack water periods could be productive.';
}

/**
 * Generate time-of-day advice based on species preferences
 */
function generateTimeAdvice(speciesForecasts: WeeklyForecastSpeciesEnhanced[]): string {
  const timePrefs = new Map<string, number>();

  for (const species of speciesForecasts) {
    if (species.bestTime) {
      const lower = species.bestTime.toLowerCase();
      if (lower.includes('dawn') || lower.includes('morning')) {
        timePrefs.set('dawn', (timePrefs.get('dawn') || 0) + 1);
      }
      if (lower.includes('dusk') || lower.includes('evening')) {
        timePrefs.set('dusk', (timePrefs.get('dusk') || 0) + 1);
      }
      if (lower.includes('night')) {
        timePrefs.set('night', (timePrefs.get('night') || 0) + 1);
      }
      if (lower.includes('day') || lower.includes('daylight')) {
        timePrefs.set('day', (timePrefs.get('day') || 0) + 1);
      }
    }
  }

  if (timePrefs.size === 0) return 'Dawn and dusk usually most productive.';

  const sorted = Array.from(timePrefs.entries()).sort((a, b) => b[1] - a[1]);
  const topPref = sorted[0][0];

  if (topPref === 'dawn') return 'Early morning sessions should be most productive.';
  if (topPref === 'dusk') return 'Evening sessions look promising this week.';
  if (topPref === 'night') return 'Night fishing could be rewarding.';
  return 'Daylight hours offer good opportunities.';
}

/**
 * Main cron handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[Weekly Forecast] Cron job started');

  try {
    // Get all users with weekly forecast enabled
    const { data: preferences, error: prefsError } = await supabase
      .from('user_notification_preferences')
      .select('user_id, weekly_forecast_enabled, weekly_forecast_day, weekly_forecast_time')
      .eq('weekly_forecast_enabled', true);

    if (prefsError) {
      console.error('[Weekly Forecast] Error fetching preferences:', prefsError);
      return res.status(500).json({ error: 'Failed to fetch user preferences' });
    }

    if (!preferences || preferences.length === 0) {
      console.log('[Weekly Forecast] No users with weekly forecast enabled');
      return res.status(200).json({
        success: true,
        message: 'No users to process',
        processed: 0,
      });
    }

    console.log(`[Weekly Forecast] Processing ${preferences.length} users`);

    let emailsSent = 0;

    // Process each user
    for (const pref of preferences) {
      try {
        const sent = await sendWeeklyForecastEmail(pref.user_id);
        if (sent) {
          emailsSent++;
        }
      } catch (error) {
        console.error(`[Weekly Forecast] Error processing user ${pref.user_id}:`, error);
        // Continue processing other users
      }
    }

    console.log(`[Weekly Forecast] Completed. Sent ${emailsSent} emails`);

    return res.status(200).json({
      success: true,
      message: 'Weekly forecasts sent',
      processed: preferences.length,
      emailsSent,
    });

  } catch (error: unknown) {
    console.error('[Weekly Forecast] Error:', error);
    return res.status(500).json({
      error: 'Failed to send weekly forecasts',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Send weekly forecast email to a single user
 * Builds enhanced email data with species details, environmental conditions, and tactical advice
 */
async function sendWeeklyForecastEmail(userId: string): Promise<boolean> {
  if (!resend) {
    console.log('[Weekly Forecast] Resend not configured, skipping email for user:', userId);
    return false;
  }

  try {
    // 1. Get user's email and name
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user?.email) {
      console.error('[Weekly Forecast] Could not get user email:', userError);
      return false;
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.name || undefined;

    // 2. Get user's favorite species
    const { data: favourites, error: favError } = await supabase
      .from('user_favourites')
      .select('species_code, species_name, rectangle_code')
      .eq('user_id', userId);

    if (favError || !favourites || favourites.length === 0) {
      console.log('[Weekly Forecast] User has no favorites:', userId);
      return false;
    }

    // Group favorites by rectangle to batch prediction fetches
    const rectangleFavourites = new Map<string, typeof favourites>();
    for (const fav of favourites) {
      const rect = fav.rectangle_code;
      if (!rectangleFavourites.has(rect)) {
        rectangleFavourites.set(rect, []);
      }
      rectangleFavourites.get(rect)!.push(fav);
    }

    // 3. Fetch species details from database
    const allSpeciesCodes = favourites.map(f => f.species_code);
    const speciesDetails = await fetchSpeciesDetails(allSpeciesCodes);

    // 4. Fetch 7-day predictions for each species with enhanced data
    const enhancedForecasts: WeeklyForecastSpeciesEnhanced[] = [];

    for (const [rectangleCode, rectFavs] of rectangleFavourites) {
      for (const fav of rectFavs) {
        const forecast = await fetch7DayPredictions(fav.species_code, rectangleCode);

        if (forecast.length > 0) {
          // Get species image - use thumb for email (smaller, square, ~7KB)
          const speciesImageInfo = SPECIES_IMAGE_MAP[fav.species_code];
          const imageUrl = speciesImageInfo?.thumb || speciesImageInfo?.mobile || speciesImageInfo?.image || '/webp/default-fish.webp';

          // Find peak day
          const peakDay = findPeakDay(forecast);

          // Get enhanced species details
          const dbRecord = speciesDetails.get(fav.species_code);
          const advice = getSpeciesAdvice(fav.species_code);
          const shoreContext = advice?.contexts?.shore;

          // Parse baits from advice (comma-separated string to array)
          const baitString = shoreContext?.favouriteBaits || '';
          const baits = baitString.split(',').map(b => b.trim()).filter(Boolean);

          // Get first effective technique
          const technique = dbRecord?.effective_techniques?.[0] || undefined;

          enhancedForecasts.push({
            speciesName: fav.species_name,
            speciesCode: fav.species_code,
            imageUrl,
            forecast,
            peakDay: peakDay.dayName,
            peakConfidence: peakDay.confidence,
            // Enhanced fields
            playfulBio: dbRecord?.playful_bio_en || undefined,
            scientificName: dbRecord?.scientific_name || undefined,
            guild: (dbRecord?.guild as Guild) || undefined,
            badges: convertBadges(dbRecord?.species_badges || null),
            recommendedBaits: baits.length > 0 ? baits : (dbRecord?.recommended_baits || undefined),
            bestTime: shoreContext?.bestTime || undefined,
            tideSensitivity: shoreContext?.tideSensitivity || undefined,
            effectiveTechnique: technique,
            funFact: advice?.funFact || undefined,
          });
        }
      }
    }

    if (enhancedForecasts.length === 0) {
      console.log('[Weekly Forecast] No predictions available for user:', userId);
      return false;
    }

    // 5. Get location info and environmental data
    const firstRectangle = Array.from(rectangleFavourites.keys())[0];

    // Get rectangle region name
    const { data: rectangle } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code, region, center_lat, center_lon')
      .eq('rectangle_code', firstRectangle)
      .single();

    const locationName = rectangle?.region || firstRectangle;
    const centerLat = rectangle?.center_lat || 54;
    const centerLon = rectangle?.center_lon || -5;

    // 6. Fetch environmental conditions, moon data, and nearby tackle shops
    const envConditions = await fetchEnvironmentalConditions(firstRectangle);
    const moonData = await fetchMoonData(centerLat, centerLon);
    const tackleShops = await fetchNearbyTackleShops(centerLat, centerLon);

    // 7. Calculate overall rating and build environmental summary
    const overallRating = calculateOverallRating(envConditions, moonData);
    const bestDays = findBestDays(enhancedForecasts);

    const environmental: EnvironmentalSummary = {
      seaTempC: envConditions?.sea_temp_c || 12,
      seaTempTrend: calculateSeaTempTrend(envConditions?.sea_temp_c || null),
      waterClarity: calculateWaterClarity(envConditions?.kd490 || null),
      tidePattern: getTidePattern(moonData?.moon_phase_name || null),
      pressureHpa: envConditions?.air_pressure_hpa || 1013,
      pressureTrend: calculatePressureTrend(envConditions?.air_pressure_hpa || null),
      waveHeightM: envConditions?.wave_height_m || 1,
      moonPhase: moonData?.moon_phase_name || 'Unknown',
      moonIllumination: moonData?.moon_illumination_pct || 50,
      overallRating,
      bestDaysOfWeek: bestDays,
      conditionsSummary: generateConditionsSummary(envConditions, moonData, overallRating),
    };

    // 8. Build tactical summary
    const tactical: TacticalSummary = {
      topBaits: aggregateTopBaits(enhancedForecasts),
      topTechniques: aggregateTopTechniques(enhancedForecasts),
      tideAdvice: generateTideAdvice(enhancedForecasts),
      timeAdvice: generateTimeAdvice(enhancedForecasts),
    };

    // 9. Separate star species (85%+ peak confidence) from regular
    const starSpecies = enhancedForecasts.filter(s => s.peakConfidence >= 85);
    const regularSpecies = enhancedForecasts.filter(s => s.peakConfidence < 85);

    // Sort both by peak confidence (descending)
    starSpecies.sort((a, b) => b.peakConfidence - a.peakConfidence);
    regularSpecies.sort((a, b) => b.peakConfidence - a.peakConfidence);

    // 10. Generate week start string
    const today = new Date();
    const weekStart = formatWeekStart(today);

    // 11. Generate unsubscribe token and URL
    const unsubscribeToken = await generateUnsubscribeToken(userId);
    const unsubscribeUrl = `https://fishfindr.eu/findr/unsubscribe?token=${unsubscribeToken}`;

    // 12. Build enhanced email data for V2 template
    const enhancedEmailData: WeeklyForecastDataEnhanced = {
      userName,
      species: enhancedForecasts,
      starSpecies,
      weekStart,
      locationName,
      rectangleCode: firstRectangle,
      unsubscribeUrl,
      environmental,
      tactical,
      tackleShops: tackleShops.length > 0 ? tackleShops : undefined,
    };

    // 13. Generate V2 HTML and text versions
    const htmlContent = generateWeeklyForecastHTMLV2(enhancedEmailData);
    const textContent = generateWeeklyForecastTextV2(enhancedEmailData);

    // 14. Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: userEmail,
      subject: `📅 Your Weekly Fishing Forecast - ${enhancedForecasts.length} Species`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[Weekly Forecast] Failed to send email:', error);
      return false;
    }

    console.log(`[Weekly Forecast] Email sent successfully to ${userEmail}:`, data?.id);
    return true;

  } catch (error) {
    console.error('[Weekly Forecast] Error in sendWeeklyForecastEmail:', error);
    return false;
  }
}

/**
 * Fetch 7-day confidence predictions for a species using real CMEMS data
 * Calls get_environmental_predictions_enhanced RPC for each day
 */
async function fetch7DayPredictions(
  speciesCode: string,
  rectangleCode: string
): Promise<WeeklyForecastDay[]> {
  try {
    const forecast: WeeklyForecastDay[] = [];
    const today = new Date();

    // For each of the next 7 days, fetch real predictions
    // Uses the same RPC function as /api/findr/predictions
    // This ensures consistent predictions with real CMEMS environmental data

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Format date as "Mon 15"
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = date.getDate();

      // Fetch real prediction with CMEMS data for this specific date
      const confidence = await fetchPredictionForDate(speciesCode, rectangleCode, date);

      forecast.push({
        date: `${dayName} ${dayNum}`,
        confidence,
      });
    }

    return forecast;
  } catch (error) {
    console.error('[Weekly Forecast] Error fetching predictions:', error);
    return [];
  }
}

/**
 * Fetch prediction for a specific date using real CMEMS data
 * Calls the same RPC function used by the main predictions API
 */
async function fetchPredictionForDate(
  speciesCode: string,
  rectangleCode: string,
  date: Date
): Promise<number> {
  try {
    // Format date as YYYY-MM-DD for RPC call
    const targetDate = date.toISOString().split('T')[0];

    // Call the same RPC function used by /api/findr/predictions
    // This ensures we're using the exact same prediction logic with real CMEMS data
    const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
      target_rectangle: rectangleCode,
      target_date: targetDate,
      user_lat: null,
      user_lon: null,
    });

    if (error) {
      console.error('[Weekly Forecast] RPC error for', speciesCode, 'on', targetDate, ':', error);
      return 50; // Fallback to neutral confidence
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('[Weekly Forecast] No predictions returned for', rectangleCode, 'on', targetDate);
      return 50; // Fallback to neutral confidence
    }

    // Find the specific species in the predictions
    const speciesPrediction = data.find((pred: {species_code?: string}) =>
      pred.species_code === speciesCode
    );

    if (!speciesPrediction) {
      console.warn('[Weekly Forecast] Species', speciesCode, 'not found in predictions for', targetDate);
      return 50; // Fallback to neutral confidence
    }

    // Extract confidence score (same logic as mapPrediction.ts)
    const confidence = extractConfidence(speciesPrediction);
    return Math.round(Math.min(Math.max(confidence, 0), 100));

  } catch (error) {
    console.error('[Weekly Forecast] Error fetching prediction for', speciesCode, ':', error);
    return 50; // Fallback to neutral confidence
  }
}

/**
 * Extract confidence score from prediction data
 * Uses the same logic as parseConfidence in lib/findr/mapPrediction.ts
 */
function extractConfidence(prediction: Record<string, unknown>): number {
  const candidateKeys = [
    'confidence_percent',
    'environmental_score',
    'confidence',
    'confidencePercentage',
    'confidence_score',
    'bite_score',
  ];

  for (const key of candidateKeys) {
    const raw = prediction[key];
    if (raw == null || typeof raw !== 'number' || Number.isNaN(raw)) continue;

    let value = raw;
    // If value is 0-1 (probability), convert to percentage
    if (value > 0 && value <= 1) {
      value *= 100;
    }
    // If value is 0-10 (environmental_score), convert to percentage
    if (key === 'environmental_score' && value >= 0 && value <= 10) {
      value *= 10;
    }
    if (value < 0) continue;
    return value;
  }

  return 50; // Default neutral confidence
}

/**
 * Find the peak fishing day from the 7-day forecast
 */
function findPeakDay(forecast: WeeklyForecastDay[]): { dayName: string; confidence: number } {
  if (forecast.length === 0) {
    return { dayName: 'Unknown', confidence: 0 };
  }

  let peakDay = forecast[0];
  for (const day of forecast) {
    if (day.confidence > peakDay.confidence) {
      peakDay = day;
    }
  }

  // Extract day name from "Mon 15" format
  const dayName = peakDay.date.split(' ')[0];
  const dayNameMap: Record<string, string> = {
    'Mon': 'Monday',
    'Tue': 'Tuesday',
    'Wed': 'Wednesday',
    'Thu': 'Thursday',
    'Fri': 'Friday',
    'Sat': 'Saturday',
    'Sun': 'Sunday',
  };

  return {
    dayName: dayNameMap[dayName] || dayName,
    confidence: peakDay.confidence,
  };
}

/**
 * Format the week start date as "Week of January 15, 2025"
 */
function formatWeekStart(date: Date): string {
  return `Week of ${date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })}`;
}
