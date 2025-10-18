import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';
import type { PhotoData } from '@/components/findr/TrophyPhotoCarousel';

export function useMyCatchPhotos() {
  return useQuery({
    queryKey: ['my-catch-photos'],
    queryFn: async () => {
      // Get authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Fetch catches (both with and without photos)
      const res = await fetch('/api/findr/catch-log?limit=100');
      if (!res.ok) throw new Error('Failed to fetch catches');

      const catches = await res.json() as Array<{
        id: string;
        species_id: string;
        species_common_name: string;
        caught_at: string;
        rectangle_code: string;
        quantity: number;
        size_category: string;
        bait_used: string;
        notes?: string;
        photo_assets?: Array<{
          url: string;
          thumbnail_url: string;
        }> | null;
      }>;

      // Transform to PhotoData[] format
      const photos: PhotoData[] = catches.flatMap((c) => {
        // If user uploaded photos, use those
        if (c.photo_assets && c.photo_assets.length > 0) {
          return c.photo_assets.map((asset, assetIndex) => ({
            id: `${c.id}-${assetIndex}`,
            url: asset.url,
            thumbnail: asset.thumbnail_url,
            caption: `${c.species_common_name} (${c.quantity}x)`,
            metadata: {
              speciesName: c.species_common_name,
              location: c.rectangle_code,
              date: c.caught_at,
              icesRectangle: c.rectangle_code,
              quantity: c.quantity,
              size: c.size_category,
              bait: c.bait_used,
            }
          }));
        }

        // Otherwise, use species stock photo as fallback
        const speciesImage = SPECIES_IMAGE_MAP[c.species_id];
        if (!speciesImage) {
          // Skip catches with no photo and no matching species image
          return [];
        }

        return [{
          id: `${c.id}-default`,
          url: speciesImage.image, // Full-size species image
          thumbnail: speciesImage.thumb || speciesImage.mobile || speciesImage.image,
          caption: `${c.species_common_name} (${c.quantity}x) - ${new Date(c.caught_at).toLocaleDateString()}`,
          metadata: {
            speciesName: c.species_common_name,
            location: c.rectangle_code,
            date: c.caught_at,
            icesRectangle: c.rectangle_code,
            quantity: c.quantity,
            size: c.size_category,
            bait: c.bait_used,
            photographer: 'Stock photo', // Indicate this is not user's photo
          }
        }];
      });

      return photos;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always enabled if component is mounted
  });
}
