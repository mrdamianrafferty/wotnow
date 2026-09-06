/**
 * /api/cron/godaisy/daily-call
 *
 * The thing that had never been built.
 *
 * Go Daisy's whole premise is one message a day, and that message IS the
 * product — `capacitor.config.godaisy.ts` says so in as many words. Every part
 * of it existed except this: the iOS app registers an APNs token at launch
 * (`AppDelegate.swift:142`), `lib/godaisy/apnsClient.ts` sends to the right
 * topic, `makeCall` decides what the day is for. Nothing joined them, so
 * `godaisy_notification_log` held zero rows from the day it was created — not
 * failures, no attempts.
 *
 * ─── One voice, not two ──────────────────────────────────────────────────
 *
 * This does NOT compose its own copy. It runs the same assembly `/call` runs
 * in `getServerSideProps` — same forecast fetch, same `getSuggestionsByDay`,
 * same `makeCall` — and sends `asSharedSentence` of the verdict that comes out.
 * A notification that disagreed with the screen it opens would be worse than no
 * notification, and the only reliable way to make two things agree is to have
 * one of them.
 *
 * `asSharedSentence` rather than `asSentence` for the reason its own comment
 * gives: "Today is ALSO a day for a walk" reads as a second answer, and a push
 * notification is nobody's second answer — the reader has not seen the first.
 *
 * ─── Schedule: hourly, matched against each person's own clock ───────────
 *
 * The cron fires every hour; each row names the LOCAL hour its owner chose and
 * the timezone to read it in. So one job serves every timezone, and someone who
 * picked 07:00 gets 07:00 where they are, not where Vercel is.
 *
 * ─── Evening calls are about tomorrow ────────────────────────────────────
 *
 * A notification at 20:00 saying today is good for kayaking is describing a day
 * that is over. From `EVENING_FROM` onwards the call is made for the NEXT day
 * — `makeCall`'s own `dayIndex`, which steps the phrasing so the sentence names
 * the weekday instead of saying "Today", and the title says so plainly.
 *
 * ─── Silence is a feature ────────────────────────────────────────────────
 *
 * Nothing is sent unless the day clears `isGood` — prime or worth a look, the
 * app's own bands, not a threshold invented here. On a marginal day the call
 * does not go out at all. One message a day is the promise only if the message
 * is worth the interruption; a daily "it's a bit grey" trains people to swipe
 * the app away, and there is no second chance at that.
 *
 * @module pages/api/cron/godaisy/daily-call
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

import { verifyCronAuth } from '@/lib/cron-auth';
import { fetchForecastForLocation } from '@/lib/seo/getActivityScore';
import { getSuggestionsByDay, type Suggestion } from '@/utils/getSuggestionsByDay';
import { allSports } from '@/data/activities';
import { makeCall } from '@/lib/godaisy/call/makeCall';
import { isGood } from '@/lib/godaisy/call/bands';
import { asSharedSentence } from '@/lib/godaisy/call/verdict';
import { locationFromSetup } from '@/lib/godaisy/call/location';
import type { CallSetup } from '@/lib/godaisy/call/setup';
import { sendGoDaisyApnsPushNotification } from '@/lib/godaisy/apnsClient';
import { sendFcmPushNotification } from '@/lib/notifications/fcmClient';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * From this hour on, the call is about tomorrow.
 *
 * 18:00 is where the useful part of an outdoor day has gone for most of the
 * activities in the library. Earlier than that and "today" still buys someone
 * an evening; later and it is a report on a day they have already had.
 */
const EVENING_FROM = 18;

/** The Go Daisy app. Deliberately exact — a null bundle_id may be any of the three apps. */
const GODAISY_BUNDLE_ID = 'io.godaisy.app';

/**
 * A ceiling on the run, because the work is per person and the forecast is
 * upstream. Vercel gives this route 300s (see vercel.json); stopping at 240
 * leaves room to write the rows for what has already been sent, which matters
 * more than reaching the last person — they are due again in 24 hours, and a
 * killed worker mid-send is how a notification goes out with nothing recording
 * that it did.
 */
const WALL_CLOCK_BUDGET_MS = 240_000;

/** How many forecasts to have in flight at once. Small: this is somebody else's API. */
const CONCURRENCY = 4;

