import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface NotificationPreferences {
  id: string;
  user_id: string;
  hot_bite_alerts_enabled: boolean;
  hot_bite_channels: {
    push: boolean;
  };
  daily_email_enabled: boolean;
  daily_email_time: string; // HH:MM:SS format
  weekly_forecast_enabled: boolean;
  weekly_forecast_day: number; // 1=Monday, 7=Sunday
  weekly_forecast_time: string; // HH:MM:SS format
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesRequest {
  hot_bite_alerts_enabled?: boolean;
  hot_bite_channels?: {
    push: boolean;
  };
  daily_email_enabled?: boolean;
  daily_email_time?: string;
  weekly_forecast_enabled?: boolean;
  weekly_forecast_day?: number;
  weekly_forecast_time?: string;
}

/**
 * API Route: Notification Preferences Management
 *
 * Manages user's global notification preferences for fishing alerts and email digests.
 *
 * GET /api/findr/notification-preferences - Retrieve user's preferences
 * PUT /api/findr/notification-preferences - Update user's preferences
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract and verify user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn('[Notification Preferences] Auth verification failed:', authError?.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    if (req.method === 'GET') {
      return handleGetPreferences(req, res, user.id);
    } else if (req.method === 'PUT') {
      return handleUpdatePreferences(req, res, user.id);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('[Notification Preferences] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/findr/notification-preferences
 * Retrieves user's notification preferences, creating default if doesn't exist
 */
async function handleGetPreferences(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // Try to fetch existing preferences
    const { data: existing, error: fetchError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If preferences exist, return them
    if (existing && !fetchError) {
      return res.status(200).json(existing);
    }

    // If not found, create default preferences
    if (fetchError?.code === 'PGRST116') {
      console.log('[Notification Preferences] Creating default preferences for user:', userId);

      const defaultPreferences = {
        user_id: userId,
        hot_bite_alerts_enabled: true,
        hot_bite_channels: { push: true },
        daily_email_enabled: false,
        daily_email_time: '08:00:00',
        weekly_forecast_enabled: false,
        weekly_forecast_day: 1, // Monday
        weekly_forecast_time: '08:00:00',
      };

      const { data: created, error: createError } = await supabase
        .from('user_notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (createError) {
        console.error('[Notification Preferences] Failed to create defaults:', createError);
        return res.status(500).json({ error: 'Failed to create default preferences' });
      }

      return res.status(200).json(created);
    }

    // Other errors
    console.error('[Notification Preferences] Failed to fetch preferences:', fetchError);
    return res.status(500).json({ error: 'Failed to fetch preferences' });

  } catch (error) {
    console.error('[Notification Preferences] Error in handleGetPreferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/findr/notification-preferences
 * Updates user's notification preferences
 */
async function handleUpdatePreferences(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const updates: UpdatePreferencesRequest = req.body;

    // Validate the request body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Validate specific fields if provided
    if (updates.hot_bite_alerts_enabled !== undefined && typeof updates.hot_bite_alerts_enabled !== 'boolean') {
      return res.status(400).json({ error: 'hot_bite_alerts_enabled must be a boolean' });
    }

    if (updates.daily_email_enabled !== undefined && typeof updates.daily_email_enabled !== 'boolean') {
      return res.status(400).json({ error: 'daily_email_enabled must be a boolean' });
    }

    if (updates.weekly_forecast_enabled !== undefined && typeof updates.weekly_forecast_enabled !== 'boolean') {
      return res.status(400).json({ error: 'weekly_forecast_enabled must be a boolean' });
    }

    if (updates.weekly_forecast_day !== undefined) {
      const day = updates.weekly_forecast_day;
      if (!Number.isInteger(day) || day < 1 || day > 7) {
        return res.status(400).json({ error: 'weekly_forecast_day must be between 1 and 7' });
      }
    }

    if (updates.daily_email_time !== undefined) {
      const timePattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
      if (!timePattern.test(updates.daily_email_time)) {
        return res.status(400).json({ error: 'daily_email_time must be in HH:MM:SS format' });
      }
    }

    if (updates.weekly_forecast_time !== undefined) {
      const timePattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
      if (!timePattern.test(updates.weekly_forecast_time)) {
        return res.status(400).json({ error: 'weekly_forecast_time must be in HH:MM:SS format' });
      }
    }

    // First, ensure preferences exist for this user
    const { data: existing } = await supabase
      .from('user_notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existing) {
      // Create with provided updates merged with defaults
      const defaultPreferences = {
        user_id: userId,
        hot_bite_alerts_enabled: true,
        hot_bite_channels: { push: true },
        daily_email_enabled: false,
        daily_email_time: '08:00:00',
        weekly_forecast_enabled: false,
        weekly_forecast_day: 1,
        weekly_forecast_time: '08:00:00',
        ...updates,
      };

      const { data: created, error: createError } = await supabase
        .from('user_notification_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (createError) {
        console.error('[Notification Preferences] Failed to create preferences:', createError);
        return res.status(500).json({ error: 'Failed to create preferences' });
      }

      return res.status(200).json(created);
    }

    // Update existing preferences
    const { data: updated, error: updateError } = await supabase
      .from('user_notification_preferences')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[Notification Preferences] Failed to update preferences:', updateError);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    return res.status(200).json(updated);

  } catch (error) {
    console.error('[Notification Preferences] Error in handleUpdatePreferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
