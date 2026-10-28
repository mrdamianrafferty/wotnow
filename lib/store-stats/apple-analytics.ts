/**
 * App Store Connect Analytics Reports: product-page views and first-time
 * downloads per day and territory, so listing conversion can be measured.
 * Ported from Rise Daisy (RiseDaisy#875); keep the two in step.
 * https://developer.apple.com/documentation/appstoreconnectapi/downloading-analytics-reports
 *
 * The chain is request → report → instance → segment:
 *   - An ONGOING report request per app. Creating one needs an Admin key;
 *     the Sales and Reports key the cron uses can only list and download.
 *     The 7 team apps' requests were created on 2026-10-28 with a one-off
 *     Admin key (ids below). A request left unread for long enough turns
 *     `stoppedDueToInactivity`, and only an Admin key can replace it, so the
 *     daily cron reading it matters.
 *   - Each request carries a fixed catalogue of reports; two are read here,
 *     both at the Standard (not Detailed) privacy level.
 *   - Each report has dated instances (granularity DAILY, keyed by Apple's
 *     processing date, not the event date). An instance carries rows for
 *     several event dates, and "instances from a more recent processingDate
 *     overwrite" earlier ones for each date they contain: Apple's
 *     data-completeness page says not to merge a date across instances, or
 *     it is double counted. So each event date is taken whole from the
 *     newest instance that has it (`latestPerDate`). Downloads are complete
 *     within two days, discovery within three.
 *   - Each instance has one or more segments: presigned URLs to gzipped TSV.
 *     The URL carries its own signature, so it is fetched without our token.
 *
 * The Standard reports split each count by device, OS version, source and
 * engagement type. Summing `Counts` over those rows is exact. `Unique Counts`
 * summed the same way is an upper bound (one person on two OS versions is
 * two "uniques"), so conversion uses `Counts`.
 */

import { gunzipSync } from 'node:zlib';

export const DISCOVERY_REPORT = 'App Store Discovery and Engagement Standard';
export const DOWNLOADS_REPORT = 'App Downloads Standard';

/**
 * The ONGOING requests created 2026-10-28, by app Apple ID. Used only when
 * listing a request fails (Apple's role table doesn't say whether Sales and
 * Reports may list requests, only that it can't create them) or finds none.
 */
export const KNOWN_REQUEST_IDS: Record<string, string> = {
  '6761378447': '824d35d3-40fa-48fa-a0d1-6647f81eed1a', // Rise Daisy
  '6804752331': 'e335f94d-da45-474a-8694-8d07c025b5d1', // Hungerford Fishery
  '6755045700': '4adde1be-308d-4d93-98da-bb285b674c48', // Findr
  '6755695873': 'c0f6e4ee-1d6e-4277-a5d4-fd3863c7566f', // Go Daisy
  '6785914297': '57bfa511-44cf-4189-99ae-52f714f36d82', // Fly Cast
  '6756231693': 'c0e80c48-df4f-4d61-bbd3-570d29dc11c6', // Grewp
  '6756812661': 'a264e5aa-ec11-4962-b2f5-86c8ada21e01', // Grow Daisy
};

export interface ListingRow {
  stat_date: string; // YYYY-MM-DD
  country: string; // two-letter store region, 'ZZ' when unknown
  impressions: number;
  impressions_unique: number;
  product_page_views: number;
  product_page_views_unique: number;
  /** All first-time downloads, whatever page (or none) they came from */
  first_time_downloads: number;
  /** First-time downloads whose Page Type was "Product page" */
  product_page_downloads: number;
  redownloads: number;
}

function emptyRow(stat_date: string, country: string): ListingRow {
  return {
    stat_date,
    country,
    impressions: 0,
    impressions_unique: 0,
    product_page_views: 0,
    product_page_views_unique: 0,
    first_time_downloads: 0,
    product_page_downloads: 0,
    redownloads: 0,
  };
}

