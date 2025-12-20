/**
 * Generate Grow Daisy app icons and splash screens
 *
 * Usage: npx tsx scripts/generate-growdaisy-icons.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();

// Grow Daisy brand colors
const EMERALD_500 = '#10b981';
const EMERALD_800 = '#065f46';

// Create the sprout icon SVG programmatically for better control
function createIconSvg(size: number, padding: number = 0.15): string {
  const iconSize = Math.round(size * (1 - padding * 2));
  const offset = Math.round(size * padding);
  const strokeWidth = Math.max(1.5, size / 200);
  const cornerRadius = Math.round(size * 0.22);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${EMERALD_500}"/>
      <stop offset="100%" stop-color="${EMERALD_800}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>
  <g transform="translate(${offset}, ${offset})" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}">
      <path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/>
      <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/>
      <path d="M5 21h14"/>
    </svg>
  </g>
</svg>`;
}

// Create splash screen SVG
function createSplashSvg(width: number, height: number): string {
  const iconSize = Math.min(width, height) * 0.25;
  const iconX = (width - iconSize) / 2;
  const iconY = (height - iconSize) / 2 - height * 0.05;
  const strokeWidth = iconSize / 150;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${EMERALD_500}"/>
      <stop offset="100%" stop-color="${EMERALD_800}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#splashBg)"/>
  <g transform="translate(${iconX}, ${iconY})" fill="none" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <svg viewBox="0 0 24 24" width="${iconSize}" height="${iconSize}">
      <path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/>
      <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/>
      <path d="M5 21h14"/>
    </svg>
  </g>
</svg>`;
}

async function generateIcon(size: number, outputPath: string, padding?: number): Promise<void> {
  const svg = createIconSvg(size, padding);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  console.log(`  ✓ ${path.basename(outputPath)} (${size}x${size})`);
}

async function generateSplash(width: number, height: number, outputPath: string): Promise<void> {
  const svg = createSplashSvg(width, height);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  console.log(`  ✓ ${path.basename(outputPath)} (${width}x${height})`);
}

async function main() {
  console.log('🌱 Generating Grow Daisy app icons and splash screens...\n');

  // iOS icon sizes
  const iosIconDir = path.join(ROOT, 'ios-growdaisy/App/App/Assets.xcassets/AppIcon.appiconset');
  fs.mkdirSync(iosIconDir, { recursive: true });

  console.log('📱 iOS App Icons:');
  await generateIcon(1024, path.join(iosIconDir, 'icon-1024.png'));
  await generateIcon(180, path.join(iosIconDir, 'icon-180.png'));  // iPhone @3x
  await generateIcon(167, path.join(iosIconDir, 'icon-167.png'));  // iPad Pro @2x
  await generateIcon(152, path.join(iosIconDir, 'icon-152.png'));  // iPad @2x
  await generateIcon(120, path.join(iosIconDir, 'icon-120.png'));  // iPhone @2x
  await generateIcon(87, path.join(iosIconDir, 'icon-87.png'));    // Spotlight @3x
  await generateIcon(80, path.join(iosIconDir, 'icon-80.png'));    // Spotlight @2x
  await generateIcon(76, path.join(iosIconDir, 'icon-76.png'));    // iPad @1x
  await generateIcon(60, path.join(iosIconDir, 'icon-60.png'));    // iPhone @1x
  await generateIcon(58, path.join(iosIconDir, 'icon-58.png'));    // Settings @2x
  await generateIcon(40, path.join(iosIconDir, 'icon-40.png'));    // Spotlight @1x
  await generateIcon(29, path.join(iosIconDir, 'icon-29.png'));    // Settings @1x
  await generateIcon(20, path.join(iosIconDir, 'icon-20.png'));    // Notification @1x

  // Update iOS Contents.json
  const iosContentsJson = {
    images: [
      { filename: "icon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" },
      { filename: "icon-180.png", idiom: "iphone", scale: "3x", size: "60x60" },
      { filename: "icon-120.png", idiom: "iphone", scale: "2x", size: "60x60" },
      { filename: "icon-167.png", idiom: "ipad", scale: "2x", size: "83.5x83.5" },
      { filename: "icon-152.png", idiom: "ipad", scale: "2x", size: "76x76" },
      { filename: "icon-76.png", idiom: "ipad", scale: "1x", size: "76x76" },
      { filename: "icon-87.png", idiom: "iphone", scale: "3x", size: "29x29" },
      { filename: "icon-58.png", idiom: "iphone", scale: "2x", size: "29x29" },
      { filename: "icon-80.png", idiom: "iphone", scale: "2x", size: "40x40" },
      { filename: "icon-40.png", idiom: "iphone", scale: "1x", size: "40x40" },
      { filename: "icon-60.png", idiom: "iphone", scale: "3x", size: "20x20" },
      { filename: "icon-40.png", idiom: "iphone", scale: "2x", size: "20x20" },
      { filename: "icon-20.png", idiom: "iphone", scale: "1x", size: "20x20" },
    ],
    info: { author: "xcode", version: 1 }
  };
  fs.writeFileSync(
    path.join(iosIconDir, 'Contents.json'),
    JSON.stringify(iosContentsJson, null, 2)
  );
  console.log('  ✓ Contents.json\n');

  // Android icon sizes
  const androidResDir = path.join(ROOT, 'android-growdaisy/app/src/main/res');

  console.log('🤖 Android App Icons:');
  const androidSizes = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of androidSizes) {
    const dirPath = path.join(androidResDir, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    await generateIcon(size, path.join(dirPath, 'ic_launcher.png'));
    await generateIcon(size, path.join(dirPath, 'ic_launcher_round.png'));
    // Foreground layer (for adaptive icons)
    await generateIcon(Math.round(size * 1.5), path.join(dirPath, 'ic_launcher_foreground.png'), 0.25);
  }
  console.log('');

  // Android splash screens
  console.log('🖼️  Android Splash Screens:');
  const splashSizes = [
    { dir: 'drawable-port-mdpi', width: 320, height: 480 },
    { dir: 'drawable-port-hdpi', width: 480, height: 800 },
    { dir: 'drawable-port-xhdpi', width: 720, height: 1280 },
    { dir: 'drawable-port-xxhdpi', width: 960, height: 1600 },
    { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920 },
    { dir: 'drawable-land-mdpi', width: 480, height: 320 },
    { dir: 'drawable-land-hdpi', width: 800, height: 480 },
    { dir: 'drawable-land-xhdpi', width: 1280, height: 720 },
    { dir: 'drawable-land-xxhdpi', width: 1600, height: 960 },
    { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280 },
  ];

  for (const { dir, width, height } of splashSizes) {
    const dirPath = path.join(androidResDir, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    await generateSplash(width, height, path.join(dirPath, 'splash.png'));
  }

  // Also create a default splash in drawable/
  const drawableDir = path.join(androidResDir, 'drawable');
  fs.mkdirSync(drawableDir, { recursive: true });
  await generateSplash(480, 800, path.join(drawableDir, 'splash.png'));
  console.log('');

  // iOS Splash screens (using Assets.xcassets)
  console.log('🖼️  iOS Splash Screens:');
  const iosSplashDir = path.join(ROOT, 'ios-growdaisy/App/App/Assets.xcassets/Splash.imageset');
  fs.mkdirSync(iosSplashDir, { recursive: true });

  await generateSplash(1242, 2688, path.join(iosSplashDir, 'splash-1242x2688.png')); // iPhone 11 Pro Max
  await generateSplash(828, 1792, path.join(iosSplashDir, 'splash-828x1792.png'));   // iPhone 11
  await generateSplash(1125, 2436, path.join(iosSplashDir, 'splash-1125x2436.png')); // iPhone X/XS

  const iosSplashContents = {
    images: [
      { filename: "splash-1242x2688.png", idiom: "universal", scale: "1x" },
      { filename: "splash-1125x2436.png", idiom: "universal", scale: "2x" },
      { filename: "splash-828x1792.png", idiom: "universal", scale: "3x" }
    ],
    info: { author: "xcode", version: 1 }
  };
  fs.writeFileSync(
    path.join(iosSplashDir, 'Contents.json'),
    JSON.stringify(iosSplashContents, null, 2)
  );
  console.log('  ✓ Contents.json\n');

  // Web/PWA icons
  console.log('🌐 Web/PWA Icons:');
  const webIconDir = path.join(ROOT, 'public/growdaisy-favicon');
  fs.mkdirSync(webIconDir, { recursive: true });

  await generateIcon(512, path.join(webIconDir, 'icon-512x512.png'));
  await generateIcon(192, path.join(webIconDir, 'icon-192x192.png'));
  await generateIcon(180, path.join(webIconDir, 'apple-touch-icon.png'));
  await generateIcon(96, path.join(webIconDir, 'favicon-96x96.png'));
  await generateIcon(32, path.join(webIconDir, 'favicon-32x32.png'));
  await generateIcon(16, path.join(webIconDir, 'favicon-16x16.png'));

  // Create favicon.ico (use 32x32 as base)
  await sharp(Buffer.from(createIconSvg(32)))
    .toFormat('png')
    .toFile(path.join(webIconDir, 'favicon.ico'));
  console.log('  ✓ favicon.ico\n');

  // Create SVG favicon
  const svgFavicon = createIconSvg(32);
  fs.writeFileSync(path.join(webIconDir, 'favicon.svg'), svgFavicon);
  console.log('  ✓ favicon.svg\n');

  console.log('✅ All Grow Daisy icons and splash screens generated successfully!');
  console.log('\nNext steps:');
  console.log('  1. Run "npm run cap:growdaisy:sync" to sync assets to native projects');
  console.log('  2. Open Xcode and Android Studio to verify icons appear correctly');
  console.log('  3. Update public/manifest-growdaisy.json with the new icon paths');
}

main().catch(console.error);
