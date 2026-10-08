/**
 * @jest-environment node
 *
 * `autoTranslate.ts` refuses to load where `window` exists, so run under node.
 */
/**
 * Go Daisy and Grow Daisy spend from a DeepL key shared with Grewp, Rise Daisy and
 * Findr. This pins the budget (this app's cap + a ceiling on the whole account,
 * failing closed) and the rules that stop a paid translation being lost or bought
 * twice. Ported from Rise Daisy's lib/i18n/deepl-budget.ts (PR #735 there).
 */

process.env.DEEPL_API_KEY = 'deepl-test-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

const mockTranslateText = jest.fn();
const mockDb = {
  cache: new Map<string, string>(), // `${lang}|${source}` -> translation
  cacheDown: false,
  ledgerChars: 0,
  accountUsed: 1_000,
  accountLimit: 500_000,
  upserts: [] as Array<Record<string, unknown>>,
};

jest.mock('deepl-node', () => ({
  Translator: jest.fn().mockImplementation(() => ({
    translateText: mockTranslateText,
    getUsage: async () => ({ character: { count: mockDb.accountUsed, limit: mockDb.accountLimit } }),
  })),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => {
    const from = (table: string) => {
      const q: { eqs: Record<string, unknown>; inCol?: string; inVals?: string[] } = { eqs: {} };
      const resolve = (single: boolean) => {
        if (table === 'translation_usage') return { data: { chars: mockDb.ledgerChars }, error: null };
        if (table === 'translation_overrides') return { data: single ? null : [], error: null };
        if (mockDb.cacheDown) return { data: null, error: { message: 'connection reset' } };
        const lang = String(q.eqs.target_language);
        if (single) {
          const hit = mockDb.cache.get(`${lang}|${q.eqs.source_text}`);
          return { data: hit ? { translated_text: hit, translation_source: 'auto' } : null, error: null };
        }
        const rows = (q.inVals ?? [])
          .filter((t) => mockDb.cache.has(`${lang}|${t}`))
          .map((t) => ({ source_text: t, translated_text: mockDb.cache.get(`${lang}|${t}`) }));
        return { data: rows, error: null };
      };
      const chain: Record<string, unknown> = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        eq: (col: string, val: unknown) => { q.eqs[col] = val; return chain; },
        in: (col: string, vals: string[]) => { q.inCol = col; q.inVals = vals; return chain; },
        maybeSingle: async () => resolve(true),
        single: async () => resolve(true),
        then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(resolve(false)).then(ok, bad),
        upsert: async (row: Record<string, unknown>) => {
          mockDb.upserts.push(row);
          mockDb.cache.set(`${row.target_language}|${row.source_text}`, String(row.translated_text));
          return { error: null };
        },
      };
      return chain;
    };
    const rpc = async (fn: string, a: Record<string, number | string>) => {
      if (fn === 'translation_usage_reserve') {
        const ok = mockDb.ledgerChars + (a.p_chars as number) <= (a.p_cap as number);
        if (ok) mockDb.ledgerChars += a.p_chars as number;
        return { data: ok, error: null };
      }
      mockDb.ledgerChars = Math.max(0, mockDb.ledgerChars + (a.p_delta_chars as number));
      return { data: null, error: null };
    };
    return { from, rpc };
  },
}));

type Mod = typeof import('../lib/translation/autoTranslate');
let mod: Mod;

beforeEach(() => {
  jest.resetModules(); // fresh in-memory caches and budget state per test
  jest.clearAllMocks();
  Object.assign(mockDb, { cacheDown: false, ledgerChars: 0, accountUsed: 1_000, accountLimit: 500_000 });
  mockDb.cache.clear();
  mockDb.upserts.length = 0;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockTranslateText.mockImplementation(async (text: string) => ({ text: `[es] ${text}`, billedCharacters: text.length }));
  mod = require('../lib/translation/autoTranslate');
});

