# Build Generation Guide

**App:** Findr - Fishing Predictions
**Version:** 1.0.0
**Date:** January 6, 2025

---

## Overview

This guide provides step-by-step instructions for generating production-ready builds for both iOS (IPA) and Android (AAB) platforms. Follow these procedures before each App Store and Play Store submission.

---

## Prerequisites

### Common Requirements
- [ ] Node.js 20+ installed
- [ ] Project dependencies installed: `npm install`
- [ ] Capacitor CLI installed: `npm install -g @capacitor/cli`
- [ ] Code committed to git (clean working directory)
- [ ] All tests passing: `npm test`, `npm run lint:ci`, `npm run typecheck`

### iOS Requirements
- [ ] macOS with Xcode 15+ installed
- [ ] Apple Developer Account ($99/year)
- [ ] Certificates and Provisioning Profiles configured
- [ ] CocoaPods installed: `sudo gem install cocoapods`

### Android Requirements
- [ ] Android Studio installed (or Android SDK command-line tools)
- [ ] JDK 17+ installed
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Release signing key generated

---

## Part 1: Pre-Build Checklist

### 1.1 Version Number Update

**Update in multiple locations:**

#### package.json
```json
{
  "name": "wotnow",
  "version": "1.0.0",
  ...
}
```

#### capacitor.config.ts
```typescript
const config: CapacitorConfig = {
  appId: 'eu.fishfindr.app',
  appName: 'Findr',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  ios: {
    contentInset: 'always'
  },
  // Version information (for reference)
  version: '1.0.0',
  buildNumber: 1,
};
```

**Note:** Actual version numbers are in platform-specific files (below).

---

#### iOS Version (Xcode)
**File:** `ios/App/App.xcodeproj/project.pbxproj` (or via Xcode GUI)

**Via Xcode:**
1. Open `ios/App/App.xcworkspace` in Xcode
2. Select "App" target
3. General tab → Identity
4. **Version:** 1.0.0 (user-facing version string)
5. **Build:** 1 (increments with each upload)

**Via Command Line:**
```bash
cd ios/App
agvtool new-marketing-version 1.0.0  # Version
agvtool new-version -all 1          # Build number
```

---

#### Android Version (Gradle)
**File:** `android/app/build.gradle`

```gradle
android {
    defaultConfig {
        applicationId "eu.fishfindr.app"
        versionCode 1          // Integer, increments with each release
        versionName "1.0.0"    // User-facing version string
    }
}
```

**Version Code Rules:**
- Must be an integer
- Must increment with each Play Store upload
- Suggested scheme:
  - v1.0.0 → 10000
  - v1.0.1 → 10001
  - v1.1.0 → 10100
  - v2.0.0 → 20000

**Checklist:**
- [ ] `package.json` version updated
- [ ] iOS version and build number updated
- [ ] Android versionCode and versionName updated
- [ ] All three match (or follow your versioning scheme)

---

### 1.2 Environment Variables

**Create production `.env.production` file:**

```bash
# API URLs
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Services
STORMGLASS_SECRET_KEY=your-stormglass-key
COPERNICUS_USERNAME=your-copernicus-username
COPERNICUS_PASSWORD=your-copernicus-password

# Optional (Production only)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Mode
NODE_ENV=production
```

**⚠️ Security Warning:**
- Never commit `.env.production` to git
- Use environment variable management (e.g., Vercel environment variables)
- Rotate keys regularly

**Checklist:**
- [ ] `.env.production` created with production credentials
- [ ] All API keys valid and tested
- [ ] Sensitive keys NOT committed to git

---

### 1.3 Code Quality Checks

**Run all checks before building:**

```bash
# TypeScript type checking
npm run typecheck

# ESLint (CI mode, max-warnings=0)
npm run lint:ci

# Unit tests
npm test

# Build test (ensure no build errors)
npm run build
```

**All must pass:**
- [ ] ✅ TypeScript: 0 errors
- [ ] ✅ ESLint: 0 errors, 0 warnings
- [ ] ✅ Tests: All passing
- [ ] ✅ Build: Success

**If any fail:** Fix issues before proceeding.

---

### 1.4 Sync Capacitor

**Sync web build with native projects:**

```bash
# Build Next.js for production
npm run build

# Copy web assets to native projects
npx cap sync

# Or sync individually
npx cap sync ios
npx cap sync android
```

