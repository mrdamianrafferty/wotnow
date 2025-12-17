import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs/promises';

// Disable body parser for file uploads and set max duration for Vercel
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 60, // 60 seconds for file processing
};

// Dynamic import of sharp to avoid module load crashes
import type sharp from 'sharp';
type SharpFunction = typeof sharp;
let sharpModule: SharpFunction | null = null;

async function getSharp(): Promise<SharpFunction | null> {
  if (sharpModule) return sharpModule;
  
  try {
    const mod = await import('sharp');
    sharpModule = mod.default;
    return sharpModule;
  } catch (err) {
    console.error('[grow/photos] Failed to load sharp:', err);
    return null;
  }
}

// Lazy initialization to avoid crashing at module load time
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  return supabase;
}

const BUCKET_NAME = 'grow-garden-photos';
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 85;

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
  const { data: { user }, error } = await getSupabase().auth.getUser(token);
  
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

// Parse multipart form data
async function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// Process and optimize image
async function processImage(filePath: string): Promise<Buffer> {
  const sharp = await getSharp();
  
  // If sharp isn't available, just return the original file
  if (!sharp) {
    console.warn('[grow/photos] Sharp not available, using original image');
    return fs.readFile(filePath);
  }
  
  const image = sharp(filePath);
  const metadata = await image.metadata();
  
  // Resize if too large, maintain aspect ratio
  let pipeline = image;
  if ((metadata.width && metadata.width > MAX_WIDTH) || (metadata.height && metadata.height > MAX_HEIGHT)) {
    pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  
  // Strip EXIF (privacy) but keep orientation, convert to JPEG
  return pipeline
    .rotate() // Auto-rotate based on EXIF
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Wrap entire handler in try-catch to prevent 500 errors from crashing
  try {
    const userId = await getUserIdFromAuth(req);
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // GET - List user's photos
    if (req.method === 'GET') {
      const { limit = '50', offset = '0', location, tag, plantId } = req.query;
      
      let query = getSupabase()
        .from('grow_garden_photos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
    
    // Optional filters
    if (location && typeof location === 'string') {
      query = query.eq('location', location);
    }
    
    if (tag && typeof tag === 'string') {
      query = query.contains('tags', [tag]);
    }
    
    if (plantId && typeof plantId === 'string') {
      query = query.contains('plant_ids', [plantId]);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[grow/photos] Failed to list photos:', error);
      return res.status(500).json({ error: 'Failed to load photos' });
    }
    
    return res.status(200).json({
      photos: (data || []).map(serializePhoto),
      total: count ?? data?.length ?? 0,
    });
  }

  // POST - Upload new photo
  if (req.method === 'POST') {
    try {
      const { fields, files } = await parseForm(req);
      
      // Get uploaded file
      const fileArray = files.image;
      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
      
      if (!file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      // Parse metadata from fields
      const getFieldValue = (field: formidable.Fields[string]): string | undefined => {
        if (!field) return undefined;
        return Array.isArray(field) ? field[0] : field;
      };
      
      const description = getFieldValue(fields.description);
      const location = getFieldValue(fields.location);
      const takenAt = getFieldValue(fields.takenAt);
      const tagsRaw = getFieldValue(fields.tags);
      const plantIdsRaw = getFieldValue(fields.plantIds);
      
      const tags = tagsRaw ? JSON.parse(tagsRaw) : [];
      const plantIds = plantIdsRaw ? JSON.parse(plantIdsRaw) : [];
      
      // Process and optimize image
      let processedBuffer: Buffer;
      try {
        processedBuffer = await processImage(file.filepath);
      } catch (err) {
        console.error('[grow/photos] Image processing failed:', err);
        // Fallback to original file
        processedBuffer = await fs.readFile(file.filepath);
      }
      
      // Generate unique storage path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storagePath = `${userId}/${timestamp}.jpg`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await getSupabase().storage
        .from(BUCKET_NAME)
        .upload(storagePath, processedBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      
      if (uploadError) {
        console.error('[grow/photos] Upload failed:', uploadError);
        return res.status(500).json({ error: `Failed to upload photo: ${uploadError.message}` });
      }
      
      // Get public URLs
      // Note: Using same URL for both since Supabase image transforms require Pro tier
      // Next.js Image component will handle resizing on the client side
      const { data: urlData } = getSupabase().storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Insert database record
      const { data: photoRecord, error: dbError } = await getSupabase()
        .from('grow_garden_photos')
        .insert({
          user_id: userId,
          storage_path: storagePath,
          url: publicUrl,
          thumbnail_url: publicUrl, // Same URL - Next.js Image handles resizing
          description: description || null,
          location: location || null,
          taken_at: takenAt || null,
          tags: tags,
          plant_ids: plantIds,
        })
        .select('*')
        .single();
      
      if (dbError) {
        console.error('[grow/photos] DB insert failed:', dbError);
        // Try to clean up uploaded file
        await getSupabase().storage.from(BUCKET_NAME).remove([storagePath]);
        return res.status(500).json({ error: `Failed to save photo record: ${dbError.message}` });
      }
      
      // Clean up temp file
      try {
        await fs.unlink(file.filepath);
      } catch {
        // Ignore cleanup errors
      }
      
      return res.status(201).json({ photo: serializePhoto(photoRecord) });
      
    } catch (err) {
      console.error('[grow/photos] Upload error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: `Upload failed: ${message}` });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
  
  } catch (err) {
    // Top-level catch for any unhandled errors
    console.error('[grow/photos] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: `Server error: ${message}` });
  }
}
