#!/bin/bash

# Grow Icons Optimization Script
# Creates three sets of optimized icons at different sizes:
# - desktop: 192px (for large hero displays)
# - mobile: 96px (for standard card displays)
# - small: 48px (for list items and compact views)

SOURCE_DIR="/Users/damianrafferty/Projects/WotNow/public/grow/icons"
OUTPUT_BASE="/Users/damianrafferty/Projects/WotNow/public/grow/icons"

# Size configurations
DESKTOP_SIZE=192
MOBILE_SIZE=96
SMALL_SIZE=48

# Create output directories
mkdir -p "$OUTPUT_BASE/desktop"
mkdir -p "$OUTPUT_BASE/mobile"
mkdir -p "$OUTPUT_BASE/small"

echo "🌱 Grow Icons Optimization Script"
echo "================================="
echo ""

# Count source files
SOURCE_COUNT=$(ls -1 "$SOURCE_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
echo "📁 Found $SOURCE_COUNT source PNG files"
echo ""

# Process each PNG file in the source directory
for src_file in "$SOURCE_DIR"/*.png; do
    # Skip if it's a directory or doesn't exist
    [ -f "$src_file" ] || continue
    
    filename=$(basename "$src_file")
    
    # Skip already processed files in subdirectories
    if [[ "$src_file" == *"/desktop/"* ]] || [[ "$src_file" == *"/mobile/"* ]] || [[ "$src_file" == *"/small/"* ]]; then
        continue
    fi
    
    echo "Processing: $filename"
    
    # Desktop size (192px)
    sips -Z $DESKTOP_SIZE "$src_file" --out "$OUTPUT_BASE/desktop/$filename" 2>/dev/null
    
    # Mobile size (96px)
    sips -Z $MOBILE_SIZE "$src_file" --out "$OUTPUT_BASE/mobile/$filename" 2>/dev/null
    
    # Small size (48px)
    sips -Z $SMALL_SIZE "$src_file" --out "$OUTPUT_BASE/small/$filename" 2>/dev/null
    
done

echo ""
echo "✅ Optimization complete!"
echo ""

# Show results
echo "📊 Results:"
echo "-----------"

desktop_count=$(ls -1 "$OUTPUT_BASE/desktop"/*.png 2>/dev/null | wc -l | tr -d ' ')
mobile_count=$(ls -1 "$OUTPUT_BASE/mobile"/*.png 2>/dev/null | wc -l | tr -d ' ')
small_count=$(ls -1 "$OUTPUT_BASE/small"/*.png 2>/dev/null | wc -l | tr -d ' ')

echo "Desktop ($DESKTOP_SIZE px): $desktop_count files"
echo "Mobile ($MOBILE_SIZE px):  $mobile_count files"
echo "Small ($SMALL_SIZE px):   $small_count files"

# Calculate sizes
echo ""
echo "📦 Directory sizes:"
du -sh "$OUTPUT_BASE/desktop" 2>/dev/null
du -sh "$OUTPUT_BASE/mobile" 2>/dev/null
du -sh "$OUTPUT_BASE/small" 2>/dev/null

# Sample file sizes
echo ""
echo "📐 Sample dimensions (watering-can.png):"
echo "Desktop:"
sips -g pixelWidth -g pixelHeight "$OUTPUT_BASE/desktop/watering-can.png" 2>/dev/null | grep pixel
echo "Mobile:"
sips -g pixelWidth -g pixelHeight "$OUTPUT_BASE/mobile/watering-can.png" 2>/dev/null | grep pixel
echo "Small:"
sips -g pixelWidth -g pixelHeight "$OUTPUT_BASE/small/watering-can.png" 2>/dev/null | grep pixel

echo ""
echo "🎉 Done! Icons are ready at:"
echo "  - /grow/icons/desktop/*.png (hero displays)"
echo "  - /grow/icons/mobile/*.png (card displays)"
echo "  - /grow/icons/small/*.png (list items)"

# Optional: Remove source files to save space
echo ""
read -p "Remove source files from root to save space? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f "$SOURCE_DIR"/*.png
    echo "✅ Source files removed"
    echo "New total size:"
    du -sh "$SOURCE_DIR"
fi
