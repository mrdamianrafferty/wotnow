import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/grow/api';

export const USER_PLANTS_QUERY_KEY = ['grow', 'user-plants'] as const;

type RawPlant = {
  id: string;
  name?: string;
  type?: string;
  species_slug?: string | null;
  [key: string]: unknown;
};

export interface UserPlantsResponse {
  plants?: RawPlant[];
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  onboardingSkipped?: boolean;
  plantCount?: number;
  [key: string]: unknown;
}

function hasAccessToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.localStorage.getItem('access_token');
}

export function useUserPlants(options?: { enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && hasAccessToken();

  return useQuery<UserPlantsResponse>({
    queryKey: USER_PLANTS_QUERY_KEY,
    queryFn: async () => (await api.getUserPlants()) as UserPlantsResponse,
    enabled,
    staleTime: 15 * 60 * 1000, // 15 min — plants change rarely
    gcTime: 30 * 60 * 1000,
  });
}

export function useInvalidateUserPlants() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USER_PLANTS_QUERY_KEY });
}
