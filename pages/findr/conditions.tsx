'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import SEO from '../../components/SEO';
import { MoonStar } from 'lucide-react';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { FishingAreaInfo } from '../../components/findr/FishingAreaInfo';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';
import {
  FALLBACK_RECTANGLE_OPTIONS,
  useFindrRectangleOptions,
  type RectangleOption,
} from '../../hooks/useFindrRectangleOptions';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { getTodayIso } from '../../lib/date/today';
import ConditionsDashboard from '../../components/findr/ConditionsDashboard';
import { useFindrConditions } from '../../hooks/useFindrConditions';
import MoonWidget from '../../components/findr/MoonWidget';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';

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
    predictionDate,
    setPredictionDate,
    language: _language,
    setLanguage: _setLanguage,
  } = usePersistentFindrSettings({ predictionDate: getTodayIso(), language: 'en' });

  const { location, updateLocation, loading: locationLoading } = useUnifiedLocation();
  const locationRectangle = location?.rectangleCode ?? null;

  const rectangleFromUrl = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;

  // Single source of truth priority:
  // 1. Location from UnifiedLocationContext (from header picker)
  // 2. selectedCode (persisted fallback)
  const activeRectangle = locationRectangle ?? (selectedCode || null);
  
  const activeOption = useMemo<RectangleOption | null>(
    () => {
      const code = activeRectangle;
      if (!code) return null;
      return rectangleOptions.find((option) => option.code === code) ?? null;
    },
    [activeRectangle, rectangleOptions]
  );

  // Sync selectedCode when location context changes (for persistence)
  useEffect(() => {
    if (locationLoading) return;
    if (!locationRectangle) return;
    if (selectedCode === locationRectangle) return;
    console.log('[Conditions] Syncing selectedCode to context:', locationRectangle);
    setSelectedCode(locationRectangle);
  }, [locationRectangle, locationLoading, selectedCode, setSelectedCode]);

  // Sync URL to match active rectangle (for sharing/bookmarking)
  useEffect(() => {
    if (!router.isReady) return;
    if (!activeRectangle) return;
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
    if (locationRectangle) return; // Already have location, don't override
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
  }, [rectangleFromUrl, locationLoading, locationRectangle, rectangleOptions, router.isReady, updateLocation]);

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPredictionDate(event.target.value);
    },
    [setPredictionDate]
  );

  const handleSetToday = useCallback(() => {
    setPredictionDate(getTodayIso());
  }, [setPredictionDate]);

  const conditions = useFindrConditions(activeRectangle);

  // Debug: Log when activeRectangle changes
  useEffect(() => {
    console.log('[Conditions] Active rectangle changed:', {
      activeRectangle,
      locationRectangle,
      selectedCode,
      source: location?.source,
    });
  }, [activeRectangle, locationRectangle, selectedCode, location?.source]);

  const moonCoords = useMemo(() => {
    const optionLat = typeof activeOption?.centerLat === 'number' ? activeOption.centerLat : undefined;
    const optionLon = typeof activeOption?.centerLon === 'number' ? activeOption.centerLon : undefined;
    const fallbackLat = typeof conditions.data?.rectangle?.centerLat === 'number' ? conditions.data.rectangle.centerLat : undefined;
    const fallbackLon = typeof conditions.data?.rectangle?.centerLon === 'number' ? conditions.data.rectangle.centerLon : undefined;

    const latCandidate = optionLat ?? fallbackLat;
    const lonCandidate = optionLon ?? fallbackLon;

    if (
      typeof latCandidate === 'number' &&
      Number.isFinite(latCandidate) &&
      typeof lonCandidate === 'number' &&
      Number.isFinite(lonCandidate)
    ) {
      return { lat: latCandidate, lon: lonCandidate };
    }

    return null;
  }, [
    activeOption?.centerLat,
    activeOption?.centerLon,
    conditions.data?.rectangle?.centerLat,
    conditions.data?.rectangle?.centerLon,
  ]);

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
        title="Conditions"
        description="View detailed environmental conditions including water temperature, salinity, oxygen levels, and water clarity for your fishing area."
        url="https://fishfindr.eu/findr/conditions"
      />
      <main className="min-h-screen bg-base-200 pb-16">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="sm:mx-auto px-0 pt-2 sm:px-4 sm:pt-6 md:px-6 lg:max-w-6xl">
          <div className="space-y-10">
            <ConditionsDashboard
            data={conditions.data}
            loading={conditions.loading}
            error={conditions.error}
            source={conditions.source}
            onRetry={conditions.reload}
            rectangleCode={activeRectangle ?? undefined}
          />
          {moonCoords ? (
            <section className="card bg-base-100 shadow-lg">
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <MoonStar size={20} /> <TranslatedText text="Moon" />
                    </h2>
                    <p className="text-sm text-base-content/60">
                    
                    </p>
                  </div>
                  <span className="badge badge-ghost text-xs">beta</span>
                </div>
                <div className="-mx-3 sm:-mx-4 md:mx-0">
                  <MoonWidget lat={moonCoords.lat} lon={moonCoords.lon} />
                </div>
              </div>
            </section>
          ) : null}
          
          {/* Fishing Area Information */}
          <FishingAreaInfo
            activeOption={activeOption}
            activeRectangle={activeRectangle}
          />

          {/* Date Settings */}
          <section className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="text-lg font-semibold mb-4">
                <TranslatedText text="Prediction date" />
              </h2>
              
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={predictionDate}
                  onChange={handleDateChange}
                  className="input input-bordered"
                  aria-label="Prediction date"
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleSetToday}>
                  <TranslatedText text="Today" />
                </button>
              </div>
              
              <p className="text-xs text-base-content/60 mt-3">
                <TranslatedText text="View fishing predictions for any date" />
              </p>
            </div>
          </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default FindrConditionsRoute;
