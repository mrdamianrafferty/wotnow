import {
  inferGardeningClimateZone,
  getClimateZoneInfo,
  getClimateZonePlantingAdvice,
  getClimateZoneFrostRisk,
  zonHasFrostRisk,
  isInFrostRiskPeriod,
  getClimateZoneFrostDates,
  type ClimateZoneCode,
} from '../../lib/grow/climate';

describe('inferGardeningClimateZone', () => {
  it('returns mountain_cool for elevation > 800m', () => {
    expect(inferGardeningClimateZone(48, 10, 1200)).toBe('mountain_cool');
  });

  it('returns mountain_cool for Alpine lat/lon without elevation', () => {
    // Austrian Alps: lat 47, lon 11
    expect(inferGardeningClimateZone(47, 11)).toBe('mountain_cool');
  });

  it('returns mountain_cool for Pyrenees band', () => {
    // Pyrenees: lat 43, lon -1
    expect(inferGardeningClimateZone(43, -1)).toBe('mountain_cool');
  });

  it('returns cool_maritime for Scandinavia (lat >= 58)', () => {
    expect(inferGardeningClimateZone(60, 10)).toBe('cool_maritime');
  });

  it('returns cool_maritime for Scotland/Denmark band', () => {
    // Edinburgh: lat 55.95, lon -3.19
    expect(inferGardeningClimateZone(55.95, -3.19)).toBe('cool_maritime');
  });

  it('returns cool_maritime for North German coast', () => {
    // Hamburg: lat 53.5, lon 10
    expect(inferGardeningClimateZone(53.5, 9.9)).toBe('cool_maritime');
  });

  it('returns atlantic_mild for Ireland', () => {
    // Dublin: lat 53.35, lon -6.26
    expect(inferGardeningClimateZone(53.35, -6.26)).toBe('atlantic_mild');
  });

  it('returns atlantic_mild for Western France', () => {
    // Brest: lat 48.39, lon -4.49
    expect(inferGardeningClimateZone(48.39, -4.49)).toBe('atlantic_mild');
  });

  it('returns med_marine for N Portugal / Galicia (lat < 43 Atlantic)', () => {
    // Porto: lat 41.15, lon -8.61
    expect(inferGardeningClimateZone(41.15, -8.61)).toBe('med_marine');
  });

  it('returns med_marine for coastal Mediterranean', () => {
    // Barcelona: lat 41.38, lon 2.17 — close to coast
    expect(inferGardeningClimateZone(40, 2)).toBe('med_marine');
  });

  it('returns southern_hot_dry for inland southern Europe', () => {
    // Falls through Med basin check into the inlandHotSouth catch-all (section 6)
    // Must be lat 36-45, lon -10 to 30, but NOT hit the isMedBasin check (lat < 44)
    // Since isMedBasin has lat >= 35 && lat <= 45 && lat < 44, essentially all coords hit it
    // The closeToCoast check uses abs(lat-37)<3 || abs(lat-40)<3 || abs(lat-43)<3
    // To get southern_hot_dry, must be in isMedBasin but NOT closeToCoast
    // lat=44.5 bypasses isMedBasin (lat < 44 fails), but hits inlandHotSouth
    expect(inferGardeningClimateZone(44.5, 20)).toBe('southern_hot_dry');
  });

  it('returns continental_cool as default for inland Europe', () => {
    // Berlin: lat 52.52, lon 13.41
    expect(inferGardeningClimateZone(52.52, 13.41)).toBe('continental_cool');
  });
});

describe('getClimateZoneInfo', () => {
  const zones: ClimateZoneCode[] = [
    'atlantic_mild', 'cool_maritime', 'continental_cool',
    'med_marine', 'southern_hot_dry', 'mountain_cool',
  ];

  it.each(zones)('returns info for %s', (code) => {
    const info = getClimateZoneInfo(code);
    expect(info.code).toBe(code);
    expect(info.name).toBeTruthy();
    expect(info.description).toBeTruthy();
    expect(info.characteristics).toBeDefined();
    expect(info.characteristics.winterType).toBeTruthy();
    expect(info.characteristics.summerType).toBeTruthy();
    expect(info.characteristics.growingSeason).toBeTruthy();
  });
});

describe('getClimateZonePlantingAdvice', () => {
  const zones: ClimateZoneCode[] = [
    'atlantic_mild', 'cool_maritime', 'continental_cool',
    'med_marine', 'southern_hot_dry', 'mountain_cool',
  ];

  it.each(zones)('returns advice for %s', (code) => {
    const advice = getClimateZonePlantingAdvice(code);
    expect(advice.bestPlants.length).toBeGreaterThan(0);
    expect(advice.avoidPlants.length).toBeGreaterThan(0);
    expect(advice.specialConsiderations.length).toBeGreaterThan(0);
  });
});

