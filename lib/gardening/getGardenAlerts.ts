import { buildGardenAlertInputs } from './buildGardenAlertInputs';
import { evaluateGardenAlerts, type GardenProfile, type GardenAlertResult } from './gardenAlerts';
import type { UnifiedWeatherAPIResponse } from '../../types/weather';

const defaultProfile: GardenProfile = {
  soilType: 'loam',
  shade: 'full_sun',
};

export function getGardenAlertsFromWeather(
  weather: UnifiedWeatherAPIResponse,
  profile: GardenProfile = defaultProfile
): GardenAlertResult[] {
  const inputs = buildGardenAlertInputs(weather);
  if (!inputs) return [];
  return evaluateGardenAlerts(inputs, profile);
}

export async function fetchGardenAlerts({
  baseUrl,
  lat,
  lon,
  profile = defaultProfile,
  signal,
}: {
  baseUrl: string;
  lat: number;
  lon: number;
  profile?: GardenProfile;
  signal?: AbortSignal;
}): Promise<GardenAlertResult[]> {
  const url = new URL('/api/unified-weather', baseUrl);
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('mode', 'land');

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    console.warn('[GardenAlerts] Unified weather fetch failed', response.status, response.statusText);
    return [];
  }

  const weather = (await response.json()) as UnifiedWeatherAPIResponse;
  return getGardenAlertsFromWeather(weather, profile);
}

export { defaultProfile as defaultGardenProfile };
