#!/bin/bash

# Image Optimization Script for WotNow
# Converts PNG images to WebP format with quality optimization

echo "Starting image optimization..."

# Determine converter command
USE_NPX_FALLBACK=false
if command -v cwebp >/dev/null 2>&1; then
    CWEBP_CMD=(cwebp)
else
    echo "cwebp not found; using npx cwebp-bin (first run may download the binary)."
    CWEBP_CMD=(npx --yes --package cwebp-bin cwebp)
    USE_NPX_FALLBACK=true
fi

PARALLEL_AVAILABLE=false
if command -v parallel >/dev/null 2>&1; then
    PARALLEL_AVAILABLE=true
else
    echo "GNU parallel not found; falling back to sequential processing for large images."
fi


# Determine script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
WEBP_DIR="$PROJECT_ROOT/public/webp"
mkdir -p "$WEBP_DIR"

# Helper to calculate proportional resize dimensions without upscaling
calculate_resize_dimensions() {
    local input_file="$1"
    local max_dim="$2"

    python3 - "$input_file" "$max_dim" <<'PY'
import struct
import sys

path, max_dim = sys.argv[1], int(sys.argv[2])
with open(path, 'rb') as f:
    header = f.read(24)

if header[:8] != b'\x89PNG\r\n\x1a\n':
    print('0 0')
    raise SystemExit(0)

width, height = struct.unpack('>II', header[16:24])
max_side = max(width, height)

if max_side == 0 or max_side <= max_dim:
    print(f"{width} {height}")
else:
    scale = max_dim / max_side
    new_w = max(1, round(width * scale))
    new_h = max(1, round(height * scale))
    print(f"{new_w} {new_h}")
PY
}

# Function to convert and resize images

convert_image() {
    local input_file="$1"
    local base_name=$(basename "$input_file" .png)
    echo "Converting $input_file..."
    # Convert to WebP with 85% quality (good balance of size/quality)
    "${CWEBP_CMD[@]}" -q 85 "$input_file" -o "$WEBP_DIR/${base_name}.webp"
    # Create mobile-optimized version (max 768px)
    read mobile_width mobile_height < <(calculate_resize_dimensions "$input_file" 768)
    "${CWEBP_CMD[@]}" -q 85 -resize "$mobile_width" "$mobile_height" "$input_file" -o "$WEBP_DIR/${base_name}-mobile.webp"
    # Create thumbnail version (max 384px)
    read thumb_width thumb_height < <(calculate_resize_dimensions "$input_file" 384)
    "${CWEBP_CMD[@]}" -q 80 -resize "$thumb_width" "$thumb_height" "$input_file" -o "$WEBP_DIR/${base_name}-thumb.webp"
}

# Export the function so it can be used with parallel processing
export -f convert_image
export -f calculate_resize_dimensions


# If arguments are provided, process only those files
if [[ $# -gt 0 ]]; then
    for input_file in "$@"; do
        if [[ -f "$input_file" ]]; then
            convert_image "$input_file"
        else
            echo "Warning: $input_file not found, skipping"
        fi
    done
else
    # No arguments: fall back to original bulk logic
    echo "Converting large images..."
    if $USE_NPX_FALLBACK; then
        echo "Skipping bulk large-image conversion until native cwebp is installed (brew install webp)."
    else
        if $PARALLEL_AVAILABLE; then
            find "$PROJECT_ROOT/public" -name "*.png" -size +2M -print0 | parallel -0 convert_image
        else
            while IFS= read -r -d '' file; do
                convert_image "$file"
            done < <(find "$PROJECT_ROOT/public" -name "*.png" -size +2M -print0)
        fi
    fi
fi

echo "Image optimization complete!"
echo "Check $WEBP_DIR for optimized images"

# Show size comparison
echo -e "\nSize comparison:"
echo "Original PNGs > 2MB:"
find "$PROJECT_ROOT/public" -name "*.png" -size +2M -exec ls -lh {} + | awk '{print $5 "\t" $9}' | head -10

echo -e "\nOptimized WebP files:"
ls -lh "$WEBP_DIR"/*.webp | awk '{print $5 "\t" $9}' | head -10
