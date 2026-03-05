export type BedType = 'raised_bed' | 'container' | 'in_ground' | 'greenhouse' | 'polytunnel' | 'other';
export type BedColor = 'terracotta' | 'sage' | 'cornflower' | 'sunflower' | 'slate' | 'plum';
export type SunExposure = 'full_sun' | 'partial_shade' | 'full_shade';

export type BedRow = {
  id: string;
  user_id: string;
  name: string;
  type: BedType;
  color: BedColor;
  sort_order: number;
  sun_exposure: SunExposure | null;
  soil_type: string | null;
  size_label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SerializedBed = {
  id: string;
  name: string;
  type: BedType;
  color: BedColor;
  sortOrder: number;
  sunExposure?: SunExposure | null;
  soilType?: string | null;
  sizeLabel?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  plantCount: number;
};

export function serializeBed(row: BedRow, plantCount: number = 0): SerializedBed {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color as BedColor,
    sortOrder: row.sort_order,
    sunExposure: row.sun_exposure as SunExposure | null,
    soilType: row.soil_type,
    sizeLabel: row.size_label,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    plantCount,
  };
}

export const BED_COLORS: BedColor[] = ['terracotta', 'sage', 'cornflower', 'sunflower', 'slate', 'plum'];

export const BED_COLOR_HEX: Record<BedColor, string> = {
  terracotta: '#C2714F',
  sage: '#7A9E7E',
  cornflower: '#6B8EC4',
  sunflower: '#D4A843',
  slate: '#6B7B8D',
  plum: '#8B6F8E',
};

export const BED_TYPES: Record<BedType, string> = {
  raised_bed: 'Raised Bed',
  container: 'Container',
  in_ground: 'In-Ground',
  greenhouse: 'Greenhouse',
  polytunnel: 'Polytunnel',
  other: 'Other',
};

export function nextBedColor(existingCount: number): BedColor {
  return BED_COLORS[existingCount % BED_COLORS.length];
}
