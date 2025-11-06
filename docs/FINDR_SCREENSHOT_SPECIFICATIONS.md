# Findr App Screenshot Specifications

**Date:** January 6, 2025
**Version:** 1.0.0
**Purpose:** Store submission screenshots for iOS App Store and Google Play Store

---

## Overview

This document provides detailed specifications for capturing app screenshots for store submissions. Screenshots are the most important visual element in converting store visitors to installers—they must showcase key features clearly and attractively.

---

## iOS Screenshots

### Required Dimensions

Apple requires screenshots for 3 device sizes:

| Device Class | Resolution | Aspect Ratio | Example Devices |
|--------------|-----------|--------------|-----------------|
| **6.7" Display** | 1290 x 2796 px | 19.5:9 | iPhone 14 Pro Max, 15 Pro Max, 15 Plus |
| **6.5" Display** | 1242 x 2688 px | 19.5:9 | iPhone 11 Pro Max, XS Max |
| **5.5" Display** | 1242 x 2208 px | 16:9 | iPhone 8 Plus, 7 Plus, 6s Plus |

**Note:** App Store will automatically scale from 6.7" to other devices, but providing all sizes ensures optimal quality.

---

### Screenshot Set (7 screenshots per size)

#### 1. Hero Shot - Prediction Screen
**Screen:** Main Findr index page with predictions loaded
**Goal:** Show the core value proposition

**Content:**
- Rectangle code visible (e.g., "31F1 - North Sea")
- 5-8 species cards with confidence scores
- Bite score indicator showing "Good" or "Excellent"
- Date selector showing today's date
- Clear, readable confidence percentages (75%, 82%, etc.)

**Text Overlay (Top):**
"Smart Fishing Predictions"

**Caption (Bottom):**
"Real-time confidence scores for 50+ species"

**Design Notes:**
- Use a rectangle with good fishing conditions
- Ensure species cards show diverse guilds (pelagic, reef, benthic)
- Show "Fresh data" indicator if possible
- Use light mode for consistency

---

#### 2. Species Detail Card
**Screen:** Expanded species prediction card
**Goal:** Demonstrate detailed advice and transparency

**Content:**
- Large species image (high quality)
- Species name in English and scientific name
- Confidence score with colored badge (green for high)
- Environmental factors displayed:
  - Water temperature: "14°C (Optimal: 12-18°C)"
  - Depth range: "Shallow to mid-depth"
  - Seabed type: "Rocky, Sandy"
- Bait recommendations with icons
- Best time indicator
- Bite score for this species
- "Why this confidence?" explanation

**Text Overlay (Top):**
"Species-Specific Advice"

**Caption (Bottom):**
"Environmental matching with transparent rationale"

**Design Notes:**
- Choose a high-confidence species (>75%)
- Show favorable environmental match
- Use a photogenic species (bass, cod, mackerel)

---

#### 3. Map View - Location Selection
**Screen:** FullScreenMap component with ICES rectangles
**Goal:** Highlight location precision and coverage

**Content:**
- Map centered on European coast (UK, France, or Iberian)
- ICES rectangle overlay visible
- Selected rectangle highlighted
- Location pin or current location indicator
- Search bar at top
- Mini-legend showing what rectangles mean

**Text Overlay (Top):**
"Precise Marine Zones"

**Caption (Bottom):**
"ICES rectangle mapping across European waters"

**Design Notes:**
- Show a recognizable coastline (Thames Estuary, Bay of Biscay)
- Ensure rectangle boundaries are clear
- Use moderate zoom level (not too close, not too far)

---

#### 4. Catch Log - Photo Gallery
**Screen:** SessionLogModal or catch history page
**Goal:** Show catch tracking and photo features

**Content:**
- Multiple logged catches with photos
- Species identified with names
- Dates visible
- Bait and habitat information
- Mix of different species
- "Add Catch" button visible

**Text Overlay (Top):**
"Track Your Success"

**Caption (Bottom):**
"Photo logging with bait and habitat tracking"

