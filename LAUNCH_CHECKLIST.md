# Findr Launch Checklist

**Date:** October 25, 2025
**Status:** 🟢 Image generation in progress (52/100 complete)

---

## ✅ COMPLETED

### 1. Rectangle Lookup Fix (Commit `b9a9a248`)
- **Problem:** San Francisco mapped to Scotland (37G6, 7763km away)
- **Solution:** Added 1000km distance threshold to rectangle lookup API
- **Result:** American locations now correctly return 404 instead of European rectangles
- **File:** `pages/api/findr/rectangle-lookup.ts`

### 2. Species Image Map Regenerated (Commit `0f59398c`)
- **Status:** 80 species WITH images (European), 100 WITHOUT images (American)
- **Missing species:** Documented in `SPECIES_IMAGES_MISSING` array
- **File:** `data/speciesImageMap.ts`

### 3. Image Generation Script Ready (Commit `1a735978`)
- **Script:** `generate_fish_catalogue.py` updated with 100 American species
- **Backup:** Dual location (project + `~/fish_images_backup/americas/`)
- **Optimized:** 2 min interval = ~3.3 hours total
- **Documentation:** `GENERATE_AMERICAN_SPECIES_IMAGES.md`

### 4. ES Module Build Error Fixed (Commit `b03b4b60`)
- **Problem:** "module is not defined in ES module scope" in styles/index.css
- **Root Cause:** package.json has "type": "module" but config files used CommonJS
- **Solution:** Renamed all config files from .js to .cjs extension
  - `postcss.config.js` → `postcss.config.cjs`
  - `tailwind.config.js` → `tailwind.config.cjs`
  - `jest.config.js` → `jest.config.cjs`
  - `next-sitemap.config.js` → `next-sitemap.config.cjs`
- **Result:** Dev server builds successfully in 3.9s, no more build errors

### 5. Conditions Map Fix (Commit `b287a19a`)
- **Problem:** Map showing Spanish location (Gijón) for American waters (Malibu Beach)
- **Root Cause:** Fallback conditions had hardcoded Spanish coordinates
- **Solution:** Create dynamic fallback using user's actual coordinates when rectangleCode is null
- **Files:**
  - `pages/api/findr/conditions.ts` (lines 481-499)
  - `hooks/useFindrConditions.ts` (lines 37-74)
- **Result:** American locations now show correct coordinates on map

### 6. Swipable Cards Fix
- **Problem:** "Next!" button gets stuck after 1-2 clicks on Findr swipable cards
- **Root Cause:** Race condition in `handleProgrammaticSkip` trying to trigger swipe animation programmatically
- **Solution:** Simplified to directly call `handleSkip()` instead of triggering animation
- **File:** `pages/findr/index.tsx` (lines 863-868)
- **Result:** Next button now reliably advances to next card without getting stuck

### 7. American Species Bios Added
- **Problem:** Most American species had no bios showing on swipable cards or modals
- **Root Cause:** Only 56 European species had hardcoded bios in `data/findrFishBios.ts`
- **Solution:** Added playful Tinder-style bios for all 100 American species
- **File:** `data/findrFishBios.ts` (lines 57-157)
- **Result:** All 156 species now have complete bios on cards and modals

### 8. American Species Image Generation (In Progress)
- **Status:** 52 out of 100 images generated (52% complete)
- **Latest:** Red Grouper (Epinephelus morio)
- **Remaining:** 48 species
- **Location:** `fish_out_americas/` + `~/fish_images_backup/americas/`

---

## ⏳ NEXT STEPS (Required for Launch)

### Step 1: Add OpenAI API Key (2 minutes)

```bash
# Add your OpenAI API key to .env.local
echo "OPENAI_API_KEY=sk-your-key-here" >> .env.local
```

### Step 2: Generate American Species Images (~3-4 hours)

```bash
# Install Python dependencies
pip install openai python-dotenv

# Run generation script
python generate_fish_catalogue.py
```

**Timeline:**
- 100 species × 2 minutes = 3.3 hours minimum
- With retries: expect 4-5 hours total
- **Cost:** ~$4.00 (DALL-E pricing)

**Progress:**
- Script is resumable (skips existing images)
- Monitors: rate limits, retries, backups
- Output: `fish_out_americas/` + `~/fish_images_backup/americas/`

### Step 3: Convert to WebP and Update Map (30 minutes)

