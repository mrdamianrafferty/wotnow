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
import { parseInstallsOverviewCsv, parseStorePerformanceCsv, summariseInstalls, summariseListing, type InstallRow, type ListingRow } from './play-reports';
import { cleanMessage, withPlayDownloads, type AppSnapshot, type FamilyApp, type FamilyAppId, type Part, type PlayInstalls, type PlayListing, type PlayPart, type PlayRelease, type PlayReleaseStatus, type PlayReview, type PlayReviews } from './family';

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

// ─── Reviews ─────────────────────────────────────────────────────────

/** A review is low when it gives one or two stars. */
export const LOW_STARS = 2;
const REVIEW_TEXT_MAX = 280;

/**
 * Android Publisher reviews.list → the week's reviews. Play returns only the
 * last week, newest edit of each, each with the user's comment and any
 * developer reply. The author's name is never read: the dashboard has no use for it.
 */
export function readReviews(body: unknown): PlayReviews {
  const raw = isObj(body) && Array.isArray(body.reviews) ? body.reviews.filter(isObj) : [];
  const reviews = raw.flatMap((r): PlayReview[] => {
    const comments = Array.isArray(r.comments) ? r.comments.filter(isObj) : [];
    const user = comments.map((c) => c.userComment).find(isObj);
    const stars = user && typeof user.starRating === 'number' ? Math.round(user.starRating) : 0;
    if (!user || stars < 1 || stars > 5) return [];
    const seconds = isObj(user.lastModified) ? Number(user.lastModified.seconds) : NaN;
    const text = str(user.text)?.replace(/\s+/g, ' ').trim();
    return [
      {
        stars,
        text: text ? (text.length > REVIEW_TEXT_MAX ? `${text.slice(0, REVIEW_TEXT_MAX - 1)}…` : text) : null,
        version: str(user.appVersionName),
        date: Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : '',
        replied: comments.some((c) => isObj(c.developerComment)),
      },
    ];
  });
  const low = (r: PlayReview) => r.stars <= LOW_STARS && !r.replied;
  const recent = [...reviews]
    .sort((a, b) => Number(b.stars <= LOW_STARS && !b.replied) - Number(a.stars <= LOW_STARS && !a.replied) || a.stars - b.stars || b.date.localeCompare(a.date))
    .slice(0, 3);
  return {
    count: reviews.length,
    average: reviews.length ? Math.round((reviews.reduce((t, r) => t + r.stars, 0) / reviews.length) * 10) / 10 : null,
    lowUnanswered: reviews.filter(low).length,
    recent,
  };
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

/** One report object from the reports bucket: its text, or null when Play has not written it. */
async function fetchReport(config: GoogleConfig, object: string, auth: HeadersInit, fetchImpl: typeof fetch): Promise<string | null> {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o/${encodeURIComponent(object)}?alt=media`;
  const res = await fetchImpl(url, { headers: auth, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new PlayError(`Play report → ${res.status}`, res.status);
  return decodePlayCsv(Buffer.from(await res.arrayBuffer()));
}

/** This month's and last month's report, each parsed; a month Play has not written is simply absent. */
async function fetchMonths<T>(config: GoogleConfig, kind: string, packageName: string, file: string, now: Date, fetchImpl: typeof fetch, parse: (csv: string) => T[]): Promise<T[]> {
  const auth = { Authorization: `Bearer ${await token(config, STORAGE_SCOPE)}` };
  const texts = await Promise.all(recentMonths(now, 2).map((month) => fetchReport(config, `stats/${kind}/${kind}_${packageName}_${month}_${file}.csv`, auth, fetchImpl)));
  return texts.flatMap((t) => (t === null ? [] : parse(t)));
}

/**
 * Installs over every month Play has a report for. The bucket holds one
 * installs file a month from the app's first day, so list them and add them
 * up. Null when they cannot be listed or read: the all-time figure is an
 * extra, and a bucket that refuses to list must not take the week's numbers
 * down with it.
 */
async function fetchInstallsAllTime(config: GoogleConfig, packageName: string, fetchImpl: typeof fetch): Promise<PlayInstalls['downloadsAllTime'] | null> {
  try {
    const auth = { Authorization: `Bearer ${await token(config, STORAGE_SCOPE)}` };
    const prefix = `stats/installs/installs_${packageName}_`;
    const names: string[] = [];
    let page = '';
    do {
      const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(config.bucket)}/o?prefix=${encodeURIComponent(prefix)}&fields=items(name),nextPageToken${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`;
      const res = await fetchImpl(url, { headers: auth, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
      if (!res.ok) return null;
      const body = (await res.json()) as { items?: { name?: string }[]; nextPageToken?: string };
      for (const item of body.items ?? []) if (item.name && /_\d{6}_overview\.csv$/.test(item.name)) names.push(item.name);
      page = body.nextPageToken ?? '';
    } while (page);

    const texts = await Promise.all(names.map((name) => fetchReport(config, name, auth, fetchImpl)));
    const rows = texts.flatMap((t) => (t === null ? [] : parseInstallsOverviewCsv(t)));
    if (rows.length === 0) return null;
    return { total: rows.reduce((a, r) => a + r.installs, 0), since: rows.reduce((first, r) => (r.date < first ? r.date : first), rows[0].date) };
  } catch {
    return null;
  }
}

async function fetchInstalls(config: GoogleConfig, packageName: string, now: Date, fetchImpl: typeof fetch): Promise<PlayInstalls | null> {
  const [installs, allTime] = await Promise.all([
    fetchMonths<InstallRow>(config, 'installs', packageName, 'overview', now, fetchImpl, parseInstallsOverviewCsv).then((rows) => summariseInstalls(rows, now)),
    fetchInstallsAllTime(config, packageName, fetchImpl),
  ]);
  return installs && allTime ? { ...installs, downloadsAllTime: allTime } : installs;
}

async function fetchListing(config: GoogleConfig, packageName: string, now: Date, fetchImpl: typeof fetch): Promise<PlayListing | null> {
  return summariseListing(await fetchMonths<ListingRow>(config, 'store_performance', packageName, 'country', now, fetchImpl, parseStorePerformanceCsv), now);
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

async function fetchReviews(config: GoogleConfig, packageName: string, fetchImpl: typeof fetch): Promise<PlayReviews> {
  const headers = { Authorization: `Bearer ${await token(config, PUBLISHER_SCOPE)}` };
  const res = await fetchImpl(`${PUBLISHER_API}/${encodeURIComponent(packageName)}/reviews?maxResults=100`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  if (!res.ok) throw new PlayError(`Play reviews → ${res.status} ${(await res.text()).slice(0, 160)}`, res.status);
  // A week with no reviews is an empty object, not an error
  return readReviews(await res.json());
}

function describe(err: unknown, packageName: string, half: 'reports' | 'release' | 'reviews'): string {
  if (err instanceof PlayError && (err.status === 401 || err.status === 403)) {
    const cause = err.message.replace(/^Play [a-z ]+→ \d+ ?/, '');
    return (
      half === 'reports'
        ? `The reports bucket refused the service account (${err.status}). Check GOOGLE_PLAY_REPORTS_BUCKET and that the account can read it. ${cause}`
        : half === 'reviews'
          ? `Play refused the reviews call (${err.status}). Give the service account access to ratings and reviews in Play Console. ${cause}`
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

  const [rating, installs, listing, release, reviews] = await Promise.allSettled([
    fetchRating(config, packageName, now, fetchImpl),
    fetchInstalls(config, packageName, now, fetchImpl),
    fetchListing(config, packageName, now, fetchImpl),
    fetchRelease(config, packageName, fetchImpl),
    fetchReviews(config, packageName, fetchImpl),
  ]);
  // Three reads share the reports bucket, so they share a cause: say it once
  const reports = [rating, installs, listing].find((r): r is PromiseRejectedResult => r.status === 'rejected');
  const notes: string[] = [];
  if (reports) notes.push(`Reports: ${describe(reports.reason, packageName, 'reports')}`);
  if (release.status === 'rejected') notes.push(`Release: ${describe(release.reason, packageName, 'release')}`);
  if (reviews.status === 'rejected') notes.push(`Reviews: ${describe(reviews.reason, packageName, 'reviews')}`);

  // Every read failing is a failure; any one is still worth showing, with why the others are missing
  if (reports && rating.status === 'rejected' && installs.status === 'rejected' && listing.status === 'rejected' && release.status === 'rejected' && reviews.status === 'rejected') {
    return { state: 'error', message: notes.join(' · ').slice(0, 300) };
  }
  const value = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);
  return {
    state: 'ok',
    data: {
      packageName,
      rating: value(rating),
      release: value(release),
      reviews: value(reviews),
      installs: value(installs),
      listing: value(listing),
      notes,
    },
  };
}

/** The snapshot with its Play part attached, even when the app's own endpoint did not answer: Play is asked separately. */
export async function withPlay(snapshot: AppSnapshot, app: FamilyApp, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<AppSnapshot> {
  const play = await fetchPlayPart(app, env, { fetchImpl });
  if (!play) return snapshot;
  const withPart = { ...snapshot, play };
  return play.state === 'ok' && play.data.installs ? withPlayDownloads(withPart, play.data.installs) : withPart;
}
