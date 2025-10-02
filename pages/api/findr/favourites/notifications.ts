/**
 * /api/findr/favourites/notifications
 * 
 * Update notification preferences for a favourite species
 * PATCH: Update notification settings
 */

import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create authenticated Supabase client
  const supabase = createServerSupabaseClient({ req, res });
  
  // Get authenticated user
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized - Please sign in' });
  }

  const userId = session.user.id;

  try {
    const { speciesId, preferences } = req.body;

    if (!speciesId) {
      return res.status(400).json({ error: 'speciesId required' });
    }

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences object required' });
    }

    // Validate preferences structure
    const { enabled, threshold, channels } = preferences;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'preferences.enabled must be a boolean' });
    }

    // Find the user's favourite entry
    const { data: favourite, error: findError } = await supabase
      .from('user_favourites')
      .select('id')
      .eq('user_id', userId)
      .eq('species_id', speciesId)
      .single();

    if (findError || !favourite) {
      return res.status(404).json({ error: 'Favourite not found' });
    }

    // Update notification preferences
    // Note: This assumes user_favourites table has notification columns
    // You may need to create a separate notifications table if needed
    const updateData: Record<string, boolean | number | { push: boolean; email: boolean; sms: boolean }> = {
      notifications_enabled: enabled,
    };

    if (typeof threshold === 'number') {
      updateData.notification_threshold = threshold;
    }

    if (channels && typeof channels === 'object') {
      updateData.notification_channels = channels;
    }

    const { data, error: updateError } = await supabase
      .from('user_favourites')
      .update(updateData)
      .eq('id', favourite.id)
      .eq('user_id', userId) // RLS safety
      .select()
      .single();

    if (updateError) {
      console.error('Error updating notifications:', updateError);
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      notification: {
        speciesId,
        enabled: data.notifications_enabled,
        threshold: data.notification_threshold,
        channels: data.notification_channels,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({ 
      error: 'Failed to update notification preferences', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
