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
import { fetchPlayPart, parseRatingsOverviewCsv, PLAY_PACKAGES, readProductionRelease, readRating, readReviews, recentMonths } from '../play-console';

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
function fakePlay({ ratings = CSV, publisher = 200, reviews = {} as unknown, reviewsStatus = 200 }: { ratings?: string | null; publisher?: number; reviews?: unknown; reviewsStatus?: number } = {}) {
  const calls: { method: string; url: string }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url });
    if (url.startsWith('https://storage.googleapis.com/')) {
      // Only the newest month has a file
      return ratings !== null && url.includes('_202610_overview') ? new Response(ratings) : new Response('', { status: 404 });
    }
    if (method === 'GET' && url.includes('/reviews?')) return reviewsStatus === 200 ? json(reviews) : new Response('{}', { status: reviewsStatus });
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
        reviews: { count: 0, average: null, lowUnanswered: 0, recent: [] },
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

  it('is an error only when every half fails', async () => {
    const impl = (async () => new Response('', { status: 500 })) as typeof fetch;
    const part = await fetchPlayPart(app('grewp'), env, { fetchImpl: impl, now });
    expect(part).toMatchObject({ state: 'error' });
    expect((part as { message: string }).message).toMatch(/Rating:.*Release:.*Reviews:/);
  });

  it('keeps the rating and release when only the reviews call is refused, and says why', async () => {
    const part = await fetchPlayPart(app('grewp'), env, { fetchImpl: fakePlay({ reviewsStatus: 403 }).impl, now });
    expect(part).toMatchObject({ state: 'ok', data: { reviews: null, rating: { average: 4.8 }, release: { status: 'completed' } } });
    expect((part as Extract<Part<PlayPart>, { state: 'ok' }>).data.notes[0]).toMatch(/^Reviews: Play refused the reviews call \(403\)/);
  });

  it('reads the week’s reviews through the same call, without writing anything', async () => {
    const play = fakePlay({ reviews: REVIEWS });
    const part = await fetchPlayPart(app('findr'), env, { fetchImpl: play.impl, now });
    expect(part).toMatchObject({ state: 'ok', data: { reviews: { count: 3, lowUnanswered: 1 } } });
    const reviewCalls = play.calls.filter((c) => c.url.includes('/reviews'));
    expect(reviewCalls).toEqual([{ method: 'GET', url: expect.stringContaining('/applications/eu.fishfindr.app/reviews?maxResults=100') }]);
  });

  it('reports unreadable credentials as an error rather than throwing', async () => {
    expect(await fetchPlayPart(app('grewp'), { ...env, GOOGLE_PLAY_REPORTS_CREDENTIALS: 'not-base64-json' }, { now })).toMatchObject({ state: 'error' });
  });
});

/** Android Publisher reviews.list, in the shape Google documents. */
const review = (id: string, stars: number, text: string | undefined, replied = false) => ({
  reviewId: id,
  authorName: 'A Reviewer',
  comments: [
    { userComment: { text, starRating: stars, lastModified: { seconds: String(Date.parse('2026-10-26T12:00:00Z') / 1000 + stars) }, appVersionName: '1.0.9' } },
    ...(replied ? [{ developerComment: { text: 'Thanks', lastModified: { seconds: '1793000000' } } }] : []),
  ],
});
const REVIEWS = { reviews: [review('a', 1, 'Crashes on launch.'), review('b', 2, 'Needs maps.', true), review('c', 5, undefined)] };

describe('reviews', () => {
  it('summarises the week: count, average, and the low ones nobody has answered', () => {
    expect(readReviews(REVIEWS)).toMatchObject({ count: 3, average: 2.7, lowUnanswered: 1 });
  });

  it('puts what needs a reply first, then fewest stars, and keeps three', () => {
    const r = readReviews({ reviews: [review('a', 5, 'Lovely'), review('b', 2, 'Meh', true), review('c', 1, 'Broken'), review('d', 2, 'Slow'), review('e', 4, 'Good')] });
    expect(r.recent.map((x) => x.text)).toEqual(['Broken', 'Slow', 'Meh']);
    expect(r.recent[0]).toMatchObject({ stars: 1, version: '1.0.9', replied: false });
  });

  it('never carries the author, flattens and shortens the text, and keeps a star-only review', () => {
    const r = readReviews({ reviews: [review('a', 1, `Line one\n\nline   two ${'x'.repeat(400)}`), review('b', 3, undefined)] });
    expect(JSON.stringify(r)).not.toContain('Reviewer');
    expect(r.recent[0].text).toMatch(/^Line one line two x+…$/);
    expect(r.recent[0].text!.length).toBe(280);
    expect(r.recent.find((x) => x.stars === 3)?.text).toBeNull();
  });

  it('reads a week with no reviews (Play sends {}) and unreadable bodies as none', () => {
    const none = { count: 0, average: null, lowUnanswered: 0, recent: [] };
    expect(readReviews({})).toEqual(none);
    expect(readReviews('nope')).toEqual(none);
    expect(readReviews({ reviews: [{ comments: [{ userComment: { starRating: 9 } }] }, { comments: [] }, 'x'] })).toEqual(none);
  });
});

describe('Needs attention', () => {
  const ok = (rating: PlayPart['rating'], release: PlayPart['release'], reviews: PlayPart['reviews'] = null): Part<PlayPart> => ({ state: 'ok', data: { packageName: 'p', rating, release, reviews, notes: [] } });
  const rel = (status: 'draft' | 'inProgress' | 'halted' | 'completed', userFraction: number | null = null) => ({ status, name: '1.2.3', userFraction, versionCodes: ['1'] });
  const rate = (average: number, previous: number | null = average) => ({ average, previous, date: '2026-10-27' });

  /** The sample family with one app's Play part replaced, all others removed. */
  function items(id: FamilyAppId, play: Part<PlayPart> | undefined, others: Partial<Record<FamilyAppId, Part<PlayPart>>> = {}) {
    const base = sampleFamilySummary(now);
    const apps = base.apps.map((a): AppSnapshot => ({ ...a, ...(a.id === id && play ? { play } : others[a.id] ? { play: others[a.id] } : {}) }));
    return deriveAttention({ ...base, apps }).filter((i) => i.rule.startsWith('play_') || i.rule === 'rating_low' || i.rule === 'review_low');
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

  it('flags an unanswered 1–2 star review with its words, and ignores answered and good ones', () => {
    const [item] = items('findr', ok(rate(4.5), rel('completed'), readReviews(REVIEWS)));
    expect(item).toMatchObject({ level: 'check', rule: 'review_low', apps: ['findr'], short: 'Low review', title: 'A low Play review needs a reply' });
    expect(item.body).toContain('1★ on 1.0.9: “Crashes on launch.”');
    expect(items('findr', ok(rate(4.5), rel('completed'), readReviews({ reviews: [REVIEWS.reviews[1], REVIEWS.reviews[2]] })))).toEqual([]);
    expect(items('findr', ok(rate(4.5), rel('completed'), null))).toEqual([]);
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
