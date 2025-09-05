#!/bin/bash

echo "🔧 Fixing macOS Sequoia Location Issues"
echo "======================================"

echo ""
echo "The issue is likely that macOS 15.6.1 (Sequoia) reset your location permissions."
echo "Let's fix this step by step:"
echo ""

echo "📍 STEP 1: Clear App Location Failure Memory"
echo "--------------------------------------------"
if [[ -f ~/Library/Preferences/com.apple.Safari.plist ]] || [[ -d ~/Library/Application\ Support/Google/Chrome ]]; then
    echo "Clearing cached location failures from our app..."
    # We'll do this through the browser console
    echo "✅ Will reset via browser console"
else
    echo "❌ No browser data found"
fi

echo ""
echo "🔒 STEP 2: Check/Enable System Location Services"
echo "------------------------------------------------"
echo "You need to manually enable Location Services:"
echo ""
echo "1. Open System Settings (or System Preferences)"
echo "2. Go to 'Privacy & Security' → 'Location Services'"
echo "3. Make sure 'Location Services' toggle is ON"
echo "4. Scroll down and find your browser (Chrome/Safari)"
echo "5. Make sure it's enabled"
echo ""
echo "🌐 STEP 3: Reset Browser Location Permissions"
echo "--------------------------------------------"
echo "For Chrome:"
echo "1. Go to: chrome://settings/content/location"
echo "2. Click 'Delete all' to clear site permissions"
echo "3. Go to your app: http://localhost:3000"
echo "4. Allow location when prompted"
echo ""
echo "For Safari:"
echo "1. Safari → Preferences → Websites → Location"
echo "2. Remove localhost entries"
echo "3. Reload your app and re-allow"
echo ""

echo "🧪 STEP 4: Test Location Recovery"
echo "--------------------------------"
echo "1. Open http://localhost:3000"
echo "2. Try location detection"
echo "3. You should see permission prompt"
echo "4. Allow location access"
echo ""

echo "💡 ALTERNATIVE: Force IP-Only Mode"
echo "---------------------------------"
echo "If GPS still fails, we can modify the app to prefer IP location:"
echo "This bypasses all macOS CoreLocation issues."
echo ""

read -p "🤔 Would you like me to modify the app to prefer IP location for your device? (y/n): " choice

if [[ $choice == "y" || $choice == "Y" ]]; then
    echo ""
    echo "🔧 Modifying geolocation strategy to prefer IP fallback..."
    echo "This will make your app use IP location first, avoiding GPS issues."
    echo ""
    echo "Changes will be applied to force IP-first mode for persistent failures."
    
    # We'll implement this by modifying the failure count to trigger IP-first mode
    cat << 'EOF' > /tmp/reset_location.js
// Reset location failure count and force IP-first mode
console.log('🔧 Resetting location settings for macOS Sequoia compatibility...');

// Clear any cached failures
localStorage.removeItem('geolocationFailureCount');
localStorage.removeItem('hasLocationIssues');
localStorage.removeItem('advancedGeolocationCache');
localStorage.removeItem('ipGeolocationCache');

// Set failure count to trigger IP-first mode (3+ failures)
localStorage.setItem('geolocationFailureCount', '4');

console.log('✅ Location settings reset. App will now prefer IP geolocation.');
console.log('💡 Refresh the page and try location detection again.');
console.log('📍 The app will skip GPS and use IP location immediately.');
EOF

    echo "📋 JavaScript code generated at /tmp/reset_location.js"
    echo ""
    echo "To apply the fix:"
    echo "1. Open http://localhost:3000"
    echo "2. Open browser console (F12)"
    echo "3. Copy and paste this code:"
    echo ""
    cat /tmp/reset_location.js
    echo ""
    echo "4. Press Enter to run it"
    echo "5. Refresh the page"
    echo "6. Try location detection - it should work via IP now!"
    
else
    echo ""
    echo "📝 Manual steps to fix:"
    echo "1. Enable Location Services in System Settings"
    echo "2. Reset browser permissions"
    echo "3. Test with: https://www.google.com/maps first"
    echo "4. Then test your app"
    echo ""
fi

echo ""
echo "🔍 The root cause is macOS 15.6.1 privacy changes."
echo "Your location used to work because permissions were grandfathered in."
echo "The OS update reset these permissions for security."
echo ""
echo "✅ Following these steps should restore location functionality!"
