import {
  serializeBed,
  nextBedColor,
  BED_COLORS,
  BED_COLOR_HEX,
  BED_TYPES,
  type BedRow,
  type BedColor,
  type BedType,
} from '../../../lib/grow/server/beds';

describe('serializeBed', () => {
  const baseBedRow: BedRow = {
    id: 'bed-1',
    user_id: 'user-1',
    name: 'Raised Bed 1',
    type: 'raised_bed',
    color: 'terracotta',
    sort_order: 0,
    sun_exposure: 'full_sun',
    soil_type: 'loam',
    size_label: '4x8 ft',
    notes: 'South-facing',
    created_at: '2026-03-05T10:00:00Z',
    updated_at: '2026-03-05T10:00:00Z',
  };

  it('maps snake_case DB row to camelCase serialized bed', () => {
    const result = serializeBed(baseBedRow, 5);

    expect(result).toEqual({
      id: 'bed-1',
      name: 'Raised Bed 1',
      type: 'raised_bed',
      color: 'terracotta',
      sortOrder: 0,
      sunExposure: 'full_sun',
      soilType: 'loam',
      sizeLabel: '4x8 ft',
      notes: 'South-facing',
      createdAt: '2026-03-05T10:00:00Z',
      updatedAt: '2026-03-05T10:00:00Z',
      plantCount: 5,
      plantSummary: '',
      lastActivity: null,
      bedStatus: undefined,
    });
  });

  it('defaults plantCount to 0', () => {
    const result = serializeBed(baseBedRow);
    expect(result.plantCount).toBe(0);
  });

  it('handles null optional fields', () => {
    const row: BedRow = {
      ...baseBedRow,
      sun_exposure: null,
      soil_type: null,
      size_label: null,
      notes: null,
    };
    const result = serializeBed(row, 0);
    expect(result.sunExposure).toBeNull();
    expect(result.soilType).toBeNull();
    expect(result.sizeLabel).toBeNull();
    expect(result.notes).toBeNull();
  });

  it('preserves all bed types correctly', () => {
    const types: BedType[] = ['raised_bed', 'container', 'in_ground', 'greenhouse', 'polytunnel', 'other'];
    types.forEach(type => {
      const row = { ...baseBedRow, type };
      expect(serializeBed(row).type).toBe(type);
    });
  });

  it('preserves all bed colors correctly', () => {
    const colors: BedColor[] = ['terracotta', 'sage', 'cornflower', 'sunflower', 'slate', 'plum'];
    colors.forEach(color => {
      const row = { ...baseBedRow, color };
      expect(serializeBed(row).color).toBe(color);
    });
  });
});

describe('nextBedColor', () => {
  it('returns terracotta for first bed', () => {
    expect(nextBedColor(0)).toBe('terracotta');
  });

  it('cycles through all 6 colors', () => {
    const expected: BedColor[] = ['terracotta', 'sage', 'cornflower', 'sunflower', 'slate', 'plum'];
    for (let i = 0; i < 6; i++) {
      expect(nextBedColor(i)).toBe(expected[i]);
    }
  });

  it('wraps around after 6 beds', () => {
    expect(nextBedColor(6)).toBe('terracotta');
    expect(nextBedColor(7)).toBe('sage');
    expect(nextBedColor(12)).toBe('terracotta');
  });

  it('handles large numbers', () => {
    expect(nextBedColor(100)).toBe(BED_COLORS[100 % 6]);
  });
});

describe('BED_COLORS', () => {
  it('has exactly 6 colors', () => {
    expect(BED_COLORS).toHaveLength(6);
  });

  it('contains all expected colors', () => {
    expect(BED_COLORS).toEqual(['terracotta', 'sage', 'cornflower', 'sunflower', 'slate', 'plum']);
  });
});

describe('BED_COLOR_HEX', () => {
  it('has a hex value for every color', () => {
    BED_COLORS.forEach(color => {
      expect(BED_COLOR_HEX[color]).toBeDefined();
      expect(BED_COLOR_HEX[color]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('has correct hex values', () => {
    expect(BED_COLOR_HEX.terracotta).toBe('#C2714F');
    expect(BED_COLOR_HEX.sage).toBe('#7A9E7E');
    expect(BED_COLOR_HEX.cornflower).toBe('#6B8EC4');
    expect(BED_COLOR_HEX.sunflower).toBe('#D4A843');
    expect(BED_COLOR_HEX.slate).toBe('#6B7B8D');
    expect(BED_COLOR_HEX.plum).toBe('#8B6F8E');
  });
});

describe('BED_TYPES', () => {
  it('has display labels for all types', () => {
    expect(BED_TYPES.raised_bed).toBe('Raised Bed');
    expect(BED_TYPES.container).toBe('Container');
    expect(BED_TYPES.in_ground).toBe('In-Ground');
    expect(BED_TYPES.greenhouse).toBe('Greenhouse');
    expect(BED_TYPES.polytunnel).toBe('Polytunnel');
    expect(BED_TYPES.other).toBe('Other');
  });

  it('has exactly 6 types', () => {
    expect(Object.keys(BED_TYPES)).toHaveLength(6);
  });
});
