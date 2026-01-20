/**
 * /api/grow/integrations
 *
 * List and manage user integrations.
 *
 * GET: List all user integrations with latest data
 *
 * @module pages/api/grow/integrations
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  if (req.method === 'GET') {
    try {
      const type = req.query.type as string;
      const includeData = req.query.includeData === 'true';

      // Fetch user's integrations
      let query = supabase
        .from('grow_user_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('integration_type', type);
      }

      const { data: integrations, error: intError } = await query;

      if (intError) {
        console.error('[Integrations] Error fetching:', intError);
        return res.status(500).json({ error: 'Failed to fetch integrations' });
      }

      // If includeData, fetch latest data for each integration
      let integrationsWithData = integrations || [];

      if (includeData && integrations && integrations.length > 0) {
        const integrationIds = integrations.map(i => i.id);

        // Get latest weather station data for each integration
        const { data: latestData } = await supabase
          .rpc('grow_get_latest_station_data', { integration_ids: integrationIds });

        // Merge data with integrations
        integrationsWithData = integrations.map(integration => {
          const data = latestData?.find((d: { integration_id: string }) => d.integration_id === integration.id);
          return {
            ...integration,
            latest_data: data || null,
          };
        });
      }

      // Calculate summary
      const summary = {
        total: integrationsWithData.length,
        by_type: integrationsWithData.reduce((acc: Record<string, number>, int) => {
          const t = int.integration_type;
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {}),
      };

      return res.status(200).json({
        integrations: integrationsWithData,
        summary,
      });
    } catch (error) {
      console.error('[Integrations] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
