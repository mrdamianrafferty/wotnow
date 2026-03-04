/**
 * /api/grow/integrations/netatmo/authorize
 *
 * Initiate Netatmo OAuth flow.
 *
 * GET: Returns authorization URL to redirect user to Netatmo
 *
 * @module pages/api/grow/integrations/netatmo/authorize
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getNetatmoAuthUrl } from '@/lib/grow/netatmo';
import { checkIntegrationAccess } from '@/lib/grow/integrations';

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'This action is not supported.' });
  }

  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }

  // Check subscription access for hardware integrations
  const { hasAccess } = await checkIntegrationAccess(supabase, user.id);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Connecting devices is a premium feature. Upgrade your plan to get started.',
      upgradeRequired: true,
    });
  }

  try {
    // Generate state token with user ID for callback verification
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64url');

    // Store state temporarily for verification
    await supabase
      .from('grow_oauth_states')
      .upsert({
        state,
        user_id: user.id,
        provider: 'netatmo',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
      });

    // Construct redirect URI
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://grow.godaisy.io';
    const redirectUri = `${APP_URL}/api/grow/integrations/netatmo/callback`;

    const authUrl = getNetatmoAuthUrl(redirectUri, state);

    return res.status(200).json({ authUrl });
  } catch (error) {
    console.error('[Netatmo Authorize] Error:', error);
    return res.status(500).json({ error: 'Something went wrong on our end. Please try again in a few minutes.' });
  }
}
