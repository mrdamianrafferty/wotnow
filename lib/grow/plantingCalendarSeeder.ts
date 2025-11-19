import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_TABLE = 'grow_planting_calendar';
const ALLOWED_WINDOW_TYPES = new Set(['sow_indoor', 'sow_outdoor', 'transplant', 'harvest']);
const ALLOWED_ZONE_CODES = new Set([
  'atlantic_mild',
  'cool_maritime',
  'continental_cool',
  'med_marine',
  'southern_hot_dry',
  'mountain_cool',
]);
const ALLOWED_DATA_QUALITY = new Set(['authoritative', 'derived', 'estimated']);
const DEFAULT_BATCH_SIZE = 200;

export interface SeedLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface SeedPlantingCalendarOptions {
  sourceUrl?: string;
  dryRun?: boolean;
  logger?: SeedLogger;
  batchSize?: number;
  tableName?: string;
}

export interface SeedPlantingCalendarResult {
  attempted: number;
  upserted: number;
  skipped: number;
  datasetVersion: string | null;
  sourceUsed: string;
  fallbackUsed: boolean;
  plantsProcessed: number;
  notes?: string[];
}

type PlantingCalendarDataset = {
  metadata?: {
    version?: string;
    data_owner?: string;
    source_summary?: string;
    license?: string;
    fallback?: boolean;
  };
  plants: PlantDefinition[];
};

type PlantDefinition = {
  plant_slug: string;
  common_name?: string;
  scientific_name?: string;
  windows: PlantingWindowDefinition[];
};

type PlantingWindowDefinition = {
  climate_zone_code: string;
  window_type: string;
  start_day_of_year: number;
  end_day_of_year: number;
  tasks?: string[];
  data_quality?: string;
  source?: string;
  source_url?: string;
  notes?: string;
  data_version?: string;
};

interface FlatPlantingRow {
  plant_slug: string;
  plant_common_name: string | null;
  plant_scientific_name: string | null;
  climate_zone_code: string;
  window_type: string;
  start_day_of_year: number;
  end_day_of_year: number;
  tasks: string[];
  data_quality: string;
  source: string | null;
  source_url: string | null;
  notes: string | null;
  data_version: string;
}

export class PlantingCalendarSeedError extends Error {}