interface PrefRow {
  user_id: string;
  timezone: string | null;
  call_hour: number | null;
  call_place_name: string | null;
  call_place_lat: number | null;
  call_place_lon: number | null;
  call_coastal_name: string | null;
  call_coastal_lat: number | null;
  call_coastal_lon: number | null;
  call_sports: string[] | null;
  call_last_sent_on: string | null;
}

/**
 * What hour is it where they are, and what is today's date there?
 *
 * `en-CA` because its short date format is ISO (`2026-09-06`), which is the
 * shape the DATE column wants and one fewer place to assemble a date by hand.
 */
function localClock(tz: string, at: Date): { hour: number; date: string } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const hour = Number(get('hour'));
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    if (!Number.isInteger(hour) || !date.startsWith('2')) return null;
    // Intl renders midnight as "24" in some ICU versions; normalise so an
    // hour of 0 is never missed by an equality test.
    return { hour: hour === 24 ? 0 : hour, date };
  } catch {
    // An unresolvable timezone. The API route refuses these on the way in, so
    // this is a row that predates that check — skipped, not crashed on.
    return null;
  }
}

/** The setup, rebuilt from the row, in the shape `locationFromSetup` already understands. */
function setupFromRow(row: PrefRow): CallSetup | null {
  if (row.call_place_lat === null || row.call_place_lon === null) return null;
  const sports = (row.call_sports ?? []).filter(Boolean);
  if (!sports.length) return null;
  return {
    v: 1,
    sports,
    place: {
      name: row.call_place_name ?? 'Your place',
      lat: row.call_place_lat,
      lon: row.call_place_lon,
    },
    ...(row.call_coastal_lat !== null && row.call_coastal_lon !== null
      ? {
          coastal: {
            name: row.call_coastal_name ?? 'The coast',
            lat: row.call_coastal_lat,
            lon: row.call_coastal_lon,
          },
        }
      : {}),
    hour: row.call_hour ?? undefined,
  };
}

interface Outcome {
  userId: string;
  status: 'sent' | 'suppressed' | 'no_device' | 'no_forecast' | 'error';
  detail?: string;
}

/**
 * Make the call for one person and, if it is worth sending, send it.
 *
 * Returns without writing `call_last_sent_on` when nothing went out. The column
 * means what it says — the day a notification actually left — and a suppressed
 * day costs only a recomputation if the hour somehow comes round twice.
 */
