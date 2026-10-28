/**
 * @jest-environment node
 */
/**
 * Google Play on /admin/apps: the ratings CSV, the production release, the
 * fetch (one half failing, an edit always deleted) and the Needs-attention
 * rules built on them.
 */

jest.mock('@/lib/google/service-account-token', () => ({
  ...jest.requireActual('@/lib/google/service-account-token'),
  getServiceAccountToken: jest.fn(async () => 'test-token'),
}));

import { appAttention, deriveAttention } from '../attention';
import { FAMILY_APPS, type AppSnapshot, type FamilyAppId, type Part, type PlayPart } from '../family';
import { sampleFamilySummary } from '../family-sample';
import { fetchPlayPart, parseRatingsOverviewCsv, PLAY_PACKAGES, readProductionRelease, readRating, recentMonths } from '../play-console';

const now = new Date('2026-10-28T10:00:00Z');
const app = (id: FamilyAppId) => FAMILY_APPS.find((a) => a.id === id)!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const credentials = Buffer.from(JSON.stringify({ client_email: 'reports@example.iam.gserviceaccount.com', private_key: 'not-a-real-key' })).toString('base64');
const env = { GOOGLE_PLAY_REPORTS_CREDENTIALS: credentials, GOOGLE_PLAY_REPORTS_BUCKET: 'gs://pubsite_prod_rev_123' };

const CSV = [
  'Date,Package Name,Daily Average Rating,Total Average Rating',
  '2026-09-27,org.grewp.app,NA,4.5',
  '2026-10-20,org.grewp.app,5.0,4.7',
  '2026-10-27,org.grewp.app,NA,4.8',
].join('\n');

describe('ratings CSV', () => {
  it('reads rows by header name, skipping NA and malformed dates', () => {
    const rows = parseRatingsOverviewCsv(`${CSV}\nnot-a-date,x,1,1`);
    expect(rows.map((r) => [r.date, r.total, r.daily])).toEqual([
      ['2026-09-27', 4.5, null],
      ['2026-10-20', 4.7, 5],
      ['2026-10-27', 4.8, null],
    ]);
  });

  it('returns nothing when the columns it needs are missing', () => {
    expect(parseRatingsOverviewCsv('Date,Something\n2026-10-27,1')).toEqual([]);
    expect(parseRatingsOverviewCsv('')).toEqual([]);
  });

  it('takes the latest running average and the one 30 days before it', () => {
    expect(readRating(parseRatingsOverviewCsv(CSV))).toEqual({ average: 4.8, previous: 4.5, date: '2026-10-27' });
  });

  it('has no previous when the reports do not go back 30 days, and no rating when none is numeric', () => {
    expect(readRating(parseRatingsOverviewCsv(CSV.split('\n').slice(0, 1).concat(CSV.split('\n').slice(2)).join('\n')))?.previous).toBeNull();
    expect(readRating(parseRatingsOverviewCsv('Date,Total Average Rating\n2026-10-27,NA'))).toBeNull();
  });

  it('asks for this month and the two before it, across a year end', () => {
    expect(recentMonths(new Date('2026-01-15T00:00:00Z'))).toEqual(['202601', '202512', '202511']);
  });
});

describe('production release', () => {
  const tracks = (releases: unknown[], track = 'production') => ({ tracks: [{ track: 'internal', releases: [{ status: 'draft', name: 'x' }] }, { track, releases }] });

  it('reads only the production track', () => {
    expect(readProductionRelease(tracks([{ status: 'completed', name: '1.8.3', versionCodes: ['12'] }]))).toMatchObject({ status: 'completed', name: '1.8.3' });
    expect(readProductionRelease(tracks([], 'beta'))).toBeNull();
  });

  it('reports what is waiting on someone before what is live', () => {
    const r = readProductionRelease(
      tracks([
        { status: 'completed', name: '1.8.2' },
        { status: 'inProgress', name: '1.8.3', userFraction: 0.2 },
      ]),
    );
    expect(r).toMatchObject({ status: 'inProgress', name: '1.8.3', userFraction: 0.2 });
    expect(readProductionRelease(tracks([{ status: 'draft', name: 'd' }, { status: 'halted', name: 'h', userFraction: 0.5 }, { status: 'completed' }]))?.status).toBe('halted');
  });

  it('ignores a fraction that is not a staged rollout and statuses it does not know', () => {
    expect(readProductionRelease(tracks([{ status: 'completed', userFraction: 0.5 }]))?.userFraction).toBeNull();
    expect(readProductionRelease(tracks([{ status: 'statusUnspecified' }]))).toBeNull();
    expect(readProductionRelease('nope')).toBeNull();
  });
});

