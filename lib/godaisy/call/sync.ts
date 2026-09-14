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
 * A mirror with more than one device behind it needs a rule for which copy
 * wins. That rule is `reconcileSetup`, at the bottom of this file.
 *
 * A SEPARATE MODULE FROM `setup.ts` on purpose. `setup.ts` is imported by
 * `getServerSideProps` for `setupFromCookieHeader`; importing the browser
 * Supabase client from it would drag an auth client into the server bundle for
 * the sake of a function the server never calls.
 *
 * @module lib/godaisy/call/sync
 */

import { supabase } from '@/lib/supabase/client';
import {
  readSetup, writeSetup, sanitiseSetup, encodeSetup, mirrorToPreferences, DEFAULT_SPORTS,
  type CallSetup, type SetupPlace,
} from './setup';

/**
 * Mirror the setup into Supabase. Never throws.
 *
 * Onboarding's last act is `router.replace('/call')`, and a failure here must
 * not stand between somebody and the screen they just finished setting up. A
 * lost sync is marked pending by `saveSetup` and retried by `reconcileSetup` at
 * the next launch — so it is logged and swallowed, not surfaced. The cookie,
 * which is what `/call` actually reads, has already been written by then
 * either way.
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

/*
 * A CHANGE THE SERVER HAS NOT HEARD ABOUT YET.
 *
 * Written by `saveSetup` before it asks the server, removed once the server has
 * it. It is how `reconcileSetup` tells a device with news from a device that is
 * merely out of date — the two look identical from the cookie alone, and
 * treating every cookie as news is what let one phone's defaults overwrite an
 * account.
 *
 * localStorage rather than the cookie: nothing on the server needs it, and the
 * cookie's shape is validated and versioned for reasons that have nothing to do
 * with this.
 */
const PENDING_KEY = 'godaisy.call.setup.pending';

interface Pending {
  /** The account the change was made under. Null when made signed out. */
  owner: string | null;
  /** The setup as saved, encoded — so a sync of an older edit cannot clear a newer one. */
  setup: string;
}

function readPending(): Pending | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Pending>;
    if (typeof p.setup !== 'string') return null;
    return { owner: typeof p.owner === 'string' ? p.owner : null, setup: p.setup };
  } catch {
    return null;
  }
}

function markPending(owner: string | null, setup: CallSetup): void {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ owner, setup: encodeSetup(setup) }));
  } catch {
    // A private window. The change is still in the cookie; it just will not be
    // retried if this sync fails.
  }
}

