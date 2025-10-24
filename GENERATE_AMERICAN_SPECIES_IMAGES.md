# Generate American Species Images

This guide explains how to generate the 100 missing American species images for Findr.

## Requirements

1. **OpenAI API Key** with access to DALL-E (gpt-image-1 model)
2. **Python 3.10+** with required packages

## Setup

### 1. Add OpenAI API Key

Add your OpenAI API key to `.env.local`:

```bash
echo "OPENAI_API_KEY=sk-your-key-here" >> .env.local
```

### 2. Install Python Dependencies

```bash
pip install openai python-dotenv
```

## Generate Images

### Run the generation script:

```bash
python generate_fish_catalogue.py
```

**Timeline:**
- 100 species × 2 minutes = ~3.3 hours minimum
- With retries and API limits, expect 4-5 hours total

**Output:**
- Images saved in: `fish_out_americas/`
- Backup saved in: `~/fish_images_backup/americas/`

### Monitor Progress

The script will show:
- `[gen]` - Generating image
- `[done]` - Image saved
- `[skip]` - Image already exists (safe to resume)
- `[warn]` - Retry on rate limit
- `[wait]` - Waiting before next image

### Resume if Interrupted

The script is resumable - it skips already-generated images. Just run it again:

```bash
python generate_fish_catalogue.py
```

## After Generation

### 1. Convert PNG to WebP

Use the existing optimization script to convert raw PNGs to WebP format:

```bash
# Create script to optimize American species images
cat > scripts/optimize-american-fish.sh << 'EOF'
#!/bin/bash
set -e

INPUT_DIR="fish_out_americas"
OUTPUT_DIR="public/webp"

echo "Converting American species images to WebP..."

for png in "$INPUT_DIR"/*.png; do
  if [ -f "$png" ]; then
    filename=$(basename "$png" .png)
    # Convert to lowercase and replace underscores with hyphens
    webp_name=$(echo "$filename" | tr '[:upper:]' '[:lower:]' | sed 's/_/-/g' | sed 's/^[0-9]*-//')

    # Base image (1536x1024)
    cwebp -q 85 "$png" -o "$OUTPUT_DIR/${webp_name}.webp"

    # Mobile image (800x533)
    convert "$png" -resize 800x533 - | cwebp -q 85 - -o "$OUTPUT_DIR/${webp_name}-mobile.webp"

    # Thumbnail (200x133)
    convert "$png" -resize 200x133 - | cwebp -q 85 - -o "$OUTPUT_DIR/${webp_name}-thumb.webp"

    echo "✓ $webp_name"
  fi
done

echo "Done! Converted $(ls $INPUT_DIR/*.png | wc -l) images"
EOF

chmod +x scripts/optimize-american-fish.sh
bash scripts/optimize-american-fish.sh
```

### 2. Regenerate Species Image Map

Update the TypeScript species image map:

```bash
npx tsx scripts/generate-species-image-map.ts
```

### 3. Verify Results

Check the updated species image map:

```bash
grep -c "SPECIES_IMAGE_MAP" data/speciesImageMap.ts  # Should show 180 species (80 European + 100 American)
grep -c "SPECIES_IMAGES_MISSING" data/speciesImageMap.ts  # Should show 0 missing
```

### 4. Test in Browser

```bash
npm run dev
# Navigate to http://localhost:3001/findr
# Search for "San Francisco"
# Verify Pacific Halibut shows real image (not placeholder)
```

### 5. Commit Changes

```bash
git add fish_out_americas/ public/webp/ data/speciesImageMap.ts
git commit -m "Add American species images - 100 species generated via DALL-E"
```

## Backup Strategy

Images are automatically saved to TWO locations:

1. **Inside project**: `fish_out_americas/` (committed to git)
2. **Outside project**: `~/fish_images_backup/americas/` (safe from accidental deletion)

If images are ever deleted from the project, restore from backup:

```bash
cp ~/fish_images_backup/americas/*.png fish_out_americas/
```

## Troubleshooting

### Error: "No OPENAI_API_KEY found"
- Add API key to `.env.local`
- Verify with: `grep OPENAI_API_KEY .env.local`

### Error: "Rate limit exceeded"
- Script will auto-retry with exponential backoff
- If persistent, increase `INTERVAL_SECS` in the script

### Error: "Module not found"
- Install dependencies: `pip install openai python-dotenv`

### Images look wrong
- Check `TOP_DOWN` set in script for flatfish
- Verify scientific names match database

## Cost Estimate

- DALL-E pricing: ~$0.040 per image (1536x1024)
- 100 images × $0.040 = ~$4.00 total

## Species List (100 American Species)

Generated images for:
- 5 Salmon species (Chinook, Coho, Sockeye, Pink, Chum)
- 2 Halibut species (Pacific, Atlantic)
- 10 Grouper species (Gag, Black, Red, Nassau, etc.)
- 8 Snapper species (Red, Yellowtail, Cubera, etc.)
- 6 Tuna species (Yellowfin, Bluefin, Albacore, etc.)
- 5 Shark species (Bull, Tiger, Blue, Blacktip, Hammerhead)
- 4 Marlin species (Blue, White, Striped)
- Plus 60+ other American coastal species

See `generate_fish_catalogue.py` for complete list.
