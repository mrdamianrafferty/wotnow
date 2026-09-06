/**
 * The setup, pushed to the server for anyone signed in.
 *
 * `setup.ts` explains why the cookie is the system of record, and that decision
 * stands — it is what makes `/call` correct in the first byte of HTML and what
 * makes onboarding work for a stranger with no account. But it also means the
 * setup exists ONLY in a browser, and the daily call is sent by a cron, which
 * has no browser. That gap is why Go Daisy had collected iOS device tokens for
 * six months and never sent a single notification.
 *
 * So this is a mirror, not a move. Signed-out people keep working exactly as
 * before and simply get no call, which is the honest outcome: a push
 * notification needs a device token, and a device token belongs to an account.
 *
 * A SEPARATE MODULE FROM `setup.ts` on purpose. `setup.ts` is imported by
 * `getServerSideProps` for `setupFromCookieHeader`; importing the browser
 * Supabase client from it would drag an auth client into the server bundle for
 * the sake of a function the server never calls.
 *
 * @module lib/godaisy/call/sync
 */

import { supabase } from '@/lib/supabase/client';
import { readSetup, writeSetup, DEFAULT_SPORTS, type CallSetup, type SetupPlace } from './setup';

/**
 * Mirror the setup into Supabase. Never throws.
 *
 * Onboarding's last act is `router.replace('/call')`, and a failure here must
 * not stand between somebody and the screen they just finished setting up. A
 * lost sync costs one missed call and is repaired the next time they pass
 * through `/start` or change a setting — so it is logged and swallowed, not
 * surfaced. The cookie, which is what `/call` actually reads, has already been
 * written by then either way.
 *
 * @returns true when the server accepted the setup.
 */
export async function syncSetupToServer(setup: CallSetup): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    /*
     * The zone the person is actually in, read from their own browser.
     *
     * The sender matches each row's chosen hour against the local clock in this
     * timezone. Without it the column keeps its default of Europe/Dublin, and
     * someone in Vancouver who asked for 07:00 would be called at 23:00 — the
     * kind of bug that reads as the app being broken rather than mis-configured.
     */
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;

    const res = await fetch('/api/godaisy/call-setup', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        sports: setup.sports,
        place: setup.place,
        ...(setup.coastal ? { coastal: setup.coastal } : {}),
        ...(setup.hour !== undefined ? { hour: setup.hour } : {}),
        ...(timezone ? { timezone } : {}),
      }),
    });

    if (!res.ok) {
      console.warn('[CallSync] Server rejected the setup:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[CallSync] Could not mirror setup to the server:', err);
    return false;
  }
}

/** The server's copy, for a device that has no cookie yet. */
interface ServerCallSetup {
  call_hour: number | null;
  call_place_name: string | null;
  call_place_lat: number | null;
  call_place_lon: number | null;
  call_coastal_name: string | null;
  call_coastal_lat: number | null;
  call_coastal_lon: number | null;
  call_sports: string[] | null;
}

async function fetchServerSetup(): Promise<ServerCallSetup | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    const res = await fetch('/api/godaisy/call-setup', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return null;
    const json = await res.json() as { setup: ServerCallSetup | null };
    return json.setup;
  } catch {
    return null;
  }
}

/**
 * The hour this person has chosen, from whichever store knows.
 *
 * Cookie first, because it is the system of record and the only one that
 * answers instantly. The server is the fallback for a device that has never
 * been through onboarding — a second phone, or a reinstall — where the cookie
 * is gone but the choice was made months ago and should not have to be made
 * again.
 */
export async function loadCallHour(): Promise<number | undefined> {
  const cookie = readSetup();
  if (cookie?.hour !== undefined) return cookie.hour;
  const server = await fetchServerSetup();
  return server?.call_hour ?? undefined;
}

