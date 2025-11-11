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
  generateWeeklyForecastHTML,
  generateWeeklyForecastText,
  type WeeklyForecastData,
  type WeeklyForecastSpecies,
  type WeeklyForecastDay
} from '../../../lib/findr/emailTemplates';
import { generateUnsubscribeToken } from '../findr/unsubscribe';
import { SPECIES_IMAGE_MAP } from '../../../data/speciesImageMap';

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

    // 3. Fetch 7-day predictions for each species
    const speciesForecast: WeeklyForecastSpecies[] = [];

    for (const [rectangleCode, rectFavs] of rectangleFavourites) {
      for (const fav of rectFavs) {
        const forecast = await fetch7DayPredictions(fav.species_code, rectangleCode);

        if (forecast.length > 0) {
          // Get species image
          const speciesImageInfo = SPECIES_IMAGE_MAP[fav.species_code];
          const imageUrl = speciesImageInfo?.mobile || speciesImageInfo?.image || '/webp/default-fish.webp';

          // Find peak day
          const peakDay = findPeakDay(forecast);

          speciesForecast.push({
            speciesName: fav.species_name,
            speciesCode: fav.species_code,
            imageUrl,
            forecast,
            peakDay: peakDay.dayName,
            peakConfidence: peakDay.confidence,
          });
        }
      }
    }

    if (speciesForecast.length === 0) {
      console.log('[Weekly Forecast] No predictions available for user:', userId);
      return false;
    }

    // 4. Get location name (use first rectangle)
    const firstRectangle = Array.from(rectangleFavourites.keys())[0];
    const { data: rectangle } = await supabase
      .from('ices_rectangles')
      .select('code')
      .eq('code', firstRectangle)
      .single();
    const locationName = rectangle?.code || firstRectangle;

    // 5. Generate week start string
    const today = new Date();
    const weekStart = formatWeekStart(today);

    // 6. Generate unsubscribe token and URL
    const unsubscribeToken = await generateUnsubscribeToken(userId);
    const unsubscribeUrl = `https://fishfindr.eu/findr/unsubscribe?token=${unsubscribeToken}`;

    // 7. Build email data
    const emailData: WeeklyForecastData = {
      userName,
      species: speciesForecast,
      weekStart,
      locationName,
      unsubscribeUrl,
    };

    // 8. Generate HTML and text versions
    const htmlContent = generateWeeklyForecastHTML(emailData);
    const textContent = generateWeeklyForecastText(emailData);

    // 9. Send via Resend
    const { data, error } = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: userEmail,
      subject: `📅 Your Weekly Fishing Forecast - ${speciesForecast.length} Species`,
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
 * Fetch 7-day confidence predictions for a species
 * This is a simplified version - in production, you'd call your prediction API
 * or directly query the prediction logic for multiple days
 */
async function fetch7DayPredictions(
  speciesCode: string,
  rectangleCode: string
): Promise<WeeklyForecastDay[]> {
  try {
    const forecast: WeeklyForecastDay[] = [];
    const today = new Date();

    // For each of the next 7 days, fetch predictions
    // Note: This is a placeholder. In production, you'd want to:
    // - Use your existing prediction logic (lib/findr/mapPrediction.ts)
    // - Fetch CMEMS data for future dates
    // - Cache results to avoid repeated calculations

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Format date as "Mon 15"
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = date.getDate();

      // TODO: Call prediction API or logic here
      // For now, using a placeholder that fetches current prediction
      // In production, this should fetch predictions for the specific date
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
 * Fetch prediction for a specific date
 * This is a placeholder - in production, you'd integrate with your prediction system
 */
async function fetchPredictionForDate(
  _speciesCode: string,
  _rectangleCode: string,
  _date: Date
): Promise<number> {
  // TODO: Integrate with actual prediction system
  // For now, return a mock confidence score
  // In production, this should:
  // 1. Fetch CMEMS data for the date
  // 2. Run the prediction algorithm
  // 3. Return the calculated confidence

  // Placeholder: return a value between 40-90
  return Math.floor(Math.random() * 50) + 40;
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