// ── Territory → two-letter code ──
// Apple's docs describe Territory only as "the App Store country or region",
// without an example. Accept a code as-is, and map an English region name
// to its code, so either form lands in the same column.

let regionNames: Map<string, string> | null = null;

/** UK → GB, DD → DE and the like; null when the code isn't a region at all. */
function canonicalRegion(code: string): string | null {
  try {
    return new Intl.Locale(`und-${code}`).region ?? null;
  } catch {
    return null;
  }
}

function regionCodeByName(): Map<string, string> {
  if (regionNames) return regionNames;
  regionNames = new Map();
  const names = new Intl.DisplayNames(['en'], { type: 'region' });
  const A = 'A'.charCodeAt(0);
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = canonicalRegion(String.fromCharCode(A + i, A + j));
      const name = code && names.of(code);
      if (code && code !== 'ZZ' && name && name !== code) regionNames.set(name.toLowerCase(), code);
    }
  }
  return regionNames;
}

export function territoryCode(raw: string | undefined): string {
  const t = (raw ?? '').trim();
  if (/^[A-Za-z]{2}$/.test(t)) return canonicalRegion(t.toUpperCase()) ?? 'ZZ';
  return regionCodeByName().get(t.toLowerCase()) ?? 'ZZ';
}

// ── TSV parsing (pure) ──

interface Tsv {
  col: (_name: string) => number;
  rows: string[][];
}

function readTsv(tsv: string): Tsv | null {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 1) return null;
  const header = lines[0].split('\t').map((h) => h.trim().replace(/^"|"$/g, ''));
  return {
    col: (name) => header.indexOf(name),
    rows: lines.slice(1).map((l) => l.split('\t').map((c) => c.trim().replace(/^"|"$/g, ''))),
  };
}

function int(cell: string | undefined): number {
  const n = parseInt(cell ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type Acc = Map<string, ListingRow>; // `${date}|${country}` → row

function bucket(acc: Acc, date: string, country: string): ListingRow {
  const key = `${date}|${country}`;
  let row = acc.get(key);
  if (!row) {
    row = emptyRow(date, country);
    acc.set(key, row);
  }
  return row;
}

const lower = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/** Discovery and Engagement: impressions, and product-page views. Rows for other apps are ignored. */
export function addDiscoveryTsv(acc: Acc, tsv: string, appleId: string): void {
  const t = readTsv(tsv);
  if (!t) return;
  const [date, app, event, page, territory, counts, unique] = [
    'Date', 'App Apple Identifier', 'Event', 'Page Type', 'Territory', 'Counts', 'Unique Counts',
  ].map(t.col);
  if ([date, event, counts].includes(-1)) throw new Error(`${DISCOVERY_REPORT}: unexpected header`);

  for (const r of t.rows) {
    if (app !== -1 && r[app] !== appleId) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r[date] ?? '')) continue;
    const ev = lower(r[event]);
    const isImpression = ev === 'impression';
    // Page views of the product page itself; in-app event, developer and
    // other pages are left out, since they aren't the listing.
    const isProductPageView = ev === 'page view' && lower(r[page]) === 'product page';
    if (!isImpression && !isProductPageView) continue;

    const row = bucket(acc, r[date], territoryCode(r[territory]));
    if (isImpression) {
      row.impressions += int(r[counts]);
      row.impressions_unique += int(r[unique]);
    } else {
      row.product_page_views += int(r[counts]);
      row.product_page_views_unique += int(r[unique]);
    }
  }
}

