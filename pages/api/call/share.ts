/**
 * The four share renders, from one template.
 *
 *   /api/call/share?place=croyde-bay&day=0&crop=card|story|og|text
 *
 * Node runtime: sharp is unavailable on edge, and satori needs font buffers off
 * the filesystem.
 *
 * The cache key carries the DATE. A verdict is valid until the next call hour,
 * and a stale card outliving its own forecast is the one failure the voice rules
 * forbid — "never a confident sentence over incomplete data".
 *
 * @module pages/api/call/share
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchForecastForLocation } from '@/lib/seo/getActivityScore';
import { getSuggestionsByDay, type Suggestion } from '@/utils/getSuggestionsByDay';
import { allSports } from '@/data/activities';
import { makeCall } from '@/lib/godaisy/call/makeCall';
import { asSentence } from '@/lib/godaisy/call/verdict';
import { SEO_LOCATIONS, type SeoLocation } from '@/data/seoLocations';
import { renderShare } from '@/lib/godaisy/share/render';
import { shareText, type ShareCrop } from '@/lib/godaisy/share/template';
import { bakedDataUri } from '@/lib/godaisy/share/photos';

export const config = { api: { responseLimit: false } };

const CROPS: ShareCrop[] = ['card', 'story', 'og'];

/** Today in Europe/London, which is the timezone the call is written in. */
function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.place ?? '');
  const cropParam = String(req.query.crop ?? 'card');
  const dayIndex = Math.max(0, Math.min(6, Number(req.query.day ?? 0) || 0));

  // No fallback to SEO_LOCATIONS[0]: that made "Unknown place" unreachable, hid
  // broken share links behind a plausible-looking card, and left the response
  // depending on the order of rows in a data file.
  const location: SeoLocation | undefined = SEO_LOCATIONS.find((l: SeoLocation) => l.slug === slug);
  if (!location) return res.status(404).json({ error: `Unknown place: ${slug || '(none)'}` });

  /*
   * The date must be IN the URL, not merely in a comment.
   *
   * The first version claimed the cache key carried the date and it did not, so
   * a CDN could serve yesterday's verdict over today's URL — around midnight, or
   * across a call-hour boundary, the card would outlive its own forecast. That
   * is the one failure the voice rules forbid, and a header cannot fix it
   * because the header is not the key.
   *
   * A request without a date is redirected to one with it, so every day is a
   * distinct URL and a stale entry simply falls out of use.
   */
  const date = String(req.query.date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const q = new URLSearchParams(
      Object.entries(req.query).flatMap(([k, v]) =>
        v === undefined || k === 'date' ? [] : [[k, String(v)] as [string, string]]),
    );
    q.set('date', todayISO());
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    return res.redirect(307, `/api/call/share?${q.toString()}`);
  }

  try {
    const forecast = (await fetchForecastForLocation(location)).slice(0, 7);
    if (!forecast[dayIndex]) return res.status(404).json({ error: 'No forecast for that day' });

    const chosen = location.activities.slice(0, 3);
    const byDay = getSuggestionsByDay({
      forecast, activities: allSports, interests: chosen,
      now: new Date(), includeAllActivities: true,
    }) as Array<{ date: number; suggestions: Suggestion[] }>;

    const d = byDay[dayIndex];
    const weekday = (ts: number) =>
      new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(ts * 1000));

    const call = makeCall({
      date: d.date, place: location.name, weather: forecast[dayIndex].weather,
      suggestions: d.suggestions, sports: chosen, seeded: chosen,
      names: Object.fromEntries((allSports as Array<{ id: string; name: string }>).map((a) => [a.id, a.name])),
      dayIndex, weekday: weekday(d.date),
    });

    // The share takes the DISPLAYED alternate, not the day's default — otherwise
    // the card contradicts the screen someone tapped Send on.
    const altIndex = Math.max(0, Number(req.query.alt ?? 0) || 0);
    const option = call.alternates[altIndex] ?? call.call;
    if (!option) return res.status(404).json({ error: 'No call for that day' });

    const iso = new Date(d.date * 1000).toISOString().slice(0, 10);
    // The URL's date must match the day it actually renders. A link kept
    // overnight asks for a day the forecast has moved past; say so rather than
    // serving a card for a different date under the requested one.
    if (dayIndex === 0 && date !== iso) {
      return res.status(410).json({ error: `That call was for ${date}; today is ${iso}.` });
    }
    const data = {
      place: location.name,
      date: new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        .format(new Date(d.date * 1000)),
      verdict: asSentence({ ...option.verdict, reason: '' }).trim(),
      reason: option.verdict.reason,
      facts: option.facts,
      /*
       * The card's URL has to be a page, not a decoration.
       *
       * It printed `godaisy.io/{slug}` — no scheme, because a bare host is
       * typography where a scheme is noise. True, and it 404s: there is no
       * route at the root. Anyone who READ the card rather than tapping the
       * link got an error from the app's most-distributed surface.
       *
       * `/{activity}/{location}` is the existing programmatic-SEO page, which
       * answers the card's own question for that pair, and reads as naturally
       * across a footer. Underscores to hyphens is the mapping that route
       * already uses.
       */
      url: `godaisy.io/${option.activityId.replace(/_/g, '-')}/${location.slug}`,
      photo: '',
    };

    // s-maxage plus a date in the key: a warm re-fetch is free, and a new day is
    // a new URL rather than a stale image.
    res.setHeader('Cache-Control', 'public, no-transform, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Call-Date', iso);

    if (cropParam === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(shareText(data));
    }

    const crop = (CROPS as string[]).includes(cropParam) ? (cropParam as ShareCrop) : 'card';

    // Baked at build time. The request path never runs sharp: bundling it took
    // this function to 361 MB against Vercel's 250 MB limit.
    const photo = bakedDataUri(option.activityId, crop);
    if (!photo) {
      return res.status(503).json({
        error: `No baked ${crop} image for ${option.activityId}. Run scripts/prebake-call-images.ts.`,
      });
    }
    data.photo = photo;

    const image = await renderShare(data, crop);
    const buf = Buffer.from(await image.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    return res.status(200).send(buf);
  } catch (e) {
    // The verdict is withheld rather than guessed.
    return res.status(503).json({ error: e instanceof Error ? e.message : 'Unavailable' });
  }
}
