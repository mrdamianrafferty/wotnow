import type { NextApiRequest, NextApiResponse } from 'next';

// Lightweight in-memory caches to avoid hammering Stormglass on fast reloads
const sgTideCache = new Map<string, { ts: number; data: any }>();
const sgMarineCache = new Map<string, { ts: number; data: any }>();
const TIDE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const MARINE_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const keyLL = (lat: number, lon: number) => `${lat.toFixed(3)},${lon.toFixed(3)}`;

// Types matching what my-weather.tsx expects
type Hour = {
  timeISO: string
  tempC?: number
  pop?: number // 0..1
  windMS?: number
  windDeg?: number
  precipMM?: number
  icon?: string
  pressureHpa?: number
  waveHeightM?: number | null
}

type Day = {
  dateISO: string
  minC?: number
  maxC?: number
  pop?: number
  summary?: string
  icon?: string
  windMS?: number
  windDeg?: number
  pressureHpa?: number
  uvi?: number
  moonriseISO?: string
  moonsetISO?: string
  moonPhase?: number // 0..1 (0=new, 0.5=full) from OpenWeather
  pollen?: { grass?: number; tree?: number; weed?: number; olive?: number }
}

type Tides = {
  time: string
  type: 'high' | 'low'
  height: number | null
}[]

type Marine = {
  waveHeight?: number | null
  waveDirection?: number | null
  wavePeriod?: number | null
  swellHeight?: number | null
  swellDirection?: number | null
  swellPeriod?: number | null
}

type UnifiedWeather = {
  // core current
  name?: string
  lat: number
  lon: number
  isMarine?: boolean
  temperatureC?: number
  feelsLikeC?: number
  dewPointC?: number
  humidityPct?: number
  pressureHpa?: number
  windSpeedMS?: number
  windGustMS?: number
  windDeg?: number
  visibilityKm?: number
  uvi?: number
  cloudsPct?: number
  description?: string
  icon?: string
  sunriseISO?: string
  sunsetISO?: string

  // series
  hourly?: Hour[]
  daily?: Day[]

  // marine
  marine?: Marine
  tides?: Tides

  // optional air quality summary (OpenWeather format)
  airQuality?: {
    aqi?: number | null
    components?: Record<string, number | null>
  }
  // optional soil snapshot (Open-Meteo hourly, latest)
  soil?: {
    temp0cm?: number;
    temp6cm?: number;
    temp18cm?: number;
    temp54cm?: number;
    moisture0to1?: number;
    moisture1to3?: number;
    moisture3to9?: number;
    moisture9to27?: number;
  }
  // timestamp (ISO) of the soil snapshot used for the above values
  soilTimeISO?: string
}

