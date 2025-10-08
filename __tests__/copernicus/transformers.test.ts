import { fetchCopernicusBundleMock } from '../../lib/copernicus/mockClient';
import { toCopernicusMarineData, toCopernicusMarineSnapshots } from '../../lib/copernicus/transformers';

describe('Copernicus transformers', () => {
  it('produces snapshots with surface metrics', async () => {
    const bundle = await fetchCopernicusBundleMock({
      lat: 43.55,
      lon: -6.25,
      start: '2025-09-27T00:00:00Z',
      end: '2025-09-28T00:00:00Z',
    });

    const snapshots = toCopernicusMarineSnapshots(bundle);
    expect(snapshots).toHaveLength(2);

    const morning = snapshots[0];
    expect(morning.temperatureSurface).toBeCloseTo(17.4, 1);
    expect(morning.salinitySurface).toBeCloseTo(35.2, 1);
    expect(morning.dissolvedOxygenSurface).toBeCloseTo(210, 0);
    expect(morning.chlorophyllSurface).toBeGreaterThan(1);
    expect(morning.significantWaveHeight).toBeCloseTo(1.2, 1);
    expect(morning.depthProfile).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ depth: 0, temperature: 17.4, chlorophyll: 1.6 }),
        expect.objectContaining({ depth: 20, nitrate: 5.0 }),
      ])
    );
  });

  it('wraps snapshots in the marine data envelope', async () => {
    const bundle = await fetchCopernicusBundleMock({
      lat: 43.55,
      lon: -6.25,
      start: '2025-09-27T00:00:00Z',
      end: '2025-09-28T00:00:00Z',
    });

    const data = toCopernicusMarineData(bundle);

    expect(data.location.lat).toBeCloseTo(43.55, 2);
    expect(data.location.lon).toBeCloseTo(-6.25, 2);
    expect(data.metadata.datasets).toEqual(
      expect.arrayContaining([
        'GLOBAL_ANALYSISFORECAST_PHY_001_024',
        'GLOBAL_ANALYSISFORECAST_BGC_001_028',
        'GLOBAL_ANALYSISFORECAST_WAV_001_027',
      ])
    );
    expect(data.metadata.source).toBe('mock');
    expect(data.snapshots.length).toBeGreaterThanOrEqual(2);
  });
});
