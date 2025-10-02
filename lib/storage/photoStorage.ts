import { supabase } from '../supabase/client';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a photo to Supabase Storage with automatic organization by user and date
 * 
 * @param file - The image file or blob to upload
 * @param catchId - Unique identifier for the catch (for organizing photos)
 * @param userId - User ID for organizing photos by user
 * @returns Upload result with public URL or error
 */
export async function uploadCatchPhoto(
  file: File | Blob,
  catchId: string,
  userId: string
): Promise<PhotoUploadResult> {
  try {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const fileName = `${userId}/${catchId}/${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('findr-catch-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file instanceof File ? file.type : 'image/jpeg'
      });

    if (error) {
      console.error('[Photo Upload] Supabase error:', error);
      return { success: false, error: `Upload failed: ${error.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('findr-catch-photos')
      .getPublicUrl(data.path);

    return { 
      success: true, 
      url: urlData.publicUrl 
    };

  } catch (error) {
    console.error('[Photo Upload] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Delete a photo from Supabase Storage
 * 
 * @param photoPath - The path of the photo in storage (extracted from URL)
 * @returns Success status
 */
export async function deleteCatchPhoto(photoPath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('findr-catch-photos')
      .remove([photoPath]);

    if (error) {
      console.error('[Photo Delete] Supabase error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Photo Delete] Unexpected error:', error);
    return false;
  }
}

/**
 * Extract storage path from Supabase public URL
 * 
 * @param publicUrl - The public URL returned by Supabase
 * @returns The storage path for use with delete operations
 */
export function extractStoragePath(publicUrl: string): string {
  // Extract path from URL like: 
  // https://xyz.supabase.co/storage/v1/object/public/findr-catch-photos/user123/catch456/2024-01-01T12-00-00.jpg
  const matches = publicUrl.match(/\/findr-catch-photos\/(.+)$/);
  return matches ? matches[1] : '';
}

/**
 * Create the Supabase Storage bucket for catch photos if it doesn't exist
 * This should be called during app initialization or migration
 */
export async function createPhotoBucket(): Promise<boolean> {
  try {
    // Create bucket with public read access
    const { error } = await supabase.storage.createBucket('findr-catch-photos', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB limit for processed images
    });

    if (error && !error.message.includes('already exists')) {
      console.error('[Photo Bucket] Creation failed:', error);
      return false;
    }

    console.info('[Photo Bucket] Ready for catch photos');
    return true;
  } catch (error) {
    console.error('[Photo Bucket] Unexpected error:', error);
    return false;
  }
}

/**
 * Compresses an image file to reduce storage size while maintaining acceptable quality
 * 
 * CURRENT SETTINGS (optimized for storage efficiency):
 * - Max width: 600px (maintains aspect ratio)
 * - JPEG quality: 60% 
 * - Typical size reduction: 80-90% of original
 * 
 * FUTURE ADJUSTMENT GUIDE:
 * If storage fills up too fast, consider these options in order:
 * 1. Reduce maxWidth to 400px (for thumbnails only)
 * 2. Lower JPEG quality to 50% (noticeable quality loss)
 * 3. Convert to WebP format (better compression, check browser support)
 * 4. Implement progressive deletion of old photos after 6 months
 * 5. Add photo count limits per user (e.g., max 50 photos)
 * 
 * If quality complaints arise:
 * 1. Increase JPEG quality to 70-75%
 * 2. Increase maxWidth to 800px
 * 3. Consider different settings for different photo types
 */
export const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions (max 600px width, maintain aspect ratio)
      // Adjust these values based on storage usage and quality requirements
      const maxWidth = 600;   // STORAGE SETTING: Reduce to 400px if storage issues
      const maxHeight = 600;  // STORAGE SETTING: Reduce proportionally with maxWidth
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress with storage-optimized settings
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        0.6 // 60% quality - STORAGE SETTING: Reduce to 0.5 if storage issues, increase to 0.7-0.75 if quality complaints
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};