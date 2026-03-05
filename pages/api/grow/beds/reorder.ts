import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase, userId } = auth;

  const { bedIds } = req.body ?? {};

  if (!Array.isArray(bedIds) || bedIds.length === 0) {
    return res.status(400).json({ error: 'bedIds array is required' });
  }

  // Validate all bedIds belong to user
  const { data: beds, error: bedsError } = await supabase
    .from('grow_garden_beds')
    .select('id')
    .eq('user_id', userId)
    .in('id', bedIds);

  if (bedsError || !beds) {
    return res.status(500).json({ error: 'Failed to validate beds' });
  }

  const validIds = new Set(beds.map(b => b.id));

  // Update sort_order for each valid bed
  for (let i = 0; i < bedIds.length; i++) {
    if (!validIds.has(bedIds[i])) continue;
    await supabase
      .from('grow_garden_beds')
      .update({ sort_order: i })
      .eq('id', bedIds[i])
      .eq('user_id', userId);
  }

  return res.status(200).json({ success: true });
}
