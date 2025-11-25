#!/usr/bin/env tsx

/**
 * Import translated CSV into Supabase ui_text_strings table
 *
 * This script imports the bulk-translated CSV file into the Supabase ui_text_strings table.
 * It handles upserts (insert or update) to support re-importing with updates.
 *
 * Prerequisites:
 * - .env.local must contain SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * - CSV must have been translated (all language columns filled)
 * - ui_text_strings table must exist in Supabase
 *
 * Usage:
 *   npx tsx scripts/import-translations.ts
 *   # Imports from godaisy-text-strings.csv
 *
 *   # Or specify custom file:
 *   npx tsx scripts/import-translations.ts path/to/custom.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const DEFAULT_INPUT_FILE = path.join(process.cwd(), 'godaisy-text-strings.csv');
const BATCH_SIZE = 50; // Insert in batches to avoid payload limits

// Validate environment
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Ensure .env.local contains:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface CSVRow {
  text_key: string;
  text_en: string;
  text_es: string;
  text_fr: string;
  text_pt: string;
  text_de: string;
  text_it: string;
  text_nl: string;
  text_pl: string;
  text_tr: string;
  text_sv: string;
  context: string;
  page: string;
  category: string;
}

/**
 * Parse CSV file into rows
 */
function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim());

  // Parse rows
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Handle CSV with quoted fields
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          // Escaped quote
          currentValue += '"';
          j++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field delimiter
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add last value
    values.push(currentValue.trim());

    // Map to CSVRow object
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

/**
 * Import rows into Supabase in batches
 */
async function importRows(rows: CSVRow[]): Promise<void> {
  console.log(`\n📥 Importing ${rows.length} rows in batches of ${BATCH_SIZE}...`);

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    try {
      // Upsert batch (insert or update based on text_key)
      const { data, error } = await supabase
        .from('ui_text_strings')
        .upsert(batch, {
          onConflict: 'text_key', // Update existing rows with same text_key
        });

      if (error) {
        errorCount += batch.length;
        errors.push(`Batch ${i / BATCH_SIZE + 1}: ${error.message}`);
        console.error(`❌ Error in batch ${i / BATCH_SIZE + 1}:`, error.message);
      } else {
        successCount += batch.length;
        console.log(
          `✅ Batch ${i / BATCH_SIZE + 1}/${Math.ceil(rows.length / BATCH_SIZE)}: Imported ${batch.length} rows`
        );
      }
    } catch (err) {
      errorCount += batch.length;
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Batch ${i / BATCH_SIZE + 1}: ${errMsg}`);
      console.error(`❌ Error in batch ${i / BATCH_SIZE + 1}:`, errMsg);
    }
  }

  console.log(`\n📊 Import complete:`);
  console.log(`   ✅ Success: ${successCount} rows`);
  console.log(`   ❌ Errors: ${errorCount} rows`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Error details:`);
    errors.forEach((err) => console.log(`   ${err}`));
  }
}

/**
 * Validate translations (check if all language columns are filled)
 */
function validateTranslations(rows: CSVRow[]): void {
  console.log('\n🔍 Validating translations...');

  const languages = ['text_es', 'text_fr', 'text_pt', 'text_de', 'text_it', 'text_nl', 'text_pl', 'text_tr', 'text_sv'];
  const missingTranslations: Record<string, number> = {};

  languages.forEach((lang) => (missingTranslations[lang] = 0));

  rows.forEach((row) => {
    languages.forEach((lang) => {
      if (!row[lang as keyof CSVRow] || row[lang as keyof CSVRow].trim() === '') {
        missingTranslations[lang]++;
      }
    });
  });

  let hasWarnings = false;

  languages.forEach((lang) => {
    const missing = missingTranslations[lang];
    if (missing > 0) {
      console.warn(`⚠️  ${lang}: ${missing} missing translations (${Math.round((missing / rows.length) * 100)}%)`);
      hasWarnings = true;
    } else {
      console.log(`✅ ${lang}: All translations present`);
    }
  });

  if (hasWarnings) {
    console.warn('\n⚠️  Warning: Some translations are missing. Proceeding with import...');
    console.warn('   Missing translations will be filled with English text or empty strings.');
  } else {
    console.log('\n✅ All translations complete!');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting translation import...\n');

  // Get input file
  const inputFile = process.argv[2] || DEFAULT_INPUT_FILE;

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: CSV file not found: ${inputFile}`);
    console.error('   Run "npx tsx scripts/json-to-csv.ts" first to generate the CSV');
    process.exit(1);
  }

  console.log(`📂 Reading CSV file: ${inputFile}`);

  // Parse CSV
  const rows = parseCSV(inputFile);
  console.log(`📊 Found ${rows.length} rows`);

  // Validate translations
  validateTranslations(rows);

  // Import to Supabase
  await importRows(rows);

  console.log('\n✅ Import process complete!');
  console.log('\n🎯 Next steps:');
  console.log('   1. Verify data in Supabase dashboard');
  console.log('   2. Test translations with useUIText hook');
  console.log('   3. Wrap UI text with TranslatedText components');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