**What this does:**
- Copies `out/` (Next.js build) to `ios/App/App/public/` and `android/app/src/main/assets/public/`
- Updates native dependencies from `package.json`
- Runs CocoaPods (iOS) and Gradle sync (Android)

**Checklist:**
- [ ] `npm run build` successful
- [ ] `npx cap sync` completed without errors
- [ ] No warnings about missing plugins or dependencies

---

## Part 2: iOS Build (IPA)

### 2.1 Open Project in Xcode

```bash
npx cap open ios
```

**Or manually:**
```bash
open ios/App/App.xcworkspace
```

**⚠️ Important:** Always open `.xcworkspace`, NOT `.xcodeproj` (CocoaPods requirement).

---

### 2.2 Configure Signing

**Navigate to:** Xcode → Targets → App → Signing & Capabilities

#### Development Signing
- **Automatically manage signing:** ☑ (checked)
- **Team:** Select your Apple Developer team
- **Signing Certificate:** Apple Development
- **Provisioning Profile:** Automatic

#### Production Signing (for App Store)
**Change configuration to "Release":**
1. Xcode → Product → Scheme → Edit Scheme
2. Run → Build Configuration → **Release**
3. Archive → Build Configuration → **Release**

**Signing settings:**
- **Automatically manage signing:** ☑ (or manual if you prefer)
- **Team:** Your production team
- **Signing Certificate:** **Apple Distribution**
- **Provisioning Profile:** **App Store** (automatic or select manually)

**Checklist:**
- [ ] Team selected
- [ ] Distribution certificate valid
- [ ] App Store provisioning profile valid
- [ ] No signing errors or warnings

---

### 2.3 Build Configuration

**Verify Release build settings:**

**Navigate to:** Targets → App → Build Settings

**Key settings:**
| Setting | Value |
|---------|-------|
| **Optimization Level** | `-Os` (Optimize for Size) |
| **Enable Bitcode** | No (deprecated in Xcode 14+) |
| **Strip Debug Symbols** | Yes |
| **Dead Code Stripping** | Yes |
| **Enable Testability** | No (Release only) |
| **Deployment Target** | iOS 13.0 or higher |

**Checklist:**
- [ ] Release configuration optimized
- [ ] Debug symbols stripped
- [ ] Deployment target set correctly

---

### 2.4 Archive the App

#### Method A: Via Xcode GUI (Recommended)

1. **Select target device:**
   - Top toolbar: "Any iOS Device (arm64)" or "Generic iOS Device"

2. **Archive:**
   - Menu: Product → Archive
   - Wait 2-5 minutes (depends on project size)
   - Xcode Organizer opens automatically when done

#### Method B: Via Command Line

```bash
cd ios/App

xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath "$PWD/build/App.xcarchive" \
  archive
```

**Checklist:**
- [ ] Archive completes without errors
- [ ] Archive appears in Xcode Organizer

---

### 2.5 Export for App Store

**In Xcode Organizer:**

1. **Select Archive**
   - Window → Organizer → Archives tab
   - Select the latest "App" archive

2. **Distribute App**
   - Click "Distribute App" button (right side)

3. **Distribution Method**
   - Select: **App Store Connect**
   - Click "Next"

4. **Distribution Options**
   - **Upload:** ☑ (uploads to App Store Connect)
   - **Include bitcode:** ☐ (deprecated)
   - **Upload symbols:** ☑ (for crash reports)
   - Click "Next"

5. **Signing**
   - **Automatically manage signing:** ☑ (recommended)
   - Or select signing certificate and provisioning profile manually
   - Click "Next"

6. **Review App.ipa**
   - Verify:
     - App name: Findr
     - Bundle ID: eu.fishfindr.app
     - Version: 1.0.0
     - Build: 1
   - Click "Upload"

7. **Wait for Upload**
   - Upload progress bar (2-10 minutes depending on IPA size)
   - "Upload Successful" message appears

**Checklist:**
- [ ] Upload successful
- [ ] No errors or warnings during export

---

### 2.6 Verify Upload in App Store Connect

**Navigate to:** https://appstoreconnect.apple.com

1. **Check processing status:**
   - My Apps → Findr → Activity tab
   - Build status: "Processing" (takes 5-30 minutes)

