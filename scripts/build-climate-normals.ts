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
import { landNormals, marineNormals, type LandNormals, type MarineNormals } from '../lib/seo/climateAggregate';

// Relative to where it is run (the repo root, as `npx tsx scripts/...` is): ES modules have no __dirname
const OUT = resolve(process.cwd(), 'data/climate/normals.json');
const LAND_YEARS: [string, string] = ['2020-01-01', '2024-12-31'];
const MARINE_YEARS: [string, string] = ['2022-01-01', '2024-12-31'];
// Five years of daily data is a heavy request: the free API allows a limited weight a minute
const PAUSE_MS = 2500;
const MINUTE_MS = 65_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, label: string): Promise<any | null> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 429) {
      const body = await res.text().catch(() => '');
      // "Minutely" clears in a minute; hourly or daily limits will not clear inside this run
      if (/hourly|daily/i.test(body) && !/minutely/i.test(body)) {
        console.warn(`  ${label}: ${body.slice(0, 120)}`);
        return null;
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
  return marineNormals({ time: d.daily.time, waveMax: d.daily.wave_height_max }, { time: d.hourly.time, sst: d.hourly.sea_surface_temperature });
}

function save(locations: Record<string, { land: LandNormals; marine?: MarineNormals }>) {
  const file = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'Open-Meteo historical archive (ERA5 reanalysis); marine: Open-Meteo Marine (ERA5-Ocean)',
    landYears: [LAND_YEARS[0].slice(0, 4), LAND_YEARS[1].slice(0, 4)],
    marineYears: [MARINE_YEARS[0].slice(0, 4), MARINE_YEARS[1].slice(0, 4)],
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
  const previous: Record<string, { land: LandNormals; marine?: MarineNormals }> =
    !force && existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')).locations ?? {}) : {};
  const locations: Record<string, { land: LandNormals; marine?: MarineNormals }> = {};
  const skipped: string[] = [];
  for (const [i, p] of places.entries()) {
    const coastal = p.beachFacingDeg != null || p.coastal === true;
    // Kept as it was, unless it is coastal and still lacks the marine half it could have
    const have = previous[p.slug];
    if (have && (!coastal || have.marine)) {
      locations[p.slug] = have;
      console.log(`[${i + 1}/${places.length}] ${p.slug} ... already built`);
      continue;
    }
    process.stdout.write(`[${i + 1}/${places.length}] ${p.slug}${coastal ? ' (coastal)' : ''} ... `);
    const l = await land(p.lat, p.lon, p.slug);
    await sleep(PAUSE_MS);
    if (!l) {
      skipped.push(p.slug);
      console.log('NO LAND DATA');
      continue;
    }
    const entry: { land: LandNormals; marine?: MarineNormals } = { land: l };
    if (coastal) {
      const m = await marine(p.lat, p.lon, p.slug);
      await sleep(PAUSE_MS);
      if (m) entry.marine = m;
    }
    locations[p.slug] = entry;
    save(locations);
    console.log(entry.marine ? 'land + marine' : coastal ? 'land only (marine missing)' : 'land');
  }

  save(locations);
  console.log(`\nWrote ${Object.keys(locations).length} places to ${OUT}`);
  if (skipped.length) console.log(`No land data for: ${skipped.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
