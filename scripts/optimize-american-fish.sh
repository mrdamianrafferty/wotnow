#!/bin/bash
set -e

# Optimize American Species Fish Images
# Converts PNG images from fish_out_americas/ to WebP format with three sizes

echo "Starting American species fish image optimization..."

# Check if cwebp is available
if ! command -v cwebp >/dev/null 2>&1; then
    echo "Error: cwebp not found. Install with: brew install webp"
    exit 1
fi

INPUT_DIR="fish_out_americas"
OUTPUT_DIR="public/webp"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Counter
processed=0
total=$(ls "$INPUT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')

echo "Found $total PNG images to process"

# Process each PNG file
for png_file in "$INPUT_DIR"/*.png; do
    if [ ! -f "$png_file" ]; then
        continue
    fi

    # Get the filename without path and extension
    filename=$(basename "$png_file" .png)

    # Normalize filename:
    # 1. Remove leading number prefix (001_, 002_, etc.)
    # 2. Convert to lowercase
    # 3. Replace underscores with hyphens
    # 4. Remove scientific name (everything after second underscore)
    normalized=$(echo "$filename" | \
        sed 's/^[0-9]*_//' | \
        tr '[:upper:]' '[:lower:]' | \
        tr '_' '-')

    # For fish with scientific names like "California-Sheephead-Semicossyphus-pulcher"
    # We want just "california-sheephead"
    # Take only the first two parts (common name, typically 1-2 words)
    base_name=$(echo "$normalized" | awk -F'-' '{
        # Special handling for multi-word species
        if ($1 == "california" || $1 == "pacific" || $1 == "atlantic" || $1 == "american" ||
            $1 == "common" || $1 == "greater" || $1 == "lesser" || $1 == "black" ||
            $1 == "blue" || $1 == "red" || $1 == "barred" || $1 == "spotted" ||
            $1 == "longfin" || $1 == "shortfin" || $1 == "scalloped" || $1 == "small") {
            if ($2 == "spotted" || $2 == "white" || $2 == "inshore") {
                print $1 "-" $2 "-" $3
            } else {
                print $1 "-" $2
            }
        } else if ($2 == "grouper" || $2 == "snapper" || $2 == "jack" || $2 == "shark" ||
                   $2 == "drum" || $2 == "crab" || $2 == "lobster" || $2 == "squid" ||
                   $2 == "mackerel" || $2 == "tuna" || $2 == "salmon" || $2 == "halibut" ||
                   $2 == "bass" || $2 == "durgon" || $2 == "trevally" || $2 == "greenling" ||
                   $2 == "hammerhead" || $2 == "thresher" || $2 == "corbina" || $2 == "tarpon" ||
                   $2 == "pargo" || $2 == "seabass" || $2 == "bonito" || $2 == "surfperch" ||
                   $2 == "goatfish" || $2 == "sheephead" || $2 == "marlin") {
            print $1 "-" $2
        } else {
            print $1
        }
    }')

    processed=$((processed + 1))
    echo "[$processed/$total] Converting $filename → $base_name"

    # Base image (original size, quality 85)
    cwebp -q 85 "$png_file" -o "$OUTPUT_DIR/${base_name}.webp" 2>/dev/null

    # Mobile version (800px max dimension, quality 85)
    cwebp -q 85 -resize 0 800 "$png_file" -o "$OUTPUT_DIR/${base_name}-mobile.webp" 2>/dev/null

    # Thumbnail version (200px max dimension, quality 80)
    cwebp -q 80 -resize 0 200 "$png_file" -o "$OUTPUT_DIR/${base_name}-thumb.webp" 2>/dev/null

    echo "  ✓ Created: ${base_name}.webp, ${base_name}-mobile.webp, ${base_name}-thumb.webp"
done

echo ""
echo "✅ Optimization complete!"
echo "Processed: $processed images"
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Size comparison:"
echo "Original PNGs:"
du -sh "$INPUT_DIR" 2>/dev/null || echo "N/A"
echo "Optimized WebP files:"
du -sh "$OUTPUT_DIR"/*-mobile.webp 2>/dev/null | head -1 | awk '{print "Mobile: " $1}'
du -sh "$OUTPUT_DIR"/*-thumb.webp 2>/dev/null | head -1 | awk '{print "Thumb: " $1}'
