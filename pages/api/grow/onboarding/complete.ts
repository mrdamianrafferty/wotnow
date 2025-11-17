import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';

interface CompleteOnboardingResponse {
  success: boolean;
  completedAt: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompleteOnboardingResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;
  const completedAt = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    grow_onboarding_completed: true,
    grow_onboarding_completed_at: completedAt,
  };

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId);

  if (error) {
    console.error('[grow] Failed to mark onboarding complete for user', userId, error);
    return res.status(500).json({ error: error.message || 'Failed to mark onboarding complete' });
  }

  return res.status(200).json({ success: true, completedAt });
}
