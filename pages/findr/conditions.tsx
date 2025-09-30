'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { MapPin } from 'lucide-react';
import { FindrNavigation } from '../../components/findr/FindrNavigation';
import { SettingsForm } from '../../components/findr/SettingsForm';
import {
  FALLBACK_RECTANGLE_OPTIONS,
  useFindrRectangleOptions,
  type RectangleOption,
} from '../../hooks/useFindrRectangleOptions';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { normalizeRectangleCode } from '../../lib/findr/rectangle';
import { getTodayIso } from '../../lib/date/today';
import ConditionsDashboard from '../../components/findr/ConditionsDashboard';
import { useFindrConditions } from '../../hooks/useFindrConditions';

const FindrConditionsRoute: React.FC = () => {
  const {
    options: rectangleOptions,
    loading: rectangleOptionsLoading,
    error: rectangleOptionsError,
    isFallback: rectangleOptionsUsingFallback,
  } = useFindrRectangleOptions(FALLBACK_RECTANGLE_OPTIONS);

  const {
    selectedCode,
    setSelectedCode,
    manualCode,
    setManualCode,
    predictionDate,
    setPredictionDate,
    language,
    setLanguage,
  } = usePersistentFindrSettings({ predictionDate: getTodayIso(), language: 'en' });

  const manualNormalized = useMemo(() => normalizeRectangleCode(manualCode), [manualCode]);
  const activeRectangle = manualNormalized ?? (selectedCode || null);
  const activeOption = useMemo<RectangleOption | null>(
    () => rectangleOptions.find((option) => option.code === (manualNormalized ?? selectedCode)) ?? null,
    [manualNormalized, rectangleOptions, selectedCode]
  );

  useEffect(() => {
    if (selectedCode || manualNormalized) return;
    if (rectangleOptions.length === 0) return;
    setSelectedCode(rectangleOptions[0].code);
  }, [manualNormalized, rectangleOptions, selectedCode, setSelectedCode]);
  useEffect(() => {
    if (!selectedCode || manualNormalized) return;
    if (rectangleOptions.some((option) => option.code === selectedCode)) return;
    if (rectangleOptions.length === 0) return;
    setSelectedCode(rectangleOptions[0].code);
  }, [manualNormalized, rectangleOptions, selectedCode, setSelectedCode]);

  const manualInvalid = manualCode.trim().length > 0 && !manualNormalized;

  const handleSelectOption = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedCode(event.target.value);
      setManualCode('');
    },
    [setManualCode, setSelectedCode]
  );

  const handleManualCodeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setManualCode(event.target.value.toUpperCase());
    },
    [setManualCode]
  );

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPredictionDate(event.target.value);
    },
    [setPredictionDate]
  );

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setLanguage(event.target.value);
    },
    [setLanguage]
  );

  const handleSetToday = useCallback(() => {
    setPredictionDate(getTodayIso());
  }, [setPredictionDate]);

  const noop = useCallback(() => {}, []);
  const conditions = useFindrConditions(activeRectangle);

  const formattedLastUpdated = useMemo(() => {
    if (!conditions.data?.snapshot?.capturedAt) return null;
    try {
      const parsed = new Date(conditions.data.snapshot.capturedAt);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed.toLocaleString();
    } catch {
      return null;
    }
  }, [conditions.data?.snapshot?.capturedAt]);

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
      <Head>
        <title>findr conditions</title>
      </Head>
      <main className="min-h-screen bg-base-200 pb-16">
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
          <FindrNavigation />
          <ConditionsDashboard
            data={conditions.data}
            loading={conditions.loading}
            error={conditions.error}
            source={conditions.source}
            onRetry={conditions.reload}
            rectangleCode={activeRectangle ?? undefined}
          />
          <section className="card bg-base-100 shadow-lg border border-base-200/60">
            <div className="card-body space-y-5">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MapPin size={20} /> Fishing area & language
                </h2>
                <p className="text-sm text-base-content/60">
                  {activeRectangle ? (
                    <>
                      Fishing area <strong>{activeRectangle}</strong>
                      {activeOption ? ` • ${activeOption.region}` : manualNormalized ? ' • Custom area' : ''}
                    </>
                  ) : (
                    'Pick a fishing area to power Findr predictions across the app.'
                  )}
                </p>
              </div>
              <SettingsForm
                rectangleOptions={rectangleOptions}
                optionsLoading={rectangleOptionsLoading}
                optionsError={rectangleOptionsError}
                usingFallback={rectangleOptionsUsingFallback}
                selectedCode={selectedCode}
                manualCode={manualCode}
                manualNormalized={manualNormalized}
                manualInvalid={manualInvalid}
                predictionDate={predictionDate}
                language={language}
                loading={conditions.loading}
                deckResetDisabled={true}
                activeOption={activeOption}
                activeRectangle={activeRectangle}
                formattedLastUpdated={formattedLastUpdated}
                totalPredictions={0}
                onSelectOption={handleSelectOption}
                onManualCodeChange={handleManualCodeChange}
                onDateChange={handleDateChange}
                onSetToday={handleSetToday}
                onLanguageChange={handleLanguageChange}
                onReload={conditions.reload}
                onResetDeck={noop}
                showDeckTools={false}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default FindrConditionsRoute;
