#!/usr/bin/env tsx

/**
 * Extract English UI text from Go Daisy pages for translation
 *
 * This script analyzes Go Daisy page files and extracts ONLY user-facing English text.
 * Filters out code, class names, variable names, and other non-UI content.
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
 * Check if text is actual UI content (not code)
 */
function isUIText(text: string): boolean {
  // Minimum length
  if (text.length < 3) return false;

  // Filter out code-like patterns
  if (
    // CSS class names (e.g., "min-h-screen bg-base-100")
    text.match(/^[\w-]+ [\w-]+ [\w-]+/) && text.includes('-') ||

    // Single CSS class (e.g., "btn-primary", "text-base-content")
    text.match(/^(btn|text|bg|border|flex|grid|container|card|badge|alert|input|modal|navbar|footer|hero|divider|loading|menu|tooltip|drawer|swap|indicator|mask|mockup|stack|avatar|countdown|stat|radial|rating|range|toggle|collapse|carousel|chat|timeline|steps|progress|join|diff|kbd|file|artboard|phone|stats|tabs)-[\w-]+$/) ||

    // Tailwind/DaisyUI utility classes
    text.match(/^(w|h|p|m|pt|pb|pl|pr|mt|mb|ml|mr|px|py|mx|my|gap|space|top|bottom|left|right|inset|z|opacity|rounded|shadow|ring)-/) ||

    // Numbers only
    text.match(/^\d+$/) ||

    // Variable names (camelCase, snake_case, PascalCase)
    (text.match(/^[a-z][a-zA-Z0-9]*$/) && text.length < 15) || // camelCase variable
    text.match(/^[A-Z][a-zA-Z0-9]*$/) && text.length < 20 || // PascalCase component
    text.match(/^[a-z]+_[a-z_]+$/) || // snake_case

    // Keywords and reserved words
    text.match(/^(const|let|var|function|if|else|return|import|export|from|default|true|false|null|undefined|async|await|try|catch|throw|class|extends|super|this|new|typeof|instanceof|break|continue|switch|case|while|for|do|in|of|void|delete|with|yield|static|public|private|protected)$/i) ||

    // JSX props and attributes
    text.match(/^(className|style|onClick|onChange|onSubmit|onClose|href|src|alt|width|height|role|aria|data|type|value|placeholder|disabled|checked|selected|required|readonly|tabIndex|id|key|ref)$/) ||

    // File paths and URLs
    text.match(/^(\/|\.\/|\.\.\/|http|https|www\.)/) ||
    text.includes('/api/') ||
    text.includes('.tsx') ||
    text.includes('.ts') ||
    text.includes('.js') ||
    text.includes('.css') ||
    text.includes('.svg') ||
    text.includes('.png') ||
    text.includes('.jpg') ||

    // Function calls
    text.match(/^\w+\(/) ||

    // Object properties (key: value patterns)
    text.includes(':') && text.length < 30 ||

    // Template literal markers
    text.includes('${') ||

    // React/JSX fragments
    text.match(/^<\/?[A-Z]/) ||

    // HTML/JSX tags
    text.match(/^<[a-z]+/) ||
    text.match(/<\/[a-z]+>$/) ||

    // Common code patterns
    text.includes('&&') ||
    text.includes('||') ||
    text.includes('=>') ||
    text.includes('?.') ||
    text.includes('??') ||

    // CSS values
    text.match(/^#[0-9a-f]{3,6}$/i) || // hex colors
    text.match(/^\d+px$/) || // pixels
    text.match(/^\d+%$/) || // percentages
    text.match(/^rgba?\(/) || // rgb/rgba colors

    // Only punctuation
    text.match(/^[{}<>()[\];,.:!?]+$/) ||

    // JavaScript object notation
    text.match(/^\{.*\}$/) ||
    text.match(/^\[.*\]$/)
  ) {
    return false;
  }

  // Must contain at least one space OR be a meaningful single word
  if (!text.includes(' ')) {
    // Allow common UI single words
    const allowedSingleWords = new Set([
      'today', 'tomorrow', 'yesterday', 'loading', 'error', 'success',
      'submit', 'cancel', 'save', 'delete', 'edit', 'view', 'close',
      'back', 'next', 'previous', 'home', 'settings', 'help', 'about',
      'login', 'logout', 'signup', 'register', 'profile', 'account',
      'weather', 'activities', 'support', 'privacy', 'terms', 'faq',
      'cookie', 'policy', 'yes', 'no', 'okay', 'continue', 'skip',
      'learn', 'more', 'less', 'show', 'hide', 'expand', 'collapse',
      'search', 'filter', 'sort', 'share', 'download', 'upload'
    ]);

    if (!allowedSingleWords.has(text.toLowerCase())) {
      return false;
    }
  }

  // Must contain at least one letter
  if (!text.match(/[a-zA-Z]/)) return false;

  // If it looks like a sentence (has spaces and punctuation), it's likely UI text
  if (text.match(/^[A-Z][a-z].*[.!?]$/)) return true;

  // If it has multiple words with normal capitalization, likely UI text
  if (text.match(/^[A-Z][a-z]+( [a-z]+)+/)) return true;

  return true;
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
    lowerText.match(/^(click|submit|cancel|save|delete|add|remove|confirm|choose|select|go to)/i)
  ) {
    return 'button';
  }

  // Heading patterns (h1-h6, title, heading classes)
  if (
    lowerLine.match(/<h[1-6]|className=".*title|className=".*heading|card-title/) ||
    text.length < 100 && text.match(/^(What|Why|How|When|Where|Who|About|Welcome|Get Started)/i)
  ) {
    return 'heading';
  }

  // Link patterns
  if (
    lowerLine.match(/<link|<a href|next\/link|href=/) ||
    lowerText.match(/^(learn more|read more|see more|view|visit)/i)
  ) {
    return 'link';
  }

  // Label patterns
  if (
    lowerLine.includes('label') ||
    lowerLine.includes('placeholder') ||
    (text.length < 50 && !text.match(/[.!?]$/))
  ) {
    return 'label';
  }

  // Nav patterns
  if (lowerLine.includes('nav') || lowerLine.includes('menu')) {
    return 'nav';
  }

  // Paragraph is default for longer text with sentence structure
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

    // Extract JSX text content between tags: >text<
    const jsxTextPattern = />([^<>{}\n]+)</g;
    let match;
    while ((match = jsxTextPattern.exec(line)) !== null) {
      let text = match[1]?.trim();
      if (!text) continue;

      // Clean up HTML entities
      text = text
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      // Filter out non-UI text
      if (!isUIText(text)) continue;

      // Detect category
      const category = detectCategory(line, text);

      // Generate context
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

    // Extract string literals that are clearly UI text (in quotes, but with spaces)
    const stringLiteralPattern = /["']([^"']{10,}?)["']/g;
    while ((match = stringLiteralPattern.exec(line)) !== null) {
      let text = match[1]?.trim();
      if (!text) continue;

      // Must have spaces to be UI text (not a class name or variable)
      if (!text.includes(' ')) continue;

      // Filter out non-UI text
      if (!isUIText(text)) continue;

      // Detect category
      const category = detectCategory(line, text);

      // Generate context
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
  console.log('🔍 Extracting user-facing English text from Go Daisy pages...\n');

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

  // Sample output for verification
  console.log('\n📋 Sample extracted strings:');
  deduplicated.slice(0, 10).forEach((str, idx) => {
    console.log(`   ${idx + 1}. [${str.category}] "${str.text_en.substring(0, 60)}${str.text_en.length > 60 ? '...' : ''}"`);
  });

  console.log('\n🎯 Next steps:');
  console.log('   1. Review godaisy-text-strings.json and verify quality');
  console.log('   2. Convert JSON to CSV format');
  console.log('   3. Bulk translate CSV using ChatGPT/Google Sheets/DeepL');
  console.log('   4. Import translations to Supabase ui_text_strings table');
}

main();
