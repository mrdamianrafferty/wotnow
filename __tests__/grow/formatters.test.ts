import {
  formatToxicitySeverity,
  shouldShowSafetyWarning,
  estimateHardinessZone,
  isZoneCompatible,
  formatDimensions,
  formatGrowthRate,
  formatCareLevel,
  formatMaintenance,
  formatWatering,
  formatPropagation,
  formatAttracts,
  formatSeason,
  formatColors,
  getLocalizedName,
  getAllLocalizedNames,
} from '../../lib/grow/formatters';

describe('formatToxicitySeverity', () => {
  it('returns Safe for level 0', () => {
    expect(formatToxicitySeverity(0).label).toBe('Safe');
    expect(formatToxicitySeverity(0).showWarning).toBe(false);
  });

  it('returns Mild for level 1', () => {
    expect(formatToxicitySeverity(1).label).toBe('Mild');
    expect(formatToxicitySeverity(1).showWarning).toBe(false);
  });

  it('returns Moderate for level 2 with warning', () => {
    expect(formatToxicitySeverity(2).label).toBe('Moderate');
    expect(formatToxicitySeverity(2).showWarning).toBe(true);
  });

  it('returns Significant for level 3 with warning', () => {
    expect(formatToxicitySeverity(3).label).toBe('Significant');
    expect(formatToxicitySeverity(3).showWarning).toBe(true);
  });

  it('returns Severe for level 4', () => {
    expect(formatToxicitySeverity(4).label).toBe('Severe');
    expect(formatToxicitySeverity(4).showWarning).toBe(true);
  });

  it('returns Highly toxic for level 5', () => {
    expect(formatToxicitySeverity(5).label).toBe('Highly toxic');
    expect(formatToxicitySeverity(5).showWarning).toBe(true);
  });

  it('clamps to max level for values > 5', () => {
    expect(formatToxicitySeverity(10).label).toBe('Highly toxic');
  });

  it('treats null as level 0', () => {
    expect(formatToxicitySeverity(null).label).toBe('Safe');
  });

  it('treats undefined as level 0', () => {
    expect(formatToxicitySeverity(undefined).label).toBe('Safe');
  });
});

describe('shouldShowSafetyWarning', () => {
  it('returns false when both are below threshold', () => {
    expect(shouldShowSafetyWarning(0, 1)).toBe(false);
    expect(shouldShowSafetyWarning(1, 0)).toBe(false);
  });

  it('returns true when human toxicity >= 2', () => {
    expect(shouldShowSafetyWarning(2, 0)).toBe(true);
  });

  it('returns true when pet toxicity >= 2', () => {
    expect(shouldShowSafetyWarning(0, 2)).toBe(true);
  });

  it('handles null values (treats as 0)', () => {
    expect(shouldShowSafetyWarning(null, null)).toBe(false);
    expect(shouldShowSafetyWarning(null, 3)).toBe(true);
  });
});

describe('estimateHardinessZone', () => {
  it('estimates zone 13 near equator', () => {
    expect(estimateHardinessZone(25)).toBe(13);
  });

  it('estimates lower zones at higher latitudes', () => {
    const tropics = estimateHardinessZone(30);
    const temperate = estimateHardinessZone(50);
    expect(tropics).toBeGreaterThan(temperate);
  });

  it('clamps to minimum zone 1', () => {
    expect(estimateHardinessZone(90)).toBe(1);
  });

  it('clamps to maximum zone 13', () => {
    expect(estimateHardinessZone(0)).toBe(13);
  });

  it('works for southern hemisphere', () => {
    const zone = estimateHardinessZone(-35);
    expect(zone).toBeGreaterThanOrEqual(1);
    expect(zone).toBeLessThanOrEqual(13);
  });
});

