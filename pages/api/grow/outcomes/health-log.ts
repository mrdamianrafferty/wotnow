/**
 * /api/grow/outcomes/health-log
 *
 * API endpoint for managing plant health observations.
 *
 * GET: Retrieve health logs (optionally filtered by plant)
 * POST: Record a new health observation
 *
 * @module pages/api/grow/outcomes/health-log
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Valid symptoms for validation
const VALID_SYMPTOMS = [
  'yellowing_leaves',
  'browning_leaves',
  'wilting',
  'drooping',
  'pest_damage',
  'holes_in_leaves',
  'spots',
  'mold',
  'stunted_growth',
  'leggy',
  'leaf_drop',
  'no_flowers',
  'no_fruit',
  'root_rot',
  'other',
] as const;

type Symptom = (typeof VALID_SYMPTOMS)[number];

interface HealthLogRequest {
  plantId: string;
  healthScore: number;
  symptoms?: Symptom[];
  symptomNotes?: string;
  heightCm?: number;
  leafCount?: number;
  flowerCount?: number;
  fruitCount?: number;
  soilMoisture?: 'dry' | 'moist' | 'wet';
  photoUrl?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  if (req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const plantId = req.query.plantId as string;
      const since = req.query.since as string; // ISO date string

      let query = supabase
        .from('grow_plant_health_log')
        .select('*')
        .eq('user_id', userId)
        .order('observed_at', { ascending: false })
        .limit(limit);

      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      if (since) {
        query = query.gte('observed_at', since);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[HealthLog] Error fetching:', error);
        return res.status(500).json({ error: 'Failed to fetch health logs' });
      }

      // Transform to camelCase for frontend
      const logs = (data || []).map((log) => ({
        id: log.id,
        plantId: log.plant_id,
        observedAt: log.observed_at,
        healthScore: log.health_score,
        symptoms: log.symptoms,
        symptomNotes: log.symptom_notes,
        heightCm: log.height_cm,
        leafCount: log.leaf_count,
        flowerCount: log.flower_count,
        fruitCount: log.fruit_count,
        soilMoisture: log.soil_moisture,
        photoUrl: log.photo_url,
        weatherSnapshot: log.weather_snapshot,
        createdAt: log.created_at,
      }));

      return res.status(200).json({ logs });
    } catch (error) {
      console.error('[HealthLog] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const body = req.body as HealthLogRequest;

    // Validation
    if (!body.plantId) {
      return res.status(400).json({ error: 'plantId is required' });
    }

    if (typeof body.healthScore !== 'number' || body.healthScore < 1 || body.healthScore > 10) {
      return res.status(400).json({ error: 'healthScore must be a number between 1 and 10' });
    }

    if (body.symptoms) {
      const invalidSymptoms = body.symptoms.filter((s) => !VALID_SYMPTOMS.includes(s));
      if (invalidSymptoms.length > 0) {
        return res.status(400).json({
          error: `Invalid symptoms: ${invalidSymptoms.join(', ')}`,
          validSymptoms: VALID_SYMPTOMS,
        });
      }
    }

    if (body.soilMoisture && !['dry', 'moist', 'wet'].includes(body.soilMoisture)) {
      return res.status(400).json({ error: 'soilMoisture must be dry, moist, or wet' });
    }

    try {
      // Optionally fetch current weather for the snapshot
      let weatherSnapshot = null;
      try {
        // Get user's location from preferences
        const { data: prefs } = await supabase
          .from('grow_user_preferences')
          .select('latitude, longitude')
          .eq('user_id', userId)
          .single();

        if (prefs?.latitude && prefs?.longitude) {
          // Fetch weather from internal API
          const weatherResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'https://godaisy.io'}/api/grow/weather?lat=${prefs.latitude}&lon=${prefs.longitude}`
          );
          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            weatherSnapshot = {
              temp: weatherData.current?.temp,
              humidity: weatherData.current?.humidity,
              condition: weatherData.current?.condition,
              capturedAt: new Date().toISOString(),
            };
          }
        }
      } catch {
        // Weather capture is optional - continue without it
      }

      const { data, error } = await supabase
        .from('grow_plant_health_log')
        .insert({
          user_id: userId,
          plant_id: body.plantId,
          health_score: body.healthScore,
          symptoms: body.symptoms || [],
          symptom_notes: body.symptomNotes,
          height_cm: body.heightCm,
          leaf_count: body.leafCount,
          flower_count: body.flowerCount,
          fruit_count: body.fruitCount,
          soil_moisture: body.soilMoisture,
          photo_url: body.photoUrl,
          weather_snapshot: weatherSnapshot,
        })
        .select()
        .single();

      if (error) {
        console.error('[HealthLog] Error inserting:', error);
        return res.status(500).json({ error: 'Failed to record health observation' });
      }

      // Transform response to camelCase
      const log = {
        id: data.id,
        plantId: data.plant_id,
        observedAt: data.observed_at,
        healthScore: data.health_score,
        symptoms: data.symptoms,
        symptomNotes: data.symptom_notes,
        heightCm: data.height_cm,
        leafCount: data.leaf_count,
        flowerCount: data.flower_count,
        fruitCount: data.fruit_count,
        soilMoisture: data.soil_moisture,
        photoUrl: data.photo_url,
        weatherSnapshot: data.weather_snapshot,
        createdAt: data.created_at,
      };

      return res.status(201).json({ log });
    } catch (error) {
      console.error('[HealthLog] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
