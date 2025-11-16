#!/usr/bin/env bash

# ============================================================
# SELF-CONTAINED GROW DAISY → WOTNOW MIGRATION
# ============================================================
# This script:
#   - Validates you're in the wotnow repo
#   - Creates directories for Grow Daisy pages/components/lib
#   - Creates Next.js page stubs under /pages/grow
#   - Generates fix-imports.sh to normalise import paths
# Run this FROM your wotnow repository root.
#
# Usage:
#   1. Save as: migrate-grow.sh
#   2. chmod +x migrate-grow.sh
#   3. ./migrate-grow.sh
# ============================================================

set -euo pipefail

# Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step()    { echo -e "${BLUE}[STEP]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================
# VALIDATION
# ============================================================

print_step "Validating we're in the wotnow repository..."

if [ ! -f "pages/findr/index.tsx" ]; then
  print_error "This doesn't look like the wotnow repository!"
  echo "Please run this script FROM the wotnow directory, for example:"
  echo "  cd /path/to/wotnow"
  echo "  ./migrate-grow.sh"
  exit 1
fi

print_success "wotnow repository detected ✅"

# ============================================================
# BACKUP
# ============================================================

print_step "Creating backup directory..."

BACKUP_DIR=".migration-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_success "Backup directory created: $BACKUP_DIR"

# (Optionally you could copy important files into BACKUP_DIR here.)

# ============================================================
# CREATE DIRECTORY STRUCTURE
# ============================================================

print_step "Creating Grow Daisy directory structure..."

mkdir -p pages/grow/{plan,activities,weather,garden,onboarding}
mkdir -p components/grow/{garden,tasks,weather,location,guild,onboarding}
mkdir -p lib/grow
mkdir -p components/ui
mkdir -p components/figma
mkdir -p docs/grow
mkdir -p types

print_success "Directories created ✅"

# ============================================================
# CREATE PAGES
# ============================================================

print_step "Creating Next.js page stubs under pages/grow..."

# Main page
cat > pages/grow/index.tsx << 'ENDOFFILE'
import React from 'react';
import { Homepage } from '@/components/grow/Homepage';

export default function GrowPage() {
  return <Homepage />;
}
ENDOFFILE

# Plan page
cat > pages/grow/plan/index.tsx << 'ENDOFFILE'
import React from 'react';
import { PlanPage } from '@/components/grow/tasks/PlanPage';

export default function GrowPlanPage() {
  return <PlanPage />;
}
ENDOFFILE

# Activities page
cat > pages/grow/activities/index.tsx << 'ENDOFFILE'
import React from 'react';
import { ActivitiesPage } from '@/components/grow/tasks/ActivitiesPage';

export default function GrowActivitiesPage() {
  return <ActivitiesPage />;
}
ENDOFFILE

# Weather page
cat > pages/grow/weather/index.tsx << 'ENDOFFILE'
import React from 'react';
import { WeatherPage } from '@/components/grow/weather/WeatherPage';

export default function GrowWeatherPage() {
  return <WeatherPage />;
}
ENDOFFILE

# Garden page
cat > pages/grow/garden/index.tsx << 'ENDOFFILE'
import React from 'react';
import { GardenPage } from '@/components/grow/garden/GardenPage';

export default function GrowGardenPage() {
  return <GardenPage />;
}
ENDOFFILE

# Onboarding page
cat > pages/grow/onboarding/index.tsx << 'ENDOFFILE'
import React from 'react';
import { OnboardingFlow } from '@/components/grow/onboarding/OnboardingFlow';

export default function GrowOnboardingPage() {
  return <OnboardingFlow />;
}
ENDOFFILE

print_success "Page stubs created ✅"

# ============================================================
# CREATE IMPORT FIX SCRIPT
# ============================================================

print_step "Creating fix-imports.sh script..."

cat > fix-imports.sh << 'ENDOFFILE'
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
ENDOFFILE

chmod +x fix-imports.sh

print_success "fix-imports.sh created and made executable ✅"

# ============================================================
# FINAL SUMMARY
# ============================================================

echo ""
echo "============================================================"
print_success "GROW DAISY MIGRATION SCAFFOLD CREATED!"
echo "============================================================"
echo ""
echo "📁 Backup directory:"
echo "   $BACKUP_DIR"
echo ""
echo "📂 Created structure:"
echo "   pages/grow/ (with index, plan, activities, weather, garden, onboarding)"
echo "   components/grow/ (feature folders, currently empty)"
echo "   lib/grow/ (empty)"
echo "   components/ui/ (created if missing)"
echo "   components/figma/"
echo "   docs/grow/"
echo ""
echo "▶ Next manual steps:"
echo "  1) Copy Grow Daisy component files from the Figma AI export into:"
echo "       - components/grow/"
echo "       - lib/grow/"
echo "       - components/ui/ (if there are shared UI primitives)"
echo ""
echo "  2) Run import fixer:"
echo "       ./fix-imports.sh"
echo ""
echo "  3) Install any extra dependencies the Figma project used, for example:"
echo "       npm install lucide-react recharts @googlemaps/js-api-loader"
echo ""
echo "  4) Add any required environment variables for Grow Daisy to .env.local"
echo ""
echo "  5) Start dev server and test:"
echo "       npm run dev"
echo "       # Then open: http://localhost:3000/grow"
echo ""
print_success "Scaffold ready. You can now start copying Grow Daisy code into wotnow."
echo ""