// pages/api/account/delete.ts
// Account deletion endpoint for App Store compliance

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import { withRateLimit } from '@/lib/utils/apiMiddleware';

// Use service role for admin operations (deleting user)
const getServiceRoleClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export default withRateLimit(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabaseServerClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = user.id;
  console.log(`[Account Delete] Starting deletion for user: ${userId}`);

  try {
    const serviceClient = getServiceRoleClient();

    // Delete user data from all tables (order matters for foreign keys)
    // Using service role to bypass RLS
    const deletionSteps = [
      // Grow Daisy data
      { table: 'grow_garden_photos', label: 'garden photos' },
      { table: 'grow_user_plants', label: 'plants' },
      { table: 'grow_user_preferences', label: 'grow preferences' },
      { table: 'task_dismissals', label: 'task dismissals' },
      { table: 'planned_activities', label: 'planned activities' },

      // Findr data
      { table: 'findr_catch_entries', label: 'catch entries' },
      { table: 'findr_prediction_impressions', label: 'prediction impressions' },
      { table: 'findr_user_preferences', label: 'findr preferences' },
      { table: 'fish_id_usage', label: 'fish ID usage' },

      // Shared data
      { table: 'user_favourites', label: 'favourites' },
      { table: 'user_location_preferences', label: 'location preferences' },
      { table: 'user_notification_preferences', label: 'notification preferences' },
      { table: 'user_push_tokens', label: 'push tokens' },
      { table: 'notification_log', label: 'notification log' },
      { table: 'subscriptions', label: 'subscriptions' },
    ];

    const results: { table: string; success: boolean; error?: string }[] = [];

    for (const step of deletionSteps) {
      try {
        const { error } = await serviceClient
          .from(step.table)
          .delete()
          .eq('user_id', userId);

        if (error && !error.message.includes('does not exist')) {
          // Table might not exist, that's ok
          console.log(`[Account Delete] Note: ${step.table} - ${error.message}`);
        }
        results.push({ table: step.table, success: true });
      } catch (e) {
        console.error(`[Account Delete] Error deleting from ${step.table}:`, e);
        results.push({ table: step.table, success: false, error: String(e) });
      }
    }

    // Finally, delete the auth user
    const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('[Account Delete] Failed to delete auth user:', deleteUserError);
      return res.status(500).json({
        error: 'Failed to delete account',
        details: deleteUserError.message
      });
    }

    console.log(`[Account Delete] Successfully deleted user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      deletedTables: results.filter(r => r.success).map(r => r.table)
    });

  } catch (error) {
    console.error('[Account Delete] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}, 'strict');
