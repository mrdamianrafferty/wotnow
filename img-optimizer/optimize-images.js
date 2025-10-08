import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';

const PUBLIC_DIR = '../public';
const WEBP_DIR = '../public/webp';

// Ensure webp directory exists
await fs.ensureDir(WEBP_DIR);

async function optimizeImage(inputPath, fileName) {
    const baseName = path.parse(fileName).name;
    const inputFile = path.join(PUBLIC_DIR, fileName);
    
    try {
        console.log(`Optimizing ${fileName}...`);
        
        // Get original file size
        const originalStats = await fs.stat(inputFile);
        const originalSizeMB = (originalStats.size / 1024 / 1024).toFixed(2);
        
        const variants = [
            { suffix: '', width: 1024, quality: 85 },
            { suffix: '-mobile', width: 512, quality: 85 },
            { suffix: '-thumb', width: 256, quality: 80 },
        ];

        const generated = [];
        for (const variant of variants) {
            const outputPath = path.join(WEBP_DIR, `${baseName}${variant.suffix}.webp`);
            await sharp(inputFile)
                .resize({
                    width: variant.width,
                    fit: 'inside',
                    withoutEnlargement: true,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .webp({ quality: variant.quality })
                .toFile(outputPath);

            const stats = await fs.stat(outputPath);
            generated.push({
                path: outputPath,
                size: stats.size,
                label: variant.suffix || 'desktop',
            });
        }

        // Get optimized file sizes
        const desktopStats = generated.find((f) => f.label === 'desktop');
        const mobileStats = generated.find((f) => f.label === '-mobile' || f.label === 'mobile');
        const thumbStats = generated.find((f) => f.label === '-thumb' || f.label === 'thumb');
        
    const desktopSizeMB = (desktopStats.size / 1024 / 1024).toFixed(2);
    const mobileSizeMB = (mobileStats.size / 1024 / 1024).toFixed(2);
    const thumbSizeMB = (thumbStats.size / 1024 / 1024).toFixed(2);
        
    const totalOptimizedMB = generated.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024;
    const savings = ((originalStats.size - generated.reduce((sum, f) => sum + f.size, 0)) / originalStats.size * 100).toFixed(1);
        
        console.log(`  Original: ${originalSizeMB}MB`);
        console.log(`  Desktop WebP: ${desktopSizeMB}MB`);
        console.log(`  Mobile WebP: ${mobileSizeMB}MB`);
        console.log(`  Thumb WebP: ${thumbSizeMB}MB`);
        console.log(`  Total savings: ${savings}%\n`);
        
        return {
            original: originalStats.size,
            optimized: generated.reduce((sum, f) => sum + f.size, 0),
            fileName
        };
        
    } catch (error) {
        console.error(`Error optimizing ${fileName}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('Starting image optimization...\n');
    
    // Get all PNG files in public directory
    const files = await fs.readdir(PUBLIC_DIR);
    const pngFiles = files.filter(file => 
        file.toLowerCase().endsWith('.png') && 
        !file.includes('android-chrome') && 
        !file.includes('apple-touch-icon') &&
        !file.includes('favicon')
    );
    
    console.log(`Found ${pngFiles.length} PNG files to optimize\n`);
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let processedCount = 0;
    
    // Process files in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < pngFiles.length; i += batchSize) {
        const batch = pngFiles.slice(i, i + batchSize);
        
        const results = await Promise.all(
            batch.map(file => optimizeImage(PUBLIC_DIR, file))
        );
        
        results.forEach(result => {
            if (result) {
                totalOriginalSize += result.original;
                totalOptimizedSize += result.optimized;
                processedCount++;
            }
        });
        
        console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(pngFiles.length/batchSize)}`);
    }
    
    // Summary
    console.log('\n=== OPTIMIZATION SUMMARY ===');
    console.log(`Files processed: ${processedCount}`);
    console.log(`Original total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Optimized total size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total space saved: ${(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1)}%`);
    console.log(`Space saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)}MB`);
}

main().catch(console.error);
