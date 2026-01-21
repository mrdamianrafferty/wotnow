import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';
import { lenientRateLimiter, RateLimitError } from '../../../../lib/utils/rate-limiter';

/**
 * Optimized 7-day predictions endpoint
 * 
 * Instead of making 7 separate API calls (which causes 504 timeouts),
 * this endpoint fetches all 7 days of predictions in a single optimized query.
 * 
 * Returns: Map of species_code -> array of 7 daily confidence scores
 */

interface DayPrediction {
  species_code: string;
  confidence_percent?: number;  // From RPC/cache (primary field)
  confidence?: number;          // Alternative field name  
  bite_score?: number;          // Fallback
  prediction_date?: string;
}

interface SevenDayResponse {
  success: boolean;
  rectangleCode: string;
  startDate: string;
  forecasts: Record<string, number[]>; // species_code -> [day0, day1, ..., day6]
  error?: string;
}

const CACHE_TABLE = 'findr_prediction_sessions';

function validateDate(input?: string): string | null {
  if (!input) return null;
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDatePattern.test(input)) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return input;
}

function generateDateRange(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SevenDayResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      success: false,
      rectangleCode: '',
      startDate: '',
      forecasts: {},
      error: 'Method not allowed'
    });
  }

  // Rate limiting (30 requests per minute)
  try {
    await lenientRateLimiter.check(req);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return res.status(429).json({
        success: false,
        rectangleCode: '',
        startDate: '',
        forecasts: {},
        error: 'Too many requests. Please try again later.'
      });
    }
  }

  try {
    // Parse query parameters
    const rectangleCode = Array.isArray(req.query.rectangle)
      ? req.query.rectangle[0]
      : req.query.rectangle as string | undefined;

    const startDateParam = Array.isArray(req.query.startDate)
      ? req.query.startDate[0]
      : req.query.startDate as string | undefined;

    const language = Array.isArray(req.query.language)
      ? req.query.language[0]
      : (req.query.language as string) || 'en';

    if (!rectangleCode) {
      return res.status(400).json({
        success: false,
        rectangleCode: '',
        startDate: '',
        forecasts: {},
        error: 'Missing rectangle parameter'
      });
    }

    // Default to today if no start date provided
    const today = new Date().toISOString().split('T')[0];
    const startDate = validateDate(startDateParam) || today;
    const dates = generateDateRange(startDate, 7);

    const supabase = getSupabaseServerClient();

    // Fetch cached predictions for all 7 days in a single query
    // This is MUCH more efficient than 7 separate API calls
    const { data: cachedData, error: cacheError } = await supabase
      .from(CACHE_TABLE)
      .select('prediction_date, payload')
      .eq('rectangle_code', rectangleCode)
      .eq('language', language)
      .in('prediction_date', dates)
      .gt('expires_at', new Date().toISOString());

    if (cacheError) {
      console.warn('[7-day] Cache query error:', cacheError.message);
    }
    
    // Debug: log what we got from cache
    console.log('[7-day] Cache query result:', {
      rectangleCode,
      language,
      dates,
      cachedRowCount: cachedData?.length ?? 0,
      cacheError: cacheError?.message
    });

    // Build forecasts from cached data
    const forecasts: Record<string, number[]> = {};

    // Process cached predictions - first pass: get all species data we have
    let baselinePredictions: DayPrediction[] = [];
    
    if (cachedData && cachedData.length > 0) {
      // Create a map of date -> predictions
      const dateToPayload = new Map<string, DayPrediction[]>();
      
      for (const row of cachedData) {
        if (Array.isArray(row.payload)) {
          dateToPayload.set(row.prediction_date, row.payload as DayPrediction[]);
        }
      }

      // Use today's data (or most recent) as baseline
      baselinePredictions = dateToPayload.get(startDate) || 
                           dateToPayload.get(dates[0]) ||
                           (cachedData[0]?.payload as DayPrediction[]) ||
                           [];

      // For each date in order, extract species confidence
      dates.forEach((date, dayIndex) => {
        const predictions = dateToPayload.get(date) || [];
        
        for (const pred of predictions) {
          const speciesCode = pred.species_code;
          if (!speciesCode) continue;

          // Get confidence score (check all possible field names from different sources)
          const confidence = typeof pred.confidence_percent === 'number'
            ? pred.confidence_percent
            : typeof pred.confidence === 'number'
            ? pred.confidence
            : typeof pred.bite_score === 'number'
            ? pred.bite_score
            : null;

          if (confidence === null) continue;

          // Initialize array if first time seeing this species
          if (!forecasts[speciesCode]) {
            forecasts[speciesCode] = new Array(7).fill(0);
          }

          forecasts[speciesCode][dayIndex] = Math.round(confidence);
        }
      });
    }

    // Find which days are missing from cache
    const missingDays: number[] = [];
    const cachedDates = new Set(cachedData?.map(row => row.prediction_date) ?? []);

    for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
      if (!cachedDates.has(dates[dayIndex])) {
        missingDays.push(dayIndex);
      }
    }

    // If we have missing days, fetch them in parallel from the predictions API
    if (missingDays.length > 0) {
      console.log('[7-day] Fetching real predictions for missing days:', missingDays.map(i => dates[i]));

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ||
                     (req.headers.host?.includes('localhost') ? 'http://localhost:3000' : `https://${req.headers.host}`);

      // Fetch all missing days in parallel
      const fetchPromises = missingDays.map(async (dayIndex) => {
        try {
          const response = await fetch(`${baseUrl}/api/findr/predictions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rectangleCode,
              predictionDate: dates[dayIndex],
              language
            })
          });

          if (response.ok) {
            const data = await response.json();
            return { dayIndex, predictions: data.predictions as DayPrediction[] ?? [] };
          }
          return { dayIndex, predictions: [] };
        } catch (error) {
          console.warn(`[7-day] Failed to fetch predictions for day ${dayIndex}:`, error);
          return { dayIndex, predictions: [] };
        }
      });

      const results = await Promise.all(fetchPromises);

      // Merge fresh predictions into forecasts
      for (const { dayIndex, predictions } of results) {
        for (const pred of predictions) {
          const speciesCode = pred.species_code;
          if (!speciesCode) continue;

          const confidence = typeof pred.confidence_percent === 'number'
            ? pred.confidence_percent
            : typeof pred.confidence === 'number'
            ? pred.confidence
            : typeof pred.bite_score === 'number'
            ? pred.bite_score
            : null;

          if (confidence === null) continue;

          if (!forecasts[speciesCode]) {
            forecasts[speciesCode] = new Array(7).fill(0);
          }

          forecasts[speciesCode][dayIndex] = Math.round(confidence);
        }
      }
    }

    // Fill any remaining zeros with baseline data (only as last resort fallback)
    // This handles edge cases where API calls fail for specific days
    if (baselinePredictions.length > 0) {
      for (const pred of baselinePredictions) {
        const speciesCode = pred.species_code;
        if (!speciesCode) continue;

        const baseConfidence = typeof pred.confidence_percent === 'number'
          ? pred.confidence_percent
          : typeof pred.confidence === 'number'
          ? pred.confidence
          : typeof pred.bite_score === 'number'
          ? pred.bite_score
          : null;

        if (baseConfidence === null) continue;

        if (!forecasts[speciesCode]) {
          forecasts[speciesCode] = new Array(7).fill(0);
        }

        // Only fill zeros (where we couldn't get real data)
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          if (forecasts[speciesCode][dayIndex] === 0) {
            // Use baseline as fallback (no random variation)
            forecasts[speciesCode][dayIndex] = Math.round(baseConfidence);
          }
        }
      }
    }

    // Cache the response for 30 minutes
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

    return res.status(200).json({
      success: true,
      rectangleCode,
      startDate,
      forecasts,
    });

  } catch (error) {
    console.error('[7-day] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      rectangleCode: '',
      startDate: '',
      forecasts: {},
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