**Design Notes:**
- Use real-looking catch photos (or high-quality stock)
- Show variety (different species, dates)
- Include some catches without photos to show flexibility
- Display positive/successful entries

---

#### 5. Offline Mode Indicator
**Screen:** Prediction screen with offline banner
**Goal:** Emphasize offline capability for remote fishing

**Content:**
- Predictions loaded from cache
- NetworkStatusIndicator showing "Offline Mode"
- DataFreshnessIndicator showing "3h ago" or "Recent"
- Predictions still fully visible and usable
- Optional: "Will sync when online" message

**Text Overlay (Top):**
"Works Offline"

**Caption (Bottom):**
"Cached predictions for remote fishing spots"

**Design Notes:**
- Show yellow offline banner prominently
- Ensure data is still readable and useful
- Include freshness timestamp
- Optional: small icon indicating cached data

---

#### 6. Bite Score Dashboard
**Screen:** Prediction screen with bite score prominent
**Goal:** Highlight the unique "best time to fish" feature

**Content:**
- Large bite score indicator: "Excellent Bite" or "Good Bite"
- Score breakdown:
  - Temperature match: 90%
  - Salinity optimal: 85%
  - Moon phase: Full moon icon
  - Tide: Incoming (if implemented)
- List of top species for current conditions
- Time-of-day indicator: "Now" or "Best: 6-9 AM"

**Text Overlay (Top):**
"Daily Bite Score"

**Caption (Bottom):**
"Optimal fishing conditions at a glance"

**Design Notes:**
- Use a day with high bite score (>75)
- Show positive indicators (green badges, high percentages)
- Clear visual hierarchy (score number largest)

---

#### 7. Multi-Language Species
**Screen:** Species prediction cards in non-English language
**Goal:** Show international support

**Content:**
- Predictions in French, Spanish, or German
- Species names translated
- Interface language changed
- Advice text in selected language
- Flag icon or language indicator visible

**Text Overlay (Top):**
"6 Languages Supported"

**Caption (Bottom):**
"English, French, Spanish, German, Italian, Portuguese"

**Design Notes:**
- Choose French or Spanish (widely spoken in EU fishing regions)
- Ensure translations are accurate and natural
- Show the same prediction screen as screenshot #1 for comparison

---

### Screenshot Production Workflow (iOS)

#### Option A: Device Simulator (Xcode)
```bash
# 1. Launch iOS Simulator
open -a Simulator

# 2. Select device
# Hardware > Device > iOS 16.x > iPhone 14 Pro Max

# 3. Run app in dev mode
npm run dev
# Then open in Simulator: Cmd+R in Xcode or use React Native

# 4. Navigate to each screen
# Take screenshots: Cmd+S (saves to Desktop)

# 5. Repeat for each device size
# 6.7" (iPhone 14 Pro Max)
# 6.5" (iPhone 11 Pro Max)
# 5.5" (iPhone 8 Plus)
```

#### Option B: Physical Device
```bash
# 1. Connect iPhone via USB
# 2. Build and run via Xcode
# 3. Navigate to screens
# 4. Screenshot: Power + Volume Up
# 5. AirDrop to Mac or export via Photos app
# 6. Verify resolution matches requirements
```

#### Option C: Screenshot Tool (Recommended)
Use tools like:
- **Fastlane Snapshot:** Automated screenshot generation
- **Screenshot Creator (Mac App):** Frame screenshots with device mockups
- **Figma/Sketch:** Design screenshots with annotations

---

## Android Screenshots

### Required Dimensions

Google Play requires screenshots for 2 device sizes (tablets optional but recommended):

| Device Class | Minimum Resolution | Recommended | Example Devices |
|--------------|-------------------|-------------|-----------------|
| **Phone** | 320px shortest side | 1080 x 1920 px (16:9)<br>1080 x 2340 px (19.5:9) | Pixel 6, Samsung Galaxy S22 |
| **7" Tablet** | 600px shortest side | 1200 x 1920 px | Nexus 7, Galaxy Tab |
| **10" Tablet** | 800px shortest side | 1600 x 2560 px | Nexus 10, Galaxy Tab S |

