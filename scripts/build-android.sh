#!/bin/bash

# Android Build Script for Multi-App Flavors
# Usage: ./scripts/build-android.sh [flavor] [buildType]
# Examples:
#   ./scripts/build-android.sh findr debug
#   ./scripts/build-android.sh godaisy release
#   ./scripts/build-android.sh growdaisy debug

set -e

FLAVOR=${1:-findr}
BUILD_TYPE=${2:-debug}

# Validate flavor
if [[ ! "$FLAVOR" =~ ^(findr|godaisy|growdaisy)$ ]]; then
    echo "Invalid flavor: $FLAVOR"
    echo "Valid flavors: findr, godaisy, growdaisy"
    exit 1
fi

# Validate build type
if [[ ! "$BUILD_TYPE" =~ ^(debug|release)$ ]]; then
    echo "Invalid build type: $BUILD_TYPE"
    echo "Valid build types: debug, release"
    exit 1
fi

# Capitalize first letter for gradle task
FLAVOR_CAP="$(tr '[:lower:]' '[:upper:]' <<< ${FLAVOR:0:1})${FLAVOR:1}"
BUILD_TYPE_CAP="$(tr '[:lower:]' '[:upper:]' <<< ${BUILD_TYPE:0:1})${BUILD_TYPE:1}"

echo "=========================================="
echo "Building $FLAVOR ($BUILD_TYPE)"
echo "=========================================="

# Select the correct capacitor config
CONFIG_FILE="capacitor.config.ts"
case $FLAVOR in
    findr)
        CONFIG_FILE="capacitor.config.ts"  # Default is Findr
        ;;
    godaisy)
        CONFIG_FILE="capacitor.config.godaisy.ts"
        ;;
    growdaisy)
        CONFIG_FILE="capacitor.config.growdaisy.ts"
        ;;
esac

echo "Using Capacitor config: $CONFIG_FILE"

# Sync Capacitor with the correct config (using temp symlink approach)
echo "Syncing Capacitor..."

# Backup current config and use the flavor-specific one
if [ "$CONFIG_FILE" != "capacitor.config.ts" ]; then
    cp capacitor.config.ts capacitor.config.ts.backup
    cp "$CONFIG_FILE" capacitor.config.ts
    npx cap sync android
    mv capacitor.config.ts.backup capacitor.config.ts
else
    npx cap sync android
fi

# Build the specific flavor
cd android

echo "Building assemble${FLAVOR_CAP}${BUILD_TYPE_CAP}..."
./gradlew "assemble${FLAVOR_CAP}${BUILD_TYPE_CAP}"

# Show output location
APK_PATH="app/build/outputs/apk/${FLAVOR}/${BUILD_TYPE}/app-${FLAVOR}-${BUILD_TYPE}.apk"
if [ -f "$APK_PATH" ]; then
    echo ""
    echo "=========================================="
    echo "Build successful!"
    echo "APK: android/$APK_PATH"
    echo "=========================================="
else
    echo "APK built at: app/build/outputs/apk/${FLAVOR}/${BUILD_TYPE}/"
fi
