#!/usr/bin/env tsx

/**
 * Extract English UI text from Go Daisy pages for translation
 *
 * This script analyzes Go Daisy page files and extracts all user-facing English text
 * into a structured format for bulk translation. It generates a JSON file that can be
 * converted to CSV and translated using ChatGPT/Google Sheets/DeepL bulk API.
 *
 * Output format matches ui_text_strings table schema:
 * - text_key: Unique identifier (e.g., "homepage.hero.title")
 * - text_en: English source text
 * - context: Description of where/how this text is used
 * - page: Page or component where it appears
 * - category: Type of UI element (button, heading, paragraph, etc.)
 *
 * Usage:
 *   npx tsx scripts/extract-godaisy-text.ts
 *   # Output: godaisy-text-strings.json
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PAGES_DIR = path.join(process.cwd(), 'pages');
const OUTPUT_FILE = path.join(process.cwd(), 'godaisy-text-strings.json');

// Go Daisy pages to extract (not Findr)
const GO_DAISY_PAGES = [
  'index.tsx',
  'support.tsx',
  'whether-weather.tsx',
  'AboutUs.tsx',
  'activities.tsx',
  'weather.tsx',
  'FAQs.tsx',
  'HowWeDoIt.tsx',
  'CookiePolicy.tsx',
  'PrivacyPolicy.tsx',
  'TermsAndConditions.tsx',
  'interests.tsx',
  'onboarding.tsx',
];

interface TextString {
  text_key: string;
  text_en: string;
  context: string;
  page: string;
  category: 'button' | 'heading' | 'paragraph' | 'label' | 'link' | 'nav' | 'other';
}

const extractedStrings: TextString[] = [];
let keyCounter = 0;

/**
 * Generate unique key for text string
 */
function generateKey(page: string, category: string, text: string): string {
  const pageName = page.replace('.tsx', '').toLowerCase();
  const textSlug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .substring(0, 30);
  keyCounter++;
  return `${pageName}.${category}.${textSlug}_${keyCounter}`;
}

/**
 * Detect category based on context
 */
function detectCategory(line: string, text: string): TextString['category'] {
  const lowerLine = line.toLowerCase();
  const lowerText = text.toLowerCase();

  // Button patterns
  if (
    lowerLine.includes('button') ||
    lowerLine.includes('btn') ||
    lowerLine.match(/onclick|onsubmit|type="button"|type="submit"/) ||
    lowerText.match(/^(click|submit|cancel|save|delete|add|remove|confirm)/i)
  ) {
    return 'button';
  }

  // Heading patterns (h1-h6, title, heading classes)
  if (
    lowerLine.match(/<h[1-6]|className=".*title|className=".*heading|className="card-title"/) ||
    lowerText.match(/^(what|why|how|when|where|who)/i) && text.length < 100
  ) {
    return 'heading';
  }

  // Link patterns
  if (
    lowerLine.match(/<link|<a href|next\/link/) ||
    lowerText.match(/^(learn more|read more|see more|view|go to)/i)
  ) {
    return 'link';
  }

  // Label patterns
  if (
    lowerLine.includes('label') ||
    lowerLine.includes('placeholder') ||
    text.length < 50 && !text.match(/[.!?]$/)
  ) {
    return 'label';
  }

  // Nav patterns
  if (lowerLine.includes('nav') || lowerLine.includes('menu')) {
    return 'nav';
  }

  // Paragraph is default for longer text
  if (text.length > 50 || text.match(/[.!?]$/)) {
    return 'paragraph';
  }

  return 'other';
}

/**
 * Extract text strings from a file
 */
function extractFromFile(filePath: string, pageName: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Regex patterns for extracting text
  const patterns = [
    // JSX text content: >text<
    />([\w\s,.!?'"-]+)</g,
    // String literals in JSX: "text" or 'text'
    /["']([^"']{3,}?)["']/g,
    // Template literals with text (not variables)
    /`([^`${]+)`/g,
  ];

  lines.forEach((line, lineNum) => {
    // Skip comments, imports, and code-only lines
    if (
      line.trim().startsWith('//') ||
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*') ||
      line.trim().startsWith('import ') ||
      line.trim().startsWith('export ') ||
      line.includes('console.log') ||
      line.includes('console.error') ||
      !line.trim()
    ) {
      return;
    }

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        let text = match[1]?.trim();

        if (!text) continue;

        // Filter out code-like text
        if (
          text.length < 3 ||
          text.match(/^[{}<>()[\];,.:]+$/) || // Only punctuation
          text.match(/^(const|let|var|function|if|else|return|import|export|from|default)$/i) || // Keywords
          text.match(/^\d+$/) || // Only numbers
          text.match(/^[a-z_]+$/i) && text.length < 10 || // Single word variables
          text.match(/^(true|false|null|undefined)$/i) || // Boolean/null
          text.match(/^[A-Z_]+$/) || // Constants like "API_KEY"
          text.includes('${') || // Template literals with variables
          text.includes('className') ||
          text.includes('style=') ||
          text.match(/^\w+\(/) // Function calls
        ) {
          continue;
        }

        // Clean up HTML entities
        text = text
          .replace(/&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        // Detect category
        const category = detectCategory(line, text);

        // Generate context from surrounding code
        const context = `Line ${lineNum + 1}: ${line.trim().substring(0, 80)}`;

        // Add to extracted strings
        extractedStrings.push({
          text_key: generateKey(pageName, category, text),
          text_en: text,
          context,
          page: pageName.replace('.tsx', ''),
          category,
        });
      }
    });
  });
}

/**
 * Deduplicate extracted strings (keep first occurrence)
 */
function deduplicateStrings(strings: TextString[]): TextString[] {
  const seen = new Set<string>();
  return strings.filter((str) => {
    if (seen.has(str.text_en)) {
      return false;
    }
    seen.add(str.text_en);
    return true;
  });
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Extracting English text from Go Daisy pages...\n');

  GO_DAISY_PAGES.forEach((page) => {
    const filePath = path.join(PAGES_DIR, page);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${page} (file not found)`);
      return;
    }

    console.log(`📄 Processing ${page}...`);
    extractFromFile(filePath, page);
  });

  // Deduplicate
  console.log(`\n📊 Found ${extractedStrings.length} text strings`);
  const deduplicated = deduplicateStrings(extractedStrings);
  console.log(`📊 After deduplication: ${deduplicated.length} unique strings`);

  // Write to JSON file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deduplicated, null, 2), 'utf-8');
  console.log(`\n✅ Extracted text saved to: ${OUTPUT_FILE}`);

  // Statistics
  const byCategory = deduplicated.reduce((acc, str) => {
    acc[str.category] = (acc[str.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📈 Statistics by category:');
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });

  console.log('\n🎯 Next steps:');
  console.log('   1. Review godaisy-text-strings.json and remove any non-UI text');
  console.log('   2. Convert JSON to CSV format');
  console.log('   3. Bulk translate CSV using ChatGPT/Google Sheets/DeepL');
  console.log('   4. Import translations to Supabase ui_text_strings table');
}

main();
