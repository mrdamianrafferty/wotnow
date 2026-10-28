/**
 * @jest-environment node
 */
/**
 * Each app's top unresolved Sentry issue (sentry-top.ts): which project,
 * which query, the shared Rise Daisy project, and failures as one line.
 */

import { FAMILY_APPS, unavailableSnapshot } from '../family';
import { fetchTopIssue, readTopIssue, sharedWith, withSentryTop } from '../sentry-top';

const app = (id: string) => FAMILY_APPS.find((a) => a.id === id)!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('Sentry top issue', () => {
  function fakeSentry(answer: (url: URL) => Response) {
    const calls: URL[] = [];
    const impl = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      calls.push(url);
      return answer(url);
    }) as typeof fetch;
    return { calls, impl };
  }
  const issues = [{ id: '1', shortId: 'FLY-CAST-9', title: 'TypeError: x is undefined', count: '57', permalink: 'https://go-daisy.sentry.io/issues/1/' }];

  it('resolves the slug once, then asks for the unresolved issue with the most events in 7 days', async () => {
    const f = fakeSentry((url) => (url.pathname === '/api/0/projects/go-daisy/fly-cast/' ? json({ id: '4501', slug: 'fly-cast' }) : json(issues)));
    const part = await fetchTopIssue(app('flycast'), { SENTRY_ADMIN_TOKEN: 't' }, f.impl);
    expect(part).toEqual({
      state: 'ok',
      data: { title: 'TypeError: x is undefined', shortId: 'FLY-CAST-9', count: 57, permalink: 'https://go-daisy.sentry.io/issues/1/', project: 'fly-cast', sharedWith: null },
    });
    const q = f.calls[1].searchParams;
    expect(f.calls[1].pathname).toBe('/api/0/organizations/go-daisy/issues/');
    expect([q.get('project'), q.get('query'), q.get('statsPeriod'), q.get('sort'), q.get('limit')]).toEqual(['4501', 'is:unresolved', '7d', 'freq', '1']);

    await fetchTopIssue(app('flycast'), { SENTRY_ADMIN_TOKEN: 't' }, f.impl);
    expect(f.calls.filter((u) => u.pathname.startsWith('/api/0/projects/'))).toHaveLength(1);
  });

  it('says Hungerford’s top issue is Rise Daisy’s project', async () => {
    expect(sharedWith('hungerford')).toBe('Rise Daisy');
    expect(sharedWith('risedaisy')).toBeNull();
    const f = fakeSentry((url) => (url.pathname.startsWith('/api/0/projects/') ? json({ id: '77' }) : json(issues)));
    expect(await fetchTopIssue(app('hungerford'), { SENTRY_ADMIN_TOKEN: 't' }, f.impl)).toMatchObject({ state: 'ok', data: { project: 'rise-daisy', sharedWith: 'Rise Daisy' } });
  });

  it('needs no call for an app without a project or without a token', async () => {
    const f = fakeSentry(() => json([]));
    expect(await fetchTopIssue(app('growdaisy'), { SENTRY_ADMIN_TOKEN: 't' }, f.impl)).toMatchObject({ state: 'not_configured', note: 'Grow Daisy has no Sentry project' });
    expect(await fetchTopIssue(app('grewp'), {}, f.impl)).toEqual({ state: 'not_configured', missing: ['SENTRY_ADMIN_TOKEN'] });
    expect(f.calls).toHaveLength(0);
  });

  it('turns a refusal into "not configured" naming the token, and an empty list into a note', async () => {
    const refused = fakeSentry(() => json({ detail: 'nope' }, 403));
    expect(await fetchTopIssue(app('findr'), { SENTRY_ADMIN_TOKEN: 'secret' }, refused.impl)).toMatchObject({ state: 'not_configured', missing: ['SENTRY_ADMIN_TOKEN'] });
    const empty = fakeSentry((url) => (url.pathname.startsWith('/api/0/projects/') ? json({ id: '88' }) : json([])));
    expect(await fetchTopIssue(app('grewp'), { SENTRY_ADMIN_TOKEN: 't' }, empty.impl)).toEqual({ state: 'not_configured', missing: [], note: 'No unresolved issues in 7 days' });
  });

  it('accepts only an https permalink', () => {
    expect(readTopIssue([{ title: 'x', permalink: 'javascript:alert(1)' }], 'p', null)).toBeNull();
    expect(readTopIssue('nope', 'p', null)).toBeNull();
  });

  it('adds nothing to an app the dashboard could not reach', async () => {
    const f = fakeSentry(() => json(issues));
    const s = unavailableSnapshot(app('findr'), 'unavailable', 'HTTP 500');
    expect(await withSentryTop(s, app('findr'), { SENTRY_ADMIN_TOKEN: 't' }, f.impl)).toBe(s);
    expect(f.calls).toHaveLength(0);
  });
});

