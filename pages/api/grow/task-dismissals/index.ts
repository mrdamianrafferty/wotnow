import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';

interface TaskDismissal {
  id: string;
  task_key: string;
  dismissal_type: 'done' | 'skipped';
  dismissed_for_year: number;
  created_at: string;
}

interface GetResponse {
  dismissals: TaskDismissal[];
}

interface PostBody {
  taskKey: string;
  dismissalType: 'done' | 'skipped';
  year?: number;
}

interface PostResponse {
  success: boolean;
  dismissal?: TaskDismissal;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | PostResponse | { error: string }>
) {
  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;

  if (req.method === 'GET') {
    // Get all dismissals for current year (and optionally a specific year)
    try {
      const yearParam = req.query.year;
      const year = yearParam ? parseInt(yearParam as string, 10) : new Date().getFullYear();

      const { data, error } = await supabase
        .from('grow_task_dismissals')
        .select('id, task_key, dismissal_type, dismissed_for_year, created_at')
        .eq('user_id', userId)
        .eq('dismissed_for_year', year);

      if (error) {
        console.error('[task-dismissals] GET error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ dismissals: data || [] });
    } catch (error) {
      console.error('[task-dismissals] GET exception:', error);
      return res.status(500).json({ error: 'Failed to fetch dismissals' });
    }
  }

  if (req.method === 'POST') {
    // Add or update a dismissal
    try {
      const body = req.body as PostBody;

      if (!body.taskKey || !body.dismissalType) {
        return res.status(400).json({ error: 'taskKey and dismissalType are required' });
      }

      const year = body.year || new Date().getFullYear();

      // Upsert the dismissal
      const { data, error } = await supabase
        .from('grow_task_dismissals')
        .upsert({
          user_id: userId,
          task_key: body.taskKey,
          dismissal_type: body.dismissalType,
          dismissed_for_year: year,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,task_key,dismissed_for_year'
        })
        .select()
        .single();

      if (error) {
        console.error('[task-dismissals] POST error:', error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ success: true, dismissal: data });
    } catch (error) {
      console.error('[task-dismissals] POST exception:', error);
      return res.status(500).json({ error: 'Failed to save dismissal' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