async function callOne(row: PrefRow, tz: string, localDate: string): Promise<Outcome> {
  const setup = setupFromRow(row);
  if (!setup) return { userId: row.user_id, status: 'error', detail: 'incomplete setup' };

  // Devices first. There is no point buying a forecast for someone with no
  // phone attached to the account.
  const { data: tokens } = await supabase
    .from('user_push_tokens')
    .select('token, platform')
    .eq('user_id', row.user_id)
    .eq('bundle_id', GODAISY_BUNDLE_ID);

  if (!tokens?.length) return { userId: row.user_id, status: 'no_device' };

  const location = locationFromSetup(setup);
  const forecast = (await fetchForecastForLocation(location)).slice(0, 7);
  if (!forecast.length) return { userId: row.user_id, status: 'no_forecast' };

  const dayIndex = (row.call_hour ?? 0) >= EVENING_FROM ? 1 : 0;
  if (dayIndex >= forecast.length) return { userId: row.user_id, status: 'no_forecast' };

  const byDay = getSuggestionsByDay({
    forecast,
    activities: allSports,
    interests: setup.sports,
    now: new Date(),
    includeAllActivities: true,
  }) as Array<{ date: number; suggestions: Suggestion[] }>;

  const day = byDay[dayIndex];
  if (!day) return { userId: row.user_id, status: 'no_forecast' };

  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: tz })
    .format(new Date(day.date * 1000));

  const call = makeCall({
    date: day.date,
    place: location.name,
    weather: forecast[dayIndex].weather,
    suggestions: day.suggestions,
    sports: setup.sports,
    seeded: setup.sports,
    coords: { lat: location.lat, lon: location.lon },
    names: Object.fromEntries(
      (allSports as Array<{ id: string; name: string }>).map((a) => [a.id, a.name]),
    ),
    dayIndex,
    weekday,
    parts: forecast[dayIndex].parts,
    activities: allSports as never,
  });

  // The bar. `isGood` is prime or worth a look — the app's own vocabulary,
  // so what gets sent and what the screen calls a good day cannot drift apart.
  if (!call.call || !isGood(call.call.band)) {
    return { userId: row.user_id, status: 'suppressed', detail: call.call?.band ?? 'no call' };
  }

  const title = dayIndex === 0
    ? `Today at ${location.name}`
    : `Tomorrow at ${location.name}`;
  const body = asSharedSentence(call.call.verdict);

  let sent = 0;
  const failures: string[] = [];
  for (const t of tokens) {
    try {
      const ok = t.platform === 'ios'
        ? await sendGoDaisyApnsPushNotification(t.token, {
            title,
            body,
            data: { type: 'daily_call', activityId: call.call.activityId, url: '/call' },
          })
        : await sendFcmPushNotification(t.token, {
            title,
            body,
            data: { type: 'daily_call', activityId: call.call.activityId, url: '/call' },
          });
      if (ok) sent++; else failures.push(`${t.platform} rejected`);
    } catch (err) {
      failures.push(`${t.platform}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  await supabase.from('godaisy_notification_log').insert({
    user_id: row.user_id,
    notification_type: 'daily_call',
    title,
    body,
    data: { activityId: call.call.activityId, band: call.call.band, dayIndex },
    status: sent > 0 ? 'sent' : 'failed',
    error_message: sent > 0 ? null : failures.join('; ').slice(0, 500),
    sent_at: sent > 0 ? new Date().toISOString() : null,
  });

  if (sent > 0) {
    await supabase
      .from('godaisy_notification_preferences')
      .update({ call_last_sent_on: localDate })
      .eq('user_id', row.user_id);
    return { userId: row.user_id, status: 'sent', detail: call.call.activityId };
  }

  return { userId: row.user_id, status: 'error', detail: failures.join('; ') };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startedAt = Date.now();
  const now = new Date();

  const { data: rows, error } = await supabase
    .from('godaisy_notification_preferences')
    .select('user_id, timezone, call_hour, call_place_name, call_place_lat, call_place_lon, call_coastal_name, call_coastal_lat, call_coastal_lon, call_sports, call_last_sent_on')
    .eq('call_enabled', true)
    .not('call_hour', 'is', null)
    .not('call_place_lat', 'is', null)
    .returns<PrefRow[]>();

  if (error) {
    console.error('[GoDaisyDailyCall] Load failed:', error.message);
    return res.status(500).json({ error: 'Failed to load call setups' });
  }

  /*
   * Whose hour is it? Decided here, in one pass, before any upstream work —
   * the expensive part is the forecast, and on a typical run all but a
   * twenty-fourth of the table is not due.
   */
  const due = (rows ?? []).filter((row) => {
    const tz = row.timezone || 'Europe/Dublin';
    const clock = localClock(tz, now);
    if (!clock) return false;
    if (clock.hour !== row.call_hour) return false;
    // Already called today, where they are.
    return row.call_last_sent_on !== clock.date;
  });

  const outcomes: Outcome[] = [];
  let budgetExhausted = false;

  for (let i = 0; i < due.length; i += CONCURRENCY) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
      budgetExhausted = true;
      break;
    }
    const batch = due.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (row) => {
      const tz = row.timezone || 'Europe/Dublin';
      const clock = localClock(tz, now);
      try {
        return await callOne(row, tz, clock!.date);
      } catch (err) {
        console.error('[GoDaisyDailyCall] Failed for user:', row.user_id, err);
        return {
          userId: row.user_id,
          status: 'error' as const,
          detail: err instanceof Error ? err.message : 'unknown',
        };
      }
    }));
    outcomes.push(...results);
  }

  const tally = outcomes.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log('[GoDaisyDailyCall]', JSON.stringify({
    considered: rows?.length ?? 0,
    due: due.length,
    processed: outcomes.length,
    budgetExhausted,
    ...tally,
  }));

  return res.status(200).json({
    success: true,
    considered: rows?.length ?? 0,
    due: due.length,
    processed: outcomes.length,
    budgetExhausted,
    tally,
    ms: Date.now() - startedAt,
  });
}