/** App Downloads: first-time downloads (all, and from the product page) and redownloads. */
export function addDownloadsTsv(acc: Acc, tsv: string, appleId: string): void {
  const t = readTsv(tsv);
  if (!t) return;
  const [date, app, type, page, territory, counts] = [
    'Date', 'App Apple Identifier', 'Download Type', 'Page Type', 'Territory', 'Counts',
  ].map(t.col);
  if ([date, type, counts].includes(-1)) throw new Error(`${DOWNLOADS_REPORT}: unexpected header`);

  for (const r of t.rows) {
    if (app !== -1 && r[app] !== appleId) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r[date] ?? '')) continue;
    const kind = lower(r[type]);
    // Updates and restores aren't acquisition
    if (kind !== 'first-time download' && kind !== 'redownload') continue;

    const row = bucket(acc, r[date], territoryCode(r[territory]));
    const n = int(r[counts]);
    if (kind === 'redownload') row.redownloads += n;
    else {
      row.first_time_downloads += n;
      if (lower(r[page]) === 'product page') row.product_page_downloads += n;
    }
  }
}

// ── API ──

const API = 'https://api.appstoreconnect.apple.com';

interface JsonApiList<A> {
  data: { id: string; attributes: A }[];
  links?: { next?: string };
}

async function getJson<A>(url: string, token: string): Promise<{ status: number; body: JsonApiList<A> | null; text: string }> {
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  for (let i = 1; i < 3 && (res.status >= 500 || res.status === 429); i++) {
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  }
  const text = await res.text();
  return { status: res.status, body: res.ok ? (JSON.parse(text) as JsonApiList<A>) : null, text: text.slice(0, 200) };
}

/** Every page of a list endpoint. */
async function getAll<A>(url: string, token: string): Promise<JsonApiList<A>['data']> {
  const out: JsonApiList<A>['data'] = [];
  let next: string | undefined = url;
  for (let page = 0; next && page < 50; page++) {
    const r: Awaited<ReturnType<typeof getJson<A>>> = await getJson<A>(next, token);
    if (!r.body) throw new Error(`App Store Connect ${r.status}: ${r.text}`);
    out.push(...r.body.data);
    next = r.body.links?.next;
  }
  return out;
}

/**
 * The app's live ONGOING request id. Listing first, so a request someone
 * re-creates later is picked up; the known id when listing is refused.
 */
export async function findOngoingRequest(appleId: string, token: string): Promise<string> {
  const r = await getJson<{ accessType: string; stoppedDueToInactivity: boolean }>(
    `${API}/v1/apps/${appleId}/analyticsReportRequests?filter[accessType]=ONGOING`,
    token,
  );
  if (r.body) {
    const live = r.body.data.find((d) => !d.attributes.stoppedDueToInactivity);
    if (live) return live.id;
    if (r.body.data.length > 0) {
      throw new Error('Analytics report request stoppedDueToInactivity: create a new ONGOING request (needs an Admin key)');
    }
  }
  const known = KNOWN_REQUEST_IDS[appleId];
  if (!known) throw new Error(`No analytics report request for app ${appleId} (listing: ${r.status})`);
  return known;
}

export async function findReportId(requestId: string, name: string, token: string): Promise<string> {
  const reports = await getAll<{ name: string; category: string }>(
    `${API}/v1/analyticsReportRequests/${requestId}/reports?limit=200`,
    token,
  );
  const report = reports.find((r) => r.attributes.name === name);
  if (!report) throw new Error(`Report "${name}" not in request ${requestId}`);
  return report.id;
}

/** DAILY instances processed on or after `since` (YYYY-MM-DD). */
export async function listDailyInstances(reportId: string, since: string, token: string): Promise<{ id: string; processingDate: string }[]> {
  const instances = await getAll<{ granularity: string; processingDate: string }>(
    `${API}/v1/analyticsReports/${reportId}/instances?filter[granularity]=DAILY&limit=200`,
    token,
  );
  return instances
    .filter((i) => i.attributes.processingDate >= since)
    .map((i) => ({ id: i.id, processingDate: i.attributes.processingDate }));
}

