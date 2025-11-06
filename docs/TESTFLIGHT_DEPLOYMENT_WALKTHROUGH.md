# TestFlight & Play Console Deployment Walkthrough

**Goal:** Deploy Findr mobile app to beta testing platforms (TestFlight for iOS, Play Console Internal Testing for Android)

**Time Required:**
- iOS (TestFlight): ~2 hours first time, ~30 mins subsequent
- Android (Play Console): ~1 hour first time, ~20 mins subsequent

---

## Quick Start Checklist

Before starting, ensure:

- [ ] You have a Mac (required for iOS builds)
- [ ] Xcode 15+ installed (for iOS)
- [ ] Android Studio installed (for Android)
- [ ] Apple Developer Account ($99/year) - [Sign up here](https://developer.apple.com/programs/)
- [ ] Google Play Developer Account ($25 one-time) - [Sign up here](https://play.google.com/console/signup)
- [ ] All Phase 1 blockers fixed (tests passing, logging enforced, memory cleanup)

---

## Part 1: iOS TestFlight Deployment

### Step 1: Apple Developer Setup (One-Time)

#### 1.1 Create App ID
1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** button
4. Select **App IDs** → **App**
5. Fill in:
   - **Description:** Findr - Fishing Predictions
   - **Bundle ID:** `eu.fishfindr.app` (must match capacitor.config.ts)
   - **Capabilities:** Enable:
     - Push Notifications (if using push)
     - Sign in with Apple (if using Apple auth)
6. Click **Continue** → **Register**

#### 1.2 Create App Store Connect App
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platforms:** iOS
   - **Name:** Findr
   - **Primary Language:** English (UK)
   - **Bundle ID:** Select `eu.fishfindr.app` from dropdown
   - **SKU:** `findr-fishing-app` (your choice, can't change later)
   - **User Access:** Full Access
4. Click **Create**

**Important:** Save the **App ID** (looks like `6479123456`) - you'll need it for API keys.

---

### Step 2: Configure Xcode Project

#### 2.1 Open Project
```bash
cd /path/to/wotnow
npx cap open ios
```

This opens `ios/App/App.xcworkspace` in Xcode.

#### 2.2 Select Development Team
1. In Xcode, select **App** target (top left, under the play button)
2. Go to **Signing & Capabilities** tab
3. Under **Team**, select your Apple Developer team
4. Xcode will automatically create provisioning profiles

**If you see "Failed to create provisioning profile":**
- Ensure your Apple ID is added: **Xcode menu → Settings → Accounts → + → Apple ID**
- Ensure bundle ID matches App ID created earlier

#### 2.3 Verify Configuration
- **Bundle Identifier:** Should be `eu.fishfindr.app`
- **Version:** 1.0.0
- **Build:** 1
- **Signing:** "Automatically manage signing" should be checked
- **Team:** Your team should be selected

---

### Step 3: Build Archive for TestFlight

#### 3.1 Select Target Device
1. Click the device selector (next to play/stop buttons)
2. Select **Any iOS Device (arm64)**

**Important:** Must select "Any iOS Device" not a simulator!

#### 3.2 Create Archive
1. Go to **Product menu → Archive**
2. Wait 5-10 minutes (first build takes longer)
3. When done, the **Organizer** window opens automatically

**Common Build Errors:**

**Error: "Signing certificate not found"**
- Solution: Go to Signing & Capabilities → Download Manual Profiles

**Error: "No profiles for eu.fishfindr.app"**
- Solution: Ensure bundle ID is registered in Apple Developer portal

**Error: "Command PhaseScriptExecution failed"**
- Solution: Clean build folder (**Product → Clean Build Folder**), then try again

#### 3.3 Upload to App Store Connect
1. In **Organizer** window, select your archive
2. Click **Distribute App**
3. Select **App Store Connect** → **Next**
4. Select **Upload** → **Next**
5. Leave default options:
   - Strip Swift symbols: ✓
   - Upload symbols: ✓
   - Manage Version and Build Number: ✓
6. Click **Next** → **Upload**
7. Wait 2-3 minutes for upload

**Success:** You'll see "Upload Successful"

---

### Step 4: Submit to TestFlight

#### 4.1 Wait for Processing
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **My Apps** → **Findr**
3. Click **TestFlight** tab
4. Wait for "Ready to Submit" status (~10-15 minutes)

You'll receive an email when processing is complete.

#### 4.2 Add Beta Information (First Time Only)

**Test Information:**
1. Click on your build number (e.g., "1.0.0 (1)")
2. Fill in required fields:
   - **What to Test:** "Initial beta release - testing offline functionality, permissions, and core features"
   - **Feedback Email:** your-email@example.com
   - **Privacy Policy URL:** https://fishfindr.eu/privacy (if you have one)

**Export Compliance:**
1. Scroll to **Export Compliance**
2. Select:
   - **Is your app designed to use cryptography or does it contain or incorporate cryptography?** → **No**

   *(Or **Yes** if using HTTPS - then select "Standard encryption")*
3. Click **Start Internal Testing**

#### 4.3 Add Beta Testers

**Internal Testing (up to 100 testers, instant access):**
1. Go to **TestFlight** tab → **Internal Testing** section
2. Click **+** next to Internal Testers
3. Add testers by email (they must have Apple ID)
4. Click **Add**

Testers receive email with TestFlight link within 1-2 minutes.

**External Testing (requires Apple review, unlimited testers):**
- Not needed for Phase 2 beta testing
- Use this for public beta before App Store launch

---

### Step 5: Testers Install App

#### 5.1 Tester Instructions
Send to your beta testers:

```
You've been invited to beta test Findr!

1. Install TestFlight app from App Store (if not already installed)
2. Check your email for "You're invited to test Findr"
3. Tap "View in TestFlight" or "Start Testing"
4. TestFlight app opens → Tap "Accept"
5. Tap "Install"
6. Launch Findr from home screen

Provide feedback via TestFlight or email me directly.
```

#### 5.2 Monitor Crashes
1. Go to **TestFlight** tab → Select your build
2. Click **Crashes** to see crash reports
3. Download crash logs if needed

**Goal for Phase 2:** 99% crash-free rate

---

## Part 2: Android Play Console Deployment

### Step 1: Google Play Console Setup (One-Time)

#### 1.1 Create App
1. Go to [play.google.com/console](https://play.google.com/console)
2. Click **Create app**
3. Fill in:
   - **App name:** Findr
   - **Default language:** English (United Kingdom)
   - **App or game:** App
   - **Free or paid:** Free
   - **Declarations:** Check all boxes
4. Click **Create app**

#### 1.2 Complete App Access
1. In left sidebar, click **App access**
2. Select "All functionality is available without restrictions"
3. Click **Save**

#### 1.3 Set Up Data Safety
1. Click **Data safety** in left sidebar
2. Answer questions about data collection:
   - **Does your app collect or share user data?** → Yes
   - **Data types:**
     - Location: Approximate, Ephemeral, Optional
     - Photos: Collected, Not shared, Optional
     - Personal info: Email (if sign-in enabled)
     - Device ID: Analytics purposes, Not shared
3. Click **Next** → **Submit**

---

### Step 2: Generate Signing Key (One-Time)

#### 2.1 Create Upload Key
```bash
cd android/app

# Generate key (replace with your info)
keytool -genkey -v -keystore findr-release.keystore \
  -alias findr-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STRONG_PASSWORD \
  -keypass YOUR_STRONG_PASSWORD \
  -dname "CN=Your Name, OU=Org Unit, O=Organization, L=City, ST=State, C=Country"
```

**Important:**
- Save `findr-release.keystore` file securely (backup to 1Password, etc.)
- Save passwords - you'll need them for every build
- If you lose this, you can't update the app (need to publish new app)

#### 2.2 Configure Gradle
Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('findr-release.keystore')
            storePassword 'YOUR_STRONG_PASSWORD'
            keyAlias 'findr-key-alias'
            keyPassword 'YOUR_STRONG_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Security Note:** Don't commit passwords to git. Use environment variables:

```gradle
signingConfigs {
    release {
        storeFile file('findr-release.keystore')
        storePassword System.getenv("RELEASE_STORE_PASSWORD")
        keyAlias 'findr-key-alias'
        keyPassword System.getenv("RELEASE_KEY_PASSWORD")
    }
}
```

Then set environment variables before building:
```bash
export RELEASE_STORE_PASSWORD="your_password"
export RELEASE_KEY_PASSWORD="your_password"
```

---

### Step 3: Build Android App Bundle (AAB)

#### 3.1 Clean and Build
```bash
cd /path/to/wotnow/android

# Clean previous builds
./gradlew clean

# Build release AAB
./gradlew bundleRelease
```

**Build Time:** 2-5 minutes

**Output File:** `android/app/build/outputs/bundle/release/app-release.aab`

**Common Build Errors:**

**Error: "keystore password was incorrect"**
- Solution: Check passwords in build.gradle or environment variables

**Error: "Execution failed for task ':app:signReleaseBundle'"**
- Solution: Ensure keystore file exists in `android/app/` directory

**Error: "AAPT: error: resource android:attr/lStar not found"**
- Solution: Update `compileSdk` to 33 or higher in `android/app/build.gradle`

#### 3.2 Verify AAB
```bash
# Check file exists and size
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# Should be 5-20 MB
```

---

### Step 4: Upload to Play Console

#### 4.1 Create Internal Testing Release
1. Go to Play Console → **Findr** app
2. In left sidebar, go to **Testing → Internal testing**
3. Click **Create new release**

#### 4.2 Upload AAB
1. Click **Upload** under "App bundles"
2. Select `app-release.aab` from your computer
3. Wait for upload and processing (~2-3 minutes)

You'll see:
- **Version code:** 1
- **Version name:** 1.0.0
- **Supported devices:** ~10,000+ devices
- **APK sizes:** Varies by device (usually 8-15 MB)

#### 4.3 Add Release Notes
Fill in "Release notes":

```
Initial beta release

New features:
- Fishing predictions based on environmental data
- Offline catch logging with photo capture
- Location-based species recommendations
- Favorites management

Testing focus:
- Offline functionality
- Camera and photo permissions
- Location accuracy
- App performance
```

#### 4.4 Review and Roll Out
1. Click **Next** → **Save**
2. Review release summary
3. Click **Start rollout to Internal testing**
4. Confirm rollout

**Status:** Your app is now available to internal testers (usually within 1-2 hours).

---

### Step 5: Add Beta Testers

#### 5.1 Create Internal Testing Track
1. Go to **Testing → Internal testing**
2. Click **Testers** tab
3. Click **Create email list**
4. Name: "Internal Beta Testers"
5. Add tester emails (comma-separated)
6. Click **Save changes**

#### 5.2 Share Testing Link
1. Copy the **Copy link** URL (looks like `https://play.google.com/apps/internaltest/...`)
2. Send to testers

#### 5.3 Tester Instructions
Send to your beta testers:

```
You've been invited to beta test Findr on Android!

1. Click this link: [Your Internal Testing Link]
2. Sign in with your Google account (must match email I invited)
3. Click "Become a tester"
4. Click "Download it on Google Play"
5. Install Findr from Play Store
6. Provide feedback via Play Store or email me directly
```

---

## Part 3: Updating Builds (Subsequent Releases)

### iOS Update Process

**After fixing bugs or adding features:**

```bash
# 1. Increment build number in Xcode
# General tab → Build: 2 (or next number)

# 2. Create new archive
# Product → Archive

# 3. Upload to App Store Connect
# (Same as Step 3.3 above)

# 4. Wait for processing (~10 min)

# 5. Submit to TestFlight
# TestFlight tab → Select new build → "Start Internal Testing"
```

**Version vs. Build:**
- **Version** (1.0.0): User-facing, only increment for significant changes
- **Build** (1, 2, 3...): Increment for every upload, even small fixes

### Android Update Process

**After fixing bugs or adding features:**

```bash
# 1. Increment version code in android/app/build.gradle
versionCode 2  # Was 1

# 2. Build new AAB
cd android
./gradlew bundleRelease

# 3. Upload to Play Console
# Testing → Internal testing → Create new release

# 4. Upload AAB and add release notes

# 5. Start rollout to Internal testing
```

**Version code vs. Version name:**
- **Version code** (1, 2, 3...): Increment for every upload
- **Version name** (1.0.0, 1.0.1): User-facing version string

---

## Part 4: Monitoring Beta Testing

### iOS (TestFlight)

**Metrics to track:**
1. **Crashes:** TestFlight tab → Build → Crashes
   - Goal: <1% crash rate (99% crash-free)
2. **Beta Feedback:** TestFlight automatically includes feedback screenshot tool
3. **Install Rate:** How many invited testers actually installed

**Download Crash Logs:**
1. TestFlight → Select build → Crashes
2. Click crash → Download .crash file
3. Symbolicate in Xcode: **Window → Organizer → Crashes**

### Android (Play Console)

**Metrics to track:**
1. **Crashes & ANRs:** Play Console → Quality → Crashes and ANRs
   - Goal: <1% crash rate
2. **Pre-launch Report:** Automated testing on real devices (free!)
3. **User Feedback:** Play Console → Releases → Internal testing → Feedback

**View Crash Reports:**
1. Play Console → Quality → Android vitals → Crashes
2. Click crash → Stack trace and device info

---

## Part 5: Troubleshooting

### iOS Issues

**"App installation failed" on tester device**
- **Cause:** Device UDID not registered (only for development builds)
- **Solution:** Internal TestFlight doesn't require UDID registration. Ensure tester accepted invite via email.

**"Expired provisioning profile"**
- **Cause:** Profile expired after 1 year
- **Solution:** In Xcode, go to Signing & Capabilities → click "Download Manual Profiles"

**"App is damaged and can't be opened" on Mac**
- **Cause:** Not relevant for TestFlight (iOS only)

### Android Issues

**"App not installed" error**
- **Cause 1:** Conflicting package already installed (debug build)
  - **Solution:** Uninstall debug version first: `adb uninstall eu.fishfindr.app`
- **Cause 2:** Incompatible architecture
  - **Solution:** Ensure AAB includes all architectures (default behavior)

**"Waiting for Wi-Fi" when downloading from Play Store**
- **Cause:** Play Store restricts large downloads over cellular
- **Solution:** Connect to Wi-Fi or change Play Store settings

**"Your device isn't compatible with this version"**
- **Cause:** minSdkVersion too high
- **Solution:** Check `android/app/build.gradle` - should be 24 (Android 7.0) or lower

---

## Part 6: Success Criteria for Phase 2 Beta

**Metrics to achieve before proceeding to Phase 3 (Hybrid Conversion):**

### Stability
- [ ] 99% crash-free rate (iOS + Android combined)
- [ ] <5% of users report bugs
- [ ] No critical bugs (app unusable, data loss)

### User Satisfaction
- [ ] 4.0+ average rating from beta testers
- [ ] Positive feedback on core features:
  - Offline functionality works as expected
  - Permissions are clear and justified
  - Performance is acceptable (no lag/freezing)

### Coverage
- [ ] 5-10 beta testers recruited
- [ ] At least 3 active users per day
- [ ] Testing across:
  - iOS 15, 16, 17 (min)
  - Android 10, 11, 12, 13, 14 (min)
  - Various device types (iPhone, iPad, Android phones/tablets)

### Feedback Collection
- [ ] Set up feedback form or email
- [ ] Track common issues in spreadsheet:
  - Issue description
  - Device/OS version
  - Reproducible steps
  - Priority (critical, high, medium, low)

**Beta Duration:** 10 days minimum (Day 8-17 in phased launch plan)

---

## Part 7: After Beta Testing

**When beta testing is successful:**

1. **Fix Critical Bugs:** Address all critical and high-priority issues
2. **Update Build:** Increment version to 1.0.1 (if bugs fixed)
3. **Proceed to Phase 3:** Convert to hybrid architecture (if desired)
4. **Final Beta:** Test hybrid version with same beta group (3-5 days)
5. **Proceed to Phase 4:** Full store submission for public release

**If beta testing reveals major issues:**
- Pause beta testing
- Fix issues
- Upload new build
- Restart beta test counter (10 days from new build)

---

## Quick Reference

### iOS TestFlight Checklist
```bash
# 1. Open Xcode project
npx cap open ios

# 2. Select "Any iOS Device"
# 3. Product → Archive
# 4. Organizer → Distribute App → Upload
# 5. Wait ~15 min for processing
# 6. App Store Connect → TestFlight → Start Internal Testing
# 7. Add testers by email
# 8. Testers receive invite immediately
```

### Android Play Console Checklist
```bash
# 1. Build AAB
cd android && ./gradlew bundleRelease

# 2. Upload to Play Console
# Testing → Internal testing → Create new release

# 3. Upload app-release.aab

# 4. Add release notes → Start rollout

# 5. Add testers by email → Share testing link

# 6. Testers can install within 1-2 hours
```

### Key URLs
- **Apple Developer:** https://developer.apple.com/account
- **App Store Connect:** https://appstoreconnect.apple.com
- **Google Play Console:** https://play.google.com/console
- **TestFlight App:** https://apps.apple.com/app/testflight/id899247664

---

## Need Help?

**iOS TestFlight Issues:**
- [Apple's TestFlight Documentation](https://developer.apple.com/testflight/)
- [TestFlight Beta Testing Guide](https://developer.apple.com/testflight/)

**Android Play Console Issues:**
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Internal Testing Documentation](https://support.google.com/googleplay/android-developer/answer/9845334)

**General Capacitor Issues:**
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)

Good luck with your beta launch! 🚀
