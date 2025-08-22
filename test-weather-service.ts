import { normalizeWeatherFeatures } from './lib/services/weatherService';

describe('normalizeWeatherFeatures (extended)', () => {
  const mockDaySummary = { uvi: 7 };
  const mockAirPollen = {
    hourly: {
      alder_pollen: [0,2,5,3],
      birch_pollen: [1,4,2,6],
      grass_pollen: [0,0,1,2],
      ragweed_pollen: [0,0,0,1],
    }
  };
  const mockTides = {
    data: [
      { time: '2025-08-21T06:00:00+00:00', type: 'high', height: 2.1 },
      { time: '2025-08-21T12:00:00+00:00', type: 'low',  height: 0.3 }
    ]
  };
  const mockMarine = {
    hours: [
      {
        time: '2025-08-21T06:00:00+00:00',
        waveHeight: { sg: 1.2 },
        swellHeight: { sg: 0.8 },
        swellPeriod: { sg: 7.5 },
        swellDirection: { sg: 240 },
        windWaveHeight: { sg: 0.5 }
      }
    ]
  };
  const mockAstronomy = {
    data: [{
      sunrise:  '2025-08-21T05:59:00+00:00',
      sunset:   '2025-08-21T19:42:00+00:00',
      moonrise: '2025-08-21T18:10:00+00:00',
      moonset:  '2025-08-21T03:12:00+00:00',
      moonPhase: 0.62
    }]
  };
  const mockElevation = { data: [{ elevation: 8 }] };

  it('merges UVI, pollen, tides, marine, astronomy, elevation', () => {
    const r = normalizeWeatherFeatures(
      mockDaySummary, mockAirPollen, mockTides, mockMarine, mockAstronomy, mockElevation
    );
    expect(r.uvi).toBe(7);
    expect(r.pollen?.birch).toBe(6);
    expect(r.tides?.[0].type).toBe('high');
    expect(r.marine?.waveHeight).toBe(1.2);
    expect(r.astronomy?.moonPhase).toBe(0.62);
    expect(r.meta?.elevation).toBe(8);
  });

  it('gracefully handles missing providers', () => {
    const r = normalizeWeatherFeatures({}, null, null, null, null, null);
    expect(r.uvi).toBeNull();
    expect(r.pollen).toBeNull();
    expect(r.tides).toBeNull();
    expect(r.marine).toBeNull();
    expect(r.astronomy).toBeNull();
    expect(r.meta?.elevation).toBeNull();
  });
});
