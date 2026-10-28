/**
 * Google Play for /admin/apps: each Android app's average rating and the
 * state of its production release, added by the dashboard itself so no
 * sibling app's endpoint changes (the same shape as sentry-top.ts).
 *
 *   rating  — the `ratings_<package>_<YYYYMM>_overview.csv` Play writes to the
 *             Cloud Storage reports bucket (Download reports → Statistics),
 *             read with the `grewp-play-reports` service account that
 *             lib/store-stats/google.ts already uses for installs.
 *   release — the production track from the Android Publisher API
 *             (edits.tracks.list): draft, in rollout, halted or completed.
 *
 * What Play does NOT expose to an API: whether a change is in review, and
 * policy warnings. Those stay in Play Console.
 *
 * The service account needs the "Google Play Android Developer API" enabled
 * in its GCP project and, in Play Console → Users and permissions, access to
 * every app. Without either, the release half fails with a readable message
 * and the rating half still shows. A failure is one line on that app's card,
 * never a failed page; the result rides in the app's snapshot, so the per-app
 * cache (family-cache.ts) keeps it for the same hour.
 */

import { getServiceAccountToken } from '@/lib/google/service-account-token';
import { decodePlayCsv, getGoogleConfig, splitCsvLine, type GoogleConfig } from '@/lib/store-stats/google';
import { cleanMessage, type AppSnapshot, type FamilyApp, type FamilyAppId, type Part, type PlayPart, type PlayRelease, type PlayReleaseStatus } from './family';

/** Play package per app; Hungerford is iOS and web only. Go Daisy and Grow Daisy match app-identity.ts. */
export const PLAY_PACKAGES: Partial<Record<FamilyAppId, string>> = {
  godaisy: 'io.godaisy.app',
  growdaisy: 'io.growdaisy.app',
  risedaisy: 'com.risedaisy.app',
  findr: 'eu.fishfindr.app',
  flycast: 'com.flycastcoach.app',
  grewp: 'org.grewp.app',
};

const TIMEOUT_MS = 8_000;
const STORAGE_SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
const PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const PUBLISHER_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const DAY_MS = 86_400_000;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

// ─── Ratings ─────────────────────────────────────────────────────────

export interface RatingRow {
  date: string;
  /** The running average over every rating the app has; null when Play writes "NA". */
  total: number | null;
  daily: number | null;
}

/** Parse a Play `ratings_<package>_<YYYYMM>_overview.csv`, by header name so a column moving does not matter. */
export function parseRatingsOverviewCsv(csv: string): RatingRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const dateIdx = header.indexOf('Date');
  const totalIdx = header.indexOf('Total Average Rating');
  const dailyIdx = header.indexOf('Daily Average Rating');
  if (dateIdx === -1 || (totalIdx === -1 && dailyIdx === -1)) return [];

  const rating = (cell: string | undefined) => {
    const n = Number.parseFloat(cell ?? '');
    return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
  };
  const rows: RatingRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = cells[dateIdx]?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({ date, total: totalIdx === -1 ? null : rating(cells[totalIdx]), daily: dailyIdx === -1 ? null : rating(cells[dailyIdx]) });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

/** The latest running average, and the one 30 days before it when the reports go back that far. */
export function readRating(rows: RatingRow[]): NonNullable<PlayPart['rating']> | null {
  const rated = rows.filter((r) => r.total !== null);
  const latest = rated[rated.length - 1];
  if (!latest) return null;
  const cutoff = new Date(Date.parse(`${latest.date}T00:00:00Z`) - 30 * DAY_MS).toISOString().slice(0, 10);
  const before = [...rated].reverse().find((r) => r.date <= cutoff);
  return { average: latest.total!, previous: before?.total ?? null, date: latest.date };
}

/** YYYYMM for this month and the two before it, newest first. */
export function recentMonths(now: Date, count = 3): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

// ─── Release ─────────────────────────────────────────────────────────

const STATUSES: PlayReleaseStatus[] = ['halted', 'inProgress', 'draft', 'completed'];

/**
 * The production track's most pressing release: halted, then rolling out,
 * then draft, then the completed one. An app with a completed release and a
 * draft next to it reports the draft: that is the thing waiting on someone.
 */
export function readProductionRelease(body: unknown): PlayRelease | null {
  const tracks = isObj(body) && Array.isArray(body.tracks) ? body.tracks.filter(isObj) : [];
  const production = tracks.find((t) => t.track === 'production');
  const releases = production && Array.isArray(production.releases) ? production.releases.filter(isObj) : [];
  const read = releases.flatMap((r): PlayRelease[] => {
    const status = STATUSES.find((s) => s === r.status);
    if (!status) return [];
    const fraction = typeof r.userFraction === 'number' && r.userFraction > 0 && r.userFraction < 1 ? r.userFraction : null;
    return [
      {
        status,
        name: str(r.name),
        userFraction: status === 'inProgress' || status === 'halted' ? fraction : null,
        versionCodes: Array.isArray(r.versionCodes) ? r.versionCodes.filter((c): c is string => typeof c === 'string') : [],
      },
    ];
  });
  return read.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status))[0] ?? null;
}

// ─── Fetching ────────────────────────────────────────────────────────

class PlayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Access tokens by scope, per instance: one token serves every app's calls. */
const tokens = new Map<string, { token: string; expires: number }>();

