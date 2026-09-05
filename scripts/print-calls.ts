/**
 * Print a week of calls for real places, and read them.
 *
 * This is the only test that matters for the verdict engine. The sentences are
 * the product; if they are mediocre, no amount of typography saves them, and no
 * unit test will tell you. So the engine ships as a script before it ships as an
 * API, and the loop is: run it, read it, tune `bands.ts` and `verdict.ts`, run it
 * again.
 *
 *   npx tsx scripts/print-calls.ts
 *   npx tsx scripts/print-calls.ts --days=3
 *   npx tsx scripts/print-calls.ts --place=Croyde
 *
 * Needs the same env as the app; run after `npm run env:sync`.
 */

import { getSuggestionsByDay, type WeatherData } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { makeCall, type Call } from '../lib/godaisy/call/makeCall';
import { asSentence } from '../lib/godaisy/call/verdict';
import { BAND_LABEL } from '../lib/godaisy/call/bands';

const ARGS = process.argv.slice(2);
const flag = (n: string, d: string) => (ARGS.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=')[1];
const DAYS = Math.max(1, Math.min(7, Number(flag('days', '7')) || 7));
const ONLY = flag('place', '');

/**
 * Real places with real sports, chosen so the output exercises different
 * families rather than seven variations of "a walking day": a surf break, an
 * inland valley, a city, an estuary, a lake, a mountain, a coast.
 */
const PLACES = [
  { place: 'Croyde Bay',      lat: 51.128, lon: -4.240, coastal: true, sports: ['surfing', 'sea_swimming', 'hiking'] },
  { place: 'Exe Valley',      lat: 50.780, lon: -3.560, sports: ['road_cycling', 'trail_running', 'hiking'] },
  { place: 'Exeter',          lat: 50.718, lon: -3.534, sports: ['running', 'golf', 'photography'] },
  { place: 'Salcombe',        lat: 50.237, lon: -3.769, coastal: true, sports: ['sea_swimming', 'sailing', 'stand_up_paddleboarding'] },
  { place: 'Rutland Water',   lat: 52.660, lon: -0.660, sports: ['sailing', 'birdwatching', 'road_cycling'] },
  { place: 'Snowdonia',       lat: 53.068, lon: -4.076, sports: ['hiking', 'climbing', 'stargazing'] },
  { place: 'Brecon Beacons',  lat: 51.884, lon: -3.436, sports: ['stargazing', 'hiking', 'trail_running'] },
  { place: 'Portrush',        lat: 55.205, lon: -6.657, coastal: true, sports: ['surfing', 'golf', 'sea_swimming'] },
  { place: 'Aviemore',        lat: 57.195, lon: -3.829, sports: ['hiking', 'mountain_biking', 'stargazing'] },
  { place: 'Bristol',         lat: 51.454, lon: -2.588, sports: ['road_cycling', 'running', 'gardening'] },
  { place: 'Norfolk Broads',  lat: 52.663, lon: 1.500,  sports: ['kayaking', 'birdwatching', 'sailing'] },
  { place: 'Pembrokeshire',   lat: 51.869, lon: -5.208, coastal: true, sports: ['sea_kayaking', 'surfing', 'hiking'] },
];

const NAMES: Record<string, string> = Object.fromEntries(
  (allSports as Array<{ id: string; name: string }>).map((a) => [a.id, a.name]),
);

/** Open-Meteo, because it needs no key and carries everything the scorer reads. */
async function fetchForecast(lat: number, lon: number): Promise<Array<{ date: number; weather: WeatherData }>> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,` +
    `wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,cloud_cover_mean,` +
    `relative_humidity_2m_mean,visibility_mean,shortwave_radiation_sum` +
    `&timezone=Europe%2FLondon&forecast_days=${DAYS}&wind_speed_unit=kmh`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} for ${lat},${lon}`);
  const j = (await res.json()) as { daily: Record<string, unknown[]> };
  const d = j.daily;
  const num = (k: string, i: number): number | undefined => {
    const v = d[k]?.[i];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };

  return (d.time as string[]).map((iso, i) => {
    const tmax = num('temperature_2m_max', i);
    const tmin = num('temperature_2m_min', i);
    return {
      date: Math.floor(new Date(`${iso}T12:00:00Z`).getTime() / 1000),
      weather: {
        temperature: tmax !== undefined && tmin !== undefined ? (tmax + tmin) / 2 : tmax,
        temperatureMax: tmax,
        temperatureMin: tmin,
        precipitation: num('precipitation_sum', i),
        precipitationHours: num('precipitation_hours', i),
        windspeed: num('wind_speed_10m_max', i),
        windspeedMax: num('wind_speed_10m_max', i),
        gustspeed: num('wind_gusts_10m_max', i),
        winddirection: num('wind_direction_10m_dominant', i),
        clouds: num('cloud_cover_mean', i),
        humidity: num('relative_humidity_2m_mean', i),
        visibility: num('visibility_mean', i),
      } as WeatherData,
    };
  });
}

