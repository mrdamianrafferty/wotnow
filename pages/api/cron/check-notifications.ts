/**
 * /api/cron/check-notifications
 *
 * Cron job that checks fishing predictions and sends notifications to users
 * when their favorite species cross confidence thresholds
 *
 * Runs every 30-60 minutes via Vercel Cron
 *
 * Notification Strategy:
 *
 * Push Notifications (Hot Bite Alerts):
 * - Sent immediately for species crossing 85%+ confidence threshold
 * - Rate-limited to prevent spam (6-hour cooldown per species)
 * - User must have hot_bite_alerts_enabled: true
 *
 * Email Strategy (Tiered Daily Digest):
 * - One email per user per day maximum
 * - Shows ALL favourite species grouped by confidence bands:
 *   • HOT BITES (85%+) - Urgent, action encouraged
 *   • GOOD CONDITIONS (60-84%) - Worth considering
 *   • STATUS UPDATES (<60%) - Informational
 * - User must have daily_email_enabled: true
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyCronAuth } from '@/lib/cron-auth';
import { Resend } from 'resend';
import {
  generateDailyDigestHTML,
  generateDailyDigestText,
  generateTieredDailyDigestHTML,
  generateTieredDailyDigestText,
  generateDailyDigestHTMLV2,
  generateDailyDigestTextV2,
  type EmailSpeciesAlert,
  type TieredEmailSpeciesAlert,
  type TieredDailyDigestData,
  type DailyDigestDataV2,
  type DailyTopSpecies,
  type DailyAlternativeSpecies,
  type DailyConditionsSnapshot,
  type NearbyTackleShop,
  type Guild,
} from '../../../lib/findr/emailTemplates';
import {
  calculateVerdictScore,
  getVerdict,
  generateVerdictReason,
  calculateOverallRating,
  calculateWaterClarity,
  calculatePressureTrend,
  calculateOptimalWindow,
  type EnvironmentalConditions,
  type MoonData,
} from '../../../lib/findr/conditionHelpers';
import { generateUnsubscribeToken } from '../findr/unsubscribe';
import { sendApnsPushNotification } from '../../../lib/findr/apnsClient';
import { SPECIES_IMAGE_MAP } from '../../../data/speciesImageMap';
import { sendFcmPushNotification } from '../../../lib/notifications/fcmClient';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration for cron job');
}

// Service role client bypasses RLS for cron jobs
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Initialize Resend client (only if API key is configured)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface UserFavourite {
  id: string;
  user_id: string;
  species_id: string;
  notifications_enabled: boolean;
  notification_threshold: number;
  notification_channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  species: {
    species_code: string;
    name_en: string;
  };
}

interface UserNotificationPreferences {
  user_id: string;
  hot_bite_alerts_enabled: boolean;
  daily_email_enabled: boolean;
  daily_email_time: string;
  weekly_forecast_enabled: boolean;
  weekly_forecast_day: number;
  weekly_forecast_time: string;
}

interface PredictionResult {
  species_code: string;
  confidence: number;
  rectangle_code: string;
}

interface NotificationToSend {
  userId: string;
  speciesId: string;
  speciesCode: string;
  speciesName: string;
  confidence: number;
  rectangleCode: string;
}

/**
 * Get user's default location (rectangle code)
 */
async function getUserLocation(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_location_preferences')
    .select('preferred_rectangles, home_region')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  // Return first preferred rectangle if available
  if (data.preferred_rectangles && data.preferred_rectangles.length > 0) {
    return data.preferred_rectangles[0];
  }

  // Fallback to home_region if no preferred rectangles
  return data.home_region || null;
}

/**
 * Get live predictions for a species in a rectangle
 */
async function getPredictions(rectangleCode: string, _speciesCodes: string[]): Promise<Map<string, number>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('[Cron] Fetching predictions for', rectangleCode, 'on', today);

    const { data, error } = await supabase.rpc('get_fishing_predictions', {
      rectangle_code_input: rectangleCode,
      prediction_date_input: today,
      user_language: 'en'
    });

    if (error) {
      console.error('[Cron] Error fetching predictions:', error);
      return new Map();
    }

    console.log('[Cron] Got', data?.length || 0, 'predictions from RPC');

    if (!data || !Array.isArray(data)) {
      return new Map();
    }

    // Build map of species_code -> confidence
    const predictions = new Map<string, number>();
    data.forEach((prediction: PredictionResult) => {
      if (prediction.species_code && typeof prediction.confidence === 'number') {
        predictions.set(prediction.species_code.toUpperCase(), prediction.confidence);
      }
    });

    console.log('[Cron] Predictions map keys:', Array.from(predictions.keys()).join(', '));
    console.log('[Cron] Looking for species codes:', _speciesCodes.join(', '));

    return predictions;
  } catch (error) {
    console.error('[Cron] Exception fetching predictions:', error);
    return new Map();
  }
}