export async function seedPlantingCalendar(options: SeedPlantingCalendarOptions = {}): Promise<SeedPlantingCalendarResult> {
  const logger = options.logger ?? console;
  const notes: string[] = [];

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new PlantingCalendarSeedError('Supabase credentials are missing (SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
  }

  const { dataset, sourceUsed, fallbackUsed } = await loadDataset({
    explicitSourceUrl: options.sourceUrl,
    logger,
  });

  const { rows, skipped } = flattenDataset(dataset, logger, notes);
  const attempted = rows.length;

  if (attempted === 0) {
    return {
      attempted,
      upserted: 0,
      skipped,
      datasetVersion: dataset.metadata?.version ?? null,
      sourceUsed,
      fallbackUsed,
      plantsProcessed: dataset.plants.length,
      notes,
    };
  }

  if (options.dryRun) {
    logger.info(`Dry run: prepared ${attempted} planting calendar rows for upsert.`);
    return {
      attempted,
      upserted: 0,
      skipped,
      datasetVersion: dataset.metadata?.version ?? null,
      sourceUsed,
      fallbackUsed,
      plantsProcessed: dataset.plants.length,
      notes: notes.concat('Dry run, no data written.'),
    };
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const upserted = await upsertRows({
    client,
    rows,
    batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
    tableName: options.tableName ?? DEFAULT_TABLE,
    logger,
  });

  return {
    attempted,
    upserted,
    skipped,
    datasetVersion: dataset.metadata?.version ?? null,
    sourceUsed,
    fallbackUsed,
    plantsProcessed: dataset.plants.length,
    notes,
  };
}

async function loadDataset({
  explicitSourceUrl,
  logger,
}: {
  explicitSourceUrl?: string;
  logger: SeedLogger;
}): Promise<{ dataset: PlantingCalendarDataset; sourceUsed: string; fallbackUsed: boolean }>
{  const fallbackPath = path.join(process.cwd(), 'data', 'grow', 'planting_calendar_baseline.json');
  const configuredUrl = explicitSourceUrl ?? process.env.PLANTING_CALENDAR_SOURCE_URL;

  if (configuredUrl) {
    try {
      logger.info(`Fetching planting calendar dataset from ${configuredUrl}`);
      const response = await fetch(configuredUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const dataset = (await response.json()) as PlantingCalendarDataset;
      validateDatasetShape(dataset);
      return { dataset, sourceUsed: configuredUrl, fallbackUsed: false };
    } catch (error) {
      logger.warn(`Failed to download planting calendar dataset from ${configuredUrl}. Falling back to bundled baseline.`, error);
    }
  }

  logger.info('Loading planting calendar dataset from bundled baseline file.');
  const raw = await readFile(fallbackPath, 'utf-8');
  const dataset = JSON.parse(raw) as PlantingCalendarDataset;
  validateDatasetShape(dataset);
  return { dataset, sourceUsed: fallbackPath, fallbackUsed: true };
}

function validateDatasetShape(dataset: PlantingCalendarDataset) {
  if (!dataset || !Array.isArray(dataset.plants)) {
    throw new PlantingCalendarSeedError('Dataset format invalid: plants array not found.');
  }

  for (const [index, plant] of dataset.plants.entries()) {
    if (!plant.plant_slug) {
      throw new PlantingCalendarSeedError(`Plant entry at index ${index} is missing plant_slug.`);
    }
    if (!Array.isArray(plant.windows)) {
      throw new PlantingCalendarSeedError(`Plant ${plant.plant_slug} is missing windows array.`);
    }
  }
}

function flattenDataset(dataset: PlantingCalendarDataset, logger: SeedLogger, notes: string[]): { rows: FlatPlantingRow[]; skipped: number } {
  const rows: FlatPlantingRow[] = [];
  let skipped = 0;
  const datasetVersion = dataset.metadata?.version ?? new Date().toISOString().slice(0, 10);

  for (const plant of dataset.plants) {
    for (const windowDef of plant.windows) {
      const validationError = validateWindow(plant, windowDef);
      if (validationError) {
        logger.warn(`Skipping ${plant.plant_slug} (${windowDef.climate_zone_code}/${windowDef.window_type}): ${validationError}`);
        notes.push(`${plant.plant_slug} ${windowDef.window_type} skipped: ${validationError}`);
        skipped += 1;
        continue;
      }

      rows.push({
        plant_slug: plant.plant_slug,
        plant_common_name: plant.common_name ?? null,
        plant_scientific_name: plant.scientific_name ?? null,
        climate_zone_code: windowDef.climate_zone_code,
        window_type: windowDef.window_type,
        start_day_of_year: windowDef.start_day_of_year,
        end_day_of_year: windowDef.end_day_of_year,
        tasks: windowDef.tasks?.length ? windowDef.tasks : [],
        data_quality: windowDef.data_quality ?? 'derived',
        source: windowDef.source ?? dataset.metadata?.source_summary ?? null,
        source_url: windowDef.source_url ?? null,
        notes: windowDef.notes ?? null,
        data_version: windowDef.data_version ?? datasetVersion,
      });
    }
  }

  return { rows, skipped };
}

function validateWindow(plant: PlantDefinition, windowDef: PlantingWindowDefinition): string | null {
  if (!ALLOWED_ZONE_CODES.has(windowDef.climate_zone_code)) {
    return `Unsupported climate zone ${windowDef.climate_zone_code}`;
  }

  if (!ALLOWED_WINDOW_TYPES.has(windowDef.window_type)) {
    return `Unsupported window type ${windowDef.window_type}`;
  }

  if (typeof windowDef.start_day_of_year !== 'number' || typeof windowDef.end_day_of_year !== 'number') {
    return 'Missing numeric start/end day of year values';
  }

  if (windowDef.start_day_of_year < 1 || windowDef.start_day_of_year > 366) {
    return `start_day_of_year ${windowDef.start_day_of_year} out of range`;
  }

  if (windowDef.end_day_of_year < 1 || windowDef.end_day_of_year > 366) {
    return `end_day_of_year ${windowDef.end_day_of_year} out of range`;
  }

  if (windowDef.start_day_of_year > windowDef.end_day_of_year) {
    return 'start_day_of_year is after end_day_of_year';
  }

  if (windowDef.data_quality && !ALLOWED_DATA_QUALITY.has(windowDef.data_quality)) {
    return `Unsupported data_quality ${windowDef.data_quality}`;
  }

  if (windowDef.tasks && !Array.isArray(windowDef.tasks)) {
    return 'tasks must be an array of strings';
  }

  if (windowDef.tasks && windowDef.tasks.some((item) => typeof item !== 'string')) {
    return 'tasks must contain only strings';
  }

  return null;
}

async function upsertRows({
  client,
  rows,
  batchSize,
  tableName,
  logger,
}: {
  client: SupabaseClient;
  rows: FlatPlantingRow[];
  batchSize: number;
  tableName: string;
  logger: SeedLogger;
}): Promise<number> {
  let processed = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const { error } = await client
      .from(tableName)
      .upsert(batch, {
        onConflict: 'plant_slug,climate_zone_code,window_type,start_day_of_year',
      });

    if (error) {
      throw new PlantingCalendarSeedError(`Failed to upsert batch starting at index ${index}: ${error.message}`);
    }

    processed += batch.length;
    logger.info(`Upserted ${processed}/${rows.length} planting calendar rows...`);
  }

  return processed;
}
