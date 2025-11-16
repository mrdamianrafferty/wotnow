#!/usr/bin/env bash
# ============================================================
# Run this AFTER manually copying component / util files from
# the Figma AI Grow Daisy repo into:
#   - components/grow/
#   - lib/grow/
#   - components/ui/ (if needed)
# This script normalises imports to use existing wotnow aliases.
# ============================================================

set -euo pipefail

echo "Fixing imports..."

find pages/grow components/grow lib/grow \
  -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read -r file; do
  if [ -f "$file" ]; then
    sed -i.bak \
      -e "s|from ['\"]utils/supabase/client['\"]|from '@/lib/supabase/client'|g" \
      -e "s|from ['\"]\.\./utils/supabase/client['\"]|from '@/lib/supabase/client'|g" \
      -e "s|from ['\"]\.\./\.\./utils/supabase/client['\"]|from '@/lib/supabase/client'|g" \
      -e "s|from ['\"]utils/supabase/info['\"]|from '@/lib/supabase/client'|g" \
      -e "s|from ['\"]utils/|from '@/lib/grow/|g" \
      -e "s|from ['\"]\.\./utils/|from '@/lib/grow/|g" \
      -e "s|from ['\"]\.\./\.\./utils/|from '@/lib/grow/|g" \
      -e "s|from ['\"]\.\./\.\./\.\./utils/|from '@/lib/grow/|g" \
      -e "s|from ['\"]\.\/components/ui/|from '@/components/ui/|g" \
      -e "s|from ['\"]\.\./components/ui/|from '@/components/ui/|g" \
      -e "s|from ['\"]\.\./\.\./components/ui/|from '@/components/ui/|g" \
      "$file"
    rm -f "$file.bak"
    echo "  ✓ $(basename "$file")"
  fi
done

echo "✅ Imports fixed!"