// Transform OpenWeather data to our normalized format
function transformWeatherData(rawData: any, lat: number, lon: number, mode: string): UnifiedWeather {
  const current = rawData.current || {};
  const city = rawData.city || {};
  
  // Current weather data
  const result: UnifiedWeather = {
    name: city.name || 'Location',
    lat,
    lon,
    isMarine: mode === 'marine',
    temperatureC: current.temp,
    feelsLikeC: current.feels_like,
    dewPointC: current.dew_point,
    humidityPct: current.humidity,
    pressureHpa: current.pressure,
    windSpeedMS: current.wind_speed,
    windGustMS: current.wind_gust,
    windDeg: current.wind_deg,
    visibilityKm: current.visibility ? current.visibility / 1000 : undefined,
    uvi: current.uvi,
    cloudsPct: current.clouds,
    description: current.weather?.[0]?.description,
    icon: current.weather?.[0]?.icon,
    // OpenWeather current includes sunrise/sunset timestamps for the current day
    sunriseISO: current.sunrise ? new Date(current.sunrise * 1000).toISOString() : undefined,
    sunsetISO: current.sunset ? new Date(current.sunset * 1000).toISOString() : undefined,
  };

  // Transform hourly data
  if (rawData.hourly && Array.isArray(rawData.hourly)) {
    result.hourly = rawData.hourly.slice(0, 48).map((hour: any) => ({
      timeISO: new Date(hour.dt * 1000).toISOString(),
      tempC: hour.temp,
      pop: hour.pop, // 0-1
      windMS: hour.wind_speed,
      windDeg: hour.wind_deg,
      precipMM: hour.rain?.['1h'] || hour.snow?.['1h'] || 0,
      icon: hour.weather?.[0]?.icon,
      pressureHpa: hour.pressure,
      waveHeightM: undefined,
    }));
  }

  // Transform daily data
  if (rawData.daily && Array.isArray(rawData.daily)) {
    result.daily = rawData.daily.slice(0, 8).map((day: any) => ({
      dateISO: new Date(day.dt * 1000).toISOString().split('T')[0],
      minC: day.temp?.min,
      maxC: day.temp?.max,
      pop: day.pop,
      summary: day.weather?.[0]?.description,
      icon: day.weather?.[0]?.icon,
      windMS: day.wind_speed,
      windDeg: day.wind_deg,
      pressureHpa: day.pressure,
      uvi: day.uvi,
      moonriseISO: day.moonrise ? new Date(day.moonrise * 1000).toISOString() : undefined,
      moonsetISO: day.moonset ? new Date(day.moonset * 1000).toISOString() : undefined,
      moonPhase: typeof day.moon_phase === 'number' ? day.moon_phase : undefined,
    }));
  }

  // For marine mode, add marine-specific data if available
  if (mode === 'marine' && rawData.marine) {
    result.marine = {
      waveHeight: rawData.marine.waveHeight,
      waveDirection: rawData.marine.waveDirection,
      wavePeriod: rawData.marine.wavePeriod,
      swellHeight: rawData.marine.swellHeight,
      swellDirection: rawData.marine.swellDirection,
      swellPeriod: rawData.marine.swellPeriod,
    };
  }

  // Add tides if available
  if (rawData.tides && Array.isArray(rawData.tides)) {
    result.tides = rawData.tides;
  }

  return result;
}