describe('isZoneCompatible', () => {
  it('returns compatible when in range', () => {
    const result = isZoneCompatible(8, 6, 10);
    expect(result.compatible).toBe(true);
    expect(result.message).toContain('Compatible');
  });

  it('returns too cold when below min zone', () => {
    const result = isZoneCompatible(4, 6, 10);
    expect(result.compatible).toBe(false);
    expect(result.message).toContain('Too cold');
  });

  it('returns too warm when above max zone', () => {
    const result = isZoneCompatible(12, 6, 10);
    expect(result.compatible).toBe(false);
    expect(result.message).toContain('too warm');
  });

  it('returns compatible with unknown when plant zones are null', () => {
    const result = isZoneCompatible(8, null, null);
    expect(result.compatible).toBe(true);
    expect(result.message).toContain('unknown');
  });

  it('defaults maxZone to 13 when undefined', () => {
    const result = isZoneCompatible(12, 6, undefined);
    expect(result.compatible).toBe(true);
  });
});

describe('formatDimensions', () => {
  it('returns null for null/undefined/empty', () => {
    expect(formatDimensions(null)).toEqual({ height: null, spread: null });
    expect(formatDimensions(undefined)).toEqual({ height: null, spread: null });
    expect(formatDimensions([])).toEqual({ height: null, spread: null });
  });

  it('formats height correctly', () => {
    const dims = [{ type: 'Height', min_value: 1, max_value: 2, unit: 'm' }];
    const result = formatDimensions(dims);
    expect(result.height).toBe('1-2 m');
  });

  it('formats spread correctly', () => {
    const dims = [{ type: 'Spread', min_value: 0.5, max_value: 1, unit: 'm' }];
    const result = formatDimensions(dims);
    expect(result.spread).toBe('0.5-1 m');
  });

  it('handles equal min and max', () => {
    const dims = [{ type: 'Height', min_value: 1, max_value: 1, unit: 'm' }];
    const result = formatDimensions(dims);
    expect(result.height).toBe('1 m');
  });

  it('recognizes width as spread', () => {
    const dims = [{ type: 'Width', min_value: 1, max_value: 2, unit: 'ft' }];
    const result = formatDimensions(dims);
    expect(result.spread).toBe('1-2 ft');
  });
});

describe('formatGrowthRate', () => {
  it('returns Fast for high', () => {
    expect(formatGrowthRate('High')?.label).toBe('Fast');
  });

  it('returns Moderate for medium', () => {
    expect(formatGrowthRate('Medium')?.label).toBe('Moderate');
  });

  it('returns Slow for low', () => {
    expect(formatGrowthRate('Low')?.label).toBe('Slow');
  });

  it('returns null for null/undefined', () => {
    expect(formatGrowthRate(null)).toBeNull();
    expect(formatGrowthRate(undefined)).toBeNull();
  });

  it('returns null for unknown rate', () => {
    expect(formatGrowthRate('supersonic')).toBeNull();
  });
});

describe('formatCareLevel', () => {
  it('returns Easy for low', () => {
    const result = formatCareLevel('Low');
    expect(result?.label).toBe('Easy');
    expect(result?.color).toBe('text-success');
  });

  it('returns Moderate for medium', () => {
    expect(formatCareLevel('Medium')?.label).toBe('Moderate');
  });

  it('returns Demanding for high', () => {
    expect(formatCareLevel('High')?.label).toBe('Demanding');
  });

  it('returns null for null/undefined', () => {
    expect(formatCareLevel(null)).toBeNull();
    expect(formatCareLevel(undefined)).toBeNull();
  });
});

describe('formatMaintenance', () => {
  it('returns correct labels for all levels', () => {
    expect(formatMaintenance('Low')?.label).toBe('Low maintenance');
    expect(formatMaintenance('Medium')?.label).toBe('Moderate maintenance');
    expect(formatMaintenance('High')?.label).toBe('High maintenance');
  });

  it('returns null for null', () => {
    expect(formatMaintenance(null)).toBeNull();
  });
});

