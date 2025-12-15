/**
 * Image Utilities for Grow
 * 
 * Client-side image processing utilities including resizing for upload.
 */

/**
 * Resize an image to a maximum width while maintaining aspect ratio
 * Returns a Blob ready for upload
 */
export async function resizeImage(
  file: File | Blob,
  maxWidth: number = 1024,
  quality: number = 0.85,
  outputFormat: 'image/jpeg' | 'image/webp' = 'image/webp'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        outputFormat,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert a File to a data URL for preview
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize an image from a data URL
 */
export async function resizeDataUrl(
  dataUrl: string,
  maxWidth: number = 1024,
  quality: number = 0.85,
  outputFormat: 'image/jpeg' | 'image/webp' = 'image/webp'
): Promise<Blob> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return resizeImage(blob, maxWidth, quality, outputFormat);
}

/**
 * Upload a community plant photo to Supabase storage
 */
export async function uploadCommunityPlantPhoto(
  supabaseClient: {
    storage: {
      from: (bucket: string) => {
        upload: (path: string, file: Blob, options?: { contentType?: string }) => Promise<{ data: { path: string } | null; error: Error | null }>;
        getPublicUrl: (path: string) => { data: { publicUrl: string } };
      };
    };
  },
  file: File | Blob,
  scientificName: string,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Resize image to max 1024px width
    const resizedBlob = await resizeImage(file, 1024, 0.85, 'image/webp');

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = scientificName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
    const filename = `${sanitizedName}/${userId.slice(0, 8)}-${timestamp}.webp`;

    // Upload to Supabase storage
    const { data, error } = await supabaseClient.storage
      .from('community-plant-photos')
      .upload(filename, resizedBlob, {
        contentType: 'image/webp',
      });

    if (error || !data) {
      return { url: null, error: error?.message || 'Upload failed' };
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('community-plant-photos')
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };

  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err.message : 'Failed to upload image',
    };
  }
}

/**
 * Get image dimensions from a File or Blob
 */
export function getImageDimensions(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a JPEG, PNG, or WebP image',
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Image is too large. Maximum size is ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}
