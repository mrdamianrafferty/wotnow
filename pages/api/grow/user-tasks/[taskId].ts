import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';

interface DeleteResponse {
  success: boolean;
}

interface PatchBody {
  status?: 'pending' | 'completed' | 'dismissed';
  notes?: string;
  scheduledFor?: string;
}

interface PatchResponse {
  success: boolean;
  task?: Record<string, unknown>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteResponse | PatchResponse | { error: string }>
) {
  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;
  const { taskId } = req.query;

  if (typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' });
  }

  if (req.method === 'DELETE') {
    // Remove task (actually dismiss it)
    try {
      const { error } = await supabase
        .from('grow_user_tasks')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('task_id', taskId);

      if (error) {
        console.error('[grow/user-tasks] DELETE error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[grow/user-tasks] DELETE exception:', error);
      return res.status(500).json({ error: 'Failed to remove task' });
    }
  }

  if (req.method === 'PATCH') {
    // Update task status or details
    try {
      const body = req.body as PatchBody;
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (body.status) {
        updates.status = body.status;
      }
      if (body.notes !== undefined) {
        updates.notes = body.notes;
      }
      if (body.scheduledFor !== undefined) {
        updates.scheduled_for = body.scheduledFor;
      }

      const { data, error } = await supabase
        .from('grow_user_tasks')
        .update(updates)
        .eq('user_id', userId)
        .eq('task_id', taskId)
        .select()
        .single();

      if (error) {
        console.error('[grow/user-tasks] PATCH error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, task: data });
    } catch (error) {
      console.error('[grow/user-tasks] PATCH exception:', error);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  }

  res.setHeader('Allow', ['DELETE', 'PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}