// Canonical unified weather endpoint.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support both ESM and CommonJS exports from the service module
  const mod = await import('../../lib/services/weatherService');
  const svc: any = (mod as any).default ?? mod;
  const {
    getFullWeather,
    fetchStormglassTides,
    fetchStormglassMarine,
    getAirPollution,
    fetchOpenMeteoAirPollen,
    fetchOpenMeteoWeather,
  } = svc;

  const { lat, lon, mode = 'land' } = req.query as { lat?: string; lon?: string; mode?: string };
  const units = (req.query.units as string) || 'metric';
  const exclude = (req.query.exclude as string) || '';

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  if (lat === undefined || lon === undefined || !apiKey) {
    return res.status(400).json({ 
      error: 'Missing parameters or API key',
      received: { lat, lon, hasApiKey: !!apiKey }
    });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({ 
      error: 'Invalid coordinates',
      received: { lat: latNum, lon: lonNum }
    });
  }

  try {
    // Base weather (OpenWeather One Call)
    const weatherData = await getFullWeather({
      lat: latNum,
      lon: lonNum,
      apiKey,
      options: { units, exclude }
    });
    // Transform to normalized structure
    const normalizedData = transformWeatherData(weatherData, latNum, lonNum, mode);

    // Optional: Tides and Marine (Stormglass), if key available
    const sgKey = process.env.STORMGLASS_SECRET_KEY || process.env.STORMGLASS_API_KEY;
    if (sgKey) {
      try {
        const latlonKey = keyLL(latNum, lonNum);
        // Tides with cache
        const tideCached = sgTideCache.get(latlonKey);
        let tidesRaw: any | null = null;
        if (tideCached && Date.now() - tideCached.ts < TIDE_TTL_MS) {
          tidesRaw = tideCached.data;
        } else {
          tidesRaw = await fetchStormglassTides(latNum, lonNum, sgKey);
          if (tidesRaw) sgTideCache.set(latlonKey, { ts: Date.now(), data: tidesRaw });
        }
        if (tidesRaw && Array.isArray((tidesRaw as any).data)) {
          const tides = (tidesRaw as any).data.map((t: any) => ({
            time: new Date(t.time).toISOString(),
            type: String(t.type).toLowerCase().includes('high') ? 'high' as const : 'low' as const,
            height: typeof t.height === 'number' ? t.height : (t.height != null ? Number(t.height) : null)
          }));
          normalizedData.tides = tides;
        }

        // Marine (next ~24h) with cache
        const nowD = new Date();
        const end = new Date(nowD.getTime() + 24 * 60 * 60 * 1000);
        const marineCached = sgMarineCache.get(latlonKey);
        let marineRaw: any | null = null;
        if (marineCached && Date.now() - marineCached.ts < MARINE_TTL_MS) {
          marineRaw = marineCached.data;
        } else {
          marineRaw = await fetchStormglassMarine(
            latNum,
            lonNum,
            nowD.toISOString(),
            end.toISOString(),
            undefined,
            sgKey
          );
          if (marineRaw) sgMarineCache.set(latlonKey, { ts: Date.now(), data: marineRaw });
        }
        const firstHour = (marineRaw as any)?.hours?.[0];
        if (firstHour) {
          const sg = (k: string) => {
            const v = firstHour?.[k];
            if (v && typeof v === 'object' && typeof v.sg === 'number') return v.sg as number;
            if (typeof v === 'number') return v as number;
            return null;
          };
          normalizedData.marine = {
            waveHeight: sg('waveHeight'),
            waveDirection: sg('waveDirection'),
            wavePeriod: sg('wavePeriod'),
            swellHeight: sg('swellHeight'),
            swellDirection: sg('swellDirection'),
            swellPeriod: sg('swellPeriod'),
          };

          // Attach waveHeightM onto hourly by nearest-time match (<= 90 min)
          if (Array.isArray(normalizedData.hourly) && Array.isArray((marineRaw as any)?.hours)) {
            const hours = (marineRaw as any).hours as Array<any>;
            const parseSGTime = (t: any) => new Date(String(t)).getTime();
            for (const h of normalizedData.hourly) {
              const ht = new Date(h.timeISO).getTime();
              let best: any = null;
              let bestDiff = Infinity;
              for (const sgHour of hours) {
                const diff = Math.abs(parseSGTime(sgHour.time) - ht);
                if (diff < bestDiff) { bestDiff = diff; best = sgHour; }
              }
              if (best && bestDiff <= 90 * 60 * 1000) {
                const wh = best.waveHeight?.sg ?? best.waveHeight ?? null;
                h.waveHeightM = typeof wh === 'number' ? wh : (wh != null ? Number(wh) : null);
              }
            }
          }
        }
      } catch (e) {
        // Swallow marine/tide errors gracefully
        console.warn('Stormglass enrich failed:', e);
      }
    }

    // Optional: Air Quality (OpenWeather)
    try {
      const aq = await getAirPollution({ lat: latNum, lon: lonNum, apiKey });
      const list = (aq as any)?.list;
      if (Array.isArray(list) && list.length) {
        const first = list[0];
        normalizedData.airQuality = {
          aqi: first?.main?.aqi ?? null,
          components: first?.components ?? undefined,
        };
      }
    } catch (e) {
      // Optional, ignore errors
      console.warn('Air quality fetch failed:', e);
    }

    // Optional: Pollen (Open-Meteo) aggregated to daily maxima
    try {
      // Determine date window from available daily entries, else next 7 days
      const dates = Array.isArray(normalizedData.daily) && normalizedData.daily.length
        ? normalizedData.daily.map(d => d.dateISO)
        : (() => {
            const arr: string[] = [];
            const start = new Date();
            for (let i = 0; i < 7; i++) {
              const dt = new Date(start.getTime());
              dt.setDate(start.getDate() + i);
              arr.push(dt.toISOString().split('T')[0]);
            }
            return arr;
          })();

      const startDate = dates[0];
      let endDate = dates[dates.length - 1];
      // Clamp window to max 7 days to avoid API issues
      if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const maxEnd = new Date(s.getTime() + 6 * 24 * 60 * 60 * 1000);
        if (e.getTime() > maxEnd.getTime()) {
          endDate = maxEnd.toISOString().split('T')[0];
        }
      }
      if (startDate && endDate) {
        const polRaw: any = await fetchOpenMeteoAirPollen(latNum, lonNum, startDate, endDate);
        const times: string[] = polRaw?.hourly?.time || [];
        const grassArr: number[] = polRaw?.hourly?.grass_pollen || [];
        const alderArr: number[] = polRaw?.hourly?.alder_pollen || [];
        const birchArr: number[] = polRaw?.hourly?.birch_pollen || [];
        const ragweedArr: number[] = polRaw?.hourly?.ragweed_pollen || [];
        const oliveArr: number[] = polRaw?.hourly?.olive_pollen || [];

        const byDate: Record<string, { grass?: number; tree?: number; weed?: number; olive?: number }> = {};
        for (let i = 0; i < times.length; i++) {
          const dateKey = String(times[i]).slice(0, 10);
          const bucket = (byDate[dateKey] ||= {});
          const g = Number(grassArr[i]);
          const a = Number(alderArr[i]);
          const b = Number(birchArr[i]);
          const w = Number(ragweedArr[i]);
          const o = Number(oliveArr[i]);
          if (Number.isFinite(g)) bucket.grass = Math.max(bucket.grass ?? -Infinity, g);
          const treeNow = Math.max(Number.isFinite(a) ? a : -Infinity, Number.isFinite(b) ? b : -Infinity);
          if (Number.isFinite(treeNow)) bucket.tree = Math.max(bucket.tree ?? -Infinity, treeNow);
          if (Number.isFinite(w)) bucket.weed = Math.max(bucket.weed ?? -Infinity, w);
          if (Number.isFinite(o)) bucket.olive = Math.max(bucket.olive ?? -Infinity, o);
        }

        if (Array.isArray(normalizedData.daily)) {
          for (const d of normalizedData.daily) {
            const pol = byDate[d.dateISO];
            if (pol) {
              d.pollen = {
                grass: pol.grass === -Infinity ? undefined : pol.grass,
                tree: pol.tree === -Infinity ? undefined : pol.tree,
                weed: pol.weed === -Infinity ? undefined : pol.weed,
                olive: pol.olive === -Infinity ? undefined : pol.olive,
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('Pollen fetch failed:', e);
    }

    // Optional: Soil snapshot (Open-Meteo) — take a midday snapshot to avoid night-bias
    try {
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = startDate; // same-day window is sufficient for latest snapshot
      const om: any = await fetchOpenMeteoWeather(latNum, lonNum, startDate, endDate);
      const H = om?.hourly || {};
      const times: string[] = H.time || [];
      let idx = -1;
      if (times.length) {
        // Pick the entry closest to 12:00 local on the same local date
        const todayY = today.getFullYear();
        const todayM = today.getMonth();
        const todayD = today.getDate();
        let bestDiff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < times.length; i++) {
          const dt = new Date(times[i]); // parsed as local time
          if (dt.getFullYear() === todayY && dt.getMonth() === todayM && dt.getDate() === todayD) {
            const diff = Math.abs(dt.getHours() + dt.getMinutes()/60 - 12);
            if (diff < bestDiff) { bestDiff = diff; idx = i; }
          }
        }
        // Fallback: if none match today (edge case), use last index
        if (idx < 0) idx = times.length - 1;
      }
      if (idx >= 0) {
        const pickNum = (arr: any[]) => (Array.isArray(arr) && typeof arr[idx] === 'number') ? Number(arr[idx]) : undefined;
        normalizedData.soil = {
          temp0cm: pickNum(H.soil_temperature_0cm),
          temp6cm: pickNum(H.soil_temperature_6cm),
          temp18cm: pickNum(H.soil_temperature_18cm),
          temp54cm: pickNum(H.soil_temperature_54cm),
          moisture0to1: pickNum(H.soil_moisture_0_to_1cm),
          moisture1to3: pickNum(H.soil_moisture_1_to_3cm),
          moisture3to9: pickNum(H.soil_moisture_3_to_9cm),
          moisture9to27: pickNum(H.soil_moisture_9_to_27cm),
        };
        const picked = times[idx];
        if (picked) {
          const d = new Date(picked);
          normalizedData.soilTimeISO = Number.isNaN(d.getTime()) ? String(picked) : d.toISOString();
        }
      }
    } catch (e) {
      console.warn('Soil fetch failed:', e);
    }

    return res.status(200).json(normalizedData);
  } catch (err: any) {
    console.error('Unified Weather API error (/api/unified-weather):', err);
    const message = typeof err?.message === 'string' ? err.message : String(err);
    return res.status(500).json({ error: `Failed to fetch weather data: ${message}` });
  }
}
