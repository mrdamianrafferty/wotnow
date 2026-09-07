/**
 * The sitemap must contain the site.
 *
 * This is the test that was missing when it mattered. `activitiesWithHubs`
 * moved from `pages/[activity]/index` to `lib/seo/hubs`, a `require()` inside a
 * try/catch was not updated with it, and the endpoint answered 200 with nine
 * static URLs — having silently dropped 4,460. Everything passed: tsc, eslint,
 * 1,470 tests, four CI checks and a production deploy. Google read it and
 * recorded "Discovered pages: 9".
 *
 * Nothing here mocks the data layer. The whole failure was that the real
 * modules stopped being reachable while every test that stubbed them kept
 * passing, so these assert against the actual dataset and the actual handler.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../pages/api/sitemap.xml';
import { getAllSeoPagePaths } from '../data/seoLocations';
import { activitiesWithHubs } from '../lib/seo/hubs';

/** A response double that records what the handler sent. */
function makeRes() {
  const state = { status: 200, body: '', headers: {} as Record<string, string> };
  const res = {
    setHeader: (k: string, v: string) => {
      state.headers[k] = v;
    },
    status(code: number) {
      state.status = code;
      return this;
    },
    send(body: string) {
      state.body = body;
      return this;
    },
    json(body: unknown) {
      state.body = JSON.stringify(body);
      return this;
    },
    end(body?: string) {
      if (body) state.body = body;
      return this;
    },
    redirect() {
      return this;
    },
  } as unknown as NextApiResponse;
  return { res, state };
}

const req = (host = 'godaisy.io') =>
  ({ method: 'GET', headers: { host }, query: {} }) as unknown as NextApiRequest;

describe('the Go Daisy sitemap carries the estate', () => {
  it('lists every spot page and every hub', async () => {
    const { res, state } = makeRes();
    await handler(req(), res);

    expect(state.status).toBe(200);
    const count = (state.body.match(/<loc>/g) ?? []).length;

    /*
     * Nine static pages, plus a hub per qualifying activity, plus a leaf per
     * (activity, location). Computed from the same data the handler reads, so
     * this stays true as the dataset changes and false the moment a whole half
     * of it goes missing.
     */
    const expected = 9 + activitiesWithHubs().length + getAllSeoPagePaths().length;
    expect(count).toBe(expected);

    // And the shape, not just the arithmetic: a document of the right size made
    // of the wrong URLs would pass a count alone.
    expect(state.body).toContain('<loc>https://godaisy.io/surfing</loc>');
    expect(state.body).toContain('<loc>https://godaisy.io/activities</loc>');
    expect(state.body).toContain('<loc>https://godaisy.io/surfing/newquay-cornwall</loc>');
  });

  it('is thousands of URLs, not the nine static ones', async () => {
    const { res, state } = makeRes();
    await handler(req(), res);
    const count = (state.body.match(/<loc>/g) ?? []).length;

    // The literal failure, pinned. It answered 200 with exactly nine.
    expect(count).toBeGreaterThan(1000);
  });

  it('puts the hubs above the leaves in priority', async () => {
    const { res, state } = makeRes();
    await handler(req(), res);

    const hub = state.body.indexOf('<loc>https://godaisy.io/surfing</loc>');
    const leaf = state.body.indexOf('<loc>https://godaisy.io/surfing/newquay-cornwall</loc>');
    // `/surfing` is the head term and `/surfing/newquay-cornwall` the long tail;
    // the hubs are emitted first and at 0.8 against the leaves' 0.7.
    expect(hub).toBeGreaterThan(-1);
    expect(leaf).toBeGreaterThan(-1);
    expect(hub).toBeLessThan(leaf);
  });

  it('never advertises a retired activity', async () => {
    const { res, state } = makeRes();
    await handler(req(), res);
    // These are answered 410 by the middleware; a sitemap that still lists them
    // is asking a crawler to spend budget learning they are gone.
    for (const slug of ['knitting', 'gaming', 'yoga', 'shopping', 'online']) {
      expect(state.body).not.toContain(`<loc>https://godaisy.io/${slug}/`);
      expect(state.body).not.toContain(`<loc>https://godaisy.io/${slug}</loc>`);
    }
  });
});
