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
  };
}
