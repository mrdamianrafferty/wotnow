import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifyCronAuth } from '@/lib/cron-auth';

/**
 * API endpoint for scheduled cache cleanup
 * 
 * Call via Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-cache",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 * 
 * Or call manually: GET /api/cron/cleanup-cache?secret=YOUR_CRON_SECRET
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Use service role for cleanup operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_stale_cache_data');

    if (error) {
      console.error('[CacheCleanup] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.info('[CacheCleanup] Completed:', data);
    
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results: data
    });
  } catch (err) {
    console.error('[CacheCleanup] Exception:', err);
    return res.status(500).json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
}
