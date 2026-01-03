import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';
import type { PhotoData } from '@/components/findr/TrophyPhotoCarousel';
import type { CatchSession } from '@/lib/findr/badgeDefinitions';
import {
  getCachedCatchHistory,
  cacheCatchHistory,
  type CachedCatch,
} from '@/lib/offline/catchHistory';
import { useOnlineStatus } from './useOnlineStatus';

interface MyCatchPhotosResult {
  photos: PhotoData[];
  sessions: CatchSession[];
  isFromCache?: boolean;
  cacheTimestamp?: string;
  isOffline?: boolean;
}

/**
 * Transform catches to PhotoData format
 */
function transformToPhotos(catches: CachedCatch[], isOffline = false): PhotoData[] {
  return catches.flatMap((c) => {
    // If user uploaded photos, use those
    if (c.photo_assets && c.photo_assets.length > 0) {
      return c.photo_assets.map((asset, assetIndex) => {
        // Use cached thumbnail when offline (if available)
        const thumbnail = isOffline && c.cached_thumbnail && assetIndex === 0
          ? c.cached_thumbnail
          : asset.thumbnail_url;

        return {
          id: `${c.id}-${assetIndex}`,
          url: isOffline && c.cached_thumbnail && assetIndex === 0 ? c.cached_thumbnail : asset.url,
          thumbnail,
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
        };
      });
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
}

/**
 * Transform catches to CatchSession format
 */
function transformToSessions(catches: CachedCatch[]): CatchSession[] {
  return catches.map((c) => ({
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
}

export function useMyCatchPhotos() {
  const { isOnline } = useOnlineStatus();

  return useQuery({
    queryKey: ['my-catch-photos'],
    queryFn: async (): Promise<MyCatchPhotosResult> => {
      // Get authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const userId = session.user.id;

      // If offline, return cached data
      if (!isOnline) {
        console.log('[useMyCatchPhotos] Offline - loading from cache');
        const cached = await getCachedCatchHistory(userId);

        if (cached) {
          const photos = transformToPhotos(cached.catches, true); // isOffline = true
          const sessions = transformToSessions(cached.catches);

          return {
            photos,
            sessions,
            isFromCache: true,
            cacheTimestamp: cached.cachedAt,
            isOffline: true,
          };
        }

        // No cache available offline
        return {
          photos: [],
          sessions: [],
          isFromCache: false,
          isOffline: true,
        };
      }

      // Online - fetch from API
      try {
        const res = await fetch('/api/findr/catch-log?limit=100', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          // If API fails, try cache
          const cached = await getCachedCatchHistory(userId);
          if (cached) {
            console.log('[useMyCatchPhotos] API failed, using cache');
            return {
              photos: transformToPhotos(cached.catches, false), // still online, just API failed
              sessions: transformToSessions(cached.catches),
              isFromCache: true,
              cacheTimestamp: cached.cachedAt,
              isOffline: false,
            };
          }
          throw new Error('Failed to fetch catches');
        }

        const data = await res.json();
        const catches = (data.catches || []) as CachedCatch[];

        // Cache the results for offline use
        await cacheCatchHistory(userId, catches);

        const photos = transformToPhotos(catches);
        const sessions = transformToSessions(catches);

        return {
          photos,
          sessions,
          isFromCache: false,
          isOffline: false,
        };
      } catch (error) {
        // Network error - try cache
        const cached = await getCachedCatchHistory(userId);
        if (cached) {
          console.log('[useMyCatchPhotos] Network error, using cache:', error);
          return {
            photos: transformToPhotos(cached.catches, !isOnline),
            sessions: transformToSessions(cached.catches),
            isFromCache: true,
            cacheTimestamp: cached.cachedAt,
            isOffline: !isOnline,
          };
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always enabled if component is mounted
    // Return cached data on error instead of throwing
    retry: (failureCount, _error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
  });
}
