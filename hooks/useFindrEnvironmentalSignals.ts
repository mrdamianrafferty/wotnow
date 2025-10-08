import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PollenSummary } from '../utils/pollenUtils';
import type { AirQualitySummary } from '../utils/airQualityUtils';

interface WeatherWithPollenResponse {
  current?: {
    uvi?: number | null;
    clouds?: number | null;
  } | null;
  daily?: Array<{
    uvi?: number | null;
  }> | null;
  pollenByDate?: Record<string, Partial<PollenSummary> | undefined>;
  airQualityByDate?: Record<string, (AirQualitySummary & { euAqi?: number }) | undefined>;
}

interface EnvironmentalSignalsState {
  pollen?: PollenSummary;
  airQuality?: AirQualitySummary;
  uvIndex?: number | null;
  cloudCover?: number | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  updatedAt?: string | null;
}

function normalizePollen(pollen?: Partial<PollenSummary>): PollenSummary | undefined {
  if (!pollen) return undefined;
  const entries = Object.entries(pollen)
    .map(([key, value]) => {
      const numeric = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
      return [key, numeric] as const;
    })
    .filter(([, value]) => value !== undefined);

  if (entries.length === 0) return undefined;

  return entries.reduce<PollenSummary>((acc, [key, value]) => {
    acc[key as keyof PollenSummary] = value;
    return acc;
  }, {} as PollenSummary);
}

function normalizeAirQuality(summary?: AirQualitySummary & { euAqi?: number }): AirQualitySummary | undefined {
  if (!summary) return undefined;
  const { euAqi: _ignored, ...rest } = summary;
  const hasAny = Object.values(rest).some((value) => typeof value === 'number' && Number.isFinite(value));
  return hasAny ? rest : undefined;
}

function extractUvIndex(payload: WeatherWithPollenResponse): number | null | undefined {
  const currentUv = payload.current?.uvi;
  if (typeof currentUv === 'number' && Number.isFinite(currentUv)) {
    return currentUv;
  }

  const forecastUv = payload.daily?.find((day) => typeof day?.uvi === 'number' && Number.isFinite(day.uvi ?? NaN))?.uvi;
  return typeof forecastUv === 'number' && Number.isFinite(forecastUv) ? forecastUv : null;
}

function extractCloudCover(payload: WeatherWithPollenResponse): number | null | undefined {
  const currentClouds = payload.current?.clouds;
  if (typeof currentClouds === 'number' && Number.isFinite(currentClouds)) {
    return currentClouds;
  }
  return null;
}

function makeTodayKey(reference: Date = new Date()): string {
  return reference.toISOString().split('T')[0] ?? '';
}

export function useFindrEnvironmentalSignals(lat?: number | null, lon?: number | null): EnvironmentalSignalsState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollen, setPollen] = useState<PollenSummary | undefined>(undefined);
  const [airQuality, setAirQuality] = useState<AirQualitySummary | undefined>(undefined);
  const [uvIndex, setUvIndex] = useState<number | null | undefined>(undefined);
  const [cloudCover, setCloudCover] = useState<number | null | undefined>(undefined);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const coordinates = useMemo(() => {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon } as const;
  }, [lat, lon]);

  useEffect(() => {
    if (!coordinates) {
      setLoading(false);
      setError(null);
      setPollen(undefined);
      setAirQuality(undefined);
      setUvIndex(undefined);
      setCloudCover(undefined);
      setUpdatedAt(null);
      return;
    }

  const { lat: latValue, lon: lonValue } = coordinates;
  const controller = new AbortController();
  let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          lat: latValue.toFixed(4),
          lon: lonValue.toFixed(4),
        });

        const response = await fetch(`/api/weather-with-pollen?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = `Environmental data request failed (${response.status})`;
          throw new Error(message);
        }

        const payload = (await response.json()) as WeatherWithPollenResponse;
        if (cancelled) return;

        const todayKey = makeTodayKey();
        const normalizedPollen = normalizePollen(payload.pollenByDate?.[todayKey]);
        const normalizedAir = normalizeAirQuality(payload.airQualityByDate?.[todayKey]);
        const uv = extractUvIndex(payload);
        const clouds = extractCloudCover(payload);

        setPollen(normalizedPollen);
        setAirQuality(normalizedAir);
        setUvIndex(typeof uv === 'number' ? uv : null);
        setCloudCover(typeof clouds === 'number' ? clouds : null);
        setUpdatedAt(new Date().toISOString());
      } catch (err) {
        if ((err as Error).name === 'AbortError' || cancelled) {
          return;
        }
        console.warn('[Findr] Failed to load environmental signals', err);
        setError((err as Error).message ?? 'Failed to load environmental signals');
        setPollen(undefined);
        setAirQuality(undefined);
        setUvIndex(null);
        setCloudCover(null);
        setUpdatedAt(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [coordinates, reloadToken]);

  return {
    pollen,
    airQuality,
    uvIndex,
    cloudCover,
    loading,
    error,
    reload,
    updatedAt,
  };
}

export default useFindrEnvironmentalSignals;