/** Remove the marker — only while it still describes `synced`, when given. */
function clearPending(synced?: CallSetup): void {
  try {
    if (synced && readPending()?.setup !== encodeSetup(synced)) return;
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear, or nowhere to clear it from.
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

/**
 * The server's copy. `null` means the account has none; `undefined` means the
 * question could not be asked — signed out, offline, a 500.
 *
 * The two must not be confused. Reading a failed request as "no setup" would
 * push this device's cookie over the account's on any flaky connection, which
 * is the overwrite `reconcileSetup` exists to stop.
 */
async function fetchServerSetup(): Promise<ServerCallSetup | null | undefined> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return undefined;
    const res = await fetch('/api/godaisy/call-setup', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return undefined;
    const json = await res.json() as { setup: ServerCallSetup | null };
    return json.setup ?? null;
  } catch {
    return undefined;
  }
}

/**
 * The server row as a setup, or null when it is not a complete one.
 *
 * Rows exist for people who only ever touched a notification toggle, so a row
 * with no place or no sports is an account without a setup, not a broken one.
 */
function fromServer(server: ServerCallSetup | null | undefined): CallSetup | null {
  if (!server || server.call_place_lat === null || server.call_place_lon === null) return null;
  return sanitiseSetup({
    v: 1,
    sports: server.call_sports ?? [],
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
  });
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
 * WRITES THE COOKIE AS WELL AS THE SERVER. The cookie is what `/call` renders
 * from, so an hour saved to the server alone would be called on and never
 * shown. It goes first for the same reason it does in onboarding: it must not
 * be the half that fails.
 *
 * Three outcomes, because two would have to lie about one of them:
 *
 *   'saved'      the cookie is written and the server agrees (or there is no
 *                account to agree with — the cookie is what `/call` reads, and
 *                `reconcileSetup` mirrors it on sign-in if the account has no
 *                setup of its own).
 *   'local-only' the cookie is written but the signed-in mirror failed. The
 *                choice is not lost; it is marked pending, and the next session
 *                restore syncs it.
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
 *
 * `/start` uses it for the same reason: without the fallback, a signed-in
 * device with no cookie opens onboarding on `DEFAULT_SPORTS`, and finishing it
 * saves them over the account's own.
 */
export async function loadSetup(): Promise<CallSetup | null> {
  return readSetup() ?? fromServer(await fetchServerSetup());
}

/**
 * Save a setup this person just chose, to both stores.
 *
 * The cookie goes first, and unconditionally — it is what `/call` renders from,
 * so it must not be the half that fails. The change is then marked pending
 * before the server is asked, and unmarked only once the server has it: a sync
 * that fails is retried by `reconcileSetup` at the next launch, instead of
 * being quietly reverted by it.
 */
export async function saveSetup(setup: CallSetup): Promise<SaveHourResult> {
  writeSetup(setup);
  const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  markPending(session?.user?.id ?? null, setup);
  if (!session?.access_token) return 'saved';
  const ok = await syncSetupToServer(setup);
  if (ok) clearPending(setup);
  return ok ? 'saved' : 'local-only';
}

export async function saveCallHour(hour: number): Promise<SaveHourResult> {
  const setup = await loadSetup();
  if (!setup) return 'no-setup';
  return saveSetup({ ...setup, hour });
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
  const setup = await loadSetup();
  return saveSetup(
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
  const setup = await loadSetup();
  if (!setup) return 'no-setup';
  return saveSetup({ ...setup, coastal });
}

/**
 * Bring this device and the account into agreement. Run by `AuthContext` on
 * sign-in and on every session restore. Never throws.
 *
 * THE ACCOUNT WINS, unless this device has a change the account never received.
 *
 * This used to push the device's cookie to the server unconditionally, on
 * every auth event — every launch, every hourly token refresh — so the setup
 * was whichever device had spoken last. A phone that went through `/start`,
 * where the five `DEFAULT_SPORTS` are pre-ticked, put them over a list chosen
 * elsewhere, and the daily call carried on from the defaults. Seen on 14
 * September 2026: an account whose sports were exactly those five, called for
 * a walk or a picnic every day.
 *
 * In order:
 *   1. A change made here, under this account, that the server has not
 *      accepted — push it. It is the newest thing anybody chose.
 *   2. The account has a setup — it wins, and is written into the cookie if
 *      they differ. That includes a setup made here while signed out:
 *      signing in is asking for your account back.
 *   3. The account has none — push the cookie. The case this mirror was built
 *      for: people who set up before the server stored anything, and people
 *      who onboard first and make an account after.
 * If the server cannot be asked, nothing changes.
 *
 * @returns true when the cookie was rewritten, so a page rendered from the old
 *          one knows to render again.
 */
export async function reconcileSetup(userId: string): Promise<boolean> {
  try {
    const cookie = readSetup();

    if (cookie && readPending()?.owner === userId) {
      if (await syncSetupToServer(cookie)) clearPending(cookie);
      return false;
    }

    const server = await fetchServerSetup();
    if (server === undefined) return false;

    const account = fromServer(server);
    if (account) {
      clearPending();
      if (cookie && encodeSetup(cookie) === encodeSetup(account)) return false;
      writeSetup(account);
      mirrorToPreferences(account);
      return true;
    }

    if (cookie && (await syncSetupToServer(cookie))) clearPending(cookie);
    return false;
  } catch (err) {
    console.warn('[CallSync] Could not reconcile the setup:', err);
    return false;
  }
}
