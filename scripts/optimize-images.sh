#!/bin/bash

# Image Optimization Script for WotNow
# Converts PNG images to WebP format with quality optimization

echo "Starting image optimization..."

# Create WebP directory if it doesn't exist
mkdir -p public/webp

# Function to convert and resize images
convert_image() {
    local input_file="$1"
    local base_name=$(basename "$input_file" .png)
    
    echo "Converting $input_file..."
    
    # Convert to WebP with 85% quality (good balance of size/quality)
    cwebp -q 85 "$input_file" -o "public/webp/${base_name}.webp"
    
    # Create mobile-optimized version (512x768)
    cwebp -q 85 -resize 512 768 "$input_file" -o "public/webp/${base_name}-mobile.webp"
    
    # Create thumbnail version (256x384) for very fast loading
    cwebp -q 80 -resize 256 384 "$input_file" -o "public/webp/${base_name}-thumb.webp"
}

# Export the function so it can be used with parallel processing
export -f convert_image

# Convert the largest images first (>2MB)
echo "Converting large images..."
find public -name "*.png" -size +2M -print0 | parallel -0 convert_image

echo "Image optimization complete!"
echo "Check public/webp/ directory for optimized images"

# Show size comparison
echo -e "\nSize comparison:"
echo "Original PNGs > 2MB:"
find public -name "*.png" -size +2M -exec ls -lh {} + | awk '{print $5 "\t" $9}' | head -10

echo -e "\nOptimized WebP files:"
ls -lh public/webp/*.webp | awk '{print $5 "\t" $9}' | head -10
