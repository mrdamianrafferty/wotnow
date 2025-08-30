#!/bin/bash
#
# File Quarantine Script
# This script helps quarantine files that are candidates for deletion
#

# Create quarantine directory if it doesn't exist
echo "Creating quarantine directory..."
mkdir -p .quarantine

# List of files to quarantine (from the file audit)
FILES_TO_QUARANTINE=(
  "test-simple.js"
  "test-api-caching.js"
  "test-air-quality-api.js"
  "test-air-quality-visibility.js"
  "test-astronomy-api.js"
  "test-astronomy-integration.js"
  "test-beaufort.js"
  "test-category-advice.js"
  "test-conversion-manual.js"
  "test-env-indicators.js"
  "test-environmental-fallback.js"
  "test-environmental-indicators.js"
  "test-marine-fields.js"
  "test-marine-popup-data.js"
  "test-openmeteo-service.js"
  "test-out-of-season.js"
  "test-popup-wind-fix.js"
  "test-wind-conversion.js"
  "test-wind-icon.js"
  "debug-env-data-flow.js"
  "debug-env-data.js"
  "debug-env-indicators.js"
  "debug-env-popup.js"
  "debug-marine-popup.js"
  "debug-outdoor-meditation.js"
  "check-activity-ids.js"
  "test-weather-with-pollen.js"
)

# Create a new branch for quarantine
echo "Creating quarantine branch..."
git checkout -b chore/quarantine-deletions

# Move files to quarantine directory
echo "Moving files to quarantine..."
for file in "${FILES_TO_QUARANTINE[@]}"; do
  if [ -f "$file" ]; then
    echo "Quarantining $file..."
    git mv "$file" ".quarantine/"
  else
    echo "Warning: $file not found, skipping..."
  fi
done

# Commit changes
echo "Committing changes..."
git add -A
git commit -m "chore: quarantine unused files (pending validation)"

echo ""
echo "Files have been quarantined. Please run the following to validate:"
echo "npm run typecheck && npm run test && npm run build"
echo ""
echo "If everything works for 7 days, you can safely delete the quarantined files."
echo "To restore files from quarantine: git mv .quarantine/<file> ./"
