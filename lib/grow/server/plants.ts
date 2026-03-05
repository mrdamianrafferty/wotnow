export type PlantRow = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  location: string | null;
  health: string | null;
  planted_at: string | null;
  last_watered_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  species_slug: string | null;
  variety: string | null;
  quantity: number | null;
  source: string | null;
  expected_harvest_at: string | null;
  cost_cents: number | null;
  photo_url: string | null;
  bed_id: string | null;
};

export type SerializedPlant = {
  id: string;
  name: string;
  type: string;
  location?: string | null;
  health?: string | null;
  planted?: string | null;
  lastWatered?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Enhanced fields
  speciesSlug?: string | null;
  variety?: string | null;
  quantity?: number | null;
  source?: string | null;
  expectedHarvest?: string | null;
  costCents?: number | null;
  photoUrl?: string | null;
  bedId?: string | null;
};

export type InsertPlantRow = {
  user_id: string;
  name: string;
  type: string;
  location: string | null;
  health: string;
  planted_at: string | null;
  last_watered_at: string | null;
  notes: string | null;
  // Enhanced fields (all optional)
  species_slug?: string | null;
  variety?: string | null;
  quantity?: number | null;
  source?: string | null;
  expected_harvest_at?: string | null;
  cost_cents?: number | null;
  photo_url?: string | null;
  // Custom species fields (for plants not in our database)
  scientific_name?: string | null;
  wiki_description?: string | null;
  wiki_url?: string | null;
  wiki_image_url?: string | null;
  wiki_image_license?: string | null;
  identification_data?: Record<string, unknown> | null;
  is_community_photo?: boolean;
  community_photo_url?: string | null;
  bed_id?: string | null;
};

export function serializePlant(row: PlantRow): SerializedPlant {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    location: row.location,
    health: row.health,
    planted: row.planted_at,
    lastWatered: row.last_watered_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Enhanced fields
    speciesSlug: row.species_slug,
    variety: row.variety,
    quantity: row.quantity,
    source: row.source,
    expectedHarvest: row.expected_harvest_at,
    costCents: row.cost_cents,
    photoUrl: row.photo_url,
    bedId: row.bed_id,
  };
}
