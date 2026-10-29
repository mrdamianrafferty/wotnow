/**
 * Builds data/climate/normals.json: month-by-month climate for every place
 * that has a core spot page (lib/seo/tiers.ts), from Open-Meteo's historical
 * archive (ERA5 reanalysis).
 *
 *   npx tsx scripts/build-climate-normals.ts
 *
 * Run by hand, when the places change or once a year; the site never calls
 * these APIs at build or request time. The output is committed.
 *
 *   Land weather   2020-2024, five full years.
 *   Waves and sea  2022-2024, three years: the marine archive has nothing
 *                  usable before 2022 (waves start mid-2021, sea temperature
 *                  in 2022), so a longer window would be averaged over gaps.
 *
 * Resumable: a place already in the output file is skipped, so a run that was
 * rate-limited part way is finished by running it again. `--force` rebuilds
 * everything.
 *
 * A place whose marine data is missing or incomplete gets land numbers only.
 * A month with no data stops the whole series for that measure from being
 * written: a gap is never turned into a zero.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { SEO_LOCATIONS } from '../data/seoLocations';
import { corePagePaths } from '../lib/seo/tiers';
import { ACTIVITY_MEASURES, MEASURES } from '../lib/seo/climate';
import { landNormals, marineNormals, type LandNormals, type MarineNormals } from '../lib/seo/climateAggregate';

// Relative to where it is run (the repo root, as `npx tsx scripts/...` is): ES modules have no __dirname
const OUT = resolve(process.cwd(), 'data/climate/normals.json');
const LAND_YEARS: [string, string] = ['2020-01-01', '2024-12-31'];
const MARINE_YEARS: [string, string] = ['2022-01-01', '2024-12-31'];
// Five years of daily data is a heavy request: the free API allows a limited weight a minute
const PAUSE_MS = 2500;
const MINUTE_MS = 65_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The hourly or daily allowance is spent. It will not come back inside this run, so the run stops. */
class AllowanceSpent extends Error {}

async function getJson(url: string, label: string): Promise<any | null> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 429) {
      const body = await res.text().catch(() => '');
      // "Minutely" clears in a minute; hourly or daily limits will not clear inside this run
      if (/hourly|daily/i.test(body) && !/minutely/i.test(body)) {
        throw new AllowanceSpent(`${label}: ${body.slice(0, 120)}`);
      }
      process.stdout.write(`(rate limited, waiting a minute) `);
      await sleep(MINUTE_MS);
      continue;
    }
    if (res.status >= 500) {
      await sleep(2000 * attempt);
      continue;
    }
    console.warn(`  ${label}: HTTP ${res.status}`);
    return null;
  }
  console.warn(`  ${label}: gave up`);
  return null;
}

async function land(lat: number, lon: number, slug: string): Promise<LandNormals | null> {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: LAND_YEARS[0],
    end_date: LAND_YEARS[1],
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_mean',
    timezone: 'UTC',
    wind_speed_unit: 'kmh',
  });
  const d = await getJson(`https://archive-api.open-meteo.com/v1/archive?${q}`, `${slug} land`);
  if (!d?.daily?.time) return null;
  return landNormals({
    time: d.daily.time,
    tmax: d.daily.temperature_2m_max,
    tmin: d.daily.temperature_2m_min,
    precip: d.daily.precipitation_sum,
    snowfall: d.daily.snowfall_sum,
    windMean: d.daily.wind_speed_10m_mean,
  });
}

/** The furthest a marine grid cell may be from the place and still stand for its sea. */
const MAX_SEA_KM = 60;

