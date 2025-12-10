import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';

interface UserTask {
  id: string;
  task_id: string;
  title: string | null;
  description: string | null;
  task_type: string;
  plant_slug: string | null;
  scheduled_for: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface GetResponse {
  tasks: UserTask[];
}

interface PostBody {
  taskId: string;
  title?: string;
  description?: string;
  taskType?: string;
  plantSlug?: string;
  scheduledFor?: string;
  notes?: string;
}

interface PostResponse {
  success: boolean;
  task?: UserTask;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | PostResponse | { error: string }>
) {
  console.log('[grow/user-tasks] Request:', req.method, req.url);
  
  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    console.log('[grow/user-tasks] Auth failed - no authenticated client');
    return;
  }

  const { supabase, userId } = auth;
  console.log('[grow/user-tasks] Authenticated user:', userId);

  if (req.method === 'GET') {
    // Get all user tasks
    try {
      console.log('[grow/user-tasks] Fetching tasks for user:', userId);
      const { data, error } = await supabase
        .from('grow_user_tasks')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'dismissed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[grow/user-tasks] GET error:', error);
        return res.status(500).json({ error: error.message });
      }

      console.log('[grow/user-tasks] Returning', data?.length || 0, 'tasks');
      return res.status(200).json({ tasks: data || [] });
    } catch (error) {
      console.error('[grow/user-tasks] GET exception:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  if (req.method === 'POST') {
    // Add a new task
    try {
      const body = req.body as PostBody;
      console.log('[grow/user-tasks] POST body:', JSON.stringify(body));

      if (!body.taskId) {
        console.log('[grow/user-tasks] Missing taskId');
        return res.status(400).json({ error: 'taskId is required' });
      }

      // Check if task already exists for this user
      const { data: existing } = await supabase
        .from('grow_user_tasks')
        .select('id, status')
        .eq('user_id', userId)
        .eq('task_id', body.taskId)
        .maybeSingle();

      if (existing) {
        // If dismissed, reactivate it
        if (existing.status === 'dismissed') {
          const { data: updated, error: updateError } = await supabase
            .from('grow_user_tasks')
            .update({ status: 'pending', updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }

          return res.status(200).json({ success: true, task: updated });
        }
        
        // Already exists and not dismissed
        return res.status(200).json({ success: true, task: existing as UserTask });
      }

      // Insert new task
      console.log('[grow/user-tasks] Inserting new task for user:', userId, 'taskId:', body.taskId);
      const { data: newTask, error: insertError } = await supabase
        .from('grow_user_tasks')
        .insert({
          user_id: userId,
          task_id: body.taskId,
          title: body.title || null,
          description: body.description || null,
          task_type: body.taskType || 'maintenance',
          plant_slug: body.plantSlug || null,
          scheduled_for: body.scheduledFor || null,
          notes: body.notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[grow/user-tasks] INSERT error:', insertError);
        return res.status(500).json({ error: insertError.message });
      }

      console.log('[grow/user-tasks] Task inserted successfully:', newTask?.id);
      return res.status(201).json({ success: true, task: newTask });
    } catch (error) {
      console.error('[grow/user-tasks] POST exception:', error);
      return res.status(500).json({ error: 'Failed to add task' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