async function token(config: GoogleConfig, scope: string): Promise<string> {
  const hit = tokens.get(`${config.clientEmail}|${scope}`);
  if (hit && hit.expires > Date.now()) return hit.token;
  const fresh = await getServiceAccountToken(config, scope);
  tokens.set(`${config.clientEmail}|${scope}`, { token: fresh, expires: Date.now() + 50 * 60_000 });
  return fresh;
}

async function fetchRating(config: GoogleConfig, packageName: string, now: Date, fetchImpl: typeof fetch): Promise<PlayPart['rating']> {
  const auth = { Authorization: `Bearer ${await token(config, STORAGE_SCOPE)}` };
  const rows = (
    await Promise.all(
      recentMonths(now).map(async (month) => {
        const object = `stats/ratings/ratings_${packageName}_${month}_overview.csv`;
        const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o/${encodeURIComponent(object)}?alt=media`;
        const res = await fetchImpl(url, { headers: auth, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
        // A month Play has not written (or an app with no ratings yet) is simply absent
        if (res.status === 404) return [];
        if (!res.ok) throw new PlayError(`Play ratings report → ${res.status}`, res.status);
        return parseRatingsOverviewCsv(decodePlayCsv(Buffer.from(await res.arrayBuffer())));
      }),
    )
  ).flat();
  return readRating(rows);
}

async function fetchRelease(config: GoogleConfig, packageName: string, fetchImpl: typeof fetch): Promise<PlayRelease | null> {
  const headers = { Authorization: `Bearer ${await token(config, PUBLISHER_SCOPE)}`, 'Content-Type': 'application/json' };
  const base = `${PUBLISHER_API}/${encodeURIComponent(packageName)}`;
  const call = (path: string, init: RequestInit) => fetchImpl(`${base}${path}`, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });

  // The Publisher API reads tracks through an edit; we open one, read, and always delete it. Nothing is committed.
  const opened = await call('/edits', { method: 'POST', body: '{}' });
  if (!opened.ok) throw new PlayError(`Play publisher → ${opened.status} ${(await opened.text()).slice(0, 160)}`, opened.status);
  const editId = str(((await opened.json()) as Obj).id);
  if (!editId) throw new PlayError('Play publisher returned no edit id');
  try {
    const res = await call(`/edits/${encodeURIComponent(editId)}/tracks`, { method: 'GET' });
    if (!res.ok) throw new PlayError(`Play publisher tracks → ${res.status}`, res.status);
    return readProductionRelease(await res.json());
  } finally {
    await call(`/edits/${encodeURIComponent(editId)}`, { method: 'DELETE' }).catch(() => undefined);
  }
}

function describe(err: unknown, packageName: string, half: 'rating' | 'release'): string {
  if (err instanceof PlayError && (err.status === 401 || err.status === 403)) {
    const cause = err.message.replace(/^Play [a-z ]+→ \d+ ?/, '');
    return (
      half === 'rating'
        ? `The reports bucket refused the service account (${err.status}). Check GOOGLE_PLAY_REPORTS_BUCKET and that the account can read it. ${cause}`
        : `Play refused the service account (${err.status}). Enable the Google Play Android Developer API and give it access to the app in Play Console. ${cause}`
    ).trim();
  }
  if (err instanceof PlayError && err.status === 404) return `Play has no app ${packageName} for this account`;
  const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
  return timedOut ? 'Play did not answer in time' : cleanMessage(err);
}

export async function fetchPlayPart(
  app: FamilyApp,
  env: Record<string, string | undefined> = process.env,
  { fetchImpl = fetch, now = new Date() }: { fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<Part<PlayPart> | null> {
  const packageName = PLAY_PACKAGES[app.id];
  if (!packageName) return null;

  let config: GoogleConfig | null;
  try {
    config = getGoogleConfig({ ...env, GOOGLE_PLAY_PACKAGE_NAME: packageName });
  } catch (err) {
    return { state: 'error', message: cleanMessage(err) };
  }
  if (!config) return { state: 'not_configured', missing: ['GOOGLE_PLAY_REPORTS_CREDENTIALS', 'GOOGLE_PLAY_REPORTS_BUCKET'].filter((k) => !env[k]) };

  const [rating, release] = await Promise.allSettled([fetchRating(config, packageName, now, fetchImpl), fetchRelease(config, packageName, fetchImpl)]);
  const notes: string[] = [];
  if (rating.status === 'rejected') notes.push(`Rating: ${describe(rating.reason, packageName, 'rating')}`);
  if (release.status === 'rejected') notes.push(`Release: ${describe(release.reason, packageName, 'release')}`);

  // Both halves failing is a failure; one half is still worth showing, with why the other is missing
  if (rating.status === 'rejected' && release.status === 'rejected') return { state: 'error', message: notes.join(' · ').slice(0, 300) };
  return {
    state: 'ok',
    data: {
      packageName,
      rating: rating.status === 'fulfilled' ? rating.value : null,
      release: release.status === 'fulfilled' ? release.value : null,
      notes,
    },
  };
}

/** The snapshot with its Play part attached, even when the app's own endpoint did not answer: Play is asked separately. */
export async function withPlay(snapshot: AppSnapshot, app: FamilyApp, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<AppSnapshot> {
  const play = await fetchPlayPart(app, env, { fetchImpl });
  return play ? { ...snapshot, play } : snapshot;
}
