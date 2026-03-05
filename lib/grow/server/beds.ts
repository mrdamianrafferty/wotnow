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

export type BedStatus = 'empty' | 'healthy' | 'approaching_harvest' | 'ready_to_harvest';

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
  plantSummary: string;
  lastActivity?: string | null;
  bedStatus?: BedStatus;
  speciesSlugs?: string[];
};

export function serializeBed(row: BedRow, plantCount: number = 0, plantSummary: string = '', lastActivity?: string | null, bedStatus?: BedStatus, speciesSlugs?: string[]): SerializedBed {
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
    plantSummary,
    lastActivity: lastActivity ?? null,
    bedStatus,
    speciesSlugs,
  };
}

export type PlantingSummaryRow = {
  bed_id: string;
  quantity: number;
  planted_at?: string;
  grow_user_plants: { name: string };
};

/** Build a human-readable summary like "12 Cabbages, 3 Tomatoes" */
export function buildPlantSummary(rows: PlantingSummaryRow[]): string {
  if (rows.length === 0) return '';
  return rows
    .map(r => {
      const qty = r.quantity ?? 1;
      return qty > 1 ? `${qty} ${r.grow_user_plants.name}` : r.grow_user_plants.name;
    })
    .join(', ');
}

/** Build a "last activity" string like "Planted Tomato 3d ago". Returns null if older than 30 days. */
export function buildLastActivity(rows: PlantingSummaryRow[]): string | null {
  if (rows.length === 0) return null;

  let newest: PlantingSummaryRow | null = null;
  let newestDate = 0;

  for (const r of rows) {
    if (!r.planted_at) continue;
    const d = new Date(r.planted_at).getTime();
    if (d > newestDate) {
      newestDate = d;
      newest = r;
    }
  }

  if (!newest || !newestDate) return null;

  const daysDiff = Math.floor((Date.now() - newestDate) / (1000 * 60 * 60 * 24));
  if (daysDiff > 30) return null;

  const name = newest.grow_user_plants.name;
  if (daysDiff === 0) return `Planted ${name} today`;
  if (daysDiff === 1) return `Planted ${name} 1d ago`;
  return `Planted ${name} ${daysDiff}d ago`;
}

export type BedPlantingRow = {
  id: string;
  bed_id: string;
  plant_id: string;
  quantity: number;
  planted_at: string;
  removed_at: string | null;
  harvest_data: Record<string, unknown> | null;
  created_at: string;
};

export type SerializedBedPlanting = {
  plantingId: string;
  plantId: string;
  plantName: string;
  plantType: string;
  speciesSlug: string | null;
  variety: string | null;
  photoUrl: string | null;
  quantity: number;
  plantedAt: string;
  removedAt?: string | null;
};

type BedPlantingJoinRow = BedPlantingRow & {
  grow_user_plants: {
    id: string;
    name: string;
    type: string;
    species_slug: string | null;
    variety: string | null;
    photo_url: string | null;
  };
};

export function serializeBedPlanting(row: BedPlantingJoinRow): SerializedBedPlanting {
  const plant = row.grow_user_plants;
  return {
    plantingId: row.id,
    plantId: plant.id,
    plantName: plant.name,
    plantType: plant.type,
    speciesSlug: plant.species_slug,
    variety: plant.variety,
    photoUrl: plant.photo_url,
    quantity: row.quantity ?? 1,
    plantedAt: row.planted_at,
    removedAt: row.removed_at ?? undefined,
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
