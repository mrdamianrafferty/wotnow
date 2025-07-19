// utils/fetchStormglass.ts
export async function fetchStormglassMarineForecast(lat: number, lon: number, startISO: string, endISO: string) {
  const key = process.env.NEXT_PUBLIC_STORMGLASS_KEY;
  const params = [
    "waterTemperature", "waveHeight", "windSpeed", "windDirection", "swellHeight", "swellDirection", "swellPeriod"
  ].join(',');

  const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lon}&params=${params}&start=${startISO}&end=${endISO}`;

  const res = await fetch(url, {
    headers: { "Authorization": key || "" }
  });
  if (!res.ok) throw new Error(`Stormglass error: ${res.statusText}`);
  const data = await res.json();
  return data;
}
let stormglassCache: Record<string, any> = {};

export async function fetchMarineWithCache(lat, lon, startISO, endISO) {
  const cacheKey = `${lat}_${lon}_${startISO}_${endISO}`;
  if (stormglassCache[cacheKey]) return stormglassCache[cacheKey];
  const data = await fetchStormglassMarineForecast(lat, lon, startISO, endISO);
  stormglassCache[cacheKey] = data;
  return data;
}
