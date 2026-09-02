/**
 * GET /api/godaisy/activity-conditions
 *   ?lat=52.64&lon=-0.638&name=Rutland%20Water&tz=Europe/London
 *   &activities=sailing_inland,kayaking,birdwatching
 *
 * A seven-day, per-activity conditions read for an arbitrary point.
 *
 * ─── Why this route exists ───────────────────────────────────────────────
 *
 * Go Daisy already models 100+ activities across fourteen categories
 * (data/activities/) with four condition bands each, and `getActivityScore`
 * already turns one of those plus a location into a week's outlook. All of
 * that was reachable only from `pages/[activity]/[location].tsx`, which means
 * only from a location in our own SEO list, and only at build time.
 *
 * Rise Daisy needs the same answer for points that are NOT in that list —
 * nine Anglian Water reservoirs — at request time. Rather than copy the
 * activity definitions into that app, where they would immediately begin to
 * drift, this exposes the scorer over HTTP and Rise Daisy calls it.
 *
 * That is a deliberate trade. Sharing a package would be cleaner and does not
 * exist yet; copying the models would be quickest and is the option that
 * rots. An endpoint keeps ONE definition of what good sailing weather is,
 * which is the thing worth protecting — the models are the asset, not the
 * plumbing.
 *
 * ─── Honest limits, which the response states rather than hides ──────────
 *
 * These models were written with the coast in mind as much as inland water,
 * and two of their criteria have no inland source:
 *
 *   waveHeight   there is no wave model for a reservoir. Fetch across Rutland
 *                is a few kilometres; a marine wave field does not apply.
 *   visibility   not carried in the daily forecast shape this uses. It used to
 *                be DEFAULTED to 10 km, which was worse than absent: it counted
 *                as a measurement, so this disclosure was false, and 10 km fails
 *                the strict `visibility>10` in every model's perfect band.
 *   waterTemp    no inland source — but a caller who has one can now pass
 *                `waterTempC`, and swimming needs it. See below.
 *
 * Gusts are no longer on that list. Every water-sports model carried gust
 * criteria and not one had ever been evaluated, because the daily forecast
 * request never asked for them; it does now. On enclosed water the gust spread
 * is what capsizes a dinghy, so this was the largest gap in the response and it
 * was not among the things the response admitted to.
 *
 * `evaluateConditionScore` returns a neutral 0.5 for any missing field rather
 * than failing, so an inland score degrades gracefully — but it is then
 * driven by temperature, wind, gust and precipitation alone. That is honest
 * for a reservoir and it is LESS DISCRIMINATING than the model's
 * specification suggests, so every response carries `neutralCriteria` naming
 * exactly which tests could not run. A consumer that shows a score without
 * showing that is misrepresenting it.
 *
 * Some activities are also coastal by construction — `windsurfing` sets
 * `requiresBeachOrientation` and `usesWindRelative`, which mean nothing on a
 * reservoir. Those are flagged in `coastalModel` rather than silently scored;
 * the fix is an inland variant, the way sailing already has `sailing_inland`.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getActivityScoreForLocation } from '../../../lib/seo/getActivityScore';
import { activityTypes } from '../../../data/activityTypes';
import type { SeoLocation } from '../../../data/seoLocations';

/**
 * Criteria the daily inland forecast cannot supply. Named so the caller can say
 * so on the page instead of implying a precision we do not have.
 *
 * `soilMoisture` was missing from this list and is referenced by birdwatching,
 * camping and dog walking, so the disclosure was incomplete in exactly the
 * activities a country park cares about.
 *
 * `gust` and `visibility` used to belong here and no longer do, for opposite
 * reasons. Gusts are now requested from Open-Meteo and genuinely scored — they
 * were referenced by every water-sports model and supplied to none, which was
 * the largest gap in the whole response and was not disclosed either. Visibility
 * is still not carried, but it is now honestly absent rather than defaulted to a
 * fabricated 10 km, so naming it here is again true.
 */
const INLAND_UNAVAILABLE = ['waveHeight', 'visibility', 'swellPeriod', 'waterTemperature', 'soilMoisture'];

/** Sibling apps allowed to call this. Not open to the world: the response is
 *  cheap but it is still our modelling, and an open CORS header on an
 *  unauthenticated GET is how a private asset quietly becomes a public one. */
const ALLOWED_ORIGINS = [
  'https://risedaisy.com',
  'https://www.risedaisy.com',
  'https://fishfindr.eu',
  'https://www.fishfindr.eu',
  'http://localhost:3000',
  'http://localhost:3910',
  'http://localhost:3912',
];

export interface ActivityConditionsDay {
  date: string;
  dayLabel: string;
  score: number;
  evaluation: string;
  reasoning: string;
}