/**
 * Check if a notification was recently sent (within last 24 hours)
 */
async function wasRecentlySent(userId: string, speciesId: string): Promise<boolean> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('species_id', speciesId)
    .eq('notification_type', 'threshold_crossed')
    .gte('sent_at', twentyFourHoursAgo)
    .limit(1);

  if (error) {
    console.error('[Cron] Error checking notification log:', error);
    return false; // On error, allow sending (better to send duplicate than miss)
  }

  return data && data.length > 0;
}

/**
 * Check if user has already received a daily digest email today
 * Enforces maximum one email per day policy
 *
 * NOTE: Checks for both 'daily_digest' (legacy) and 'daily_digest_v2' (current)
 */
async function hasReceivedDailyDigestToday(userId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    const { data, error } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('channel', 'email')
      .in('notification_type', ['daily_digest', 'daily_digest_v2'])
      .gte('sent_at', todayStart.toISOString())
      .limit(1);

    if (error) {
      console.error('[Cron] Error checking daily digest:', error);
      return false; // On error, allow sending
    }

    return data && data.length > 0;
  } catch {
    return false; // On error, allow sending
  }
}

/**
 * Send push notification to iOS (APNS) and Android (FCM) devices
 *
 * Queries user_push_tokens table for all device tokens and sends via appropriate service.
 * Removes invalid tokens from database if delivery fails.
 */
async function sendPushNotification(notification: NotificationToSend): Promise<boolean> {
  try {
    // 1. Get Findr push tokens from database (iOS and Android)
    // Filter to Findr bundle_id or legacy tokens (null bundle_id)
    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('token, platform, bundle_id')
      .eq('user_id', notification.userId)
      .or('bundle_id.eq.eu.fishfindr.app,bundle_id.is.null');

    if (tokenError || !tokens || tokens.length === 0) {
      console.log('[Push] No tokens found for user:', notification.userId);
      return false;
    }

    console.log('[Push] Sending notification to', tokens.length, 'device(s) for user:', notification.userId);

    let anySent = false;

    for (const { token, platform } of tokens) {
      let success = false;

      if (platform === 'ios') {
        // Send via APNS
        success = await sendApnsPushNotification(token, {
          title: '🎣 Hot Bite Alert!',
          body: `${notification.speciesName} at ${notification.confidence}% confidence in ${notification.rectangleCode}`,
          data: {
            type: 'hot_bite',
            speciesId: notification.speciesId,
            rectangleCode: notification.rectangleCode,
            confidence: notification.confidence.toString(),
          },
          badge: 1,
          sound: 'default',
        });
      } else if (platform === 'android') {
        // Send via FCM
        success = await sendFcmPushNotification(token, {
          title: '🎣 Hot Bite Alert!',
          body: `${notification.speciesName} at ${notification.confidence}% confidence in ${notification.rectangleCode}`,
          data: {
            type: 'hot_bite',
            speciesId: notification.speciesId,
            rectangleCode: notification.rectangleCode,
            confidence: notification.confidence.toString(),
          },
        });
      }

      if (success) {
        anySent = true;
        console.log(`[Push] ${platform} notification sent to user:`, notification.userId);
      } else {
        // Remove invalid token
        console.log(`[Push] Removing invalid ${platform} token for user:`, notification.userId);
        await supabase
          .from('user_push_tokens')
          .delete()
          .eq('token', token);
      }
    }

    return anySent;
  } catch (error) {
    console.error('[Push] Error sending push notification:', error);
    return false;
  }
}

/**
 * Send daily digest email to a user with all their species alerts
 *
 * @deprecated Replaced by sendTieredDailyDigestEmail which groups species by confidence bands
 * This function is kept for reference but is no longer called by the cron job.
 *
 * NOTE: This function is NOT called per-notification.
 * It's called once per user with ALL their alerts batched together.
 */
async function _sendDailyDigestEmail_DEPRECATED(
  userId: string,
  alerts: NotificationToSend[],
  locationName: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Cron] Resend not configured, skipping email for user:', userId);
    return false;
  }

  if (alerts.length === 0) {
    console.log('[Cron] No alerts to send for user:', userId);
    return false;
  }

  try {
    // 1. Get user's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user?.email) {
      console.error('[Cron] Could not get user email:', userError);
      return false;
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.name || undefined;

    // 2. Build email data with species alerts
    const emailAlerts: EmailSpeciesAlert[] = alerts.map(alert => ({
      speciesName: alert.speciesName,
      confidence: alert.confidence,
      locationName: locationName,
      rectangleCode: alert.rectangleCode,
      // TODO: Add species image URL if available
      imageUrl: undefined,
    }));

    const emailData = {
      userName,
      alerts: emailAlerts,
      date: new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
    };

    // 3. Generate HTML and text versions
    const htmlContent = generateDailyDigestHTML(emailData);
    const textContent = generateDailyDigestText(emailData);

    // 4. Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: userEmail,
      subject: `🎣 ${alerts.length} great fishing ${alerts.length === 1 ? 'opportunity' : 'opportunities'} today`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[Cron] Error sending email via Resend:', error);
      return false;
    }

    console.log('[Cron] Daily digest email sent successfully:', {
      userId,
      email: userEmail,
      alertCount: alerts.length,
      resendId: data?.id,
    });

    // 5. Log the daily digest send
    await supabase.from('notification_log').insert({
      user_id: userId,
      species_id: null, // Not species-specific, it's a digest
      notification_type: 'daily_digest',
      channel: 'email',
      confidence_at_send: null,
      threshold_value: null,
      notification_data: {
        alert_count: alerts.length,
        species_codes: alerts.map(a => a.speciesCode),
        location: locationName,
      },
      sent_at: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('[Cron] Exception sending daily digest email:', error);
    return false;
  }
}

