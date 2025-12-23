# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================
# Capacitor Core
# ============================================
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-dontwarn com.getcapacitor.**

# Keep Capacitor's BridgeActivity
-keep class * extends com.getcapacitor.BridgeActivity { *; }

# ============================================
# JavaScript Interface (WebView)
# ============================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================
# OkHttp / Okio (used by networking plugins)
# ============================================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ============================================
# Firebase / Google Services
# ============================================
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# ============================================
# SQLite Plugin (Capacitor Community)
# ============================================
-keep class com.getcapacitor.community.database.sqlite.** { *; }

# ============================================
# Preserve line numbers for crash reporting
# ============================================
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