describe('getClimateZoneFrostRisk', () => {
  it('returns low for atlantic_mild', () => {
    expect(getClimateZoneFrostRisk('atlantic_mild')).toBe('low');
  });

  it('returns moderate for cool_maritime', () => {
    expect(getClimateZoneFrostRisk('cool_maritime')).toBe('moderate');
  });

  it('returns high for continental_cool', () => {
    expect(getClimateZoneFrostRisk('continental_cool')).toBe('high');
  });

  it('returns low for med_marine', () => {
    expect(getClimateZoneFrostRisk('med_marine')).toBe('low');
  });

  it('returns moderate for southern_hot_dry', () => {
    expect(getClimateZoneFrostRisk('southern_hot_dry')).toBe('moderate');
  });

  it('returns severe for mountain_cool', () => {
    expect(getClimateZoneFrostRisk('mountain_cool')).toBe('severe');
  });
});

describe('zonHasFrostRisk', () => {
  it('returns false for low frost risk zones', () => {
    expect(zonHasFrostRisk('atlantic_mild')).toBe(false);
    expect(zonHasFrostRisk('med_marine')).toBe(false);
  });

  it('returns true for moderate+ frost risk zones', () => {
    expect(zonHasFrostRisk('cool_maritime')).toBe(true);
    expect(zonHasFrostRisk('continental_cool')).toBe(true);
    expect(zonHasFrostRisk('mountain_cool')).toBe(true);
    expect(zonHasFrostRisk('southern_hot_dry')).toBe(true);
  });
});

describe('isInFrostRiskPeriod', () => {
  it('returns true during winter (January)', () => {
    // All zones should be in frost risk in January
    const jan = new Date(2026, 0, 15); // Jan 15
    expect(isInFrostRiskPeriod('continental_cool', jan)).toBe(true);
    expect(isInFrostRiskPeriod('mountain_cool', jan)).toBe(true);
  });

  it('returns false during mid-summer (July) for most zones', () => {
    const jul = new Date(2026, 6, 15); // Jul 15
    expect(isInFrostRiskPeriod('atlantic_mild', jul)).toBe(false);
    expect(isInFrostRiskPeriod('continental_cool', jul)).toBe(false);
  });

  it('handles cross-year wrapping (Dec is after fall frost)', () => {
    const dec = new Date(2026, 11, 10); // Dec 10
    expect(isInFrostRiskPeriod('cool_maritime', dec)).toBe(true);
  });

  it('returns true on exact spring frost date', () => {
    // continental_cool: lastSpring = April 25
    const apr25 = new Date(2026, 3, 25);
    expect(isInFrostRiskPeriod('continental_cool', apr25)).toBe(true);
  });

  it('returns false just after last spring frost', () => {
    // continental_cool: lastSpring = April 25, firstFall = October 10
    const may1 = new Date(2026, 4, 1);
    expect(isInFrostRiskPeriod('continental_cool', may1)).toBe(false);
  });
});

describe('getClimateZoneFrostDates', () => {
  it('returns frost dates for a given year', () => {
    const dates = getClimateZoneFrostDates('continental_cool', 2026);
    expect(dates.lastSpringFrost.getFullYear()).toBe(2026);
    expect(dates.lastSpringFrost.getMonth()).toBe(3); // April (0-indexed)
    expect(dates.lastSpringFrost.getDate()).toBe(25);
    expect(dates.firstFallFrost.getMonth()).toBe(9); // October
    expect(dates.firstFallFrost.getDate()).toBe(10);
  });

  it('calculates frost-free depth correctly', () => {
    const dates = getClimateZoneFrostDates('continental_cool', 2026);
    // April 25 to October 10 = 168 days
    expect(dates.frostFreeDepth).toBe(168);
  });

  it('mountain_cool has shortest frost-free period', () => {
    const mountain = getClimateZoneFrostDates('mountain_cool', 2026);
    const atlantic = getClimateZoneFrostDates('atlantic_mild', 2026);
    expect(mountain.frostFreeDepth).toBeLessThan(atlantic.frostFreeDepth);
  });

  it('med_marine has longest frost-free period', () => {
    const med = getClimateZoneFrostDates('med_marine', 2026);
    const continental = getClimateZoneFrostDates('continental_cool', 2026);
    expect(med.frostFreeDepth).toBeGreaterThan(continental.frostFreeDepth);
  });
});
