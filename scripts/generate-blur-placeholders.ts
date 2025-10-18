import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { SPECIES_IMAGE_MAP } from '../data/speciesImageMap';

interface BlurPlaceholderResult {
  code: string;
  blurDataURL: string;
}

async function generateBlurPlaceholder(imagePath: string): Promise<string> {
  try {
    const buffer = await sharp(imagePath)
      .resize(10) // Resize to 10px width, maintain aspect ratio
      .blur(2) // Apply slight blur
      .webp({ quality: 20 }) // Low quality for small data URL
      .toBuffer();

    const base64 = buffer.toString('base64');
    return `data:image/webp;base64,${base64}`;
  } catch (error) {
    console.error(`Error processing ${imagePath}:`, error);
    throw error;
  }
}

async function main() {
  console.log('🎨 Generating blur placeholders for species images...\n');

  const results: BlurPlaceholderResult[] = [];
  const publicDir = path.join(process.cwd(), 'public');

  let processed = 0;
  const total = Object.keys(SPECIES_IMAGE_MAP).length;

  for (const [code, info] of Object.entries(SPECIES_IMAGE_MAP)) {
    const imagePath = path.join(publicDir, info.image);

    try {
      const blurDataURL = await generateBlurPlaceholder(imagePath);
      results.push({ code, blurDataURL });

      processed++;
      if (processed % 50 === 0) {
        console.log(`Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
      }
    } catch (error) {
      console.error(`Failed to process ${code} (${info.name}):`, error);
    }
  }

  console.log(`\n✅ Successfully generated ${results.length} blur placeholders`);
  console.log(`📝 Writing to blur-placeholders.json...`);

  // Write results to JSON file for easy import
  const outputPath = path.join(process.cwd(), 'data', 'blur-placeholders.json');
  await fs.writeFile(
    outputPath,
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log(`✨ Done! Results saved to ${outputPath}`);
  console.log(`\nNext step: Update speciesImageMap.ts to include blurDataURL properties`);
}

main().catch(console.error);