2. **Wait for processing to complete:**
   - You'll receive email: "Your build has been processed"
   - Status changes to: "Ready to Submit" or available in Build selection

3. **Select build for submission:**
   - iOS App → 1.0 Prepare for Submission
   - Build section → Click "+ Build"
   - Select: 1.0.0 (1)
   - Click "Done"

**Checklist:**
- [ ] Build appears in App Store Connect
- [ ] Build processing complete (green checkmark)
- [ ] Build selected for version 1.0

---

### 2.7 iOS Build Troubleshooting

#### Error: "No valid code signing identity found"
**Fix:**
- Xcode → Preferences → Accounts → Download Manual Profiles
- Or create new certificate in Apple Developer Portal

#### Error: "Build failed - Linker command failed"
**Fix:**
- Clean build folder: Product → Clean Build Folder (Cmd+Shift+K)
- Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Re-run CocoaPods: `cd ios/App && pod install`

#### Error: "Unable to install app on simulator"
**Not an issue:** Archives are for real devices/App Store only. Use Run (Cmd+R) for simulator testing.

#### Warning: "App icon is missing"
**Fix:**
- Add 1024x1024 App Icon to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Drag PNG into Xcode asset catalog

---

## Part 3: Android Build (AAB)

### 3.1 Generate Signing Key (First Time Only)

**Only needed once for the app lifetime.**

```bash
cd android/app

keytool -genkey -v -keystore findr-release.keystore \
  -alias findr-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Prompts:**
```
Enter keystore password: [Create strong password]
Re-enter new password: [Repeat password]
What is your first and last name? [Your Name or Company]
What is the name of your organizational unit? [Dev Team]
What is the name of your organization? [Company Name]
What is the name of your City or Locality? [City]
What is the name of your State or Province? [State]
What is the two-letter country code? [US/UK/etc]
Is CN=... correct? [yes]
Enter key password for <findr-key-alias>: [Same as keystore or different]
```

**⚠️ CRITICAL:**
- **Backup keystore file securely** (1Password, encrypted drive, etc.)
- **NEVER commit to git**
- **If lost, you cannot update the app** (must create new app with new package name)

**Store keystore:**
- Location: `android/app/findr-release.keystore`
- Backup: Multiple secure locations

**Checklist:**
- [ ] Keystore generated
- [ ] Keystore backed up in 2+ secure locations
- [ ] Passwords saved in password manager
- [ ] Keystore NOT in git (check `.gitignore`)

---

### 3.2 Configure Signing

**File:** `android/gradle.properties`

**Add signing configuration:**

```properties
# Signing config for release builds
FINDR_RELEASE_STORE_FILE=findr-release.keystore
FINDR_RELEASE_KEY_ALIAS=findr-key-alias
FINDR_RELEASE_STORE_PASSWORD=your-keystore-password
FINDR_RELEASE_KEY_PASSWORD=your-key-password
```

**⚠️ Security:**
- **DO NOT commit this file with passwords** to git
- Add `gradle.properties` to `.gitignore`
- Or use environment variables:
  ```properties
  FINDR_RELEASE_STORE_PASSWORD=${STORE_PASSWORD}
  FINDR_RELEASE_KEY_PASSWORD=${KEY_PASSWORD}
  ```

**File:** `android/app/build.gradle`

**Add signing config:**

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file(FINDR_RELEASE_STORE_FILE)
            storePassword FINDR_RELEASE_STORE_PASSWORD
            keyAlias FINDR_RELEASE_KEY_ALIAS
            keyPassword FINDR_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Checklist:**
- [ ] Signing config added to `gradle.properties`
- [ ] Signing config added to `build.gradle`
- [ ] Passwords NOT committed to git
- [ ] Keystore file exists at specified path

---

### 3.3 Build Android App Bundle (AAB)

**App Bundle is the required format for Google Play (not APK).**

#### Method A: Via Gradle Command (Recommended)

```bash
cd android

# Clean previous builds
./gradlew clean

# Build release AAB
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Build time:** 2-5 minutes

#### Method B: Via Android Studio

1. Open project in Android Studio:
   ```bash
   npx cap open android
   ```

2. Build → Generate Signed Bundle / APK
3. Select: **Android App Bundle**
4. Choose or create signing key
5. Select "release" build variant
6. Click "Finish"

