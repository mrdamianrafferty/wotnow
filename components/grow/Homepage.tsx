'use client';

import React, { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { getSeasonalTint } from '../../lib/grow/seasonalColors';
import { auth } from '../../lib/grow/auth';
import { api } from '../../lib/grow/api';
import { useLocalSignals } from '../../hooks/useLocalSignals';
import { useWeatherTasks } from '../../hooks/useWeatherTasks';
import { useGrowSubscription } from '../../hooks/useGrowSubscription';
import { useTranslationMap } from '../../lib/translation/useTranslationMap';
import { useScreenTracking } from '../../lib/performance';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import type { SerializedBed } from '../../lib/grow/server/beds';

import { HomepageHeader } from './homepage/HomepageHeader';
import { UrgencyBanner } from './homepage/UrgencyBanner';
import { BedsAtGlance } from './homepage/BedsAtGlance';
import { HarvestHorizon } from './homepage/HarvestHorizon';
import { GardenPulse } from './homepage/GardenPulse';
import { WhatToStart } from './homepage/WhatToStart';
import { SmartNudge } from './homepage/SmartNudge';
import { HomepageSkeleton } from './homepage/HomepageSkeleton';

// Static strings for translation
const STATIC_COPY = [
  'My Garden',
  'Harvest Horizon',
  'Garden Pulse',
  'What to Start This Week',
  'Start your garden',
  'Create your first bed',
  'Skip today',
  'Your plants need water today',
  'days remaining',
  'Ready to harvest',
  'Approaching harvest',
  'Ready now',
  'Empty',
];

export function Homepage() {
  useScreenTracking('Homepage');

  const seasonal = getSeasonalTint();
  const { t } = useTranslationMap(useMemo(() => STATIC_COPY, []));
  const { isBloomOrHigher } = useGrowSubscription();

  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState('');
  const [beds, setBeds] = useState<SerializedBed[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [calendarWindows, setCalendarWindows] = useState<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any[]
  >([]);
  const [userPlantSlugs, setUserPlantSlugs] = useState<Set<string>>(new Set());

  // Hooks
  const {
    signals: localSignals,
    dismissSignal,
  } = useLocalSignals({
    location: userLocation || undefined,
    enabled: !!userLocation,
  });

  const {
    data: weatherData,
    hasLocation,
    refetch: refetchWeather,
  } = useWeatherTasks();

  // Load initial data
  useEffect(() => {
    let isMounted = true;

    startTransition(async () => {
      const authenticated = auth.isAuthenticated();
      if (isMounted) setIsAuthenticated(authenticated);

      // Load location
      let location = '';
      const token = auth.getCurrentAccessToken();
      if (token) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../../lib/supabase/env');
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: { user } } = await supabase.auth.getUser();
          if (!isMounted) return;
          if (user) {
            const { data: prefs } = await supabase
              .from('user_location_preferences')
              .select('home_place_name')
              .eq('user_id', user.id)
              .maybeSingle();
            if (!isMounted) return;
            if (prefs?.home_place_name) {
              location = prefs.home_place_name;
            }
          }
        } catch {
          if (!isMounted) return;
        }
      }

      if (!location) {
        try {
          const interestsStr = localStorage.getItem('userInterests');
          if (interestsStr) {
            const interests = JSON.parse(interestsStr);
            if (interests.location) location = interests.location;
          }
        } catch {
          // Invalid JSON
        }
      }

      if (isMounted) setUserLocation(location);

      // Load beds (auth only)
      if (authenticated) {
        try {
          const bedsRes = await api.getBeds();
          if (isMounted && bedsRes?.beds) {
            setBeds(bedsRes.beds);
          }
        } catch {
          if (!isMounted) return;
        }

        // Load user plants for "What to Start" filtering
        try {
          const plantsRes = await api.getUserPlants();
          if (isMounted && plantsRes?.plants) {
            const slugs = new Set<string>();
            for (const p of plantsRes.plants) {
              if (p.species_slug) slugs.add(p.species_slug);
            }
            setUserPlantSlugs(slugs);
          }
        } catch {
          if (!isMounted) return;
        }
      }

      // Load planting calendar
      if (authenticated) {
        try {
          const calRes = await api.getPlantingCalendar();
          if (isMounted && calRes?.windows) {
            setCalendarWindows(calRes.windows);
          }
        } catch {
          if (!isMounted) return;
        }
      }

      if (isMounted) setIsLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const handleLocationUpdate = useCallback((newLocation: string) => {
    setUserLocation(newLocation);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [bedsRes] = await Promise.all([
        isAuthenticated ? api.getBeds() : null,
        refetchWeather(),
      ]);
      if (bedsRes?.beds) setBeds(bedsRes.beds);
    } finally {
      setIsRefreshing(false);
    }
  }, [isAuthenticated, refetchWeather]);

  // Build urgency IDs set for SmartNudge dedup
  const urgentAlertIds = useMemo(() => {
    const ids = new Set<string>();
    if (weatherData?.alerts) {
      for (const a of weatherData.alerts) {
        if (a.severity === 'critical') {
          ids.add(`weather-${a.type}-${a.forecastDate}`);
        }
      }
    }
    return ids;
  }, [weatherData?.alerts]);

  if (isLoading) {
    return <HomepageSkeleton />;
  }

  return (
    <div
      style={{ backgroundColor: seasonal.backgroundColor }}
      className="space-y-6 pb-24 -mx-4 px-4 -mt-8 pt-8 min-h-screen"
    >
      <HomepageHeader
        seasonal={seasonal}
        currentLocation={userLocation}
        onLocationUpdate={handleLocationUpdate}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        t={t}
      />

      <FeatureErrorBoundary feature="urgency-banner">
        <UrgencyBanner
          signals={localSignals}
          weatherAlerts={weatherData?.alerts ?? []}
          onDismissSignal={dismissSignal}
        />
      </FeatureErrorBoundary>

      <FeatureErrorBoundary feature="beds-at-glance">
        <BedsAtGlance
          beds={beds}
          isAuthenticated={isAuthenticated}
          t={t}
        />
      </FeatureErrorBoundary>

      <FeatureErrorBoundary feature="harvest-horizon">
        <HarvestHorizon t={t} />
      </FeatureErrorBoundary>

      {weatherData && hasLocation && (
        <FeatureErrorBoundary feature="garden-pulse">
          <GardenPulse
            weatherData={weatherData}
            isPremium={isBloomOrHigher}
            t={t}
          />
        </FeatureErrorBoundary>
      )}

      {calendarWindows.length > 0 && (
        <FeatureErrorBoundary feature="what-to-start">
          <WhatToStart
            windows={calendarWindows}
            userPlantSlugs={userPlantSlugs}
            t={t}
          />
        </FeatureErrorBoundary>
      )}

      {weatherData && (
        <FeatureErrorBoundary feature="smart-nudge">
          <SmartNudge
            weatherData={weatherData}
            urgentAlertIds={urgentAlertIds}
            t={t}
          />
        </FeatureErrorBoundary>
      )}
    </div>
  );
}
