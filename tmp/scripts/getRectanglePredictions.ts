#!/usr/bin/env tsx
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mapPrediction } from '../../lib/findr/mapPrediction';
import type { FishingPrediction } from '../../hooks/useFishingPredictions';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function normalizeCode(input?: string): string {
  return (input ?? '21D8').trim().toUpperCase();
}

function getIsoDate(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

async function fetchPredictions(rectangleCode: string, predictionDate: string) {
  const { data, error } = await client.rpc('get_fishing_predictions', {
    rectangle_code_input: rectangleCode,
    prediction_date_input: predictionDate,
    user_language: 'en',
  });

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data as FishingPrediction[];
}

async function main() {
  const rectangleCode = normalizeCode(process.argv[2]);
  const predictionDate = getIsoDate();

  try {
    const records = await fetchPredictions(rectangleCode, predictionDate);

    if (!records.length) {
      console.log(`No fishing predictions returned for rectangle ${rectangleCode} (date ${predictionDate}).`);
      return;
    }

    const mapped = records
      .map((record, index) => mapPrediction(record, index))
      .filter((card): card is NonNullable<ReturnType<typeof mapPrediction>> => Boolean(card))
      .slice(0, 10);

    console.log(`Fishing predictions for rectangle ${rectangleCode} (date ${predictionDate}):`);
    for (const card of mapped) {
      console.log('----------------------------------------');
      console.log(`Rank: ${card.id}`);
      console.log(`Species: ${card.commonName}`);
      if (card.scientificName) console.log(`Scientific name: ${card.scientificName}`);
      console.log(`Confidence: ${card.confidence ?? 'n/a'}`);
      if (card.summary) console.log(`Summary: ${card.summary}`);
      if (card.playfulBio) console.log(`Bio: ${card.playfulBio}`);
      if (card.rationale.length) console.log(`Rationale: ${card.rationale.join(' ')}`);
      if (card.baitSuggestions.length) console.log(`Bait: ${card.baitSuggestions.join(', ')}`);
      if (card.tideTips.length) console.log(`Tide tips: ${card.tideTips.join(' ')}`);
      if (card.statusNotes.length) console.log(`Status notes: ${card.statusNotes.join(' ')}`);
    }
  } catch (error) {
    console.error('Failed to load predictions:', error);
    process.exit(1);
  }
}

main();