**Checklist:**
- [ ] Build completes without errors
- [ ] `app-release.aab` file exists in `android/app/build/outputs/bundle/release/`
- [ ] File size reasonable (10-50 MB typical)

---

### 3.4 Verify AAB

**Check AAB details:**

```bash
cd android/app/build/outputs/bundle/release

# Use bundletool (Google's AAB inspector)
# Download from: https://github.com/google/bundletool/releases

java -jar bundletool-all.jar validate --bundle=app-release.aab

# Output: "No issues found."
```

**Check AAB contents:**
```bash
java -jar bundletool-all.jar dump manifest --bundle=app-release.aab | grep -E "(package|versionCode|versionName)"
```

**Expected output:**
```xml
package="eu.fishfindr.app"
android:versionCode="1"
android:versionName="1.0.0"
```

**Checklist:**
- [ ] Package name correct: `eu.fishfindr.app`
- [ ] Version code correct: `1`
- [ ] Version name correct: `1.0.0`
- [ ] No validation errors

---

### 3.5 Upload to Play Console

**Navigate to:** https://play.google.com/console

1. **Select App:**
   - Apps → Findr

2. **Create Release:**
   - Production → Releases → Create new release
   - Or: Testing → Internal testing (for testing first)

3. **Upload AAB:**
   - Drag and drop: `android/app/build/outputs/bundle/release/app-release.aab`
   - Wait for processing (2-5 minutes)

4. **Release Name:**
   - Auto-filled: `1 (1.0.0)`
   - Or custom: `1.0.0 (Initial Release)`

5. **Release Notes:**
   ```
   🎉 Welcome to Findr 1.0!

   Get smart fishing predictions based on real marine data.

   ✨ FEATURES:
   • 50+ fish species with confidence scores
   • Real-time ocean data (temperature, salinity, clarity)
   • Species-specific bait and habitat advice
   • Daily bite scores
   • GPS location detection
   • Catch logging with photos
   • Offline mode for remote fishing
   • Multi-language support (6 languages)

   📧 FEEDBACK:
   We'd love to hear from you! Email support@fishfindr.eu
   ```

6. **Review Release:**
   - Click "Review release"
   - Verify all details correct

7. **Start Rollout:**
   - Click "Start rollout to Production"
   - Or "Start rollout to Internal testing" (for testing first)

**Checklist:**
- [ ] AAB uploaded successfully
- [ ] Processing complete (green checkmark)
- [ ] Release notes added
- [ ] Rollout started

---

### 3.6 Android Build Troubleshooting

#### Error: "Keystore file not found"
**Fix:**
- Verify path in `gradle.properties`
- Ensure keystore is in `android/app/findr-release.keystore`

#### Error: "Wrong password"
**Fix:**
- Verify passwords in `gradle.properties`
- Re-enter with `keytool -list -v -keystore findr-release.keystore`

#### Error: "Duplicate class found"
**Fix:**
- Clean build: `./gradlew clean`
- Delete `android/app/build/` directory
- Re-run build

#### Error: "Build failed - missing google-services.json"
**Fix:**
- Download from Firebase Console
- Place in: `android/app/google-services.json`
- Re-sync: `npx cap sync android`

#### Warning: "Unoptimized APK"
**Not an issue:** App Bundles are optimized by Google Play at download time.

---

## Part 4: Testing Builds Before Submission

### 4.1 iOS TestFlight Testing

**Upload to TestFlight before App Store submission:**

1. **Build is automatically available in TestFlight** after upload
2. **Add Internal Testers:**
   - App Store Connect → TestFlight → Internal Testing
   - Add team members via email
3. **Invite Testers:**
   - Testers receive email/TestFlight app notification
4. **Install and Test:**
   - Testers install via TestFlight app
   - Test all features on real devices
5. **Collect Feedback:**
   - Testers can submit feedback via TestFlight
   - Review crash reports in App Store Connect

**Checklist:**
- [ ] TestFlight build tested on iPhone (iOS 15+)
- [ ] TestFlight build tested on iPad (optional)
- [ ] All permission flows work
- [ ] No crashes reported
- [ ] Ready for App Store submission

---

### 4.2 Android Internal Testing

**Upload to Internal Testing track before Production:**

1. **Upload AAB to Internal Testing:**
   - Play Console → Testing → Internal testing
   - Create release
   - Upload AAB