/**
 * Marine, for the coastal places.
 *
 * Without this a surf verdict is fiction: the first run chose "a walking day" at
 * Croyde and Pembrokeshire because the scorer had no wave height, no swell period
 * and no sea temperature to weigh, so every marine criterion was skipped and the
 * land activities won by default. A surf model with no swell is not a surf model.
 */
async function fetchMarine(lat: number, lon: number): Promise<Array<Partial<WeatherData>>> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&daily=wave_height_max,swell_wave_height_max,swell_wave_period_max&timezone=Europe%2FLondon` +
    `&forecast_days=${DAYS}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = (await res.json()) as { daily?: Record<string, unknown[]> };
    const d = j.daily;
    if (!d?.time) return [];
    const num = (k: string, i: number) => {
      const v = d[k]?.[i];
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
    };
    return (d.time as string[]).map((_, i) => ({
      waveHeight: num('wave_height_max', i),
      swellHeight: num('swell_wave_height_max', i),
      swellPeriod: num('swell_wave_period_max', i),
    }));
  } catch {
    // A missing marine feed must stay missing — a fabricated swell is worse than
    // no swell, because the models trust what they are given.
    return [];
  }
}

const WEEKDAY = (ts: number) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Europe/London' }).format(new Date(ts * 1000));

function render(call: Call, dayIdx: number): void {
  const day = dayIdx === 0 ? 'Today' : WEEKDAY(call.date);
  if (!call.call) {
    console.log(`  ${day.padEnd(10)} —  (nothing scored)`);
    return;
  }
  const o = call.call;
  const head = asSentence(o.verdict);
  const alts = call.alternates.length > 1 ? `  +${call.alternates.length - 1}` : '';
  console.log(`  ${day.padEnd(10)} ${head}`);
  console.log(
    `  ${' '.repeat(10)} ${o.facts.map((f) => `${f.label} ${f.value}`).join('  ·  ')}` +
      `   [${BAND_LABEL[o.band]} ${o.score}${alts}]`,
  );
}

async function main(): Promise<void> {
  const places = ONLY ? PLACES.filter((p) => p.place.toLowerCase().includes(ONLY.toLowerCase())) : PLACES;
  if (!places.length) {
    console.error(`No place matching "${ONLY}".`);
    process.exit(1);
  }

  const tally = { prime: 0, worthALook: 0, marginal: 0, notToday: 0, unsafe: 0 } as Record<string, number>;
  let noDays = 0, withAlternates = 0, total = 0;

  for (const p of places) {
    console.log(`\n\x1b[1m${p.place}\x1b[0m  ${p.sports.join(' · ')}`);
    const forecast = await fetchForecast(p.lat, p.lon);
    if ((p as { coastal?: boolean }).coastal) {
      const marine = await fetchMarine(p.lat, p.lon);
      marine.forEach((m, i) => { if (forecast[i]) Object.assign(forecast[i].weather, m); });
    }
    const byDay = getSuggestionsByDay({
      forecast,
      activities: allSports,
      interests: p.sports,
      now: new Date(),
      includeAllActivities: true,
    });

    byDay.forEach((day: { date: number; suggestions: unknown[] }, i: number) => {
      const call = makeCall({
        date: day.date,
        place: p.place,
        weather: forecast[i].weather,
        suggestions: day.suggestions as never,
        sports: p.sports,
        seeded: p.sports,
        names: NAMES,
        nextYes: undefined,
        dayIndex: i,
        weekday: WEEKDAY(day.date),
      });
      render(call, i);
      total++;
      if (call.isNoDay) noDays++;
      if (call.alternates.length > 1) withAlternates++;
      if (call.call) tally[call.call.band]++;
    });
  }

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  console.log(`\n\x1b[1m${total} days across ${places.length} places\x1b[0m`);
  console.log(`  bands        ${Object.entries(tally).filter(([, n]) => n).map(([b, n]) => `${BAND_LABEL[b as keyof typeof BAND_LABEL]} ${n}`).join(' · ')}`);
  console.log(`  no-days      ${noDays} (${pct(noDays)})`);
  console.log(`  ≥2 good      ${withAlternates} (${pct(withAlternates)})  — where the alternates control renders`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
