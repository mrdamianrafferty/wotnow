'use client';

import React, { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { FishingAreaInfo } from '../../components/findr/FishingAreaInfo';
import {
  FALLBACK_RECTANGLE_OPTIONS,
  useFindrRectangleOptions,
  type RectangleOption,
} from '../../hooks/useFindrRectangleOptions';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { getTodayIso } from '../../lib/date/today';
import { useFindrConditions } from '../../hooks/useFindrConditions';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';

// Code-split ConditionsDashboard - likely contains charts/visualizations
const ConditionsDashboard = dynamic(
  () => import('../../components/findr/ConditionsDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    )
  }
);

const FindrConditionsRoute: React.FC = () => {
  const router = useRouter();
  
  const {
    options: rectangleOptions,
    loading: _rectangleOptionsLoading,
    error: _rectangleOptionsError,
    isFallback: rectangleOptionsUsingFallback,
  } = useFindrRectangleOptions(FALLBACK_RECTANGLE_OPTIONS);

  const {
    selectedCode,
    setSelectedCode,
    language: _language,
    setLanguage: _setLanguage,
  } = usePersistentFindrSettings({ predictionDate: getTodayIso(), language: 'en' });

  const { location, updateLocation, loading: locationLoading } = useUnifiedLocation();
  const locationRectangle = location?.rectangleCode ?? null;
  const hasLocation = Boolean(location?.lat && location?.lon);

  const rectangleFromUrl = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;

  // Single source of truth priority:
  // 1. Location from UnifiedLocationContext (from header picker)
  //    - For European: use rectangleCode
  //    - For Worldwide: rectangleCode will be null (use lat/lon)
  // 2. selectedCode (persisted fallback, ICES rectangle only)
  const activeRectangle = hasLocation ? locationRectangle : (selectedCode || null);
  
  const activeOption = useMemo<RectangleOption | null>(
    () => {
      const code = activeRectangle;
      if (!code) return null;
      return rectangleOptions.find((option) => option.code === code) ?? null;
    },
    [activeRectangle, rectangleOptions]
  );

  // Sync selectedCode when location context changes (for persistence)
  // Only sync if rectangleCode exists (European waters with ICES rectangles)
  // For worldwide locations (null rectangleCode), don't overwrite selectedCode
  useEffect(() => {
    if (locationLoading) return;
    if (!locationRectangle) return; // Don't sync null rectangleCode (worldwide locations)
    if (selectedCode === locationRectangle) return;
    console.log('[Conditions] Syncing selectedCode to context:', locationRectangle);
    setSelectedCode(locationRectangle);
  }, [locationRectangle, locationLoading, selectedCode, setSelectedCode]);

  // Sync URL to match active rectangle (for sharing/bookmarking)
  // Only sync if we have an ICES rectangle - worldwide locations don't use URL params
  useEffect(() => {
    if (!router.isReady) return;
    if (!activeRectangle) return; // No rectangle for worldwide locations
    const current = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;
    if (current === activeRectangle) return;

    console.log('[Conditions] Syncing URL to activeRectangle:', { from: current, to: activeRectangle });
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, rectangle: activeRectangle },
      },
      undefined,
      { shallow: true }
    );
  }, [activeRectangle, router]);

  // Only update context from URL if:
  // - We don't have a location in context yet
  // - URL has a rectangle parameter
  useEffect(() => {
    if (locationLoading) return;
    if (hasLocation) return; // Already have location (coordinates), don't override
    if (!router.isReady) return;
    if (!rectangleFromUrl) return;
    
    const rectangle = rectangleOptions.find(option => option.code === rectangleFromUrl);
    if (!rectangle) return;
    
    console.log('[Conditions] Initializing context from URL:', rectangleFromUrl);
    void updateLocation({
      coordinates: { lat: rectangle.centerLat, lon: rectangle.centerLon },
      rectangleCode: rectangle.code,
      rectangleRegion: rectangle.region,
      rectangleLabel: `${rectangle.code} - ${rectangle.region}`,
      source: 'manual',
    });
  }, [rectangleFromUrl, locationLoading, hasLocation, rectangleOptions, router.isReady, updateLocation]);

  // Pass user's precise coordinates for accurate weather data (4dp precision)
  const userCoords = location?.lat && location?.lon ? { lat: location.lat, lon: location.lon } : null;
  const conditions = useFindrConditions(activeRectangle, userCoords);

  // Debug: Log when activeRectangle changes
  useEffect(() => {
    console.log('[Conditions] Active rectangle changed:', {
      activeRectangle,
      locationRectangle,
      selectedCode,
      source: location?.source,
    });
  }, [activeRectangle, locationRectangle, selectedCode, location?.source]);

  useEffect(() => {
    if (!rectangleOptionsUsingFallback) return;
    console.info('[Findr Conditions] Using fallback ICES rectangle options. Swap in Supabase catalogue.', {
      fallbackCount: FALLBACK_RECTANGLE_OPTIONS.length,
      sampleCodes: FALLBACK_RECTANGLE_OPTIONS.slice(0, 3).map((option) => option.code),
    });
  }, [rectangleOptionsUsingFallback]);

  useEffect(() => {
    console.info('[Findr Conditions] Conditions source', {
      source: conditions.source,
      rectangle: activeRectangle,
    });
  }, [activeRectangle, conditions.source]);

  return (
    <>
      <SEO
        title="Conditions - findr"
        description="View detailed environmental conditions including water temperature, salinity, oxygen levels, and water clarity for your fishing area."
        url="https://fishfindr.eu/findr/conditions"
      />
      <main className="min-h-screen bg-base-200 pb-16">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="sm:mx-auto pt-2 sm:px-4 sm:pt-6 md:px-6 lg:max-w-6xl">
          <div className="space-y-10">
            <ConditionsDashboard
            data={conditions.data}
            loading={conditions.loading}
            error={conditions.error}
            source={conditions.source}
            onRetry={conditions.reload}
            rectangleCode={activeRectangle ?? undefined}
          />
          
          {/* Fishing Area Information */}
          <FishingAreaInfo
            activeOption={activeOption}
            activeRectangle={activeRectangle}
            rectangleRegion={conditions.data?.rectangle?.name}
          />
          </div>
        </div>
      </main>
    </>
  );
};

export default FindrConditionsRoute;

// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