export interface ActivityConditions {
  activityId: string;
  name: string;
  /** Seven days, today first. */
  days: ActivityConditionsDay[];
  /** Criteria in this activity's bands that no inland source could answer, so
   *  scored neutral. Empty when the model is fully served. */
  neutralCriteria: string[];
  /** True when the model carries coastal-only logic (wind relative to shore,
   *  beach orientation) that does not apply on enclosed water. */
  coastalModel: boolean;
  /** Months the activity is in season, from the model. */
  seasonalMonths?: number[];
}

export interface ActivityConditionsResponse {
  place: { name: string; lat: number; lon: number };
  activities: ActivityConditions[];
  generatedAt: string;
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Which of an activity's own criteria mention a field we cannot supply
 *  inland. Read off the model rather than hardcoded, so adding a criterion to
 *  an activity cannot silently escape the disclosure. */
function neutralFor(activityId: string): { neutral: string[]; coastal: boolean } {
  const a = activityTypes.find((x) => x.id === activityId);
  if (!a) return { neutral: [], coastal: false };
  const bands = [
    ...(a.perfectConditions ?? []), ...(a.goodConditions ?? []),
    ...(a.fairConditions ?? []), ...(a.poorConditions ?? []),
  ];
  const neutral = INLAND_UNAVAILABLE.filter((f) =>
    bands.some((c) => typeof c === 'string' && c.includes(f)));
  // Both are real optional fields on ActivityType — no cast needed.
  const coastal = Boolean(a.usesWindRelative || a.requiresBeachOrientation);
  return { neutral, coastal };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActivityConditionsResponse | { error: string }>,
): Promise<void> {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const lat = num(req.query.lat);
  const lon = num(req.query.lon);
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    res.status(400).json({ error: 'lat and lon are required and must be a real coordinate' });
    return;
  }

  const requested = String(req.query.activities ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8);
  if (!requested.length) {
    res.status(400).json({ error: 'activities is required — a comma-separated list of activity ids' });
    return;
  }
  const unknown = requested.filter((id) => !activityTypes.some((a) => a.id === id));
  if (unknown.length) {
    res.status(400).json({ error: `Unknown activity id(s): ${unknown.join(', ')}` });
    return;
  }

  const name = typeof req.query.name === 'string' && req.query.name.trim()
    ? req.query.name.trim().slice(0, 80)
    : 'This location';

  /**
   * A water temperature the CALLER has measured or modelled, which no inland
   * forecast carries.
   *
   * Open-water swimming is decided by this and nothing else comes close: below
   * about 15 °C is cold water and below 10 °C is where cold-water shock and
   * swim failure dominate incidents. Without it the swimming models are scored
   * on air temperature, which lags a reservoir by weeks and is at its most
   * misleading in spring — the first warm afternoon over water still near
   * winter temperature.
   *
   * Bounded to a range fresh water can actually occupy, so a caller sending
   * Fahrenheit by mistake is refused rather than quietly scored. Absent stays
   * absent; nothing is inferred from the air.
   */
  const waterTempC = num(req.query.waterTempC);
  if (waterTempC !== null && (waterTempC < -2 || waterTempC > 40)) {
    res.status(400).json({ error: 'waterTempC must be between -2 and 40 (°C)' });
    return;
  }

  // getActivityScoreForLocation wants a SeoLocation; everything it actually
  // reads is the coordinate, the timezone and the name.
  const location: SeoLocation = {
    slug: 'ad-hoc', name, region: '', country: '',
    lat, lon,
    timezone: typeof req.query.tz === 'string' ? req.query.tz : 'Europe/London',
    activities: requested,
    beachFacingDeg: null,
  };

  try {
    const results = await Promise.all(requested.map(async (activityId): Promise<ActivityConditions | null> => {
      const payload = await getActivityScoreForLocation(
        activityId,
        location,
        waterTempC !== null ? { waterTemperature: waterTempC } : undefined,
      );
      if (!payload) return null;
      const model = activityTypes.find((a) => a.id === activityId);
      const { neutral, coastal } = neutralFor(activityId);
      /* Only still unavailable if the caller did not supply it. */
      const stillNeutral = waterTempC !== null
        ? neutral.filter((f) => f !== 'waterTemperature')
        : neutral;
      return {
        activityId,
        name: model?.name ?? activityId,
        days: (payload.weeklyOutlook ?? []).map((d) => ({
          date: d.date, dayLabel: d.dayLabel, score: d.score,
          evaluation: d.evaluation, reasoning: d.reasoning,
        })),
        neutralCriteria: stillNeutral,
        coastalModel: coastal,
        seasonalMonths: model?.seasonalMonths,
      };
    }));

    const activities = results.filter((r): r is ActivityConditions => r !== null);
    if (!activities.length) {
      res.status(502).json({ error: 'No activity could be scored for this location' });
      return;
    }

    // The underlying weather is cached upstream and moves slowly; an hour is
    // well inside a daily forecast's useful life.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({
      place: { name, lat, lon },
      activities,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[activity-conditions]', err);
    res.status(502).json({ error: 'Could not score conditions for this location' });
  }
}