```bash
# 1. Convert PNG to WebP (creates base, mobile, thumb variants)
cat > scripts/optimize-american-fish.sh << 'EOF'
#!/bin/bash
set -e

INPUT_DIR="fish_out_americas"
OUTPUT_DIR="public/webp"

for png in "$INPUT_DIR"/*.png; do
  if [ -f "$png" ]; then
    filename=$(basename "$png" .png)
    webp_name=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g' | sed 's/^[0-9]*-//')

    cwebp -q 85 "$png" -o "$OUTPUT_DIR/${webp_name}.webp"
    convert "$png" -resize 800x533 - | cwebp -q 85 - -o "$OUTPUT_DIR/${webp_name}-mobile.webp"
    convert "$png" -resize 200x133 - | cwebp -q 85 - -o "$OUTPUT_DIR/${webp_name}-thumb.webp"

    echo "✓ $webp_name"
  fi
done
EOF

chmod +x scripts/optimize-american-fish.sh
bash scripts/optimize-american-fish.sh

# 2. Regenerate species image map
npx tsx scripts/generate-species-image-map.ts

# 3. Verify results
echo "Total species with images:"
grep -c "SPECIES_IMAGE_MAP" data/speciesImageMap.ts  # Should show ~180

echo "Missing species:"
grep -c "SPECIES_IMAGES_MISSING" data/speciesImageMap.ts  # Should show 0
```

### Step 4: Test in Browser (15 minutes)

```bash
# Start dev server
npm run dev

# Test checklist:
# [ ] Navigate to localhost:3001/findr
# [ ] Search "San Francisco"
# [ ] Verify location shows "San Francisco" (not Scotland)
# [ ] Verify predictions show Pacific species
# [ ] Verify Pacific Halibut shows REAL IMAGE (not placeholder)
# [ ] Check multiple American species have images
# [ ] Test European location (31F1) still works correctly
```

### Step 5: Commit and Deploy (10 minutes)

```bash
# Stage changes
git add fish_out_americas/ public/webp/ data/speciesImageMap.ts

# Commit
git commit -m "Add 100 American species images - complete worldwide support

Generated via DALL-E (gpt-image-1):
- 5 Salmon species
- 2 Halibut species
- 10 Grouper species
- 8 Snapper species
- 6 Tuna species
- 5 Shark species
- 64 other American coastal species

Images backed up to ~/fish_images_backup/americas/

Findr now has complete image coverage for:
- European species: 80 images
- American species: 100 images
- Total: 180 species

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to remote
git push origin copernicus/bgc-ingest-ci

# Merge to main and deploy
gh pr create --title "Complete worldwide Findr support with American species images" \
  --body "Fixes San Francisco → Scotland mapping bug and adds 100 American species images"
```

---

## 📊 Launch Readiness

### Data Coverage
- ✅ European CMEMS: 221/222 rectangles (99.7%)
- ✅ American NOAA: 476 grids (24% of coastal Americas)
- ✅ Species database: 180 species (80 European + 100 American)

### Functionality
- ✅ European predictions: Production quality
- ✅ American predictions: Working (temperature-only data, 65-70% confidence)
- ✅ Location search: Autocomplete, GPS, IP detection
- ✅ Worldwide support: Properly routes European vs American locations
- ⏳ Species images: 80/180 (pending generation)

### Technical Quality
- ✅ Rectangle lookup: Rejects non-European locations (>1000km threshold)
- ✅ API performance: <1s response time
- ✅ Error handling: Graceful degradation
- ✅ Multi-language: 6 languages supported
- ✅ Authentication: Supabase RLS policies

---

## 🚀 Launch Decision

### Can Launch After Image Generation

**Remaining work:** 3-5 hours (image generation + processing)

**Blockers:** None - all code complete, just needs images

**Risk Level:** LOW - script tested, dual backup, resumable

**Recommendation:**
1. Start image generation ASAP (3-4 hours)
2. Process images (30 mins)
3. Test in browser (15 mins)
4. Deploy to production

**Total time to launch:** ~4-5 hours from now

---

## 💾 Backup Strategy

All American species images saved to:
1. **Inside project:** `fish_out_americas/` (committed to git)
2. **Outside project:** `~/fish_images_backup/americas/` (safe from deletion)

If images deleted, restore from backup:
```bash
cp ~/fish_images_backup/americas/*.png fish_out_americas/
```

---

## 📝 Post-Launch Tasks

### Week 1:
- Monitor error rates (Sentry)
- User feedback collection
- Complete American grid population (500-1000 grids)

### Week 2:
- Performance optimization (query parallelization)
- Copernicus Global integration planning

### Month 2:
- Full environmental suite for Americas (salinity, oxygen, chlorophyll)
- Tide integration
- Moon phase integration

---

**Created:** October 24, 2025
**Status:** 🟡 Ready for image generation
**Next Action:** Add OPENAI_API_KEY and run `python generate_fish_catalogue.py`
