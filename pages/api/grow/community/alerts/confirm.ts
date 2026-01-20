/**
 * /api/grow/community/alerts/confirm
 *
 * API endpoint for confirming community alerts.
 * Users can confirm that they've also seen the pest/disease/issue.
 *
 * POST: Confirm an alert
 *
 * @module pages/api/grow/community/alerts/confirm
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
  const alertId = req.query.alertId as string || req.body.alertId;

  if (!alertId) {
    return res.status(400).json({ error: 'alertId is required' });
  }

  try {
    // Get the alert and its group
    const { data: alert, error: alertError } = await supabase
      .from('grow_community_alerts')
      .select('id, group_id, confirmation_count, is_active, created_by')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Can't confirm your own alert
    if (alert.created_by === userId) {
      return res.status(400).json({ error: 'Cannot confirm your own alert' });
    }

    // Check if alert is still active
    if (!alert.is_active) {
      return res.status(400).json({ error: 'This alert is no longer active' });
    }

    // Verify user is a member of the group
    const { data: membership } = await supabase
      .from('grow_community_members')
      .select('id')
      .eq('group_id', alert.group_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Check if user has already confirmed
    // We'll store confirmations in the metadata for now (could be a separate table for larger scale)
    const { data: existingAlert } = await supabase
      .from('grow_community_alerts')
      .select('metadata')
      .eq('id', alertId)
      .single();

    const metadata = existingAlert?.metadata || {};
    const confirmations = (metadata as { confirmations?: string[] }).confirmations || [];

    if (confirmations.includes(userId)) {
      return res.status(409).json({ error: 'You have already confirmed this alert' });
    }

    // Add confirmation
    confirmations.push(userId);
    const newCount = (alert.confirmation_count || 0) + 1;

    const { error: updateError } = await supabase
      .from('grow_community_alerts')
      .update({
        confirmation_count: newCount,
        metadata: {
          ...metadata,
          confirmations,
        },
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('[Alert Confirm] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to confirm alert' });
    }

    return res.status(200).json({
      success: true,
      confirmationCount: newCount,
    });
  } catch (error) {
    console.error('[Alert Confirm] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
