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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.place ?? '');
  const cropParam = String(req.query.crop ?? 'card');
  const dayIndex = Math.max(0, Math.min(6, Number(req.query.day ?? 0) || 0));

  const location: SeoLocation | undefined =
    SEO_LOCATIONS.find((l: SeoLocation) => l.slug === slug) ?? SEO_LOCATIONS[0];
  if (!location) return res.status(404).json({ error: 'Unknown place' });

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
    const data = {
      place: location.name,
      date: new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        .format(new Date(d.date * 1000)),
      verdict: asSentence({ ...option.verdict, reason: '' }).trim(),
      reason: option.verdict.reason,
      facts: option.facts,
      url: `godaisy.io/${location.slug}`,
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
