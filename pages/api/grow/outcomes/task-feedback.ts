/**
 * /api/grow/outcomes/task-feedback
 *
 * API endpoint for managing task feedback.
 *
 * GET: Retrieve user's task feedback
 * POST: Record feedback for a completed task
 * PUT: Update outcome for existing feedback
 *
 * @module pages/api/grow/outcomes/task-feedback
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

interface TaskFeedbackRequest {
  taskId: string;
  taskType: string;
  plantId?: string;
  wasHelpful?: boolean;
  feedbackRating?: number;
  feedbackText?: string;
}

interface TaskOutcomeRequest {
  feedbackId: string;
  outcome: 'improved' | 'no_change' | 'worsened' | 'unknown';
  outcomeNotes?: string;
  wouldRecommend?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from authorization header
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
      const limit = parseInt(req.query.limit as string) || 20;
      const taskType = req.query.taskType as string;
      const pendingOutcome = req.query.pendingOutcome === 'true';

      let query = supabase
        .from('grow_task_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (taskType) {
        query = query.eq('task_type', taskType);
      }

      // Get feedback that needs outcome follow-up (3+ days old without outcome)
      if (pendingOutcome) {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        query = query
          .is('outcome', null)
          .lt('completed_at', threeDaysAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('[TaskFeedback] Error fetching:', error);
        return res.status(500).json({ error: 'Failed to fetch task feedback' });
      }

      return res.status(200).json({ feedback: data || [] });
    } catch (error) {
      console.error('[TaskFeedback] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const body = req.body as TaskFeedbackRequest;

    if (!body.taskId || !body.taskType) {
      return res.status(400).json({ error: 'taskId and taskType are required' });
    }

    try {
      const { data, error } = await supabase
        .from('grow_task_feedback')
        .insert({
          user_id: userId,
          task_id: body.taskId,
          task_type: body.taskType,
          plant_id: body.plantId,
          was_helpful: body.wasHelpful,
          feedback_rating: body.feedbackRating,
          feedback_text: body.feedbackText,
        })
        .select()
        .single();

      if (error) {
        console.error('[TaskFeedback] Error inserting:', error);
        return res.status(500).json({ error: 'Failed to record task feedback' });
      }

      return res.status(201).json({ feedback: data });
    } catch (error) {
      console.error('[TaskFeedback] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Update outcome for existing feedback
    const body = req.body as TaskOutcomeRequest;

    if (!body.feedbackId || !body.outcome) {
      return res.status(400).json({ error: 'feedbackId and outcome are required' });
    }

    try {
      const { data, error } = await supabase
        .from('grow_task_feedback')
        .update({
          outcome: body.outcome,
          outcome_notes: body.outcomeNotes,
          would_recommend: body.wouldRecommend,
          outcome_recorded_at: new Date().toISOString(),
        })
        .eq('id', body.feedbackId)
        .eq('user_id', userId) // Ensure user owns this feedback
        .select()
        .single();

      if (error) {
        console.error('[TaskFeedback] Error updating:', error);
        return res.status(500).json({ error: 'Failed to update task feedback' });
      }

      if (!data) {
        return res.status(404).json({ error: 'Feedback not found' });
      }

      return res.status(200).json({ feedback: data });
    } catch (error) {
      console.error('[TaskFeedback] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
