/**
 * @jest-environment node
 *
 * `autoTranslate.ts` refuses to load where `window` exists — it is server-only
 * by design, and jsdom would have it throw on import.
 */
/**
 * A crawler does not get to spend the translation budget.
 *
 * `grow.godaisy.io/sitemap.xml` lists 3,150 translated species pages — 450
 * species across seven languages — and each translated its description and
 * advice on demand on first visit. The full matrix is roughly a million
 * characters against a 500,000 a month DeepL allowance, so working through the
 * sitemap exhausts the month in about two days.
 *
 * It did. Between 1 and 5 September 2026, 553,000 characters were cached, 88%
 * of it on two days, spread evenly across all seven languages — which is not
 * how people browse. DeepL read exactly 500,000 / 500,000 on the 6th.
 *
 * `translateFromCacheOnly` is the half of the fix that lives in the library:
 * it answers from cache and returns null rather than reaching for the API. The
 * page turns that null into a 503 for a crawler, and only for a crawler.
 */

import { isBotRequest } from '@/lib/http/is-bot';

const single = jest.fn();
const maybeSingle = jest.fn();

jest.mock('@/lib/supabase/serverClient', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({ maybeSingle, single }),
            maybeSingle,
            single,
          }),
        }),
      }),
    }),
  }),
}));

const fetchSpy = jest.fn();

beforeEach(() => {
  jest.resetModules();
  single.mockReset().mockResolvedValue({ data: null, error: null });
  maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
  fetchSpy.mockReset().mockResolvedValue({ ok: true, json: async () => ({ translations: [] }) });
  global.fetch = fetchSpy as unknown as typeof fetch;
  process.env.DEEPL_API_KEY = 'test-key';
});

describe('translateFromCacheOnly', () => {
  it('never calls DeepL, whatever the cache says', async () => {
    const { translateFromCacheOnly } = await import('@/lib/translation/autoTranslate');

    await translateFromCacheOnly('A tall deciduous tree.', 'pl');

    // The whole point: a cache miss costs nothing. Before this existed, the
    // same request went straight to the API and 3,150 sitemap URLs each did it
    // once.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null on a miss, so the caller can decide what a miss means', async () => {
    const { translateFromCacheOnly } = await import('@/lib/translation/autoTranslate');

    expect(await translateFromCacheOnly('A tall deciduous tree.', 'pl')).toBeNull();
  });

  it('passes English straight through — there is nothing to look up', async () => {
    const { translateFromCacheOnly } = await import('@/lib/translation/autoTranslate');

    expect(await translateFromCacheOnly('A tall deciduous tree.', 'en')).toBe('A tall deciduous tree.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('treats empty text as nothing to translate, not as a miss', async () => {
    const { translateFromCacheOnly } = await import('@/lib/translation/autoTranslate');

    // A species with no `advice` must not 503 forever waiting for a
    // translation of the empty string.
    expect(await translateFromCacheOnly('', 'pl')).toBe('');
  });
});

describe('who counts as a crawler', () => {
  it('catches the ones that walk sitemaps', () => {
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'facebookexternalhit/1.1',
    ]) {
      expect(isBotRequest(ua)).toBe(true);
    }
  });

  it('treats a missing User-Agent as a bot, which is the safe direction', () => {
    // Wrong about a person costs them an English page for one visit. Wrong
    // about a crawler costs the month's quota.
    expect(isBotRequest(undefined)).toBe(true);
  });

  it('lets real browsers through to a real translation', () => {
    for (const ua of [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    ]) {
      expect(isBotRequest(ua)).toBe(false);
    }
  });
});
