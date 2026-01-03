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
INSTALL_DEVICE=false

# Check for --device flag in any position
for arg in "$@"; do
    if [ "$arg" = "--device" ]; then
        INSTALL_DEVICE=true
    fi
done

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
# IMPORTANT: Each app has its own config file to prevent cross-contamination
case $FLAVOR in
    findr)
        CONFIG_FILE="capacitor.config.findr.ts"
        ;;
    godaisy)
        CONFIG_FILE="capacitor.config.godaisy.ts"
        ;;
    growdaisy)
        CONFIG_FILE="capacitor.config.growdaisy.ts"
        ;;
esac

echo "Using Capacitor config: $CONFIG_FILE"

# Build static export for offline-capable apps
if [ "$FLAVOR" = "findr" ]; then
    echo ""
    echo "Building static export for Findr offline mode..."
    echo "(This bundles the React app locally for offline use)"

    # Build static export using the offline config
    # Note: This creates a static HTML/JS bundle that works offline
    NEXT_PUBLIC_OFFLINE_MODE=true npx next build -c next.config.findr-offline.mjs 2>&1 || {
        echo "Warning: Static export build failed. Falling back to server-based mode."
        echo "The app will require network connection to function."
    }

    # If build succeeded, copy to Capacitor assets
    if [ -d "out-findr" ]; then
        echo "Copying static export to Capacitor assets..."
        rm -rf .capacitor-assets-offline
        cp -r out-findr .capacitor-assets-offline
        echo "Static export ready: .capacitor-assets-offline/"
    fi
fi

# Sync Capacitor with the correct config
# Capacitor CLI always reads capacitor.config.ts, so we swap it temporarily
echo "Syncing Capacitor..."

# Backup current config and use the flavor-specific one
cp capacitor.config.ts capacitor.config.ts.backup
cp "$CONFIG_FILE" capacitor.config.ts
echo "Swapped capacitor.config.ts with $CONFIG_FILE"

# Verify the swap worked
echo "Config now points to:"
grep -E "(appId|appName|url)" capacitor.config.ts | head -3

npx cap sync android

# Restore original config
mv capacitor.config.ts.backup capacitor.config.ts
echo "Restored original capacitor.config.ts"

# Build the specific flavor
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    # For release builds, create AAB (Android App Bundle) for Play Store
    echo "Building bundle${FLAVOR_CAP}${BUILD_TYPE_CAP}..."
    ./gradlew "bundle${FLAVOR_CAP}${BUILD_TYPE_CAP}"

    AAB_PATH="app/build/outputs/bundle/${FLAVOR}Release/app-${FLAVOR}-release.aab"
    if [ -f "$AAB_PATH" ]; then
        echo ""
        echo "=========================================="
        echo "Build successful!"
        echo "AAB: android/$AAB_PATH"
        echo "Size: $(du -h "$AAB_PATH" | cut -f1)"
        echo "=========================================="
        echo ""
        echo "Upload this AAB to Google Play Console"
    else
        echo "AAB built at: app/build/outputs/bundle/${FLAVOR}Release/"
    fi
else
    # For debug builds, create APK
    echo "Building assemble${FLAVOR_CAP}${BUILD_TYPE_CAP}..."
    ./gradlew "assemble${FLAVOR_CAP}${BUILD_TYPE_CAP}"

    APK_PATH="app/build/outputs/apk/${FLAVOR}/${BUILD_TYPE}/app-${FLAVOR}-${BUILD_TYPE}.apk"
    if [ -f "$APK_PATH" ]; then
        echo ""
        echo "=========================================="
        echo "Build successful!"
        echo "APK: android/$APK_PATH"
        echo "=========================================="

        # Install on device if --device flag was passed
        if [ "$INSTALL_DEVICE" = true ]; then
            echo "Installing on device..."
            adb install -r "$APK_PATH"
            echo "Installed on device!"
        fi
    else
        echo "APK built at: app/build/outputs/apk/${FLAVOR}/${BUILD_TYPE}/"
    fi
fi
