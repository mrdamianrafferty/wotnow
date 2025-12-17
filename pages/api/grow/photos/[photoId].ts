import type { NextApiRequest, NextApiResponse } from 'next';
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

const BUCKET_NAME = 'grow-garden-photos';

interface GardenPhoto {
  id: string;
  userId: string;
  storagePath: string;
  url: string;
  thumbnailUrl: string | null;
  takenAt: string | null;
  description: string | null;
  location: string | null;
  plantIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Helper to get user from auth header
async function getUserIdFromAuth(req: NextApiRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

// Convert DB row to API response
function serializePhoto(row: Record<string, unknown>): GardenPhoto {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    storagePath: row.storage_path as string,
    url: row.url as string,
    thumbnailUrl: row.thumbnail_url as string | null,
    takenAt: row.taken_at as string | null,
    description: row.description as string | null,
    location: row.location as string | null,
    plantIds: (row.plant_ids as string[]) || [],
    tags: (row.tags as string[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { photoId } = req.query;
  
  if (typeof photoId !== 'string' || photoId.length === 0) {
    return res.status(400).json({ error: 'photoId is required' });
  }

  const userId = await getUserIdFromAuth(req);
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET - Get single photo
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('grow_garden_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    return res.status(200).json({ photo: serializePhoto(data) });
  }

  // PUT - Update photo metadata
  if (req.method === 'PUT') {
    const { description, location, takenAt, tags, plantIds } = req.body ?? {};
    
    const updates: Record<string, unknown> = {};
    
    if (description !== undefined) {
      updates.description = typeof description === 'string' ? description.trim() || null : null;
    }
    
    if (location !== undefined) {
      updates.location = typeof location === 'string' ? location.trim() || null : null;
    }
    
    if (takenAt !== undefined) {
      updates.taken_at = takenAt || null;
    }
    
    if (tags !== undefined && Array.isArray(tags)) {
      updates.tags = tags.filter((t): t is string => typeof t === 'string');
    }
    
    if (plantIds !== undefined && Array.isArray(plantIds)) {
      updates.plant_ids = plantIds.filter((id): id is string => typeof id === 'string');
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const { data, error } = await supabase
      .from('grow_garden_photos')
      .update(updates)
      .eq('id', photoId)
      .eq('user_id', userId)
      .select('*')
      .single();
    
    if (error) {
      console.error('[grow/photos] Update failed:', error);
      return res.status(500).json({ error: 'Failed to update photo' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    return res.status(200).json({ photo: serializePhoto(data) });
  }

  // DELETE - Delete photo
  if (req.method === 'DELETE') {
    // First get the photo to get storage path
    const { data: photo, error: fetchError } = await supabase
      .from('grow_garden_photos')
      .select('storage_path')
      .eq('id', photoId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([photo.storage_path]);
    
    if (storageError) {
      console.warn('[grow/photos] Storage delete failed:', storageError);
      // Continue to delete DB record anyway
    }
    
    // Delete from database
    const { error: dbError } = await supabase
      .from('grow_garden_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', userId);
    
    if (dbError) {
      console.error('[grow/photos] DB delete failed:', dbError);
      return res.status(500).json({ error: 'Failed to delete photo' });
    }
    
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
