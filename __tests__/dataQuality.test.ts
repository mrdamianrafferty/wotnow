import { calculateDataQualityScore, calculateCatchPoints } from '@/lib/findr/dataQuality';

describe('calculateDataQualityScore', () => {
  it('awards near-perfect scores when all enrichment signals are present', () => {
    const score = calculateDataQualityScore({
      hasPhoto: true,
      hasGPS: true,
      hasUserLocation: true,
      hasDepth: true,
      hasSubstrate: true,
      hasNotes: true,
      hasEnvironmentalData: true,
      entryType: 'detailed',
    });

    expect(score).toBeGreaterThanOrEqual(95);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('caps score when photos are missing even if other data exists', () => {
    const score = calculateDataQualityScore({
      hasPhoto: false,
      hasGPS: true,
      hasUserLocation: false,
      hasDepth: true,
      hasSubstrate: true,
      hasNotes: true,
      hasEnvironmentalData: true,
      entryType: 'detailed',
    });

    expect(score).toBeLessThanOrEqual(75);
    expect(score).toBe(69);
  });

  it('enforces a hard cap when no precise location data is available', () => {
    const score = calculateDataQualityScore({
      hasPhoto: true,
      hasGPS: false,
      hasUserLocation: false,
      hasDepth: true,
      hasSubstrate: true,
      hasNotes: true,
      hasEnvironmentalData: true,
      entryType: 'detailed',
    });

    expect(score).toBeLessThanOrEqual(45);
    expect(score).toBe(45);
  });

  it('returns a minimal baseline when only mandatory fields are present', () => {
    const score = calculateDataQualityScore({
      hasPhoto: false,
      hasGPS: false,
      hasUserLocation: false,
      hasDepth: false,
      hasSubstrate: false,
      hasNotes: false,
      hasEnvironmentalData: false,
      entryType: 'quick',
    });

    expect(score).toBe(5);
  });
});

describe('calculateCatchPoints', () => {
  it('rewards comprehensive catches with higher point totals', () => {
    const points = calculateCatchPoints({
      hasPhoto: true,
      hasGPS: true,
      hasUserLocation: true,
      entryType: 'detailed',
      dataQualityScore: 96,
    });

    expect(points).toBe(59);
  });

  it('keeps scores modest when key enrichment data is missing', () => {
    const points = calculateCatchPoints({
      hasPhoto: false,
      hasGPS: false,
      hasUserLocation: true,
      entryType: 'quick',
      dataQualityScore: 60,
    });

    expect(points).toBe(21);
  });
});