**Note:** Minimum 2 screenshots required, maximum 8 allowed.

---

### Screenshot Set (5 screenshots)

#### 1. Hero Shot - Prediction Screen
**Same as iOS #1**

**Content:**
- Material Design elements visible
- Android navigation patterns (if different from iOS)
- Status bar with Android styling

**Text Overlay:**
"Smart Fishing Predictions"

**Caption:**
"Real marine data • 50+ species • Confidence scores"

---

#### 2. Species Detail with Material Design
**Same as iOS #2, highlighting Android-specific design**

**Content:**
- Material Design ripple effects (if captured)
- Bottom sheet modal (if using Android-specific pattern)
- Share button (Android share intent icon)

**Text Overlay:**
"Detailed Species Insights"

**Caption:**
"Environmental matching • Bait advice • Best times"

---

#### 3. Location & Map
**Same as iOS #3**

**Content:**
- Android location services indicator
- Google Maps attribution (if using Google Maps)

**Text Overlay:**
"Precise Marine Zones"

**Caption:**
"ICES rectangles • GPS detection • Favorite locations"

---

#### 4. Catch Logging
**Same as iOS #4**

**Content:**
- Material Design FAB (Floating Action Button) for add catch
- Bottom navigation bar (if different from iOS)

**Text Overlay:**
"Track Your Catches"

**Caption:**
"Photo logging • Bait tracking • Sync when online"

---

#### 5. Feature Highlights Collage
**Composite screenshot showing multiple features**

**Goal:** Quick overview of all key features

**Content:** 4-6 small previews arranged in a grid:
- Prediction cards
- Species detail
- Offline mode indicator
- Catch log photo
- Map view
- Bite score

**Text Overlay (Large, centered):**
"Everything You Need to Fish Smarter"

**Features List:**
- ✓ Real marine data
- ✓ Offline mode
- ✓ Catch logging
- ✓ Multi-language
- ✓ 50+ species

**Design Notes:**
- Use branded color scheme
- Clear hierarchy (large title, smaller features)
- Professional layout (grid or arranged artistically)

---

### Screenshot Production Workflow (Android)

#### Option A: Android Emulator
```bash
# 1. Launch Android Studio
# 2. Open AVD Manager
# 3. Create/launch Pixel 6 (1080x2340)

# 4. Run app
npm run dev
# Or: npm run android

# 5. Navigate to screens
# 6. Screenshot: Emulator toolbar > Camera icon
# Or: Cmd+S (saves to Downloads)

# 7. Repeat for tablet sizes if needed
```

#### Option B: Physical Device
```bash
# 1. Enable Developer Mode on Android device
# 2. Connect via USB with ADB debugging enabled
# 3. Run: npm run android
# 4. Screenshot: Power + Volume Down
# 5. Transfer via USB to computer
# 6. Verify resolution
```

#### Option C: Screenshot Testing
```bash
# Use Fastlane Screengrab for automated Android screenshots
fastlane screengrab
```

---

## Feature Graphic (Play Store Only)

### Specifications

**Dimensions:** 1024 x 500 pixels
**Format:** PNG (24-bit) or JPEG
**File size:** Max 1MB
**Purpose:** Banner image shown at top of Play Store listing

### Design Concept

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  🐟 FINDR                    [App Icon]                        │
│                                                                 │
│  Smart Fishing Predictions                                     │
│  with Real Marine Data                                         │
│                                                                 │
│  ✓ 50+ Species  ✓ Offline Mode  ✓ Real Ocean Data            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Elements:**
- **Background:** Ocean scene (blurred or artistic, not too busy)
- **Logo:** Findr wordmark (large, left side)
- **App Icon:** Small version in top right
- **Tagline:** "Smart Fishing Predictions with Real Marine Data" (center)
- **Key Features:** 3-4 bullet points in smaller text (bottom)

**Design Guidelines:**
- Keep text readable at all sizes (mobile to desktop)
- Use brand colors
- Avoid clutter (Play Store will add badges/buttons on top)
- Test on various backgrounds (light/dark)
- Export at 2x resolution for crispness

