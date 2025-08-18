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
        
        // Desktop version (1024x1536) - WebP with 85% quality
        const desktopPath = path.join(WEBP_DIR, `${baseName}.webp`);
        await sharp(inputFile)
            .resize(1024, 1536, { fit: 'cover' })
            .webp({ quality: 85 })
            .toFile(desktopPath);
        
        // Mobile version (512x768) - WebP with 85% quality  
        const mobilePath = path.join(WEBP_DIR, `${baseName}-mobile.webp`);
        await sharp(inputFile)
            .resize(512, 768, { fit: 'cover' })
            .webp({ quality: 85 })
            .toFile(mobilePath);
            
        // Thumbnail version (256x384) - WebP with 80% quality
        const thumbPath = path.join(WEBP_DIR, `${baseName}-thumb.webp`);
        await sharp(inputFile)
            .resize(256, 384, { fit: 'cover' })
            .webp({ quality: 80 })
            .toFile(thumbPath);
        
        // Get optimized file sizes
        const desktopStats = await fs.stat(desktopPath);
        const mobileStats = await fs.stat(mobilePath);
        const thumbStats = await fs.stat(thumbPath);
        
        const desktopSizeMB = (desktopStats.size / 1024 / 1024).toFixed(2);
        const mobileSizeMB = (mobileStats.size / 1024 / 1024).toFixed(2);
        const thumbSizeMB = (thumbStats.size / 1024 / 1024).toFixed(2);
        
        const totalOptimizedMB = (desktopStats.size + mobileStats.size + thumbStats.size) / 1024 / 1024;
        const savings = ((originalStats.size - (desktopStats.size + mobileStats.size + thumbStats.size)) / originalStats.size * 100).toFixed(1);
        
        console.log(`  Original: ${originalSizeMB}MB`);
        console.log(`  Desktop WebP: ${desktopSizeMB}MB`);
        console.log(`  Mobile WebP: ${mobileSizeMB}MB`);
        console.log(`  Thumb WebP: ${thumbSizeMB}MB`);
        console.log(`  Total savings: ${savings}%\n`);
        
        return {
            original: originalStats.size,
            optimized: desktopStats.size + mobileStats.size + thumbStats.size,
            fileName
        };
        
    } catch (error) {
        console.error(`Error optimizing ${fileName}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('Testing image optimization on largest files...\n');
    
    // Test with just the 5 largest files first
    const testFiles = ['windy.png', 'photo.png', 'cinema.png', 'outdoorgym.png', 'volley-indoor.png'];
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let processedCount = 0;
    
    for (const file of testFiles) {
        const result = await optimizeImage(PUBLIC_DIR, file);
        if (result) {
            totalOriginalSize += result.original;
            totalOptimizedSize += result.optimized;
            processedCount++;
        }
    }
    
    // Summary
    console.log('\n=== TEST OPTIMIZATION SUMMARY ===');
    console.log(`Files processed: ${processedCount}`);
    console.log(`Original total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Optimized total size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total space saved: ${(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1)}%`);
    console.log(`Space saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)}MB`);
}

main().catch(console.error);
