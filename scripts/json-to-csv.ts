#!/usr/bin/env tsx

/**
 * Convert godaisy-text-strings.json to CSV format for bulk translation
 *
 * Converts the extracted JSON text strings to CSV format with columns for all 10 languages:
 * - text_key: Unique identifier
 * - text_en: English source text (filled)
 * - text_es: Spanish translation (empty, to be filled)
 * - text_fr: French translation (empty)
 * - text_pt: Portuguese translation (empty)
 * - text_de: German translation (empty)
 * - text_it: Italian translation (empty)
 * - text_nl: Dutch translation (empty)
 * - text_pl: Polish translation (empty)
 * - text_tr: Turkish translation (empty)
 * - text_sv: Swedish translation (empty)
 * - context: Description of where/how text is used
 * - page: Page name
 * - category: UI element type
 *
 * Usage:
 *   npx tsx scripts/json-to-csv.ts
 *   # Output: godaisy-text-strings.csv
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const INPUT_FILE = path.join(process.cwd(), 'godaisy-text-strings.json');
const OUTPUT_FILE = path.join(process.cwd(), 'godaisy-text-strings.csv');

interface TextString {
  text_key: string;
  text_en: string;
  context: string;
  page: string;
  category: string;
}

/**
 * Escape CSV field (handle quotes and commas)
 */
function escapeCSV(value: string): string {
  if (!value) return '';

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Convert JSON to CSV
 */
function convertToCSV(strings: TextString[]): string {
  // CSV header with all language columns
  const header = [
    'text_key',
    'text_en',
    'text_es',  // Spanish
    'text_fr',  // French
    'text_pt',  // Portuguese
    'text_de',  // German
    'text_it',  // Italian
    'text_nl',  // Dutch
    'text_pl',  // Polish
    'text_tr',  // Turkish
    'text_sv',  // Swedish
    'context',
    'page',
    'category',
  ].join(',');

  // CSV rows
  const rows = strings.map((str) => {
    return [
      escapeCSV(str.text_key),
      escapeCSV(str.text_en),
      '', // text_es (empty - to be filled by translator)
      '', // text_fr
      '', // text_pt
      '', // text_de
      '', // text_it
      '', // text_nl
      '', // text_pl
      '', // text_tr
      '', // text_sv
      escapeCSV(str.context),
      escapeCSV(str.page),
      escapeCSV(str.category),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Main execution
 */
function main() {
  console.log('📄 Converting JSON to CSV...\n');

  // Read JSON file
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Error: ${INPUT_FILE} not found`);
    console.error('   Run "npx tsx scripts/extract-godaisy-text.ts" first');
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  const strings: TextString[] = JSON.parse(jsonContent);

  console.log(`📊 Processing ${strings.length} strings...`);

  // Convert to CSV
  const csvContent = convertToCSV(strings);

  // Write CSV file
  fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf-8');

  console.log(`✅ CSV file created: ${OUTPUT_FILE}`);
  console.log(`\n📈 CSV columns:`);
  console.log('   - text_key: Unique identifier');
  console.log('   - text_en: English source text (filled)');
  console.log('   - text_es: Spanish (empty - to be filled)');
  console.log('   - text_fr: French (empty)');
  console.log('   - text_pt: Portuguese (empty)');
  console.log('   - text_de: German (empty)');
  console.log('   - text_it: Italian (empty)');
  console.log('   - text_nl: Dutch (empty)');
  console.log('   - text_pl: Polish (empty)');
  console.log('   - text_tr: Turkish (empty)');
  console.log('   - text_sv: Swedish (empty)');
  console.log('   - context: Description');
  console.log('   - page: Page name');
  console.log('   - category: UI element type');

  console.log('\n🎯 Next steps:');
  console.log('   1. Open godaisy-text-strings.csv in Google Sheets or Excel');
  console.log('   2. Use ChatGPT, Google Translate, or DeepL bulk API to fill translation columns');
  console.log('   3. For ChatGPT: "Translate the text_en column to Spanish in text_es, French in text_fr, etc."');
  console.log('   4. Export as CSV and use import script to load into Supabase');
}

main();
