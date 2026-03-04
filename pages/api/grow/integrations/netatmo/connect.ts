/**
 * /api/grow/integrations/netatmo/connect
 *
 * Netatmo integration endpoint.
 *
 * DELETE: Disconnect integration (delegates to disconnect logic)
 * POST: Not used — Netatmo uses OAuth via /authorize endpoint
 *
 * @module pages/api/grow/integrations/netatmo/connect
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
  if (req.method === 'DELETE') {
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

    const integrationId = req.query.integrationId as string;

    if (!integrationId) {
      return res.status(400).json({ error: 'integrationId is required' });
    }

    try {
      const { error: updateError } = await supabase
        .from('grow_user_integrations')
        .update({
          status: 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Netatmo Connect] Delete error:', updateError);
        return res.status(500).json({ error: 'Failed to disconnect integration' });
      }

      await supabase
        .from('grow_integration_tokens')
        .delete()
        .eq('integration_id', integrationId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Netatmo Connect] Delete error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    return res.status(400).json({
      error: 'Netatmo uses OAuth. Use GET /api/grow/integrations/netatmo/authorize instead.',
    });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
