// Script to generate bgMapOptimized.ts from all optimized WebP files
import fs from 'fs';
import path from 'path';

const webpDir = '../public/webp';
const bgMapPath = '../data/bgMap.ts';

// Read existing bgMap to get activity mappings
const bgMapContent = fs.readFileSync(bgMapPath, 'utf8');
const bgMapMatch = bgMapContent.match(/const bgMap: Record<string, string> = \{([\s\S]*?)\};/);
if (!bgMapMatch) {
  console.error('Could not parse existing bgMap');
  process.exit(1);
}

// Parse existing mappings
const existingMappings = {};
const lines = bgMapMatch[1].split('\n');
for (const line of lines) {
  const match = line.match(/^\s*([^:]+):\s*'([^']+)',?$/);
  if (match) {
    const [, activityId, imagePath] = match;
    const cleanActivityId = activityId.trim();
    const imageName = path.basename(imagePath, '.png');
    existingMappings[cleanActivityId] = imageName;
  }
}

// Get all available WebP desktop versions
const webpFiles = fs.readdirSync(webpDir);
const desktopWebPs = webpFiles.filter(f => f.endsWith('.webp') && !f.includes('-mobile') && !f.includes('-thumb'));

// Generate optimized mapping
let optimizedMappings = '';
Object.entries(existingMappings).forEach(([activityId, imageName]) => {
  const desktopWebP = `${imageName}.webp`;
  const mobileWebP = `${imageName}-mobile.webp`;
  const thumbWebP = `${imageName}-thumb.webp`;
  
  if (desktopWebPs.includes(desktopWebP)) {
    optimizedMappings += `  ${activityId}: {
    webp: '/webp/${desktopWebP}',
    webpMobile: '/webp/${mobileWebP}',
    webpThumb: '/webp/${thumbWebP}',
    fallback: '/${imageName}.png'
  },\n`;
  }
});

const optimizedBgMapContent = `// data/bgMapOptimized.ts
// Auto-generated from image optimization process

interface ImageVariants {
  webp: string;       // WebP desktop version (1024x1536)
  webpMobile: string; // WebP mobile version (512x768)
  webpThumb: string;  // WebP thumbnail version (256x384)
  fallback: string;   // Original PNG fallback
}

// Mapping of activity IDs to optimized image variants
const bgMapOptimized: Record<string, ImageVariants> = {
${optimizedMappings}};

export default bgMapOptimized;

// Utility functions for getting optimized images
export function getOptimizedImageSrc(activityId: string, variant: 'webp' | 'webpMobile' | 'webpThumb' | 'fallback' = 'webp'): string {
  const imageData = bgMapOptimized[activityId];
  if (!imageData) {
    // Fallback to zumba.png if not optimized yet
    return '/zumba.png';
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
    ? getOptimizedImageSrc(activityId, 'webpMobile')
    : getOptimizedImageSrc(activityId, 'webp');
}`;

fs.writeFileSync('../data/bgMapOptimized.ts', optimizedBgMapContent);
console.log('Generated bgMapOptimized.ts with', Object.keys(existingMappings).length, 'activity mappings');
console.log('Optimized images available for', desktopWebPs.length, 'activities');