/**
 * Send tiered daily digest email with species grouped by confidence bands
 * HOT BITES (85%+), GOOD CONDITIONS (60-84%), STATUS UPDATES (<60%)
 *
 * @deprecated Replaced by sendDailyDigestEmailV2 which uses verdict logic
 * Kept as fallback in case V2 fails for a user (e.g., missing environmental data)
 */
async function _sendTieredDailyDigestEmail(
  userId: string,
  allSpecies: Map<string, { speciesCode: string; speciesName: string; confidence: number }>,
  locationName: string,
  rectangleCode: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Cron] Resend not configured, skipping email for user:', userId);
    return false;
  }

  if (allSpecies.size === 0) {
    console.log('[Cron] No species to include in digest for user:', userId);
    return false;
  }

  try {
    // 1. Get user's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData.user?.email) {
      console.error('[Cron] Could not get user email:', userError);
      return false;
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.name || undefined;

    // 2. Group species by confidence tiers
    const hotBites: TieredEmailSpeciesAlert[] = [];
    const goodConditions: TieredEmailSpeciesAlert[] = [];
    const statusUpdates: TieredEmailSpeciesAlert[] = [];

    for (const [_, species] of allSpecies) {
      const alert: TieredEmailSpeciesAlert = {
        speciesName: species.speciesName,
        confidence: species.confidence,
        locationName,
        rectangleCode,
        imageUrl: undefined, // TODO: Add species image URLs
        tier: species.confidence >= 85 ? 'hot_bites' : species.confidence >= 60 ? 'good_conditions' : 'status_updates'
      };

      if (species.confidence >= 85) {
        hotBites.push(alert);
      } else if (species.confidence >= 60) {
        goodConditions.push(alert);
      } else {
        statusUpdates.push(alert);
      }
    }

    // Sort each tier by confidence (highest first)
    hotBites.sort((a, b) => b.confidence - a.confidence);
    goodConditions.sort((a, b) => b.confidence - a.confidence);
    statusUpdates.sort((a, b) => b.confidence - a.confidence);

    // 3. Generate unsubscribe token and URL
    const unsubscribeToken = await generateUnsubscribeToken(userId);
    const unsubscribeUrl = `https://fishfindr.eu/findr/unsubscribe?token=${unsubscribeToken}`;

    // 4. Build tiered email data
    const emailData: TieredDailyDigestData = {
      userName,
      hotBites,
      goodConditions,
      statusUpdates,
      date: new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      locationName,
      unsubscribeUrl
    };

    // 5. Generate HTML and text versions using tiered templates
    const htmlContent = generateTieredDailyDigestHTML(emailData);
    const textContent = generateTieredDailyDigestText(emailData);

    // 6. Create email subject based on what's included
    let subject = '🎣 Your Daily Fishing Digest';
    if (hotBites.length > 0) {
      subject = `🔥 ${hotBites.length} Hot Bite${hotBites.length > 1 ? 's' : ''} + Your Fishing Digest`;
    }

    // 7. Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: userEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[Cron] Error sending tiered email via Resend:', error);
      return false;
    }

    console.log('[Cron] Tiered daily digest email sent successfully:', {
      userId,
      email: userEmail,
      totalSpecies: allSpecies.size,
      hotBites: hotBites.length,
      goodConditions: goodConditions.length,
      statusUpdates: statusUpdates.length,
      resendId: data?.id,
    });

    // 7. Log the daily digest send
    const { error: logError } = await supabase.from('notification_log').insert({
      user_id: userId,
      species_id: null,
      notification_type: 'daily_digest',
      channel: 'email',
      confidence_at_send: null,
      threshold_value: null,
      notification_data: {
        total_species: allSpecies.size,
        hot_bites: hotBites.length,
        good_conditions: goodConditions.length,
        status_updates: statusUpdates.length,
        location: locationName,
      },
      sent_at: new Date().toISOString(),
    });

    if (logError) {
      console.error('[Cron] Error logging notification:', logError);
    } else {
      console.log('[Cron] Notification logged to database');
    }

    return true;
  } catch (error) {
    console.error('[Cron] Exception sending tiered daily digest email:', error);
    return false;
  }
}

