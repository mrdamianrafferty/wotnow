import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../supabase/env';

export interface AuthenticatedClient {
  supabase: SupabaseClient;
  userId: string;
}

export async function getAuthenticatedClient(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedClient | null> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }

  const accessToken = authHeader.slice(7).trim();

  if (!accessToken) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }

  return { supabase, userId: data.user.id };
}