describe('formatWatering', () => {
  it('formats frequent watering', () => {
    const result = formatWatering('Frequent', null);
    expect(result?.frequency).toBe('Frequent watering');
  });

  it('formats with benchmark schedule', () => {
    const result = formatWatering('Average', { value: '3', unit: 'days' });
    expect(result?.frequency).toBe('Average watering');
    expect(result?.schedule).toBe('Every 3 days');
  });

  it('returns null schedule without benchmark', () => {
    const result = formatWatering('Minimum', null);
    expect(result?.schedule).toBeNull();
  });

  it('returns null for null watering', () => {
    expect(formatWatering(null, null)).toBeNull();
  });

  it('handles unknown watering type', () => {
    const result = formatWatering('Custom', null);
    expect(result?.frequency).toBe('Custom');
  });
});

describe('formatPropagation', () => {
  it('returns empty array for null/empty', () => {
    expect(formatPropagation(null)).toEqual([]);
    expect(formatPropagation([])).toEqual([]);
  });

  it('formats seed method', () => {
    const result = formatPropagation(['Seed']);
    expect(result).toHaveLength(1);
    expect(result[0].method).toBe('Seed');
    expect(result[0].difficulty).toBe('easy');
  });

  it('strips "propagation" suffix from method name', () => {
    const result = formatPropagation(['Seed propagation']);
    expect(result[0].method).toBe('Seed');
  });

  it('categorizes grafting as advanced', () => {
    const result = formatPropagation(['Grafting']);
    expect(result[0].difficulty).toBe('advanced');
  });

  it('handles unknown methods as moderate', () => {
    const result = formatPropagation(['Spore']);
    expect(result[0].difficulty).toBe('moderate');
  });
});

describe('formatAttracts', () => {
  it('returns empty array for null/empty', () => {
    expect(formatAttracts(null)).toEqual([]);
    expect(formatAttracts([])).toEqual([]);
  });

  it('formats with correct icons', () => {
    const result = formatAttracts(['bees', 'butterflies']);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Bees');
    expect(result[0].icon).toBe('\uD83D\uDC1D');
    expect(result[1].name).toBe('Butterflies');
  });

  it('uses default icon for unknown wildlife', () => {
    const result = formatAttracts(['hedgehogs']);
    expect(result[0].icon).toBeTruthy();
  });
});

describe('formatSeason', () => {
  it('capitalizes first letter', () => {
    expect(formatSeason('spring')).toBe('Spring');
    expect(formatSeason('SUMMER')).toBe('Summer');
  });

  it('returns null for null/undefined', () => {
    expect(formatSeason(null)).toBeNull();
    expect(formatSeason(undefined)).toBeNull();
  });
});

describe('formatColors', () => {
  it('joins and capitalizes colors', () => {
    expect(formatColors(['red', 'blue'])).toBe('Red, Blue');
  });

  it('returns null for null/empty', () => {
    expect(formatColors(null)).toBeNull();
    expect(formatColors([])).toBeNull();
  });
});

describe('getLocalizedName', () => {
  const plant = {
    name_fr: 'Rose',
    name_es: 'Rosa',
    name_de: 'Rose',
    name_it: null,
  };

  it('returns French name', () => {
    expect(getLocalizedName(plant, 'fr')).toBe('Rose');
  });

  it('returns Spanish name', () => {
    expect(getLocalizedName(plant, 'es')).toBe('Rosa');
  });

  it('returns null for unsupported language', () => {
    expect(getLocalizedName(plant, 'zh')).toBeNull();
  });

  it('returns null when translation is null', () => {
    expect(getLocalizedName(plant, 'it')).toBeNull();
  });

  it('is case-insensitive for language code', () => {
    expect(getLocalizedName(plant, 'FR')).toBe('Rose');
  });
});

describe('getAllLocalizedNames', () => {
  it('returns only non-null translations', () => {
    const plant = {
      name_fr: 'Rose',
      name_es: 'Rosa',
      name_de: null,
    };

    const result = getAllLocalizedNames(plant);
    expect(result).toHaveLength(2);
    expect(result[0].lang).toBe('French');
    expect(result[0].name).toBe('Rose');
  });

  it('includes flag emoji', () => {
    const plant = { name_fr: 'Rose' };
    const result = getAllLocalizedNames(plant);
    expect(result[0].flag).toBeTruthy();
  });

  it('returns empty array when no translations', () => {
    expect(getAllLocalizedNames({})).toEqual([]);
  });
});