describe('budget (one meter for Go Daisy and Grow Daisy)', () => {
  it('meters a live call to the ledger', async () => {
    expect(await mod.autoTranslate('Wind today', 'es')).toBe('[es] Wind today');
    expect(mockDb.ledgerChars).toBe('Wind today'.length);
  });

  it('refuses over the app cap (default 50,000): English back, DeepL never called', async () => {
    mockDb.ledgerChars = 49_995;
    expect(await mod.autoTranslate('Over the cap', 'es')).toBe('Over the cap');
    expect(mockTranslateText).not.toHaveBeenCalled();
    expect(mockDb.upserts).toHaveLength(0); // a refusal is never cached as a translation
  });

  it('refuses over the account ceiling (40% of 500k = 200k)', async () => {
    mockDb.accountUsed = 199_995;
    expect(await mod.autoTranslate('Over the shared ceiling', 'es')).toBe('Over the shared ceiling');
    expect(mockTranslateText).not.toHaveBeenCalled();
  });

  it('fails closed when DeepL reports unusable usage figures', async () => {
    mockDb.accountUsed = NaN;
    expect(await mod.autoTranslate('Usage is broken', 'es')).toBe('Usage is broken');
    expect(mockTranslateText).not.toHaveBeenCalled();
  });

  it('gives the characters back and caches nothing when DeepL fails', async () => {
    mockTranslateText.mockRejectedValueOnce(new Error('456 quota exceeded'));
    expect(await mod.autoTranslate('Will not be billed', 'es')).toBe('Will not be billed');
    expect(mockDb.ledgerChars).toBe(0);
    expect(mockDb.upserts).toHaveLength(0);
  });

  it('translates the front of a batch when the budget cannot cover all of it', async () => {
    mockDb.ledgerChars = 49_970; // 30 characters of room
    const out = await mod.autoTranslateBatch(['aaaaaaaaaa1', 'bbbbbbbbbb2', 'cccccccccc3', 'dddddddddd4'], 'es');
    expect(out).toEqual(['[es] aaaaaaaaaa1', '[es] bbbbbbbbbb2', 'cccccccccc3', 'dddddddddd4']);
    expect(mockDb.ledgerChars).toBeLessThanOrEqual(50_000);
    expect(mockDb.upserts).toHaveLength(2); // only what was paid for is stored
  });
});

describe('never pay twice for a string', () => {
  it('sends a string repeated in one batch once, and bills it once', async () => {
    const out = await mod.autoTranslateBatch(['Low tide', 'Low tide', 'High tide', 'Low tide'], 'es');
    expect(mockTranslateText).toHaveBeenCalledTimes(2);
    expect(out).toEqual(['[es] Low tide', '[es] Low tide', '[es] High tide', '[es] Low tide']);
    expect(mockDb.ledgerChars).toBe('Low tide'.length + 'High tide'.length);
  });

  it('stores an answer identical to the source, so it is not bought again', async () => {
    mockTranslateText.mockImplementationOnce(async (text: string) => ({ text, billedCharacters: text.length }));
    await mod.autoTranslate('Padel', 'es');
    expect(mockDb.upserts).toHaveLength(1);
    expect(mockDb.upserts[0]).toMatchObject({ source_text: 'Padel', translated_text: 'Padel' });
  });

  it('serves a stored translation without touching DeepL or the budget', async () => {
    mockDb.cache.set('es|Sunrise', 'Amanecer');
    expect(await mod.autoTranslateBatch(['Sunrise'], 'es')).toEqual(['Amanecer']);
    expect(mockTranslateText).not.toHaveBeenCalled();
    expect(mockDb.ledgerChars).toBe(0);
  });

  it('serves English, not DeepL, when the cache cannot be read (single)', async () => {
    mockDb.cacheDown = true;
    expect(await mod.autoTranslate('Cache is down', 'es')).toBe('Cache is down');
    expect(mockTranslateText).not.toHaveBeenCalled();
  });

  it('serves English, not DeepL, when the cache cannot be read (batch)', async () => {
    mockDb.cacheDown = true;
    expect(await mod.autoTranslateBatch(['Cache is down', 'Also down'], 'es')).toEqual(['Cache is down', 'Also down']);
    expect(mockTranslateText).not.toHaveBeenCalled();
  });

  it('returns null from the cache-only path when the cache cannot be read, so a crawler is told to come back', async () => {
    mockDb.cacheDown = true;
    expect(await mod.translateFromCacheOnly('Cache is down', 'es')).toBeNull();
    expect(mockTranslateText).not.toHaveBeenCalled();
  });
});
