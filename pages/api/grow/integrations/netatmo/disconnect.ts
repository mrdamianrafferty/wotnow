/**
 * /api/grow/integrations/netatmo/disconnect
 *
 * Disconnect a Netatmo weather station.
 *
 * DELETE: Deactivate integration and remove tokens
 *
 * @module pages/api/grow/integrations/netatmo/disconnect
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
  if (req.method !== 'DELETE') {
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

  const integrationId = req.query.integrationId as string;

  if (!integrationId) {
    return res.status(400).json({ error: 'Could not identify the device to disconnect. Please refresh and try again.' });
  }

  try {
    // Deactivate the integration
    const { error: updateError } = await supabase
      .from('grow_user_integrations')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Netatmo Disconnect] Delete error:', updateError);
      return res.status(500).json({ error: 'Could not disconnect this device. Please try again.' });
    }

    // Delete the tokens
    await supabase
      .from('grow_integration_tokens')
      .delete()
      .eq('integration_id', integrationId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Netatmo Disconnect] Error:', error);
    return res.status(500).json({ error: 'Something went wrong on our end. Please try again in a few minutes.' });
  }
}