/**
 * Change when the call arrives.
 *
 * WRITES THE COOKIE AS WELL AS THE SERVER, and that is not belt-and-braces —
 * it is the whole correctness of the operation. `AuthContext` mirrors the
 * cookie to the server on every sign-in and every session restore, and the
 * server route stores `hour` as whatever arrived, including absent. So an hour
 * saved to the server alone survives exactly until the next app launch, when a
 * cookie that never learned about it overwrites the column with null. The
 * person would set their hour, see it accepted, and silently stop being called.
 *
 * The cookie goes first for the same reason it does in onboarding: it is what
 * `/call` renders from, and it must not be the half that fails.
 *
 * Three outcomes, because two would have to lie about one of them:
 *
 *   'saved'      the cookie is written and the server agrees (or there is no
 *                account to agree with, which is fine — the cookie is the
 *                system of record and `AuthContext` will mirror it on sign-in).
 *   'local-only' the cookie is written but the signed-in mirror failed. The
 *                choice is not lost; the next session restore syncs it.
 *   'no-setup'   there is no place to attach an hour to, on this device or on
 *                the server. NOTHING was written, and saying "stored on this
 *                device" here would be false.
 */
export type SaveHourResult = 'saved' | 'local-only' | 'no-setup';

/**
 * The setup as it currently stands, from whichever store has it.
 *
 * Cookie first — it is the system of record and answers instantly. The server
 * is the fallback for a device that has never been through onboarding (a second
 * phone, a reinstall), so a change made there does not silently start from
 * nothing and throw away sports and a place chosen months ago.
 */
async function currentSetup(): Promise<CallSetup | null> {
  const cookie = readSetup();
  if (cookie) return cookie;

  const server = await fetchServerSetup();
  if (
    !server ||
    server.call_place_lat === null ||
    server.call_place_lon === null ||
    !server.call_sports?.length
  ) {
    return null;
  }
  return {
    v: 1,
    sports: server.call_sports,
    place: {
      name: server.call_place_name ?? 'Your place',
      lat: server.call_place_lat,
      lon: server.call_place_lon,
    },
    ...(server.call_coastal_lat !== null && server.call_coastal_lon !== null
      ? {
          coastal: {
            name: server.call_coastal_name ?? 'The coast',
            lat: server.call_coastal_lat,
            lon: server.call_coastal_lon,
          },
        }
      : {}),
    ...(server.call_hour !== null ? { hour: server.call_hour } : {}),
  };
}

/**
 * Write a setup to both stores.
 *
 * The cookie goes first, and unconditionally — it is what `/call` renders from
 * and what `AuthContext` mirrors, so it must not be the half that fails.
 */
async function persist(setup: CallSetup): Promise<SaveHourResult> {
  writeSetup(setup);
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  if (!session?.access_token) return 'saved';
  return (await syncSetupToServer(setup)) ? 'saved' : 'local-only';
}

export async function saveCallHour(hour: number): Promise<SaveHourResult> {
  const setup = await currentSetup();
  if (!setup) return 'no-setup';
  return persist({ ...setup, hour });
}

/**
 * Point the call at a new place — the account page's home location.
 *
 * ─── Why this exists ─────────────────────────────────────────────────────
 *
 * `/account`'s location control wrote `preferences.locations` in localStorage
 * and nothing else. That store is read by `/weather`, `/activities` and the
 * account page itself; the CALL reads the setup cookie. So changing your home
 * location moved every screen except the one that gets sent to your phone, and
 * the daily call carried on naming a place you had just told the app you had
 * left — silently, with the two stores disagreeing and nothing to reconcile
 * them.
 *
 * `mirrorToPreferences` in `setup.ts` already pushes the setup INTO
 * preferences when onboarding finishes. This is the missing return leg.
 *
 * ─── Why it will create a setup rather than refuse ───────────────────────
 *
 * Unlike the hour, a place is enough to build a call around: `DEFAULT_SPORTS`
 * is what onboarding itself starts everybody with, and its comment explains why
 * those five are safe for someone who has said nothing about themselves. So
 * setting a location on `/account` and then an hour is a complete setup without
 * ever visiting `/start` — which is the behaviour the two controls sitting on
 * one page implies, and refusing here would strand somebody between them.
 */
export async function saveCallPlace(place: SetupPlace): Promise<SaveHourResult> {
  const setup = await currentSetup();
  return persist(
    setup
      ? { ...setup, place }
      : { v: 1, sports: [...DEFAULT_SPORTS], place },
  );
}

/**
 * The water spot, when it is somewhere other than home.
 *
 * Only ever an edit to an existing setup: a coastal spot on its own has no
 * place to be the alternative TO, and inventing a home from it would put the
 * call somewhere nobody chose.
 */
export async function saveCallCoastal(coastal: SetupPlace): Promise<SaveHourResult> {
  const setup = await currentSetup();
  if (!setup) return 'no-setup';
  return persist({ ...setup, coastal });
}