2. **Add Testers:**
   - Create email list (up to 100 testers)
   - Share opt-in URL with testers

3. **Testers Install:**
   - Testers click opt-in link
   - Install via Play Store (shows "Internal test" badge)

4. **Pre-launch Report:**
   - Google automatically tests on ~20 devices
   - Review results: crashes, performance, security
   - Wait 1-2 hours for report

5. **Review Pre-launch Report:**
   - Play Console → Release → Testing → Pre-launch report
   - Check for crashes, ANRs, security issues
   - Fix critical issues before Production

**Checklist:**
- [ ] Internal testing build tested on Android 12+
- [ ] Pre-launch report shows no crashes
- [ ] All features work correctly
- [ ] Ready for Production submission

---

## Part 5: Build Automation (Future)

### 5.1 Fastlane (iOS & Android)

**Automate build, sign, and upload process.**

**Install:**
```bash
sudo gem install fastlane
```

**Initialize:**
```bash
# iOS
cd ios
fastlane init

# Android
cd android
fastlane init
```

**Example Fastfile (iOS):**
```ruby
lane :release do
  increment_build_number
  build_app(
    workspace: "ios/App/App.xcworkspace",
    scheme: "App",
    export_method: "app-store"
  )
  upload_to_app_store
end
```

**Run:**
```bash
fastlane release
```

**Benefits:**
- One command to build and upload
- Automatic version bumping
- Screenshots generation
- Beta distribution

---

### 5.2 CI/CD (GitHub Actions)

**Automate builds on every commit or tag.**

**Example workflow:** `.github/workflows/build-ios.yml`

```yaml
name: Build iOS

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npx cap sync ios
      - run: fastlane ios release
        env:
          FASTLANE_USER: ${{ secrets.APPLE_ID }}
          FASTLANE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
```

**Benefits:**
- Automated builds on git tags
- Consistent build environment
- No manual steps
- Faster iteration

---

## Part 6: Build Checklist Summary

### Pre-Build
- [ ] Version numbers updated (iOS, Android, package.json)
- [ ] Environment variables configured (.env.production)
- [ ] Code quality checks passed (typecheck, lint, tests)
- [ ] `npm run build` successful
- [ ] `npx cap sync` completed

### iOS Build
- [ ] Xcode project opened (.xcworkspace)
- [ ] Signing configured (Distribution certificate, App Store profile)
- [ ] Archive created
- [ ] IPA exported and uploaded to App Store Connect
- [ ] Build processing complete
- [ ] Build selected for version in App Store Connect
- [ ] TestFlight testing complete (optional)

### Android Build
- [ ] Signing key generated and backed up
- [ ] Signing config added to gradle.properties and build.gradle
- [ ] AAB built with `./gradlew bundleRelease`
- [ ] AAB validated with bundletool
- [ ] AAB uploaded to Play Console
- [ ] Release created and rolled out
- [ ] Pre-launch report reviewed (optional)
- [ ] Internal testing complete (optional)

### Post-Build
- [ ] Commit build changes (version bumps) to git
- [ ] Tag release: `git tag v1.0.0 && git push --tags`
- [ ] Update changelog or release notes
- [ ] Notify team of build completion

---

## Resources

### Tools
- **Xcode:** https://developer.apple.com/xcode/
- **Android Studio:** https://developer.android.com/studio
- **Fastlane:** https://fastlane.tools
- **Bundletool:** https://github.com/google/bundletool

### Documentation
- **Capacitor Build:** https://capacitorjs.com/docs/basics/building-your-app
- **iOS Deployment:** https://capacitorjs.com/docs/ios/deploying-to-app-store
- **Android Deployment:** https://capacitorjs.com/docs/android/deploying-to-google-play
- **App Store Connect:** https://developer.apple.com/app-store-connect/
- **Play Console:** https://play.google.com/console

### Internal Docs
- `STORE_SUBMISSION_COMPLETE_GUIDE.md` - Full submission process
- `APP_STORE_CONNECT_SUBMISSION_TEMPLATE.md` - iOS store listing
- `GOOGLE_PLAY_CONSOLE_SUBMISSION_TEMPLATE.md` - Android store listing

---

**Last Updated:** January 6, 2025
**Status:** Ready for Production Builds
**Version:** 1.0.0
