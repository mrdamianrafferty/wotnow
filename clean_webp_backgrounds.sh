cat > ~/clean_webp_backgrounds.sh <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

# Usage: clean_webp_backgrounds.sh /path/to/folder [FUZZ%]
# Example: clean_webp_backgrounds.sh "/Users/damianrafferty/Projects/WotNow/public/webp" 10%

DIR="${1:-.}"
FUZZ="${2:-9%}"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick ('magick') not found. On macOS: brew install imagemagick" >&2
  exit 1
fi

cd "$DIR"
mkdir -p ../webp_clean

shopt -s nullglob
for f in *.webp; do
  echo "→ $f"

  # 1) Skip files that already have transparency
  CHANS="$(magick identify -format "%[channels]" "$f" || true)"
  if echo "$CHANS" | grep -qi "alpha"; then
    echo "   has alpha → copy unchanged"
    cp -p "$f" "../webp_clean/$f"
    continue
  fi

  # 2) Only act if a flat (near-white) edge exists:
  ORIG_WH="$(magick identify -format "%wx%h" "$f")"
  TRIM_WH="$(magick "$f" -fuzz "$FUZZ" -trim +repage -format "%wx%h" info:)"
  if [[ "$ORIG_WH" == "$TRIM_WH" ]]; then
    echo "   no flat white edge detected → copy unchanged"
    cp -p "$f" "../webp_clean/$f"
    continue
  fi

  echo "   white/near-white edge detected → removing background (fuzz $FUZZ)"

  # 3) Build a near-white mask, keep largest CC (the background), invert → alpha
  magick "$f" -alpha off \
    \( +clone \
       -fuzz "$FUZZ" -fill white -opaque white \
       -fill black +opaque white \
       -threshold 50% \
       -define connected-components:connectivity=4 \
       -define connected-components:keep=1 \
       -connected-components 4 \
       -negate -write mpr:mask +delete \) \
    mpr:mask -compose copyopacity -composite \
    -define webp:lossless=true "../webp_clean/$f"

  echo "   ✅ cleaned → ../webp_clean/$f"
done

echo "Done. Output in: $(cd ../webp_clean && pwd)"
BASH