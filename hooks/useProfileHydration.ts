/**
 * useProfileHydration
 * 
 * Loads authenticated user's profile from database and syncs it to UserPreferencesContext.
 * This ensures that signed-in users see their saved activities/locations across all pages.
 * 
 * Usage:
 * const { isHydrating } = useProfileHydration();
 * if (isHydrating) return <SkeletonLoader />;
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { useUserPreferences } from '../context/UserPreferencesContext';

const PREFERENCES_STORAGE_KEY = 'preferences';

type ProfileRow = {
  home_lat: number | null;
  home_lon: number | null;
  coast_lat: number | null;
  coast_lon: number | null;
  activities: unknown;
  preferences_json: Record<string, unknown> | null;
};

const isFiniteNumber = (value: unknown): value is number => 
  typeof value === 'number' && Number.isFinite(value);

function getSpotNamesFromProfileJson(prefsJson: Record<string, unknown> | null): {
  homeName: string;
  coastName: string;
} {
  const DEFAULT_HOME_NAME = 'Home';
  const DEFAULT_COAST_NAME = 'Coastal';

  if (!prefsJson || typeof prefsJson !== 'object') {
    return { homeName: DEFAULT_HOME_NAME, coastName: DEFAULT_COAST_NAME };
  }

  const homeName = typeof prefsJson.homeName === 'string' && prefsJson.homeName.trim() 
    ? prefsJson.homeName.trim() 
    : DEFAULT_HOME_NAME;
  
  const coastName = typeof prefsJson.coastName === 'string' && prefsJson.coastName.trim() 
    ? prefsJson.coastName.trim() 
    : DEFAULT_COAST_NAME;

  return { homeName, coastName };
}

export function useProfileHydration() {
  const { setPreferences } = useUserPreferences();
  const [isHydrating, setIsHydrating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        setIsAuthenticated(!!session);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setIsAuthenticated(!!session);
      }
    });

    return () => {
      active = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Hydrate profile from database if authenticated
  useEffect(() => {
    if (isAuthenticated === null) return; // Still checking auth
    if (!isAuthenticated) {
      setIsHydrating(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsHydrating(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('home_lat,home_lon,coast_lat,coast_lon,activities,preferences_json')
          .eq('id', user.id)
          .maybeSingle<ProfileRow>();

        if (error || !profile) {
          if (!cancelled) setIsHydrating(false);
          return;
        }

        const remoteActivities = Array.isArray(profile.activities)
          ? profile.activities.filter((id): id is string => typeof id === 'string')
          : [];
        const hasRemoteInterests = remoteActivities.length > 0;
        const hasRemoteHome = isFiniteNumber(profile.home_lat) && isFiniteNumber(profile.home_lon);
        const hasRemoteCoast = isFiniteNumber(profile.coast_lat) && isFiniteNumber(profile.coast_lon);
        const spotNames = getSpotNamesFromProfileJson(profile.preferences_json);

        console.log('[Profile Hydration] Remote profile data:', {
          remoteActivities,
          hasRemoteInterests,
          hasRemoteHome,
          hasRemoteCoast,
          spotNames
        });

        setPreferences(prev => {
          console.log('[Profile Hydration] Current preferences:', {
            interests: prev.interests,
            locations: prev.locations
          });
          const prevInterests = Array.isArray(prev.interests) ? prev.interests : [];
          const interestsChanged = hasRemoteInterests && (
            prevInterests.length !== remoteActivities.length ||
            prevInterests.some((id, idx) => id !== remoteActivities[idx])
          );

          const prevLocations = Array.isArray(prev.locations) ? prev.locations : [];
          const prevHome = prevLocations.find(l => l?.type === 'home');
          const prevCoast = prevLocations.find(l => l?.type === 'coastal');
          const otherLocations = prevLocations.filter(l => l?.type !== 'home' && l?.type !== 'coastal');

          const nextLocations = [...otherLocations];
          if (hasRemoteHome) {
            nextLocations.push({
              name: spotNames.homeName,
              lat: profile.home_lat as number,
              lon: profile.home_lon as number,
              type: 'home' as const,
            });
          } else if (prevHome) {
            nextLocations.push(prevHome);
          }

          if (hasRemoteCoast) {
            nextLocations.push({
              name: spotNames.coastName,
              lat: profile.coast_lat as number,
              lon: profile.coast_lon as number,
              type: 'coastal' as const,
            });
          } else if (prevCoast) {
            nextLocations.push(prevCoast);
          }

          const locationsChanged = nextLocations.length !== prevLocations.length || nextLocations.some((loc, index) => {
            const prevLoc = prevLocations[index];
            if (!prevLoc || !loc) return true;
            return (
              prevLoc.type !== loc.type ||
              prevLoc.name !== loc.name ||
              Number(prevLoc.lat) !== Number(loc.lat) ||
              Number(prevLoc.lon) !== Number(loc.lon)
            );
          });

          if (!interestsChanged && !locationsChanged) {
            console.log('[Profile Hydration] No changes detected, keeping current preferences');
            return prev;
          }

          const nextPreferences = {
            ...prev,
            interests: hasRemoteInterests ? remoteActivities : prevInterests,
            locations: locationsChanged ? nextLocations : prevLocations,
          };

          console.log('[Profile Hydration] Updating preferences:', {
            interestsChanged,
            locationsChanged,
            nextInterests: nextPreferences.interests,
            nextLocations: nextPreferences.locations
          });

          try {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
          } catch (err) {
            console.warn('Failed to persist preferences from profile', err);
          }

          return nextPreferences;
        });

        if (!cancelled) setIsHydrating(false);
      } catch (error) {
        console.error('Profile hydration failed:', error);
        if (!cancelled) setIsHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setPreferences]);

  return {
    isHydrating,
    isAuthenticated: isAuthenticated ?? false,
  };
}