/**
 * Fetch environmental conditions for a rectangle
 */
async function fetchEnvironmentalConditions(rectangleCode: string): Promise<EnvironmentalConditions | null> {
  try {
    const { data, error } = await supabase
      .from('findr_conditions_latest')
      .select('*')
      .eq('rectangle_code', rectangleCode)
      .single();

    if (error || !data) {
      console.log('[Cron] No environmental data for rectangle:', rectangleCode);
      return null;
    }

    return {
      sea_temp_c: data.sea_temp_c ?? data.water_temp_c ?? 12,
      salinity_psu: data.salinity_psu ?? 35,
      air_pressure_hpa: data.air_pressure_hpa ?? data.pressure_hpa ?? 1013,
      wave_height_m: data.wave_height_m ?? 1.0,
      kd490: data.kd490 ?? 0.1,
      cloud_cover_pct: data.cloud_cover_pct ?? null,
      chlorophyll_mg_m3: data.chlorophyll_mg_m3 ?? null,
      current_speed_ms: data.current_speed_ms ?? null,
      wind_speed_kts: data.wind_speed_kts ?? 10,
      next_high_tide_iso: data.next_high_tide_iso ?? null,
      next_low_tide_iso: data.next_low_tide_iso ?? null,
      pressure_trend_category: data.pressure_trend_category ?? null,
      captured_at: data.captured_at ?? null,
    };
  } catch (error) {
    console.error('[Cron] Error fetching environmental conditions:', error);
    return null;
  }
}

/**
 * Fetch moon data for today
 */
async function fetchMoonData(lat: number, lon: number): Promise<MoonData | null> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('moon_cache')
      .select('*')
      .eq('date', today)
      .gte('lat', lat - 1)
      .lte('lat', lat + 1)
      .gte('lon', lon - 1)
      .lte('lon', lon + 1)
      .limit(1)
      .single();

    if (error || !data) {
      console.log('[Cron] No moon data for date:', today);
      // Return default moon data
      return {
        moon_phase_name: 'Waxing',
        moon_illumination_pct: 50,
        sunrise_iso: null,
        sunset_iso: null,
        moon_transit_iso: null,
      };
    }

    return {
      moon_phase_name: data.phase_name ?? 'Unknown',
      moon_illumination_pct: data.illumination ?? 50,
      sunrise_iso: data.sunrise_iso ?? null,
      sunset_iso: data.sunset_iso ?? null,
      moonrise_iso: data.moonrise_iso ?? null,
      moonset_iso: data.moonset_iso ?? null,
      moon_transit_iso: data.moon_transit_iso ?? null,
    };
  } catch (error) {
    console.error('[Cron] Error fetching moon data:', error);
    return null;
  }
}

/**
 * Fetch tide times for a rectangle
 */
async function fetchTideTimes(rectangleCode: string): Promise<{ highTideIso: string | null; lowTideIso: string | null }> {
  try {
    const { data, error } = await supabase
      .from('findr_conditions_latest')
      .select('next_high_tide_iso, next_low_tide_iso')
      .eq('rectangle_code', rectangleCode)
      .single();

    if (error || !data) {
      return { highTideIso: null, lowTideIso: null };
    }

    return {
      highTideIso: data.next_high_tide_iso ?? null,
      lowTideIso: data.next_low_tide_iso ?? null,
    };
  } catch (error) {
    console.error('[Cron] Error fetching tide times:', error);
    return { highTideIso: null, lowTideIso: null };
  }
}

/**
 * Fetch nearest tackle shop using Google Places API
 */
async function fetchNearestTackleShop(lat: number, lon: number): Promise<NearbyTackleShop | null> {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_MAPS_API_KEY) {
    console.log('[Cron] Google Maps API key not configured');
    return null;
  }

  try {
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    searchUrl.searchParams.set('location', `${lat},${lon}`);
    searchUrl.searchParams.set('radius', '25000'); // 25km
    searchUrl.searchParams.set('keyword', 'fishing tackle bait shop');
    searchUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const place = data.results[0];
    const placeLat = place.geometry?.location?.lat;
    const placeLon = place.geometry?.location?.lng;

    // Calculate distance
    const R = 6371; // Earth's radius in km
    const dLat = ((placeLat - lat) * Math.PI) / 180;
    const dLon = ((placeLon - lon) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat * Math.PI) / 180) * Math.cos((placeLat * Math.PI) / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    return {
      name: place.name,
      address: place.vicinity || place.formatted_address || '',
      distance: distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
    };
  } catch (error) {
    console.error('[Cron] Error fetching tackle shop:', error);
    return null;
  }
}

