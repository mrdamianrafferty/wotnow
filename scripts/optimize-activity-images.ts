#!/usr/bin/env ts-node
/**
 * Automated Image Optimization Script
 *
 * Crops and optimizes all activity images to 16:9 aspect ratio at multiple sizes
 * for optimal performance across devices.
 *
 * Usage:
 *   npm run optimize-images        # Process all images
 *   npm run optimize-images -- surfing hiking  # Process specific images
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// Configuration
const CONFIG = {
  // Source directory
  sourceDir: path.join(process.cwd(), 'public/PNGS'),

  // Output directory
  outputDir: path.join(process.cwd(), 'public/WEBP'),

  // Target aspect ratio (16:9)
  aspectRatio: 16 / 9,

  // Output sizes (16:9 aspect ratio)
  sizes: [
    { name: 'small', width: 750, height: 422, quality: 70 },    // Mobile
    { name: 'medium', width: 1200, height: 675, quality: 70 },  // Tablet
    { name: 'large', width: 1600, height: 900, quality: 70 },   // Desktop
  ],

  // WebP format settings
  webp: {
    quality: 70,
    effort: 6, // 0-6, higher = smaller file but slower
    lossless: false,
  },
};

interface ProcessStats {
  processed: number;
  skipped: number;
  errors: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
}

/**
 * Get all PNG files from source directory
 * Only includes files older than 7 days (to avoid processing recent/in-progress images)
 */
function getSourceImages(filter?: string[]): string[] {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  const files = fs.readdirSync(CONFIG.sourceDir)
    .filter(file => {
      if (!file.endsWith('.png')) return false;

      // Check file age - only process files older than 1 week
      const filePath = path.join(CONFIG.sourceDir, file);
      const stats = fs.statSync(filePath);
      return stats.mtimeMs < oneWeekAgo;
    });

  if (filter && filter.length > 0) {
    return files.filter(file => {
      const name = path.basename(file, '.png');
      return filter.some(f => name.includes(f));
    });
  }

  return files;
}

/**
 * Calculate crop dimensions for 16:9 aspect ratio
 */
async function getCropDimensions(imagePath: string): Promise<{ width: number; height: number; left: number; top: number }> {
  const metadata = await sharp(imagePath).metadata();
  const { width: origWidth = 0, height: origHeight = 0 } = metadata;

  const origAspect = origWidth / origHeight;
  const targetAspect = CONFIG.aspectRatio;

  let cropWidth: number;
  let cropHeight: number;
  let left = 0;
  let top = 0;

  if (origAspect > targetAspect) {
    // Image is wider than 16:9 - crop sides
    cropHeight = origHeight;
    cropWidth = Math.round(cropHeight * targetAspect);
    left = Math.round((origWidth - cropWidth) / 2);
  } else {
    // Image is taller than 16:9 - crop top/bottom
    cropWidth = origWidth;
    cropHeight = Math.round(cropWidth / targetAspect);
    top = Math.round((origHeight - cropHeight) / 2);
  }

  return { width: cropWidth, height: cropHeight, left, top };
}

/**
 * Process a single image
 */
async function processImage(filename: string, stats: ProcessStats): Promise<void> {
  const sourcePath = path.join(CONFIG.sourceDir, filename);
  const baseName = path.basename(filename, '.png');

  // Skip if already processed (all 3 sizes exist)
  const largeExists = fs.existsSync(path.join(CONFIG.outputDir, `${baseName}-1600x900.webp`));
  const mediumExists = fs.existsSync(path.join(CONFIG.outputDir, `${baseName}-1200x675.webp`));
  const smallExists = fs.existsSync(path.join(CONFIG.outputDir, `${baseName}-750x422.webp`));

  if (largeExists && mediumExists && smallExists) {
    console.log(`\n⏭️  Skipping: ${baseName} (already processed)`);
    stats.skipped++;
    return;
  }

  console.log(`\n📸 Processing: ${baseName}`);

  try {
    // Get source file size
    const sourceStats = fs.statSync(sourcePath);
    const sourceSizeKB = (sourceStats.size / 1024).toFixed(0);
    console.log(`   Source: ${sourceSizeKB}KB`);

    stats.totalSizeBefore += sourceStats.size;

    // Get crop dimensions
    const crop = await getCropDimensions(sourcePath);
    console.log(`   Crop: ${crop.width}x${crop.height} (offset: ${crop.left},${crop.top})`);

    // Load and crop image once
    const image = sharp(sourcePath)
      .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height });

    // Process each size
    let totalOutputSize = 0;

    for (const size of CONFIG.sizes) {
      const outputPath = path.join(CONFIG.outputDir, `${baseName}-${size.width}x${size.height}.webp`);

      await image
        .clone()
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({
          quality: size.quality,
          effort: CONFIG.webp.effort,
          lossless: CONFIG.webp.lossless,
        })
        .toFile(outputPath);

      const outputStats = fs.statSync(outputPath);
      const outputSizeKB = (outputStats.size / 1024).toFixed(0);
      totalOutputSize += outputStats.size;

      console.log(`   ✓ ${size.name}: ${size.width}x${size.height} → ${outputSizeKB}KB`);
    }

    stats.totalSizeAfter += totalOutputSize;

    const reduction = ((1 - (totalOutputSize / sourceStats.size)) * 100).toFixed(0);
    console.log(`   💾 Saved: ${reduction}% (${sourceSizeKB}KB → ${(totalOutputSize / 1024).toFixed(0)}KB total)`);

    stats.processed++;
  } catch (error) {
    console.error(`   ❌ Error: ${(error as Error).message}`);
    stats.errors++;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🖼️  Activity Image Optimizer\n');
  console.log('Configuration:');
  console.log(`  Source: ${CONFIG.sourceDir}`);
  console.log(`  Output: ${CONFIG.outputDir}`);
  console.log(`  Aspect Ratio: 16:9`);
  console.log(`  Sizes: ${CONFIG.sizes.map(s => `${s.width}x${s.height}`).join(', ')}`);
  console.log(`  Quality: ${CONFIG.webp.quality}\n`);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`✓ Created output directory: ${CONFIG.outputDir}\n`);
  }

  // Get filter from command line args
  const filter = process.argv.slice(2);
  if (filter.length > 0) {
    console.log(`📝 Filter: Processing only images matching: ${filter.join(', ')}\n`);
  }

  // Get images to process
  const images = getSourceImages(filter);
  console.log(`📊 Found ${images.length} images to process\n`);
  console.log('─'.repeat(60));

  // Process all images
  const stats: ProcessStats = {
    processed: 0,
    skipped: 0,
    errors: 0,
    totalSizeBefore: 0,
    totalSizeAfter: 0,
  };

  for (const image of images) {
    await processImage(image, stats);
  }

  // Print summary
  console.log('\n' + '─'.repeat(60));
  console.log('\n📊 Summary:\n');
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Total size before: ${(stats.totalSizeBefore / 1024 / 1024).toFixed(1)}MB`);
  console.log(`  Total size after: ${(stats.totalSizeAfter / 1024 / 1024).toFixed(1)}MB`);

  if (stats.totalSizeBefore > 0) {
    const reduction = ((1 - (stats.totalSizeAfter / stats.totalSizeBefore)) * 100).toFixed(0);
    const savedMB = ((stats.totalSizeBefore - stats.totalSizeAfter) / 1024 / 1024).toFixed(1);
    console.log(`  Saved: ${reduction}% (${savedMB}MB)`);
  }

  console.log('\n✅ Done!\n');
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
