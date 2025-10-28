import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface SpeciesCatchStats {
  speciesId: string;
  speciesName: string;
  totalCatches: number;
  totalQuantity: number;
  lastCaughtDate: string | null;
  firstCaughtDate: string | null;
}

export interface CatchStatistics {
  bySpecies: Map<string, SpeciesCatchStats>;
  totalCatches: number;
  totalQuantity: number;
  uniqueSpecies: number;
}

/**
 * Hook to fetch real catch statistics from the catch logging API
 * Groups catches by species and provides totals
 */
export function useCatchStatistics() {
  return useQuery({
    queryKey: ['catch-statistics'],
    queryFn: async (): Promise<CatchStatistics> => {
      // Get authenticated user and access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Return empty statistics if not authenticated
        return {
          bySpecies: new Map(),
          totalCatches: 0,
          totalQuantity: 0,
          uniqueSpecies: 0,
        };
      }

      // Fetch all catches with auth token
      const res = await fetch('/api/findr/catch-log?limit=1000', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch catch statistics');
      }

      const data = await res.json();
      const catches = (data.catches || []) as Array<{
        id: string;
        species_id: string;
        species_common_name: string;
        caught_at: string;
        quantity: number;
      }>;

      // Group catches by species
      const bySpecies = new Map<string, SpeciesCatchStats>();
      let totalCatches = 0;
      let totalQuantity = 0;

      catches.forEach((catchEntry) => {
        const speciesId = catchEntry.species_id.toLowerCase();
        const existing = bySpecies.get(speciesId);

        if (existing) {
          // Update existing species stats
          existing.totalCatches++;
          existing.totalQuantity += catchEntry.quantity || 1;

          // Update last caught date if this catch is more recent
          if (catchEntry.caught_at) {
            if (!existing.lastCaughtDate || new Date(catchEntry.caught_at) > new Date(existing.lastCaughtDate)) {
              existing.lastCaughtDate = catchEntry.caught_at;
            }
            if (!existing.firstCaughtDate || new Date(catchEntry.caught_at) < new Date(existing.firstCaughtDate)) {
              existing.firstCaughtDate = catchEntry.caught_at;
            }
          }
        } else {
          // Create new species stats entry
          bySpecies.set(speciesId, {
            speciesId,
            speciesName: catchEntry.species_common_name,
            totalCatches: 1,
            totalQuantity: catchEntry.quantity || 1,
            lastCaughtDate: catchEntry.caught_at || null,
            firstCaughtDate: catchEntry.caught_at || null,
          });
        }

        totalCatches++;
        totalQuantity += catchEntry.quantity || 1;
      });

      return {
        bySpecies,
        totalCatches,
        totalQuantity,
        uniqueSpecies: bySpecies.size,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}