**Tools:**
- Figma, Adobe XD, Photoshop, or Canva
- Templates: search "Play Store feature graphic template"

---

## App Icon Verification

### iOS Icon Requirements

**Master Size:** 1024 x 1024 pixels
**Format:** PNG (no alpha channel)
**Color Space:** sRGB or P3
**Location:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Required Sizes (generated by Xcode):**
- 180 x 180 (iPhone @3x)
- 120 x 120 (iPhone @2x)
- 87 x 87 (Settings @3x)
- 60 x 60 (Notification @2x)
- And more...

**Checklist:**
- [ ] No transparency
- [ ] No rounded corners (iOS adds them)
- [ ] Looks good at small sizes (20x20)
- [ ] Readable on white and dark backgrounds
- [ ] Follows iOS design guidelines

### Android Icon Requirements

**Master Size:** 512 x 512 pixels
**Format:** PNG (32-bit with alpha)
**Location:** `android/app/src/main/res/mipmap-*/ic_launcher.png`

**Required Sizes:**
- 192 x 192 (xxxhdpi)
- 144 x 144 (xxhdpi)
- 96 x 96 (xhdpi)
- 72 x 72 (hdpi)
- 48 x 48 (mdpi)

**Adaptive Icon (Android 8+):**
- Foreground: 108 x 108 dp safe zone (432 x 432 px at xxxhdpi)
- Background: Solid color or simple pattern

**Checklist:**
- [ ] Supports adaptive icon (foreground + background)
- [ ] Looks good with various mask shapes (circle, squircle, rounded square)
- [ ] No text smaller than 8pt
- [ ] Clear at 48x48 resolution

---

## Design Best Practices

### General Guidelines

**DO:**
- ✅ Use actual app screens (not mockups)
- ✅ Show real data (not lorem ipsum)
- ✅ Highlight unique features
- ✅ Use captions/annotations to explain
- ✅ Maintain consistent branding
- ✅ Show the app in use (not empty states)
- ✅ Test readability on small screens

**DON'T:**
- ❌ Use fake data that looks fake
- ❌ Show error states or bugs
- ❌ Include offensive content
- ❌ Use competitor brand names/logos
- ❌ Show personal user information
- ❌ Use low-resolution images
- ❌ Add too much text (keep captions short)

### Typography

**Text Overlays:**
- **Title:** 60-80pt, Bold, Brand Font
- **Caption:** 36-48pt, Regular, Sans-serif
- **Ensure 4.5:1 contrast ratio** (WCAG AA)

**Background Overlay:**
- Semi-transparent overlay behind text (black 40-60% opacity)
- Or: Use solid colored bars at top/bottom

### Color Scheme

**Brand Colors (verify from design system):**
- Primary: `#0066CC` (Ocean Blue)
- Secondary: `#FF6B35` (Coral)
- Success: `#10B981` (Green)
- Background: `#FFFFFF` (White)
- Text: `#1F2937` (Dark Gray)

**Use consistently across all screenshots**

---

## Screenshot Annotations (Optional)

### Tool Recommendations

**Figma/Sketch:**
- Import screenshots
- Add text overlays
- Add arrows/callouts
- Export as PNG

**Screenshot Creator (Mac App):**
- Frame screenshots in device mockups
- Add backgrounds
- Add text annotations

**Photoshop/GIMP:**
- Full control over design
- Batch processing possible

### Annotation Style

**Minimal Approach:**
- Text overlay at top: Feature name
- No other annotations

**Callout Approach:**
- Arrows pointing to key features
- Small text labels explaining
- Use sparingly (1-2 callouts max)

**App Store Optimization (ASO) Approach:**
- First screenshot: Hero with large benefit statement
- Subsequent: Feature screenshots with short explanations
- Last screenshot: CTA or social proof

---

## Testing Before Submission

### Resolution Verification

```bash
# Check image dimensions
file screenshot_1.png
# Output should show: PNG image data, 1290 x 2796, ...

# Check file size
ls -lh *.png
# Should be reasonable (< 5MB each)

# Check color profile
sips -g all screenshot_1.png | grep space
# Should be sRGB or RGB
```

