#!/bin/bash

echo "🔍 macOS Location Services Diagnostic"
echo "===================================="
echo ""

# System info
echo "📱 System Information:"
echo "macOS Version: $(sw_vers -productVersion)"
echo "Build: $(sw_vers -buildVersion)"
echo ""

# Check Location Services
echo "📍 Location Services Status:"
if system_profiler SPConfigurationProfileDataType 2>/dev/null | grep -q "LocationServicesEnabled"; then
    echo "✅ Location Services: Managed by profile"
else
    echo "ℹ️  Location Services: User controlled"
fi

# Wi-Fi status
echo ""
echo "📶 Network Status:"
wifi_device=$(networksetup -listallhardwareports | grep -A1 "Wi-Fi" | tail -1 | cut -d' ' -f2)
if [ ! -z "$wifi_device" ]; then
    wifi_status=$(networksetup -getairportnetwork $wifi_device)
    if [[ "$wifi_status" == *"not associated"* ]]; then
        echo "❌ Wi-Fi: Not connected"
        echo "   💡 macOS location services REQUIRE Wi-Fi for positioning"
        echo "   💡 Connect to Wi-Fi to fix GPS location issues"
    else
        echo "✅ Wi-Fi: Connected to $(echo $wifi_status | cut -d':' -f2)"
    fi
else
    echo "❓ Wi-Fi: Interface not found"
fi

# Check ethernet
if networksetup -getinfo "Ethernet" 2>/dev/null | grep -q "IP address"; then
    echo "✅ Ethernet: Connected"
    echo "   💡 IP-based location should still work"
else
    echo "ℹ️  Ethernet: Not connected"
fi

# Browser checks
echo ""
echo "🌐 Browser Information:"
if [ -d "/Applications/Google Chrome.app" ]; then
    chrome_version=$(system_profiler SPApplicationsDataType | grep -A2 "Google Chrome:" | grep "Version:" | awk '{print $2}')
    echo "Chrome Version: $chrome_version"
    if [[ "$chrome_version" > "130" ]]; then
        echo "   ⚠️  Chrome 130+ has stricter location policies"
    fi
fi

if [ -d "/Applications/Safari.app" ]; then
    safari_version=$(system_profiler SPApplicationsDataType | grep -A2 "Safari:" | grep "Version:" | awk '{print $2}')
    echo "Safari Version: $safari_version"
fi

echo ""
echo "🔧 Recommended Actions:"
echo ""

if [[ "$wifi_status" == *"not associated"* ]]; then
    echo "1. 🚨 URGENT: Connect to Wi-Fi"
    echo "   • macOS location services won't work without Wi-Fi"
    echo "   • Go to System Settings > Wi-Fi and connect"
    echo ""
fi

echo "2. 📱 Check Location Services permissions:"
echo "   • System Settings > Privacy & Security > Location Services"
echo "   • Ensure Location Services is ON"
echo "   • Check browser-specific permissions"
echo ""

echo "3. 🌐 Check browser permissions:"
echo "   • Chrome: Settings > Privacy and security > Site Settings > Location"
echo "   • Safari: Preferences > Websites > Location"
echo ""

echo "4. 🔄 Clear browser data:"
echo "   • Clear site data for your app"
echo "   • Reset location permissions"
echo ""

echo "5. 💻 Alternative solutions:"
echo "   • Use IP-based location (works without Wi-Fi)"
echo "   • Manual location search"
echo "   • Try different browser"
echo ""

echo "✅ Run this diagnostic again after connecting to Wi-Fi"