/** A fake Play: the reports bucket and the Publisher API, recording every call. */
function fakePlay({ ratings = CSV, publisher = 200 }: { ratings?: string | null; publisher?: number } = {}) {
  const calls: { method: string; url: string }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url });
    if (url.startsWith('https://storage.googleapis.com/')) {
      // Only the newest month has a file
      return ratings !== null && url.includes('_202610_overview') ? new Response(ratings) : new Response('', { status: 404 });
    }
    if (publisher !== 200) return new Response('{"error":{"message":"API has not been used"}}', { status: publisher });
    if (method === 'POST' && url.endsWith('/edits')) return json({ id: 'edit-1' });
    if (method === 'GET' && url.endsWith('/edits/edit-1/tracks')) return json({ tracks: [{ track: 'production', releases: [{ status: 'completed', name: '0.9.1', versionCodes: ['9'] }] }] });
    if (method === 'DELETE') return new Response('', { status: 204 });
    return new Response('', { status: 500 });
  }) as typeof fetch;
  return { calls, impl };
}

describe('fetchPlayPart', () => {
  it('has no part for an app that is not on Play', async () => {
    expect(PLAY_PACKAGES.hungerford).toBeUndefined();
    expect(await fetchPlayPart(app('hungerford'), env, { now })).toBeNull();
  });

  it('is not configured, naming what is missing, without credentials', async () => {
    expect(await fetchPlayPart(app('grewp'), {}, { now })).toEqual({
      state: 'not_configured',
      missing: ['GOOGLE_PLAY_REPORTS_CREDENTIALS', 'GOOGLE_PLAY_REPORTS_BUCKET'],
    });
  });

  it('reads the rating and the release for the app’s own package, and deletes the edit it opened', async () => {
    const play = fakePlay();
    const part = await fetchPlayPart(app('grewp'), env, { fetchImpl: play.impl, now });
    expect(part).toEqual({
      state: 'ok',
      data: {
        packageName: 'org.grewp.app',
        rating: { average: 4.8, previous: 4.5, date: '2026-10-27' },
        release: { status: 'completed', name: '0.9.1', userFraction: null, versionCodes: ['9'] },
        notes: [],
      },
    });
    const storage = play.calls.filter((c) => c.url.startsWith('https://storage.googleapis.com/'));
    expect(storage).toHaveLength(3);
    expect(storage.every((c) => decodeURIComponent(c.url).includes('stats/ratings/ratings_org.grewp.app_'))).toBe(true);
    expect(storage.every((c) => c.url.includes('pubsite_prod_rev_123') && !c.url.includes('gs%3A'))).toBe(true);
    expect(play.calls.map((c) => c.method)).toEqual(expect.arrayContaining(['POST', 'DELETE']));
    expect(play.calls.at(-1)).toMatchObject({ method: 'DELETE', url: expect.stringContaining('/edits/edit-1') });
  });

  it('still shows the rating when the Publisher API refuses, and says why the release is missing', async () => {
    const part = await fetchPlayPart(app('grewp'), env, { fetchImpl: fakePlay({ publisher: 403 }).impl, now });
    expect(part).toMatchObject({ state: 'ok', data: { release: null, rating: { average: 4.8 } } });
    const notes = (part as Extract<Part<PlayPart>, { state: 'ok' }>).data.notes;
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/^Release: Play refused the service account \(403\)/);
  });

  it('treats an app with no ratings report as no rating, not an error', async () => {
    const part = await fetchPlayPart(app('grewp'), env, { fetchImpl: fakePlay({ ratings: null }).impl, now });
    expect(part).toMatchObject({ state: 'ok', data: { rating: null, release: { status: 'completed' } } });
  });

  it('is an error only when both halves fail', async () => {
    const impl = (async () => new Response('', { status: 500 })) as typeof fetch;
    const part = await fetchPlayPart(app('grewp'), env, { fetchImpl: impl, now });
    expect(part).toMatchObject({ state: 'error' });
    expect((part as { message: string }).message).toMatch(/Rating:.*Release:/);
  });

  it('reports unreadable credentials as an error rather than throwing', async () => {
    expect(await fetchPlayPart(app('grewp'), { ...env, GOOGLE_PLAY_REPORTS_CREDENTIALS: 'not-base64-json' }, { now })).toMatchObject({ state: 'error' });
  });
});

