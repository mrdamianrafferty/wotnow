#!/usr/bin/env tsx

/**
 * Clean extracted text by removing non-UI strings
 *
 * This script manually filters out remaining non-UI text that slipped through:
 * - CSS values (drop-shadow, rgba, px, solid, etc.)
 * - Alt text labels ("weather icon", "temperature icon", etc.)
 * - Developer error messages
 * - Code artifacts
 */

import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = path.join(process.cwd(), 'godaisy-text-strings.json');
const OUTPUT_FILE = path.join(process.cwd(), 'godaisy-text-strings-clean.json');

interface TextString {
  text_key: string;
  text_en: string;
  context: string;
  page: string;
  category: string;
}

/**
 * Check if text should be excluded (not user-facing)
 */
function shouldExclude(text: string): boolean {
  // CSS filter/style values
  if (
    text.includes('drop-shadow') ||
    text.includes('rgba(') ||
    text.includes('filter:') ||
    text.match(/\d+px\s+(solid|dashed|dotted)/) ||
    text.match(/^\d+px\s+solid\s+#/) ||
    text.includes('linear-gradient')
  ) {
    return true;
  }

  // Alt text / aria labels (technical, not UI text)
  if (
    text.match(/^(weather|wind|temperature|rain|humidity|cloud|sun)\s+icon$/i) ||
    text.match(/^(air|water|high|low)\s+temperature$/i) ||
    text === 'Wind' ||
    text === 'Precipitation'
  ) {
    return true;
  }

  // Developer error messages (not shown to users normally)
  if (
    text.includes('Failed to fetch') ||
    text.includes('Error:') ||
    text.includes('console.')
  ) {
    return true;
  }

  // Very short generic labels (like "more", "less" without context)
  if (text.length < 4 && !text.match(/^(yes|no|ok)$/i)) {
    return true;
  }

  // Inline styles or object properties
  if (
    text.match(/^(textAlign|padding|margin|background|border|color|width|height):\s*/) ||
    text.includes(' as const')
  ) {
    return true;
  }

  return false;
}

function main() {
  console.log('🧹 Cleaning extracted text...\n');

  // Read input file
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Error: ${INPUT_FILE} not found`);
    console.error('   Run "npx tsx scripts/extract-godaisy-text.ts" first');
    process.exit(1);
  }

  const jsonContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  const strings: TextString[] = JSON.parse(jsonContent);

  console.log(`📊 Original: ${strings.length} strings`);

  // Filter out non-UI text
  const cleaned = strings.filter((str) => !shouldExclude(str.text_en));

  console.log(`📊 After cleaning: ${cleaned.length} strings`);
  console.log(`🗑️  Removed: ${strings.length - cleaned.length} non-UI strings`);

  // Write cleaned output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
  console.log(`\n✅ Cleaned text saved to: ${OUTPUT_FILE}`);

  // Show removed strings for verification
  const removed = strings.filter((str) => shouldExclude(str.text_en));
  if (removed.length > 0) {
    console.log('\n🗑️  Removed strings (sample):');
    removed.slice(0, 10).forEach((str, idx) => {
      console.log(`   ${idx + 1}. "${str.text_en.substring(0, 60)}${str.text_en.length > 60 ? '...' : ''}"`);
    });
    if (removed.length > 10) {
      console.log(`   ... and ${removed.length - 10} more`);
    }
  }

  // Show cleaned sample
  console.log('\n✅ Cleaned strings (sample):');
  cleaned.slice(0, 10).forEach((str, idx) => {
    console.log(`   ${idx + 1}. [${str.category}] "${str.text_en.substring(0, 60)}${str.text_en.length > 60 ? '...' : ''}"`);
  });

  console.log('\n🎯 Next step:');
  console.log('   npx tsx scripts/json-to-csv.ts godaisy-text-strings-clean.json');
}

main();
