import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { SignalType } from '../../../../lib/grow/localSignals';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface _SignalPreferencesRow {
  user_id: string;
  muted_signals: SignalType[];
  min_severity: 'low' | 'moderate' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get auth token from header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  // Create authenticated client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (req.method === 'GET') {
    // Get user's signal preferences
    const { data, error } = await supabase
      .from('grow_signal_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching signal preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch preferences' });
    }

    // Return default preferences if none exist
    const preferences = data || {
      muted_signals: [],
      min_severity: 'low',
    };

    return res.status(200).json({
      mutedSignals: preferences.muted_signals || [],
      minSeverity: preferences.min_severity || 'low',
    });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { mutedSignals, minSeverity } = req.body;

    // Validate input
    const validSignalTypes: SignalType[] = [
      'aphid_conditions',
      'slug_activity',
      'caterpillar_conditions',
      'late_blight_risk',
      'powdery_mildew_risk',
      'botrytis_risk',
      'rust_risk',
      'frost_damage',
      'wind_damage',
      'heat_stress',
      'drought_stress',
    ];

    const validSeverities = ['low', 'moderate', 'high', 'critical'];

    if (mutedSignals && !Array.isArray(mutedSignals)) {
      return res.status(400).json({ error: 'mutedSignals must be an array' });
    }

    if (mutedSignals) {
      const invalidSignals = mutedSignals.filter(
        (s: string) => !validSignalTypes.includes(s as SignalType)
      );
      if (invalidSignals.length > 0) {
        return res.status(400).json({
          error: `Invalid signal types: ${invalidSignals.join(', ')}`,
          validTypes: validSignalTypes,
        });
      }
    }

    if (minSeverity && !validSeverities.includes(minSeverity)) {
      return res
        .status(400)
        .json({ error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` });
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('grow_signal_preferences')
      .upsert(
        {
          user_id: user.id,
          muted_signals: mutedSignals || [],
          min_severity: minSeverity || 'low',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving signal preferences:', error);
      return res.status(500).json({ error: 'Failed to save preferences' });
    }

    return res.status(200).json({
      mutedSignals: data.muted_signals,
      minSeverity: data.min_severity,
    });
  }

  if (req.method === 'POST') {
    // Toggle a single signal type mute status
    const { signalType, muted } = req.body;

    if (!signalType) {
      return res.status(400).json({ error: 'signalType is required' });
    }

    const validSignalTypes: SignalType[] = [
      'aphid_conditions',
      'slug_activity',
      'caterpillar_conditions',
      'late_blight_risk',
      'powdery_mildew_risk',
      'botrytis_risk',
      'rust_risk',
      'frost_damage',
      'wind_damage',
      'heat_stress',
      'drought_stress',
    ];

    if (!validSignalTypes.includes(signalType)) {
      return res.status(400).json({
        error: `Invalid signal type: ${signalType}`,
        validTypes: validSignalTypes,
      });
    }

    // Get current preferences
    const { data: existing } = await supabase
      .from('grow_signal_preferences')
      .select('muted_signals')
      .eq('user_id', user.id)
      .single();

    let currentMuted: SignalType[] = existing?.muted_signals || [];

    // Toggle or set mute status
    if (muted === true) {
      if (!currentMuted.includes(signalType)) {
        currentMuted.push(signalType);
      }
    } else if (muted === false) {
      currentMuted = currentMuted.filter((s) => s !== signalType);
    } else {
      // Toggle
      if (currentMuted.includes(signalType)) {
        currentMuted = currentMuted.filter((s) => s !== signalType);
      } else {
        currentMuted.push(signalType);
      }
    }

    // Save
    const { error } = await supabase.from('grow_signal_preferences').upsert(
      {
        user_id: user.id,
        muted_signals: currentMuted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Error toggling signal mute:', error);
      return res.status(500).json({ error: 'Failed to update preference' });
    }

    return res.status(200).json({
      signalType,
      muted: currentMuted.includes(signalType),
      mutedSignals: currentMuted,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