/**
 * Get rectangle center coordinates
 */
async function getRectangleCenter(rectangleCode: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const { data, error } = await supabase
      .from('ices_rectangles')
      .select('anchor_lat, anchor_lon')
      .eq('rectangle_code', rectangleCode)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      lat: data.anchor_lat,
      lon: data.anchor_lon,
    };
  } catch (error) {
    console.error('[Cron] Error fetching rectangle center:', error);
    return null;
  }
}

/**
 * Fetch species advice for tactical recommendations
 */
async function fetchSpeciesAdvice(speciesCode: string): Promise<{
  approach: string;
  baits: string[];
  technique: string;
  tideAdvice: string;
  timePreference: 'dawn' | 'dusk' | 'day' | 'night' | 'any';
  tidePreference: 'flood' | 'ebb' | 'slack' | 'any';
} | null> {
  try {
    // Try to get tactical advice from the API
    const { data, error } = await supabase
      .from('species')
      .select('effective_techniques, guild')
      .eq('species_code', speciesCode)
      .single();

    if (error || !data) {
      return null;
    }

    // Default advice structure
    return {
      approach: data.effective_techniques || 'General fishing approach',
      baits: ['Ragworm', 'Mackerel strips', 'Sandeel'],
      technique: data.effective_techniques?.split(',')[0] || 'Bottom fishing',
      tideAdvice: 'Fish around the tide change for best results',
      timePreference: 'dawn' as const,
      tidePreference: 'flood' as const,
    };
  } catch (error) {
    console.error('[Cron] Error fetching species advice:', error);
    return null;
  }
}

/**
 * Format time from ISO string to display format (e.g., "6:30 AM")
 */
function formatTimeDisplayLocal(isoString: string | null): string | undefined {
  if (!isoString) return undefined;
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return undefined;
  }
}

/**
 * Send Daily Digest V2 - Decision-focused format with GO/GOOD/SKIP verdict
 * Only sends email on GO or GOOD days (score >= 60)
 */
