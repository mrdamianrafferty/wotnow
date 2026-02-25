import {
  bucketCoord,
  roundElevationForStorage,
  getElevationCacheKey,
  getElevationFromGoogle,
} from '../../lib/grow/elevation';

describe('bucketCoord', () => {
  it('rounds to 2 decimals by default', () => {
    expect(bucketCoord(53.3498)).toBe(53.35);
    expect(bucketCoord(53.3444)).toBe(53.34);
  });

  it('rounds to 1 decimal', () => {
    expect(bucketCoord(53.35, 1)).toBe(53.4);
    expect(bucketCoord(53.34, 1)).toBe(53.3);
  });

  it('rounds to 0 decimals', () => {
    expect(bucketCoord(53.5, 0)).toBe(54);
    expect(bucketCoord(53.4, 0)).toBe(53);
  });

  it('rounds to 3 decimals', () => {
    expect(bucketCoord(53.3498, 3)).toBe(53.35);
  });

  it('handles negative values', () => {
    expect(bucketCoord(-6.2603)).toBe(-6.26);
  });

  it('handles zero', () => {
    expect(bucketCoord(0)).toBe(0);
  });
});

describe('roundElevationForStorage', () => {
  it('rounds to nearest 10m', () => {
    expect(roundElevationForStorage(123)).toBe(120);
    expect(roundElevationForStorage(127)).toBe(130);
    expect(roundElevationForStorage(125)).toBe(130); // round half up
  });

  it('handles zero', () => {
    expect(roundElevationForStorage(0)).toBe(0);
  });

  it('handles negative elevation (below sea level)', () => {
    expect(roundElevationForStorage(-5)).toBe(-0); // Math.round(-0.5) = -0 in JS
    // -15 / 10 = -1.5, Math.round(-1.5) = -1, * 10 = -10
    expect(roundElevationForStorage(-15)).toBe(-10);
  });

  it('handles exact multiples of 10', () => {
    expect(roundElevationForStorage(100)).toBe(100);
    expect(roundElevationForStorage(800)).toBe(800);
  });
});

describe('getElevationCacheKey', () => {
  it('generates cache key from bucketed coordinates', () => {
    expect(getElevationCacheKey(53.3498, -6.2603)).toBe('elevation:53.35,-6.26');
  });

  it('generates consistent keys for nearby coordinates', () => {
    const key1 = getElevationCacheKey(53.3498, -6.2603);
    const key2 = getElevationCacheKey(53.3490, -6.2610);
    expect(key1).toBe(key2);
  });

  it('generates different keys for distant coordinates', () => {
    const key1 = getElevationCacheKey(53.35, -6.26);
    const key2 = getElevationCacheKey(54.35, -7.26);
    expect(key1).not.toBe(key2);
  });
});

describe('getElevationFromGoogle', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, GOOGLE_MAPS_API_KEY: 'test-key' };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('returns rounded elevation on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{ elevation: 123.456 }],
      }),
    });

    const elevation = await getElevationFromGoogle(53.35, -6.26);
    expect(elevation).toBe(120); // rounded to nearest 10
  });

  it('throws when API key is missing', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    await expect(getElevationFromGoogle(53.35, -6.26))
      .rejects.toThrow('GOOGLE_MAPS_API_KEY not configured');
  });

  it('throws on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });

    await expect(getElevationFromGoogle(53.35, -6.26))
      .rejects.toThrow('HTTP 403');
  });

  it('throws on non-OK API status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'OVER_QUERY_LIMIT',
        results: [],
        error_message: 'Quota exceeded',
      }),
    });

    await expect(getElevationFromGoogle(53.35, -6.26))
      .rejects.toThrow('Google API: OVER_QUERY_LIMIT');
  });

  it('falls back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'public-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{ elevation: 50 }],
      }),
    });

    const elevation = await getElevationFromGoogle(53.35, -6.26);
    expect(elevation).toBe(50);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('key=public-key')
    );
  });
});