### Visual QA Checklist

For each screenshot:
- [ ] Correct resolution for device class
- [ ] No pixelation or compression artifacts
- [ ] Text is readable (zoom out to 50%)
- [ ] No placeholder content (lorem ipsum, "Test User")
- [ ] No visible bugs or UI glitches
- [ ] Status bar looks clean (time is 9:41 AM convention)
- [ ] No notifications/banners obscuring content
- [ ] Branding consistent across all screenshots
- [ ] Colors match brand guidelines
- [ ] File name follows convention: `screenshot_01_hero.png`

---

## Delivery Checklist

### iOS Screenshots
- [ ] 6.7" (1290 x 2796): 7 screenshots
- [ ] 6.5" (1242 x 2688): 7 screenshots
- [ ] 5.5" (1242 x 2208): 7 screenshots
- [ ] All in PNG format
- [ ] Named sequentially: `ios_67_01.png`, `ios_67_02.png`, etc.

### Android Screenshots
- [ ] Phone (1080 x 1920 or 1080 x 2340): 5 screenshots
- [ ] 7" Tablet (1200 x 1920): 5 screenshots (optional)
- [ ] 10" Tablet (1600 x 2560): 5 screenshots (optional)
- [ ] All in PNG or JPEG format
- [ ] Named sequentially: `android_phone_01.png`, etc.

### Feature Graphic (Play Store)
- [ ] 1024 x 500 pixels
- [ ] PNG or JPEG
- [ ] Under 1MB file size
- [ ] Named: `feature_graphic.png`

### App Icons
- [ ] iOS: 1024 x 1024, PNG, no alpha
- [ ] Android: 512 x 512, PNG, with alpha
- [ ] Verified in app builds

---

## Storage & Version Control

### Folder Structure

```
/assets/
  /store-screenshots/
    /v1.0.0/
      /ios/
        /6.7-inch/
          01_hero.png
          02_species_detail.png
          ...
        /6.5-inch/
          01_hero.png
          ...
        /5.5-inch/
          01_hero.png
          ...
      /android/
        /phone/
          01_hero.png
          ...
        /tablet-7/
          01_hero.png
          ...
      /feature-graphic/
        feature_graphic.png
      /icons/
        ios_icon_1024.png
        android_icon_512.png
```

### Git Considerations

**Should you commit screenshots to git?**
- **Pros:** Version control, easy to track changes
- **Cons:** Large file sizes, slow git operations

**Recommendation:**
- **Commit:** Final PNGs for store submission
- **Don't commit:** Raw PSDs, source files, alternates
- **Use:** Git LFS for large files if needed
- **Alternative:** Store in cloud (Dropbox, Figma, etc.) and link in README

---

## Timeline

**Preparation:** 2 hours
- Set up emulators/devices
- Configure app with good sample data
- Prepare screenshot list

**iOS Capture:** 3 hours
- Take screenshots for 3 device sizes
- 7 screens × 3 sizes = 21 screenshots

**Android Capture:** 2 hours
- Take screenshots for phone (and optionally tablets)
- 5 screens × 1-3 sizes = 5-15 screenshots

**Design/Annotation:** 3 hours
- Add text overlays
- Create feature graphic
- Design consistency pass

**Review & QA:** 1 hour
- Check resolutions
- Verify readability
- Get stakeholder approval

**Total:** 11 hours (~1.5 days)

---

## External Resources

**Apple Guidelines:**
- App Store Screenshot Specifications: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/app-icons

**Google Guidelines:**
- Play Store Asset Guidelines: https://support.google.com/googleplay/android-developer/answer/9866151
- Material Design: https://material.io/design

**Tools:**
- Figma: https://www.figma.com
- Screenshot Framer: https://www.screenshotone.com
- Fastlane: https://fastlane.tools

**Inspiration:**
- Mobbin (app screenshot gallery): https://mobbin.com
- App Store top apps in Sports category

---

**Last Updated:** January 6, 2025
**Status:** Ready for Screenshot Production
**Version:** 1.0.0