/** Download and gunzip every segment of an instance. */
export async function downloadInstance(instanceId: string, token: string): Promise<string[]> {
  const segments = await getAll<{ url: string }>(`${API}/v1/analyticsReportInstances/${instanceId}/segments`, token);
  return Promise.all(
    segments.map(async (s) => {
      const res = await fetch(s.attributes.url);
      if (!res.ok) throw new Error(`Segment download ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // gzip magic bytes; some segments may already be decompressed in transit
      return (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString('utf-8');
    }),
  );
}

/**
 * Each event date from the newest instance that carries it, never summed
 * across instances. `instances` is one parsed instance per entry; the newest
 * processing date wins.
 */
export function latestPerDate(instances: { processingDate: string; rows: Acc }[]): Acc {
  const byDate = new Map<string, { processingDate: string; rows: ListingRow[] }>();
  for (const inst of instances) {
    const dates = new Map<string, ListingRow[]>();
    for (const row of inst.rows.values()) dates.set(row.stat_date, [...(dates.get(row.stat_date) ?? []), row]);
    for (const [date, rows] of dates) {
      const held = byDate.get(date);
      if (!held || inst.processingDate > held.processingDate) byDate.set(date, { processingDate: inst.processingDate, rows });
    }
  }
  const out: Acc = new Map();
  for (const { rows } of byDate.values()) for (const r of rows) out.set(`${r.stat_date}|${r.country}`, r);
  return out;
}

/** Discovery rows and download rows for the same day and country, added into one row. */
export function mergeReports(discovery: Acc, downloads: Acc): ListingRow[] {
  const out: Acc = new Map();
  for (const source of [discovery, downloads]) {
    for (const r of source.values()) {
      const row = bucket(out, r.stat_date, r.country);
      row.impressions += r.impressions;
      row.impressions_unique += r.impressions_unique;
      row.product_page_views += r.product_page_views;
      row.product_page_views_unique += r.product_page_views_unique;
      row.first_time_downloads += r.first_time_downloads;
      row.product_page_downloads += r.product_page_downloads;
      row.redownloads += r.redownloads;
    }
  }
  return [...out.values()];
}

export interface ListingFetch {
  rows: ListingRow[];
  /** Instances read, per report, for the log */
  instances: { discovery: number; downloads: number };
}

async function readReport(
  reportId: string,
  since: string,
  token: string,
  add: (_acc: Acc, _tsv: string) => void,
): Promise<{ rows: Acc; instances: number }> {
  const instances = await listDailyInstances(reportId, since, token);
  const parsed: { processingDate: string; rows: Acc }[] = [];
  for (const inst of instances) {
    const acc: Acc = new Map();
    for (const tsv of await downloadInstance(inst.id, token)) add(acc, tsv);
    parsed.push({ processingDate: inst.processingDate, rows: acc });
  }
  return { rows: latestPerDate(parsed), instances: instances.length };
}

/**
 * Both reports for one app, from DAILY instances processed on or after
 * `since`. Each returned date is Apple's full current set for that date, so
 * the caller replaces the stored date rather than adding to it. A date one
 * report has reached and the other hasn't yet is written with zeros on the
 * other side; the next run replaces it.
 */
export async function fetchListingForApp(appleId: string, since: string, token: string): Promise<ListingFetch> {
  const requestId = await findOngoingRequest(appleId, token);
  const [discoveryId, downloadsId] = await Promise.all([
    findReportId(requestId, DISCOVERY_REPORT, token),
    findReportId(requestId, DOWNLOADS_REPORT, token),
  ]);
  const [discovery, downloads] = await Promise.all([
    readReport(discoveryId, since, token, (acc, tsv) => addDiscoveryTsv(acc, tsv, appleId)),
    readReport(downloadsId, since, token, (acc, tsv) => addDownloadsTsv(acc, tsv, appleId)),
  ]);
  return {
    rows: mergeReports(discovery.rows, downloads.rows),
    instances: { discovery: discovery.instances, downloads: downloads.instances },
  };
}