async function sendDailyDigestEmailV2(
  userId: string,
  allSpecies: Map<string, { speciesCode: string; speciesName: string; confidence: number; speciesId: string; guild?: Guild }>,
  rectangleCode: string
): Promise<{ sent: boolean; verdict: 'go' | 'good' | 'skip' }> {
  if (!resend) {
    console.log('[Cron V2] Resend not configured, skipping email for user:', userId);
    return { sent: false, verdict: 'skip' };
  }

  if (allSpecies.size === 0) {
    console.log('[Cron V2] No species to include in digest for user:', userId);
    return { sent: false, verdict: 'skip' };
  }

  try {
    // 1. Get user's email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData.user?.email) {
      console.error('[Cron V2] Could not get user email:', userError);
      return { sent: false, verdict: 'skip' };
    }
    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.name || undefined;

    // 2. Get rectangle center for location queries
    const rectangleCenter = await getRectangleCenter(rectangleCode);
    const lat = rectangleCenter?.lat ?? 54;
    const lon = rectangleCenter?.lon ?? -6;

    // 3. Fetch environmental conditions and moon data
    const envConditions = await fetchEnvironmentalConditions(rectangleCode);
    if (!envConditions) {
      console.log('[Cron V2] No environmental data - using tiered fallback');
      return { sent: false, verdict: 'skip' };
    }

    const moonData = await fetchMoonData(lat, lon);

    // 4. Calculate water clarity and overall rating
    const waterClarity = calculateWaterClarity(envConditions.kd490);
    const pressureTrend = calculatePressureTrend(envConditions.pressure_trend_category);
    const overallRating = calculateOverallRating(envConditions, moonData);

    // 5. Get best species (highest confidence)
    const sortedSpecies = Array.from(allSpecies.values()).sort((a, b) => b.confidence - a.confidence);
    const topSpeciesData = sortedSpecies[0];

    if (!topSpeciesData || topSpeciesData.confidence < 60) {
      console.log('[Cron V2] Best species confidence too low:', topSpeciesData?.confidence);
      return { sent: false, verdict: 'skip' };
    }

    // 6. Calculate verdict score
    const verdictScore = calculateVerdictScore(topSpeciesData.confidence, overallRating);
    const verdict = getVerdict(verdictScore);

    console.log('[Cron V2] Verdict calculation:', {
      bestConfidence: topSpeciesData.confidence,
      overallRating,
      verdictScore,
      verdict,
    });

    // 7. Only send on GO or GOOD days
    if (verdict === 'skip') {
      console.log('[Cron V2] SKIP day - no email sent for user:', userId);
      return { sent: false, verdict };
    }

    // 8. Fetch additional data for V2 email
    const tideTimes = await fetchTideTimes(rectangleCode);
    const speciesAdvice = await fetchSpeciesAdvice(topSpeciesData.speciesCode);
    const nearestShop = await fetchNearestTackleShop(lat, lon);

    // 9. Build optimal window
    // Map 'any' preference to null (no preference)
    const timePreference = speciesAdvice?.timePreference;
    const tidePreference = speciesAdvice?.tidePreference;
    const optimalWindow = calculateOptimalWindow({
      sunriseIso: moonData?.sunrise_iso ?? null,
      sunsetIso: moonData?.sunset_iso ?? null,
      moonTransitIso: moonData?.moon_transit_iso ?? null,
      moonIllumination: moonData?.moon_illumination_pct ?? 50,
      highTideIso: tideTimes.highTideIso,
      lowTideIso: tideTimes.lowTideIso,
      speciesTimePreference: timePreference && timePreference !== 'any' ? timePreference : 'dawn',
      speciesTidePreference: tidePreference && tidePreference !== 'any' ? tidePreference : 'flood',
    });

    // 10. Build top species data - use thumb for email (smaller, square, ~7KB)
    const speciesImageInfo = SPECIES_IMAGE_MAP[topSpeciesData.speciesCode];
    const imageUrl = speciesImageInfo?.thumb || speciesImageInfo?.mobile || speciesImageInfo?.image || '/webp/default-fish.webp';

    const topSpecies: DailyTopSpecies = {
      speciesName: topSpeciesData.speciesName,
      speciesCode: topSpeciesData.speciesCode,
      confidence: topSpeciesData.confidence,
      imageUrl,
      guild: topSpeciesData.guild,
      approach: speciesAdvice?.approach ?? 'General fishing approach',
      baits: speciesAdvice?.baits ?? ['Ragworm', 'Mackerel strips'],
      technique: speciesAdvice?.technique ?? 'Bottom fishing',
      tideAdvice: speciesAdvice?.tideAdvice ?? 'Fish around tide changes',
    };

    // 11. Build alternatives (70%+ confidence, max 2)
    const alternatives: DailyAlternativeSpecies[] = sortedSpecies
      .slice(1)
      .filter(s => s.confidence >= 70)
      .slice(0, 2)
      .map(s => ({
        speciesName: s.speciesName,
        confidence: s.confidence,
        guild: s.guild,
      }));

    // 12. Build conditions snapshot
    const conditions: DailyConditionsSnapshot = {
      seaTempC: envConditions.sea_temp_c ?? 12,
      waveHeightM: envConditions.wave_height_m ?? 1.0,
      waterClarity,
      pressureTrend,
      moonPhase: moonData?.moon_phase_name ?? 'Unknown',
      moonIllumination: moonData?.moon_illumination_pct ?? 50,
      windSpeedKts: envConditions.wind_speed_kts ?? undefined,
    };

    // 13. Generate unsubscribe URL
    const unsubscribeToken = await generateUnsubscribeToken(userId);
    const unsubscribeUrl = `https://fishfindr.eu/findr/unsubscribe?token=${unsubscribeToken}`;

    // 14. Get location name
    const { data: rectangle } = await supabase
      .from('ices_rectangles')
      .select('region')
      .eq('rectangle_code', rectangleCode)
      .single();
    const locationName = rectangle?.region || rectangleCode;

    // 15. Build email data
    const emailData: DailyDigestDataV2 = {
      userName,
      date: new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      locationName,
      rectangleCode,
      unsubscribeUrl,
      verdict,
      verdictScore,
      verdictReason: generateVerdictReason(topSpeciesData.speciesName, topSpeciesData.confidence, pressureTrend, overallRating),
      topSpecies,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      optimalWindow: {
        ...optimalWindow,
        highTide: optimalWindow.highTide || (tideTimes.highTideIso ? formatTimeDisplayLocal(tideTimes.highTideIso) : undefined),
        lowTide: optimalWindow.lowTide || (tideTimes.lowTideIso ? formatTimeDisplayLocal(tideTimes.lowTideIso) : undefined),
        sunrise: optimalWindow.sunrise || (moonData?.sunrise_iso ? formatTimeDisplayLocal(moonData.sunrise_iso) : undefined),
        sunset: optimalWindow.sunset || (moonData?.sunset_iso ? formatTimeDisplayLocal(moonData.sunset_iso) : undefined),
      },
      conditions,
      nearestShop: nearestShop ?? undefined,
    };

    // 16. Generate HTML and text
    const htmlContent = generateDailyDigestHTMLV2(emailData);
    const textContent = generateDailyDigestTextV2(emailData);

    // 17. Create subject line based on verdict
    const subject = verdict === 'go'
      ? `🎯 GO FISH! ${topSpeciesData.speciesName} at ${topSpeciesData.confidence}% today`
      : `👍 Good fishing day - ${topSpeciesData.speciesName} at ${topSpeciesData.confidence}%`;

    // 18. Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: userEmail,
      subject,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error('[Cron V2] Error sending email via Resend:', error);
      return { sent: false, verdict };
    }

    console.log('[Cron V2] Daily digest V2 sent:', {
      userId,
      email: userEmail,
      verdict,
      verdictScore,
      topSpecies: topSpeciesData.speciesName,
      resendId: data?.id,
    });

    // 19. Log the send
    await supabase.from('notification_log').insert({
      user_id: userId,
      species_id: null,
      notification_type: 'daily_digest_v2',
      channel: 'email',
      confidence_at_send: topSpeciesData.confidence,
      threshold_value: null,
      notification_data: {
        verdict,
        verdict_score: verdictScore,
        top_species: topSpeciesData.speciesCode,
        alternatives_count: alternatives.length,
        location: locationName,
        environmental_rating: overallRating,
      },
      sent_at: new Date().toISOString(),
    });

    return { sent: true, verdict };
  } catch (error) {
    console.error('[Cron V2] Exception sending daily digest V2:', error);
    return { sent: false, verdict: 'skip' };
  }
}

