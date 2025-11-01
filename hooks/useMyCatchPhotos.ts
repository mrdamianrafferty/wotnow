import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';
import type { PhotoData } from '@/components/findr/TrophyPhotoCarousel';
import type { CatchSession } from '@/lib/findr/badgeDefinitions';

export function useMyCatchPhotos() {
  return useQuery({
    queryKey: ['my-catch-photos'],
    queryFn: async () => {
      // Get authenticated user and access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Fetch catches (both with and without photos) with auth token
      const res = await fetch('/api/findr/catch-log?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch catches');

      const data = await res.json();
      const catches = (data.catches || []) as Array<{
        id: string;
        species_id: string;
        species_common_name: string;
        caught_at: string;
        rectangle_code: string;
        quantity: number;
        size_category: string;
        bait_used: string;
        habitat_type?: string;
        notes?: string;
        pinned?: boolean;
        photo_assets?: Array<{
          url: string;
          thumbnail_url: string;
        }> | null;
      }>;

      // Convert to CatchSession format for badge calculations
      const sessions: CatchSession[] = catches.map((c) => ({
        id: c.id,
        species_id: c.species_id,
        species_common_name: c.species_common_name,
        caught_at: c.caught_at,
        rectangle_code: c.rectangle_code,
        quantity: c.quantity,
        size_category: c.size_category,
        bait_used: c.bait_used,
        habitat_type: c.habitat_type,
        notes: c.notes,
        pinned: c.pinned,
        photo_assets: c.photo_assets,
      }));

      // Transform to PhotoData[] format
      const photos: PhotoData[] = catches.flatMap((c) => {
        // If user uploaded photos, use those
        if (c.photo_assets && c.photo_assets.length > 0) {
          return c.photo_assets.map((asset, assetIndex) => ({
            id: `${c.id}-${assetIndex}`,
            url: asset.url,
            thumbnail: asset.thumbnail_url,
            caption: `${c.species_common_name} (${c.quantity}x)`,
            pinned: !!c.pinned,
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
          pinned: !!c.pinned,
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

      return { photos, sessions };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always enabled if component is mounted
  });
}
