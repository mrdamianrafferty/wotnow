#!/usr/bin/env ts-node
/**
 * Regenerate bgMapOptimized.ts based on actual WEBP files
 */

import * as fs from 'fs';
import * as path from 'path';

const WEBP_DIR = path.join(process.cwd(), 'public/WEBP');
const PNGS_DIR = path.join(process.cwd(), 'public/PNGS');
const OUTPUT_FILE = path.join(process.cwd(), 'data/bgMapOptimized.ts');

// Read existing bgMapOptimized to get the activity ID mappings
const existingFile = fs.readFileSync(OUTPUT_FILE, 'utf8');

// Extract activity ID to filename mappings from existing file
const activityMappings: Record<string, string> = {};

// Parse existing mappings (looking for patterns like "football_soccer: { ... '/webp/soccer...")
const mappingRegex = /(\w+):\s*\{[\s\S]*?['"]\/[^/]+\/([^-'"\.]+)/g;
let match;
while ((match = mappingRegex.exec(existingFile)) !== null) {
  const activityId = match[1];
  let filename = match[2];
  // Remove any extensions that might have been captured
  filename = filename.replace(/\.(webp|png|jpg|jpeg)$/, '');
  activityMappings[activityId] = filename;
}

console.log(`Found ${Object.keys(activityMappings).length} activity mappings`);

// Get all -1600x900.webp files (large size)
const largeFiles = fs.readdirSync(WEBP_DIR)
  .filter(f => f.endsWith('-1600x900.webp'))
  .map(f => f.replace('-1600x900.webp', ''));

console.log(`Found ${largeFiles.length} optimized image sets`);

// Build the new bgMapOptimized object
const newMappings: Record<string, any> = {};

for (const [activityId, filename] of Object.entries(activityMappings)) {
  // Check if this filename has optimized versions
  if (largeFiles.includes(filename)) {
    newMappings[activityId] = {
      webpLarge: `/WEBP/${filename}-1600x900.webp`,
      webpMedium: `/WEBP/${filename}-1200x675.webp`,
      webpSmall: `/WEBP/${filename}-750x422.webp`,
      fallback: `/PNGS/${filename}.png`
    };
  } else {
    // Keep old format if not optimized
    console.log(`⚠️  No optimized version for: ${activityId} (${filename})`);
    newMappings[activityId] = {
      webpLarge: `/webp/${filename}.webp`,
      webpMedium: `/webp/${filename}-mobile.webp`,
      webpSmall: `/webp/${filename}-thumb.webp`,
      fallback: `/${filename}.png`
    };
  }
}

// Generate the TypeScript file
const output = `// data/bgMapOptimized.ts
// Auto-generated from image optimization process
// Generated: ${new Date().toISOString()}

interface ImageVariants {
  webpLarge: string;  // WebP large version (1600x900) - Desktop
  webpMedium: string; // WebP medium version (1200x675) - Tablet
  webpSmall: string;  // WebP small version (750x422) - Mobile
  fallback: string;   // Original PNG fallback
}

// Mapping of activity IDs to optimized image variants
const bgMapOptimized: Record<string, ImageVariants> = {
${Object.entries(newMappings).map(([activityId, variants]) => `  ${activityId}: {
    webpLarge: '${variants.webpLarge}',
    webpMedium: '${variants.webpMedium}',
    webpSmall: '${variants.webpSmall}',
    fallback: '${variants.fallback}'
  }`).join(',\n')}
};

export default bgMapOptimized;

// Utility functions for getting optimized images
export function getOptimizedImageSrc(activityId: string, variant: 'webpLarge' | 'webpMedium' | 'webpSmall' | 'fallback' = 'webpLarge'): string {
  const imageData = bgMapOptimized[activityId];
  if (!imageData) {
    // Fallback to zumba.png if not optimized yet
    return '/PNGS/zumba.png';
  }
  return imageData[variant];
}

export function getImageVariants(activityId: string): ImageVariants | null {
  return bgMapOptimized[activityId] || null;
}

export function isImageOptimized(activityId: string): boolean {
  return activityId in bgMapOptimized;
}

// Get responsive image source based on viewport
export function getResponsiveImageSrc(activityId: string, isMobile: boolean = false): string {
  if (!isImageOptimized(activityId)) {
    // Import and use original bgMap for fallback
    return \`/\${activityId.replace(/_/g, '')}.png\`; // Basic fallback
  }

  return isMobile
    ? getOptimizedImageSrc(activityId, 'webpSmall')
    : getOptimizedImageSrc(activityId, 'webpLarge');
}
`;

fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
console.log(`✅ Generated ${OUTPUT_FILE}`);
console.log(`   Total activities: ${Object.keys(newMappings).length}`);
