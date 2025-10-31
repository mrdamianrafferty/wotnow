import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { catchId, pinned } = req.body;
  if (!catchId || typeof pinned !== 'boolean') {
    return res.status(400).json({ error: 'Missing catchId or pinned' });
  }
  const { error } = await supabase
    .from('findr_catch_entries')
    .update({ pinned })
    .eq('id', catchId);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ success: true });
}