function km(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** A place needs sea data if any of its core pages is an activity that reads waves or sea temperature. */
function needsMarine(slug: string): boolean {
  return corePagePaths().some((p) => p.location === slug && ACTIVITY_MEASURES[p.activity]?.some((k) => MEASURES[k].source === 'marine'));
}

async function marine(lat: number, lon: number, slug: string): Promise<MarineNormals | null> {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: MARINE_YEARS[0],
    end_date: MARINE_YEARS[1],
    daily: 'wave_height_max',
    hourly: 'sea_surface_temperature',
    timezone: 'UTC',
  });
  const d = await getJson(`https://marine-api.open-meteo.com/v1/marine?${q}`, `${slug} marine`);
  if (!d?.daily?.time || !d?.hourly?.time) return null;
  // The API snaps to the nearest sea cell. An inland city would otherwise be given a distant coast's numbers.
  if (typeof d.latitude === 'number' && typeof d.longitude === 'number' && km(lat, lon, d.latitude, d.longitude) > MAX_SEA_KM) {
    console.log(`(nearest sea ${Math.round(km(lat, lon, d.latitude, d.longitude))} km away: not used) `);
    return null;
  }
  return marineNormals({ time: d.daily.time, waveMax: d.daily.wave_height_max }, { time: d.hourly.time, sst: d.hourly.sea_surface_temperature });
}

function save(locations: Record<string, { land: LandNormals; marine?: MarineNormals }>, marineUnavailable: string[]) {
  const file = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'Open-Meteo historical archive (ERA5 reanalysis); marine: Open-Meteo Marine (ERA5-Ocean)',
    landYears: [LAND_YEARS[0].slice(0, 4), LAND_YEARS[1].slice(0, 4)],
    marineYears: [MARINE_YEARS[0].slice(0, 4), MARINE_YEARS[1].slice(0, 4)],
    // Places where sea data was asked for and honestly is not there (inland, or no sea cell near): not asked again
    marineUnavailable: [...new Set(marineUnavailable)].sort(),
    locations,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(file) + '\n');
}

async function main() {
  const wanted = new Set(corePagePaths().map((p) => p.location));
  const places = SEO_LOCATIONS.filter((l) => wanted.has(l.slug));
  console.log(`${places.length} places with core pages`);

  const force = process.argv.includes('--force');
  type Entry = { land: LandNormals; marine?: MarineNormals };
  const saved = !force && existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const previous: Record<string, Entry> = saved.locations ?? {};
  const unavailable = new Set<string>(saved.marineUnavailable ?? []);
  const locations: Record<string, Entry> = {};
  const skipped: string[] = [];
  let stoppedBy: string | null = null;

  for (const [i, p] of places.entries()) {
    const flaggedCoastal = p.beachFacingDeg != null || p.coastal === true;
    // Any place with a sea activity wants sea data, flagged coastal or not (Athens, Dublin, New York publish
    // sailing and scuba pages without being flagged). The distance guard in marine() keeps an inland city honest.
    const wantsSea = flaggedCoastal || needsMarine(p.slug);
    const have = previous[p.slug];
    const tag = `[${i + 1}/${places.length}] ${p.slug}${wantsSea ? ' (sea)' : ''} ... `;

    if (have && (!wantsSea || have.marine || unavailable.has(p.slug))) {
      locations[p.slug] = have;
      console.log(`${tag}already built`);
      continue;
    }

    process.stdout.write(tag);
    try {
      // What is already known is kept: only the missing half is fetched
      let landData = have?.land ?? null;
      if (!landData) {
        landData = await land(p.lat, p.lon, p.slug);
        await sleep(PAUSE_MS);
      }
      if (!landData) {
        skipped.push(p.slug);
        console.log('NO LAND DATA');
        continue;
      }
      const entry: Entry = { land: landData };
      if (wantsSea) {
        const m = await marine(p.lat, p.lon, p.slug);
        await sleep(PAUSE_MS);
        if (m) entry.marine = m;
        else unavailable.add(p.slug);
      }
      locations[p.slug] = entry;
      save(locations, [...unavailable]);
      console.log(entry.marine ? 'land + sea' : wantsSea ? 'land only (no usable sea data)' : 'land');
    } catch (err) {
      if (!(err instanceof AllowanceSpent)) throw err;
      stoppedBy = err.message;
      console.log('\nSTOPPED: the API allowance is spent.');
      break;
    }
  }

  // Anything not reached keeps what it had, so a stopped run never loses finished places
  for (const [slug, entry] of Object.entries(previous)) if (!locations[slug]) locations[slug] = entry;
  save(locations, [...unavailable]);
  if (stoppedBy) console.log(`Run again after the limit resets (${stoppedBy}); finished places are kept.`);
  console.log(`\nWrote ${Object.keys(locations).length} places to ${OUT}`);
  if (skipped.length) console.log(`No land data for: ${skipped.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