describe('Needs attention', () => {
  const ok = (rating: PlayPart['rating'], release: PlayPart['release']): Part<PlayPart> => ({ state: 'ok', data: { packageName: 'p', rating, release, notes: [] } });
  const rel = (status: 'draft' | 'inProgress' | 'halted' | 'completed', userFraction: number | null = null) => ({ status, name: '1.2.3', userFraction, versionCodes: ['1'] });
  const rate = (average: number, previous: number | null = average) => ({ average, previous, date: '2026-10-27' });

  /** The sample family with one app's Play part replaced, all others removed. */
  function items(id: FamilyAppId, play: Part<PlayPart> | undefined, others: Partial<Record<FamilyAppId, Part<PlayPart>>> = {}) {
    const base = sampleFamilySummary(now);
    const apps = base.apps.map((a): AppSnapshot => ({ ...a, ...(a.id === id && play ? { play } : others[a.id] ? { play: others[a.id] } : {}) }));
    return deriveAttention({ ...base, apps }).filter((i) => i.rule.startsWith('play_') || i.rule === 'rating_low');
  }

  it('says nothing for a healthy, live app', () => {
    expect(items('grewp', ok(rate(4.8), rel('completed')))).toEqual([]);
  });

  it('flags a halted rollout as danger, and puts it on the app’s card pill', () => {
    const [item] = items('grewp', ok(rate(4.8), rel('halted', 0.5)));
    expect(item).toMatchObject({ level: 'danger', rule: 'play_release_halted', apps: ['grewp'], short: 'Rollout halted' });
    expect(item.body).toContain('at 50%');
    const base = sampleFamilySummary(now);
    const apps = base.apps.map((a) => (a.id === 'grewp' ? { ...a, play: ok(rate(4.8), rel('halted', 0.5)) } : a));
    expect(appAttention(deriveAttention({ ...base, apps }), 'grewp')?.rule).toBe('play_release_halted');
  });

  it('flags a draft and a staged rollout as waiting', () => {
    expect(items('flycast', ok(null, rel('draft')))[0]).toMatchObject({ level: 'waiting', rule: 'play_release_draft' });
    expect(items('flycast', ok(null, rel('inProgress', 0.2)))[0]).toMatchObject({ level: 'waiting', rule: 'play_rollout', short: 'Rollout 20%' });
  });

  it('flags a rating under 4 or down 0.3 in 30 days, and nothing in between', () => {
    expect(items('findr', ok(rate(3.6, 3.6), rel('completed')))[0]).toMatchObject({ level: 'check', rule: 'rating_low', title: 'Play rating is 3.6' });
    expect(items('findr', ok(rate(4.4, 4.8), rel('completed')))[0]).toMatchObject({ rule: 'rating_low', title: 'Play rating down to 4.4' });
    expect(items('findr', ok(rate(4.5, 4.7), rel('completed')))).toEqual([]);
    expect(items('findr', ok(rate(4.0, null), rel('completed')))).toEqual([]);
  });

  it('flags a Play failure once for every app it hit, with the cause', () => {
    const broken: Part<PlayPart> = { state: 'error', message: 'Release: Play refused the service account (403).' };
    const found = items('grewp', broken, { findr: broken, risedaisy: broken }).filter((i) => i.rule === 'play_unreadable');
    expect(found).toHaveLength(1);
    expect(found[0].apps.sort()).toEqual(['findr', 'grewp', 'risedaisy']);
    expect(found[0].body).toContain('403');
  });

  it('says nothing about an app with no Play part, or Play not connected', () => {
    expect(items('grewp', undefined)).toEqual([]);
    expect(items('grewp', { state: 'not_configured', missing: ['GOOGLE_PLAY_REPORTS_BUCKET'] })).toEqual([]);
  });

  it('every sample rule fires on the sample family', () => {
    const rules = deriveAttention(sampleFamilySummary(now, { withPlay: true })).map((i) => i.rule);
    expect(rules).toEqual(expect.arrayContaining(['play_release_halted', 'play_release_draft', 'play_rollout', 'rating_low']));
  });
});
