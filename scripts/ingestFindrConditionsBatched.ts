#!/usr/bin/env tsx
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

import { ingestRectangles, loadTargetRectangles } from './ingestFindrConditions';

function parseEnvBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseEnvNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_INTERVAL_MINUTES = 30;

function getSupabaseClient(): SupabaseClient<any> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient<any>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function main() {
  const metOnly = parseEnvBoolean(process.env.FINDR_MET_ONLY);
  const stormglassKey = process.env.STORMGLASS_SECRET_KEY || process.env.STORMGLASS_API_KEY;
  if (!stormglassKey && !metOnly) {
    console.error('Missing Stormglass key. Set STORMGLASS_SECRET_KEY or STORMGLASS_API_KEY.');
    process.exit(1);
  }

  const client = getSupabaseClient();

  const batchSize = parseEnvNumber(process.env.FINDR_CONDITIONS_BATCH_SIZE) ?? DEFAULT_BATCH_SIZE;
  const intervalMinutes = parseEnvNumber(process.env.FINDR_CONDITIONS_INTERVAL_MINUTES) ?? DEFAULT_INTERVAL_MINUTES;
  const delayPerRequestMs = parseEnvNumber(process.env.FINDR_CONDITIONS_DELAY_MS) ?? 300;
  const totalTarget = parseEnvNumber(process.env.FINDR_CONDITIONS_TOTAL);

  const rectangles = await loadTargetRectangles(client, totalTarget);

  if (!rectangles.length) {
    console.error('[conditions-ingest-batcher] No rectangles available to ingest. Aborting.');
    process.exit(1);
  }

  console.info(`[conditions-ingest-batcher] Starting batched ingestion for ${rectangles.length} rectangles (batch size=${batchSize}, interval=${intervalMinutes} minutes).`);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  let totalSuccess = 0;
  for (let offset = 0; offset < rectangles.length; offset += batchSize) {
    const batch = rectangles.slice(offset, offset + batchSize);
    if (!batch.length) continue;

    console.info(`[conditions-ingest-batcher] Processing batch ${offset / batchSize + 1} (${batch.length} rectangles, codes ${batch[0].code} → ${batch[batch.length - 1].code}).`);

    try {
      const result = await ingestRectangles(client, batch, stormglassKey, {
        delayBetweenRequestsMs: delayPerRequestMs,
        metOnly,
      });

      totalSuccess += result.successCount;
      console.info(`[conditions-ingest-batcher] Batch complete: ${result.successCount}/${batch.length} successful (captured_at=${result.capturedAtISO}). Total so far ${totalSuccess}/${rectangles.length}.`);
    } catch (error) {
      console.error(`[conditions-ingest-batcher] Batch failed at offset ${offset}.`, error);
    }

    const hasMore = offset + batch.length < rectangles.length;
    if (hasMore) {
      const sleepMs = intervalMinutes * 60 * 1000;
      console.info(`[conditions-ingest-batcher] Sleeping for ${intervalMinutes} minutes before next batch...`);
      await sleep(sleepMs);
    }
  }

  console.info(`[conditions-ingest-batcher] All batches processed. ${totalSuccess}/${rectangles.length} rectangles ingested.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error in batched ingestion script', error);
    process.exit(1);
  });
}
