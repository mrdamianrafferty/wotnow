
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  const { catchId, pinned } = req.body;
  if (!catchId || typeof pinned !== 'boolean') {
    return res.status(400).json({ error: 'Missing catchId or pinned' });
  }

  // Only allow updating catches owned by the user
  const { error } = await supabase
    .from('findr_catch_entries')
    .update({ pinned })
    .eq('id', catchId)
    .eq('user_id', user.id);
  if (error) {
    console.error('[pin-catch] Database error:', error);
    return res.status(500).json({ error: error.message });
  }
  console.log('[pin-catch] Successfully updated:', { catchId, pinned, userId: user.id });
  return res.status(200).json({ success: true });
}