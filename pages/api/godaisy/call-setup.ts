/**
 * /api/godaisy/call-setup
 *
 * The setup, mirrored somewhere a cron can read it.
 *
 * `lib/godaisy/call/setup.ts` explains at length why the setup lives in a
 * cookie: `/call` renders on the server, and a cookie is the only client-
 * writable store `getServerSideProps` can read, so a returning visitor sees
 * their own forecast in the first byte of HTML rather than somebody else's
 * followed by a correction. That is the right call for the page.
 *
 * It is also the reason nothing has ever sent the daily call. A cron has no
 * cookie. Until this route existed there was no server-side record of who had
 * chosen an hour, where they were, or what they did — so the sender had nothing
 * to iterate over, and `godaisy_notification_log` sat empty from the day it was
 * created.
 *
 * So: the cookie stays the system of record for the page, and this is the copy
 * the sender reads. Signed-in only, by necessity — a push notification needs a
 * device token, and a token belongs to an account.
 *
 * A COOKIE IS USER INPUT, and so is this. `setup.ts` validates every field on
 * the way out of the cookie for exactly that reason; the same values arriving
 * over HTTP get the same treatment here, because these coordinates end up in an
 * outbound forecast URL and these ids end up in a library lookup.
 *
 * @module pages/api/godaisy/call-setup
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { allSports } from '@/data/activities';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const VALID_SPORTS: ReadonlySet<string> = new Set(
  (allSports as Array<{ id: string }>).map((a) => a.id),
);

/** The same cap `/api/godaisy/activity-conditions` enforces, for the same reason. */
const MAX_SPORTS = 32;

interface IncomingPlace {
  name?: unknown;
  lat?: unknown;
  lon?: unknown;
}

interface ParsedPlace {
  name: string;
  lat: number;
  lon: number;
}

function parsePlace(raw: unknown): ParsedPlace | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as IncomingPlace;
  const lat = typeof p.lat === 'number' ? p.lat : Number(p.lat);
  const lon = typeof p.lon === 'number' ? p.lon : Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = typeof p.name === 'string' && p.name.trim()
    ? p.name.trim().slice(0, 80)
    : 'Your place';
  return { name, lat, lon };
}

/**
 * Is this a timezone Node can actually resolve?
 *
 * The sender computes "is it their chosen hour yet" with `Intl` and this
 * string. An unresolvable zone would throw inside the cron, once per run,
 * for as long as the bad row existed — so it is refused here, where there is
 * somebody to tell, rather than there, where there is not.
 */
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const { data: { user }, error: authError } =
    await supabase.auth.getUser(authHeader.substring(7));
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const userId = user.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('godaisy_notification_preferences')
      .select('call_enabled, call_hour, call_place_name, call_place_lat, call_place_lon, call_coastal_name, call_coastal_lat, call_coastal_lon, call_sports, call_last_sent_on, timezone')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[GoDaisyCallSetup] Load failed:', error.message);
      return res.status(500).json({ error: 'Failed to load call setup' });
    }
    return res.status(200).json({ setup: data ?? null });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  const place = parsePlace(body.place);
  if (!place) {
    return res.status(400).json({ error: 'place is required, with a real lat and lon' });
  }

  // Absent is fine — most people have no separate water spot. Present and
  // malformed is not, because it would be stored and then silently ignored.
  let coastal: ParsedPlace | null = null;
  if (body.coastal !== undefined && body.coastal !== null) {
    coastal = parsePlace(body.coastal);
    if (!coastal) return res.status(400).json({ error: 'coastal, when present, needs a real lat and lon' });
  }

  const rawSports = Array.isArray(body.sports) ? body.sports : [];
  const sports = rawSports
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sports.length) {
    return res.status(400).json({ error: 'sports is required — at least one activity id' });
  }
  if (sports.length > MAX_SPORTS) {
    return res.status(400).json({ error: `Too many activities: ${sports.length}. The limit is ${MAX_SPORTS}.` });
  }
  const unknown = sports.filter((id) => !VALID_SPORTS.has(id));
  if (unknown.length) {
    return res.status(400).json({ error: `Unknown activity id(s): ${unknown.join(', ')}` });
  }

  /*
   * The hour may legitimately be absent.
   *
   * Onboarding lets someone finish without picking one — `canAdvance` requires
   * it on the last step, but the setup is written on every pass and an older
   * cookie predates the hour entirely. No hour means no call, which the sender
   * enforces by selecting on `call_hour IS NOT NULL`; it does not mean the rest
   * of the setup is worth refusing.
   */
  let hour: number | null = null;
  if (body.hour !== undefined && body.hour !== null) {
    const h = Number(body.hour);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      return res.status(400).json({ error: 'hour must be an integer between 0 and 23' });
    }
    hour = h;
  }

  const tzRaw = typeof body.timezone === 'string' ? body.timezone.trim() : '';
  if (tzRaw && !isValidTimeZone(tzRaw)) {
    return res.status(400).json({ error: `Unknown timezone: ${tzRaw}` });
  }

  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);

  /*
   * Upsert on `user_id`, which is UNIQUE on this table.
   *
   * `call_last_sent_on` is deliberately NOT written here. Changing your hour
   * should not entitle you to a second call today, and clearing the key would
   * do exactly that — the sender's only guard against a double send is that
   * date already matching.
   */
  const row: Record<string, unknown> = {
    user_id: userId,
    call_enabled: enabled,
    call_hour: hour,
    call_place_name: place.name,
    call_place_lat: place.lat,
    call_place_lon: place.lon,
    call_coastal_name: coastal?.name ?? null,
    call_coastal_lat: coastal?.lat ?? null,
    call_coastal_lon: coastal?.lon ?? null,
    call_sports: sports,
    updated_at: new Date().toISOString(),
  };
  if (tzRaw) row.timezone = tzRaw;

  const { error } = await supabase
    .from('godaisy_notification_preferences')
    .upsert(row, { onConflict: 'user_id' });

  if (error) {
    console.error('[GoDaisyCallSetup] Save failed:', error.message);
    return res.status(500).json({ error: 'Failed to save call setup' });
  }

  return res.status(200).json({ success: true });
}