/**
 * Send email notification (DEPRECATED - replaced by daily digest)
 *
 * This function is no longer used for individual species notifications.
 * Email notifications are now batched into daily digests.
 */
async function _sendEmailNotification(_notification: NotificationToSend): Promise<boolean> {
  console.log('[Cron] Individual email notifications deprecated, use daily digest instead');
  return false;
}

/**
 * Log sent notification to prevent spam
 */
async function logNotification(notification: NotificationToSend, channel: 'push' | 'email' | 'sms'): Promise<void> {
  await supabase.from('notification_log').insert({
    user_id: notification.userId,
    species_id: notification.speciesId,
    notification_type: 'hot_bite_alert',
    channel,
    confidence_at_send: notification.confidence,
    threshold_value: 85, // Hot bite threshold is hardcoded at 85%
    notification_data: {
      species_code: notification.speciesCode,
      species_name: notification.speciesName,
      rectangle_code: notification.rectangleCode,
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Starting notification check...');

    // 1. Get all users with hot bite alerts enabled
    const { data: preferences, error: prefError } = await supabase
      .from('user_notification_preferences')
      .select('user_id, hot_bite_alerts_enabled, daily_email_enabled')
      .eq('hot_bite_alerts_enabled', true);

    if (prefError) {
      console.error('[Cron] Error fetching notification preferences:', prefError);
      throw prefError;
    }

    if (!preferences || preferences.length === 0) {
      console.log('[Cron] No users with hot bite alerts enabled');
      return res.status(200).json({ success: true, message: 'No notifications to check', processed: 0 });
    }

    console.log('[Cron] Found', preferences.length, 'users with hot bite alerts enabled');

    // 2. Get all favourites for these users (only those with notifications enabled)
    // Join with species table to get species_code
    const userIds = preferences.map(p => p.user_id);
    const { data: favourites, error: favError } = await supabase
      .from('user_favourites')
      .select('id, user_id, species_id, notifications_enabled, notification_threshold, notification_channels, species!inner(species_code, name_en)')
      .in('user_id', userIds)
      .eq('notifications_enabled', true);

    if (favError) {
      console.error('[Cron] Error fetching favourites:', favError);
      throw favError;
    }

    if (!favourites || favourites.length === 0) {
      console.log('[Cron] No favourites found for users with notifications enabled');
      return res.status(200).json({ success: true, message: 'No favourites to check', processed: 0 });
    }

    // Map to handle Supabase inner join returning species as array
    const typedFavourites: UserFavourite[] = favourites.map((fav: Record<string, unknown>) => ({
      ...fav,
      species: Array.isArray(fav.species) ? fav.species[0] : fav.species
    })) as UserFavourite[];
    console.log('[Cron] Found', typedFavourites.length, 'favourites to check');

    // 3. Group favourites by user
    const userFavourites = new Map<string, UserFavourite[]>();
    typedFavourites.forEach((fav) => {
      const existing = userFavourites.get(fav.user_id) || [];
      existing.push(fav);
      userFavourites.set(fav.user_id, existing);
    });

    // Create user preferences map for easy lookup
    const userPreferences = new Map<string, UserNotificationPreferences>();
    preferences.forEach((pref) => {
      userPreferences.set(pref.user_id, pref as UserNotificationPreferences);
    });

    console.log('[Cron] Processing', userFavourites.size, 'users');

    // 4. Check predictions for each user
    const notificationsToSend: NotificationToSend[] = [];

    for (const [userId, favs] of userFavourites.entries()) {
      // Get user's location
      const rectangleCode = await getUserLocation(userId);
      if (!rectangleCode) {
        console.log('[Cron] No location for user', userId, '- skipping');
        continue;
      }

      // Get species codes from favourites
      const speciesCodes = favs.map((f) => f.species.species_code.toUpperCase());

      // Get predictions for this location
      const predictions = await getPredictions(rectangleCode, speciesCodes);

      // Check each favourite against its custom threshold
      for (const fav of favs) {
        const speciesCode = fav.species.species_code.toUpperCase();
        const confidence = predictions.get(speciesCode);

        if (confidence === undefined) {
          continue; // No prediction available
        }

        // Use the favorite's custom notification threshold (per-species setting)
        const threshold = fav.notification_threshold || 90; // Default to 90 if not set

        // Check if confidence crossed the threshold
        if (confidence >= threshold) {
          // Check if we recently sent a notification for this species
          const recentlySent = await wasRecentlySent(userId, fav.species_id);
          if (recentlySent) {
            console.log('[Cron] Already sent notification for user', userId, 'species', fav.species_id, 'in last 24 hours - skipping');
            continue;
          }

          // Queue notification
          notificationsToSend.push({
            userId,
            speciesId: fav.species_id,
            speciesCode,
            speciesName: fav.species.name_en,
            confidence,
            rectangleCode,
          });
        }
      }
    }

    console.log('[Cron] Found', notificationsToSend.length, 'species crossing their notification thresholds');

    // 5. Send notifications
    // Push notifications: Send individually for all hot bite alerts (real-time)
    // Email notifications: Batch by user (one daily digest per day max)

    let pushCount = 0;
    let emailDigestCount = 0;

    // 5a. Send push notifications individually (real-time hot bite alerts)
    // All users in notificationsToSend have hot_bite_alerts_enabled=true
    for (const notification of notificationsToSend) {
      const pushSent = await sendPushNotification(notification);
      if (pushSent) {
        await logNotification(notification, 'push');
        pushCount++;
      }
    }

    // 5b. Send V2 daily digest emails (decision-focused with GO/GOOD/SKIP verdict)
    // Process ALL users with daily_email_enabled, not just those with hot bites
    const usersWithDailyEmail = preferences.filter(p => p.daily_email_enabled);
    console.log('[Cron] Found', usersWithDailyEmail.length, 'users with daily email enabled');

    let skipCount = 0;

    for (const pref of usersWithDailyEmail) {
      const userId = pref.user_id;

      // Check if user already received digest today
      const alreadySentToday = await hasReceivedDailyDigestToday(userId);
      if (alreadySentToday) {
        console.log('[Cron] User', userId, 'already received daily digest today - skipping');
        continue;
      }

      // Get user's location
      const rectangleCode = await getUserLocation(userId);
      if (!rectangleCode) {
        console.log('[Cron] No location for user', userId, '- skipping email');
        continue;
      }

      // Get ALL favourites for this user
      const userFavs = userFavourites.get(userId);
      if (!userFavs || userFavs.length === 0) {
        console.log('[Cron] No favourites for user', userId, '- skipping email');
        continue;
      }

      // Get predictions for ALL favourite species
      const speciesCodes = userFavs.map((f) => f.species.species_code.toUpperCase());
      const predictions = await getPredictions(rectangleCode, speciesCodes);

      // Build map of all species with confidence scores (include speciesId for V2)
      const allSpeciesData = new Map<string, { speciesCode: string; speciesName: string; confidence: number; speciesId: string; guild?: Guild }>();

      for (const fav of userFavs) {
        const speciesCode = fav.species.species_code.toUpperCase();
        const confidence = predictions.get(speciesCode);

        if (confidence !== undefined) {
          allSpeciesData.set(speciesCode, {
            speciesCode,
            speciesName: fav.species.name_en,
            confidence,
            speciesId: fav.species_id,
            // Guild would need to be fetched from species table - using undefined for now
          });
        }
      }

      // Only send email if we have at least one species with predictions
      if (allSpeciesData.size === 0) {
        console.log('[Cron] No predictions available for user', userId, '- skipping email');
        continue;
      }

      // Send V2 digest with verdict logic (only sends on GO/GOOD days)
      const { sent, verdict } = await sendDailyDigestEmailV2(
        userId,
        allSpeciesData,
        rectangleCode
      );

      if (sent) {
        emailDigestCount++;
      } else if (verdict === 'skip') {
        skipCount++;
      }
    }

    console.log('[Cron] Daily digest summary: sent', emailDigestCount, ', skipped (poor conditions)', skipCount);

    console.log('[Cron] Notification check complete.');
    console.log(`[Cron] - Sent ${pushCount} push notifications`);
    console.log(`[Cron] - Sent ${emailDigestCount} daily digest emails`);

    return res.status(200).json({
      success: true,
      message: 'Notifications checked and sent',
      processed: userFavourites.size,
      thresholdCrossings: notificationsToSend.length,
      pushNotificationsSent: pushCount,
      emailDigestsSent: emailDigestCount,
    });
  } catch (error: unknown) {
    console.error('[Cron] Error in notification check:', error);
    return res.status(500).json({
      error: 'Failed to check notifications',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
