# Complete Store Submission Guide

**App:** Findr - Fishing Predictions
**Version:** 1.0.0
**Date:** January 6, 2025
**Status:** Production-Ready Compliance Checklist

---

## Overview

This document provides a complete checklist for App Store and Google Play Store submission, incorporating all permissions, compliance requirements, and testing procedures.

---

## Phase 1: iOS Configuration

### 1.1 Info.plist Permission Strings

**File:** `ios/App/App/Info.plist`

**Add the following keys with Apple-approved descriptions:**

```xml
<!-- Location Permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Findr uses your location to show weather and fishing conditions near you.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Findr uses your location to update conditions and forecasts when you move between areas.</string>

<!-- Camera Permissions -->
<key>NSCameraUsageDescription</key>
<string>Findr uses the camera to take photos of your catches.</string>

<!-- Photo Library Permissions -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Findr uses your photo library so you can select existing catch photos.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Findr saves your catch photos to your photo library if you choose to export them.</string>

<!-- Motion Permissions -->
<key>NSMotionUsageDescription</key>
<string>Findr uses motion data to detect whether you are moving or stationary while fishing.</string>
```

**Notes:**
- Notifications (local/push) do NOT require Info.plist strings on iOS
- Permissions are requested at runtime
- Descriptions must explain the specific benefit to the user

**Checklist:**
- [ ] All 6 permission strings added to Info.plist
- [ ] Descriptions are user-friendly and specific to Findr's features
- [ ] No generic or template descriptions used

---

### 1.2 Xcode Capabilities

**Navigate to:** Xcode → Target "App" → Signing & Capabilities

**Enable the following capabilities:**

#### Push Notifications
- [ ] Capability added: Push Notifications
- [ ] APNs entitlement: `aps-environment` = production (or development for testing)

#### Background Modes (Optional - only if needed)
- [ ] Capability added: Background Modes
- [ ] ☑ Remote notifications (for push notifications)
- [ ] ☑ Location updates (ONLY if you truly need background location)

**Warning:** Background location requires strong justification for App Store approval. Findr currently uses "When In Use" location only.

#### Associated Domains (Optional - for universal links)
- [ ] Only if implementing deep linking
- [ ] Format: `applinks:fishfindr.eu`

---

### 1.3 APNs Configuration

**For Push Notifications:**

1. **Create APNs Auth Key** (Apple Developer Portal)
   - [ ] Navigate to: Certificates, Identifiers & Profiles → Keys
   - [ ] Create key with "Apple Push Notifications service (APNs)" enabled
   - [ ] Download `.p8` file (save securely, can't re-download)
   - [ ] Note: Key ID and Team ID

2. **Upload to Firebase**
   - [ ] Firebase Console → Project Settings → Cloud Messaging
   - [ ] iOS app configuration → APNs Authentication Key
   - [ ] Upload `.p8` file
   - [ ] Enter Key ID and Team ID

3. **Verify Bundle ID**
   - [ ] Bundle ID in Xcode matches Apple Developer: `eu.fishfindr.app`
   - [ ] Bundle ID in Firebase matches: `eu.fishfindr.app`

**Checklist:**
- [ ] APNs key created and downloaded
- [ ] APNs key uploaded to Firebase
- [ ] Bundle IDs match everywhere

---

### 1.4 App Transport Security (ATS)

**Ensure all API calls use HTTPS:**

- [ ] All API endpoints use HTTPS (no HTTP)
- [ ] No ATS exceptions in Info.plist (avoid unless absolutely necessary)
- [ ] Third-party APIs verified:
  - [ ] Supabase: HTTPS ✓
  - [ ] Copernicus Marine Service: HTTPS ✓
  - [ ] Sentry (if used): HTTPS ✓

**If ATS exceptions are needed:**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>example-non-https-domain.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
            <key>NSExceptionReason</key>
            <string>Specific reason required by Apple</string>
        </dict>
    </dict>
</dict>
```

**Best practice:** Avoid ATS exceptions. Contact API providers to support HTTPS.

---

## Phase 2: Android Configuration

### 2.1 AndroidManifest.xml Permissions

**File:** `android/app/src/main/AndroidManifest.xml`

**Add the following permissions inside `<manifest>` (before `<application>`):**

```xml
<!-- Location Permissions -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>

<!-- Background Location (ONLY if truly needed) -->
<!-- Requires declaration form in Play Console -->
<!-- <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/> -->

<!-- Camera Permission -->
<uses-permission android:name="android.permission.CAMERA"/>

<!-- Media Permissions (Android 13+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>

<!-- Legacy Storage (for older devices) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28"/>

<!-- Notifications (Android 13+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>

<!-- Motion/Activity Recognition -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>

<!-- Network State (no runtime prompt) -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

**Notes:**
- `READ_MEDIA_IMAGES` is preferred on Android 13+ (no broad storage access)
- `maxSdkVersion` limits permissions to older Android versions
- `POST_NOTIFICATIONS` requires runtime request on Android 13+

**Checklist:**
- [ ] All required permissions added
- [ ] Modern scoped permissions used (`READ_MEDIA_IMAGES`)
- [ ] Legacy permissions capped with `maxSdkVersion`
- [ ] Background location commented out (not needed for Findr v1.0)

---

### 2.2 Gradle Configuration

**File:** `android/app/build.gradle`

**Verify the following:**

```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "eu.fishfindr.app"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    // ...existing dependencies
    implementation 'com.google.firebase:firebase-messaging:23.4.0' // FCM
}

apply plugin: 'com.google.gms.google-services'
```

**Checklist:**
- [ ] `targetSdkVersion 34` (Android 14)
- [ ] `minSdkVersion 23` or higher
- [ ] Version code and name correct
- [ ] Google Services plugin applied

---

### 2.3 Firebase Configuration

**File:** `android/app/google-services.json`

1. **Download from Firebase:**
   - [ ] Firebase Console → Project Settings → General
   - [ ] Scroll to "Your apps" → Android app
   - [ ] Click "google-services.json" download button
   - [ ] Save to: `android/app/google-services.json`

2. **Verify package name:**
   - [ ] Package name in `google-services.json` matches: `eu.fishfindr.app`
   - [ ] Package name in `AndroidManifest.xml` matches
   - [ ] Package name in `build.gradle` matches

**Checklist:**
- [ ] `google-services.json` placed in correct location
- [ ] Package name matches across all files
- [ ] FCM enabled in Firebase Console

---

### 2.4 Security Configuration

**File (create if not exists):** `android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    android:allowBackup="true"
    ...>
```

**Checklist:**
- [ ] Cleartext traffic disabled (HTTPS only)
- [ ] Network security config referenced in manifest
- [ ] `allowBackup` set appropriately (true for user data backup)

---

## Phase 3: Runtime Permission Implementation

### 3.1 Location Permission Handler

**File:** `lib/capacitor/permissions.ts` (create if not exists)

```typescript
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export async function ensureLocationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web - use browser geolocation API
    return navigator.permissions
      ? navigator.permissions.query({ name: 'geolocation' }).then(
          (result) => result.state === 'granted'
        )
      : true; // Assume granted, will prompt on first use
  }

  // Check current status
  const status = await Geolocation.checkPermissions();

  if (status.location === 'granted') {
    return true;
  }

  if (status.location === 'denied') {
    // Show explanation and link to settings
    showPermissionDeniedDialog('location');
    return false;
  }

  // Request permission
  const result = await Geolocation.requestPermissions();
  return result.location === 'granted';
}

/**
 * Show user-friendly dialog when permission is denied
 */
function showPermissionDeniedDialog(permission: string) {
  // Use your toast/modal system
  alert(`Location permission is needed to show fishing conditions near you.
Please enable it in Settings.`);

  // Optional: Open app settings
  // (requires a settings plugin or deep link)
}
```

**Usage in components:**
```typescript
async function getUserLocation() {
  const hasPermission = await ensureLocationPermission();

  if (!hasPermission) {
    // Show fallback: manual location search
    showManualLocationPicker();
    return;
  }

  // Proceed with geolocation
  const position = await Geolocation.getCurrentPosition();
  // ...
}
```

**Checklist:**
- [ ] Permission check before every location request
- [ ] Graceful fallback to manual location picker
- [ ] User-friendly explanation when denied
- [ ] "Open Settings" option available

---

### 3.2 Camera & Photo Permission Handler

```typescript
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

/**
 * Take photo with camera (requests camera permission)
 */
export async function takePhoto(): Promise<Photo | null> {
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
      saveToGallery: true, // Saves to iOS Photos / Android MediaStore
      quality: 85,
    });
    return photo;
  } catch (error: any) {
    if (error.message?.includes('permission') || error.message?.includes('denied')) {
      showPermissionDeniedDialog('camera');
      return null;
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Pick photo from gallery (requests photo library permission)
 */
export async function pickPhoto(): Promise<Photo | null> {
  try {
    const photo = await Camera.getPhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.Uri,
    });
    return photo;
  } catch (error: any) {
    if (error.message?.includes('permission') || error.message?.includes('denied')) {
      showPermissionDeniedDialog('photos');
      return null;
    }
    throw error;
  }
}

function showPermissionDeniedDialog(type: 'camera' | 'photos') {
  const message =
    type === 'camera'
      ? 'Camera permission is needed to take photos of your catches. Please enable it in Settings.'
      : 'Photo library permission is needed to select photos. Please enable it in Settings.';

  alert(message);
}
```

**Key Points:**
- No separate permission request needed—Capacitor handles it
- iOS: Prompts automatically on first use
- Android: Requests at runtime
- `saveToGallery: true` uses MediaStore (no legacy storage permission)

**Checklist:**
- [ ] Camera and photo picker wrapped with error handling
- [ ] Permission denial handled gracefully
- [ ] App works without photo permissions (catch logs can be text-only)

---

### 3.3 Local Notifications Permission Handler

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

export async function ensureNotificationPermission(): Promise<boolean> {
  // Check current status
  const status = await LocalNotifications.checkPermissions();

  if (status.display === 'granted') {
    return true;
  }

  if (status.display === 'denied') {
    showPermissionDeniedDialog('notifications');
    return false;
  }

  // Request permission
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

/**
 * Schedule notification with permission check
 */
export async function scheduleNotification(options: {
  title: string;
  body: string;
  schedule: { at: Date };
}) {
  const hasPermission = await ensureNotificationPermission();

  if (!hasPermission) {
    console.log('[Notifications] Permission denied, notification not scheduled');
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Date.now(),
        title: options.title,
        body: options.body,
        schedule: options.schedule,
      },
    ],
  });
}
```

**Note:** On Android 13+, `POST_NOTIFICATIONS` permission is required and requested automatically by Capacitor when `requestPermissions()` is called.

**Checklist:**
- [ ] Permission requested before scheduling notifications
- [ ] Graceful degradation if denied (app works without notifications)
- [ ] User can enable notifications later in settings

---

### 3.4 Push Notifications Handler

```typescript
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';

export async function initializePushNotifications() {
  // Request permission
  const permResult = await PushNotifications.requestPermissions();

  if (permResult.receive !== 'granted') {
    console.log('[Push] Permission denied');
    return;
  }

  // Register for push
  await PushNotifications.register();

  // Handle registration success
  PushNotifications.addListener('registration', (token: Token) => {
    console.log('[Push] Registration successful, token:', token.value);
    // Send token to your backend
    sendPushTokenToBackend(token.value);
  });

  // Handle registration error
  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('[Push] Registration error:', error);
  });

  // Handle notification received while app is open
  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('[Push] Notification received:', notification);
      // Show in-app notification or update UI
    }
  );

  // Handle notification tapped (app was in background)
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification: any) => {
      console.log('[Push] Notification tapped:', notification);
      // Navigate to relevant screen
    }
  );
}

async function sendPushTokenToBackend(token: string) {
  try {
    await fetch('/api/user/push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.error('[Push] Failed to send token to backend:', error);
  }
}
```

**Checklist:**
- [ ] APNs key configured (iOS)
- [ ] FCM configured (Android)
- [ ] Token sent to backend
- [ ] Notification handlers registered
- [ ] Deep linking works when notification is tapped

---

## Phase 4: Store Compliance Answers

### 4.1 App Store Privacy Labels

**Navigate to:** App Store Connect → App Privacy

**Answer questions as follows:**

#### Data Collection

**Location:**
- ☑ Precise Location
- **Linked to user:** No (location not tied to account)
- **Used for tracking:** No
- **Purpose:** App Functionality (show fishing conditions)

**Photos/Media:**
- ☑ Photos or Videos
- **Linked to user:** Yes (stored in user's catch logs)
- **Used for tracking:** No
- **Purpose:** App Functionality (catch logging)

**User Content:**
- ☑ Other User Content (catch logs: species, date, bait, habitat)
- **Linked to user:** Yes
- **Used for tracking:** No
- **Purpose:** App Functionality

**Device ID (if using Sentry/Analytics):**
- ☑ Device ID
- **Linked to user:** No
- **Used for tracking:** No
- **Purpose:** App Functionality (crash reporting), Analytics

**Summary:**
- **Tracking:** No (Findr does not track users across apps/sites)
- **Data linked to identity:** Yes (catch logs, photos - but user can opt out)

**Checklist:**
- [ ] All collected data types declared
- [ ] Purposes match actual use
- [ ] Tracking set to "No" (if true)
- [ ] Privacy policy URL live and comprehensive

---

### 4.2 Google Play Data Safety

**Navigate to:** Play Console → App Content → Data safety

**Declare the following:**

#### Location
- **Collected:** Yes
- **Shared:** No
- **Ephemeral:** Yes (not stored on servers, only used for API calls)
- **Optional:** Yes (users can search manually)
- **Purpose:** App functionality

#### Photos and Videos
- **Collected:** Yes
- **Shared:** No
- **Ephemeral:** No (stored in catch logs)
- **Optional:** Yes (catch logs work without photos)
- **Purpose:** App functionality

#### Personal Info (if users create accounts)
- **Data types:** Name, Email address
- **Collected:** Yes
- **Shared:** No
- **Ephemeral:** No
- **Optional:** Yes (sign-in optional)
- **Purpose:** Account management

#### App Activity
- **Data types:** App interactions, Other user-generated content (catch logs)
- **Collected:** Yes
- **Shared:** No
- **Ephemeral:** No
- **Optional:** Yes
- **Purpose:** App functionality, Analytics (if enabled)

#### Device or Other IDs
- **Collected:** Yes (if using Sentry or analytics)
- **Shared:** No
- **Ephemeral:** No
- **Optional:** Yes (can be disabled)
- **Purpose:** App functionality (crash reporting), Analytics

**Security Practices:**
- **Encryption in transit:** Yes (HTTPS, TLS)
- **User can request deletion:** Yes
  - In-app: Settings → Account → Delete Account
  - Email: support@fishfindr.eu

**Checklist:**
- [ ] All data types declared accurately
- [ ] Purposes match actual behavior
- [ ] Deletion instructions provided
- [ ] Privacy policy matches declarations

---

### 4.3 Background Location Declaration (if needed)

**Only complete if you use `ACCESS_BACKGROUND_LOCATION`.**

**For Findr v1.0:** NOT NEEDED (uses "When In Use" location only)

**If needed in future:**

**Google Play Console Form:**
- **Feature name:** Location-based forecast updates
- **Why is it needed?** "To keep forecasts and tide data accurate as the user moves between areas."
- **Screenshots:** Show in-app UI where user enables/disables background location
- **Can user disable?** Yes (in app settings)

**Checklist:**
- [ ] Background location used only when truly necessary
- [ ] Declaration form completed in Play Console
- [ ] In-app toggle for background location
- [ ] Foreground service shown when active (Android requirement)

---

## Phase 5: Pre-Submission Testing

### 5.1 Permission Flow Testing

**Test each permission on both iOS and Android:**

#### Location
- [ ] Cold start app, location prompt appears
- [ ] Grant permission → predictions load for current location
- [ ] Deny permission → manual location search works
- [ ] Retry permission → can re-request or open settings

#### Camera
- [ ] Tap "Take Photo" in catch log
- [ ] Camera permission prompt appears
- [ ] Grant → camera opens, photo taken
- [ ] Deny → fallback to photo library picker

#### Photo Library
- [ ] Tap "Select Photo" in catch log
- [ ] Photo library permission prompt appears
- [ ] Grant → photo picker opens
- [ ] Deny → show helpful message, option to open settings

#### Notifications (Local)
- [ ] Enable notifications in settings
- [ ] Permission prompt appears (Android 13+)
- [ ] Grant → notification scheduled
- [ ] Deny → settings remain, can retry

#### Push Notifications
- [ ] App registers for push on first launch (or after sign-in)
- [ ] Token sent to backend
- [ ] Send test push notification
- [ ] Notification received and tappable

**Checklist:**
- [ ] All permissions tested on iOS Simulator
- [ ] All permissions tested on Android Emulator
- [ ] All permissions tested on physical device (if available)
- [ ] Graceful fallbacks work for every permission denial
- [ ] No crashes when permissions denied

---

### 5.2 TestFlight Beta Testing (iOS)

**Before App Store submission:**

1. **Upload build to TestFlight**
   - [ ] Xcode → Product → Archive
   - [ ] Organizer → Distribute App → App Store Connect
   - [ ] Wait for processing (5-15 min)

2. **Add internal testers**
   - [ ] App Store Connect → TestFlight → Internal Testing
   - [ ] Add team members via email
   - [ ] Invite testers

3. **Test on real devices**
   - [ ] Install via TestFlight
   - [ ] Test all permission flows
   - [ ] Test offline mode
   - [ ] Test catch logging with photos
   - [ ] Test on various iOS versions (14, 15, 16, 17)

4. **Collect feedback**
   - [ ] Note bugs and crashes
   - [ ] Fix critical issues before App Store submission
   - [ ] Update build number and re-upload if needed

**Checklist:**
- [ ] TestFlight build tested by at least 2 people
- [ ] No crashes reported
- [ ] All features work as expected
- [ ] Ready for public App Store submission

---

### 5.3 Play Console Internal Testing (Android)

**Before production release:**

1. **Upload AAB to Internal Testing track**
   - [ ] Play Console → Testing → Internal testing
   - [ ] Create release
   - [ ] Upload AAB
   - [ ] Add release notes

2. **Add internal testers**
   - [ ] Create email list (up to 100 testers)
   - [ ] Share opt-in URL

3. **Test on real devices**
   - [ ] Install via Play Store (internal track)
   - [ ] Test all permission flows
   - [ ] Test on Android 10, 11, 12, 13, 14
   - [ ] Test on various manufacturers (Samsung, Google Pixel, etc.)

4. **Pre-launch report**
   - [ ] Google automatically tests on ~20 devices
   - [ ] Review results: crashes, performance, security
   - [ ] Fix critical issues

**Checklist:**
- [ ] Internal testing complete
- [ ] Pre-launch report shows no crashes
- [ ] Tested on API 26-34 devices
- [ ] Back button behavior correct
- [ ] Light/dark mode tested

---

## Phase 6: Build Generation

### 6.1 iOS Build (IPA)

**Prerequisites:**
- [ ] Apple Developer Account active
- [ ] Certificates and Provisioning Profiles configured
- [ ] Bundle ID registered: `eu.fishfindr.app`

**Steps:**

1. **Update version**
   ```bash
   # Update package.json
   npm version 1.0.0

   # Update iOS project
   # Xcode → Target → General → Version: 1.0.0, Build: 1
   ```

2. **Build release archive**
   ```bash
   # Terminal
   cd ios/App
   xcodebuild -workspace App.xcworkspace \
     -scheme App \
     -configuration Release \
     -archivePath App.xcarchive \
     archive
   ```

   **Or via Xcode:**
   - [ ] Open `ios/App/App.xcworkspace` in Xcode
   - [ ] Select "Any iOS Device" as target
   - [ ] Product → Archive
   - [ ] Wait for archive to complete

3. **Export for App Store**
   - [ ] Xcode → Organizer → Archives tab
   - [ ] Select archive
   - [ ] Click "Distribute App"
   - [ ] Choose "App Store Connect"
   - [ ] Upload
   - [ ] Wait for processing (~15 min)

**Verify:**
- [ ] Build appears in App Store Connect → TestFlight
- [ ] No warnings or errors
- [ ] Build number increments correctly

---

### 6.2 Android Build (AAB)

**Prerequisites:**
- [ ] Google Play Developer Account active
- [ ] Signing key generated
- [ ] Package name registered: `eu.fishfindr.app`

**Steps:**

1. **Update version**
   ```bash
   # package.json
   npm version 1.0.0

   # android/app/build.gradle
   # versionCode 1
   # versionName "1.0.0"
   ```

2. **Generate signing key (first time only)**
   ```bash
   cd android/app
   keytool -genkey -v -keystore findr-release.keystore \
     -alias findr-key-alias \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000

   # Enter password and details
   # Save keystore file securely (backup!)
   ```

3. **Configure signing** (`android/gradle.properties`):
   ```properties
   FINDR_RELEASE_STORE_FILE=findr-release.keystore
   FINDR_RELEASE_KEY_ALIAS=findr-key-alias
   FINDR_RELEASE_STORE_PASSWORD=<your-store-password>
   FINDR_RELEASE_KEY_PASSWORD=<your-key-password>
   ```

4. **Build AAB**
   ```bash
   cd android
   ./gradlew bundleRelease

   # Output: android/app/build/outputs/bundle/release/app-release.aab
   ```

5. **Upload to Play Console**
   - [ ] Play Console → Production → Create release
   - [ ] Upload `app-release.aab`
   - [ ] Wait for processing

**Verify:**
- [ ] AAB uploads successfully
- [ ] No warnings about permissions or security
- [ ] Version code increments correctly

**Checklist:**
- [ ] AAB format used (not APK)
- [ ] Signed with release key
- [ ] `google-services.json` included
- [ ] ProGuard/R8 configured if using minification

---

## Phase 7: Final Pre-Submit Checklist

### Technical

#### iOS
- [ ] All Info.plist permission strings added
- [ ] Xcode capabilities configured (Push Notifications, Background Modes)
- [ ] APNs key uploaded to Firebase
- [ ] Bundle ID matches everywhere: `eu.fishfindr.app`
- [ ] HTTPS only (no ATS exceptions)
- [ ] Build uploaded to TestFlight and tested

#### Android
- [ ] All permissions in AndroidManifest.xml
- [ ] `targetSdkVersion 34`
- [ ] `google-services.json` in place
- [ ] Network security config (HTTPS only)
- [ ] AAB built and signed
- [ ] Pre-launch report reviewed (no crashes)

---

### Content

#### iOS & Android
- [ ] App name: "Findr - Fishing Predictions"
- [ ] Screenshots: 7 (iOS) / 5 (Android)
- [ ] App icon: 1024x1024 (iOS) / 512x512 (Android)
- [ ] Feature graphic: 1024x500 (Android only)
- [ ] Description complete and compelling
- [ ] Keywords optimized for discovery
- [ ] Privacy policy live at: https://fishfindr.eu/privacy
- [ ] Support page live at: https://fishfindr.eu/support

---

### Compliance

#### iOS Privacy Labels
- [ ] Location: Collected, Not tracked, App functionality
- [ ] Photos: Collected, Linked to user, App functionality
- [ ] User Content: Collected, Linked to user, App functionality
- [ ] Device ID: Collected (if Sentry used), Not linked, Analytics

#### Android Data Safety
- [ ] Location: Collected, Ephemeral, Optional
- [ ] Photos: Collected, Not shared, Optional
- [ ] Personal Info: Collected (if sign-in), Optional
- [ ] Encryption in transit: Yes
- [ ] Deletion available: Yes

---

### Testing

#### Functional Testing
- [ ] Cold start (fresh install)
- [ ] Location permission flow
- [ ] Camera permission flow
- [ ] Photo library permission flow
- [ ] Notification permission flow
- [ ] Offline mode works
- [ ] Catch logging with photos
- [ ] Sync works when back online
- [ ] All features work when permissions denied

#### Device Testing
- [ ] iOS Simulator (iPhone 14 Pro Max, iOS 17)
- [ ] iOS Physical device (if available)
- [ ] Android Emulator (Pixel 6, API 34)
- [ ] Android Physical device (if available)
- [ ] Tablet layouts (optional)

#### Performance
- [ ] No crashes on launch
- [ ] No memory leaks
- [ ] Battery drain acceptable (<5% per hour active use)
- [ ] Network requests timeout gracefully
- [ ] Images load quickly
- [ ] Offline IndexedDB operations fast

---

### Legal & Admin

- [ ] Developer account active (Apple $99, Google $25)
- [ ] Payment details configured (free apps still need bank info)
- [ ] Tax information completed
- [ ] Physical address provided (Google Play requirement)
- [ ] Support email active: support@fishfindr.eu
- [ ] Demo account created for reviewers
- [ ] Review notes filled (testing instructions)

---

## Phase 8: Submission

### iOS App Store

1. [ ] Navigate to: App Store Connect → Findr → Version 1.0 → Submit for Review
2. [ ] Review all information (see APP_STORE_CONNECT_SUBMISSION_TEMPLATE.md)
3. [ ] Click "Submit"
4. [ ] Status changes to "Waiting for Review"
5. [ ] Average review time: 1-3 days

---

### Android Play Store

1. [ ] Navigate to: Play Console → Production → Create Release
2. [ ] Upload AAB
3. [ ] Add release notes
4. [ ] Click "Review release"
5. [ ] Click "Start rollout to Production"
6. [ ] Status changes to "Under review"
7. [ ] Average review time: 2-3 days

---

## Phase 9: Post-Launch Monitoring

### Week 1 (Critical)

**Daily Checks:**
- [ ] Download counts (App Store Connect, Play Console)
- [ ] Crash rate (Sentry, Firebase Crashlytics)
- [ ] User reviews (respond to negative reviews ASAP)
- [ ] Rating: Target 4.0+ stars

**Metrics to track:**
- Installs: Target 100-500 in first week
- Crash-free rate: Target 99%+
- Day 1 retention: Target 40%+
- Day 7 retention: Target 20%+

**Actions:**
- Fix critical bugs immediately (v1.0.1 hotfix)
- Respond to user questions in reviews
- Monitor social media mentions
- Collect user feedback

---

### Week 2-4 (Optimization)

**Weekly Checks:**
- [ ] Review analytics (which features are used most?)
- [ ] Identify UX issues (where do users drop off?)
- [ ] Prioritize improvements for v1.1.0
- [ ] Optimize app store listing (A/B test screenshots, description)

**Actions:**
- Plan v1.1.0 feature update
- Address common user requests
- Improve onboarding if retention is low
- Consider promotional campaigns

---

## Phase 10: Version Updates

### Bug Fix Release (v1.0.1)

**Timeline:** 1-3 days after launch (if critical bugs found)

**Process:**
1. Fix bugs in code
2. Increment version: 1.0.1 (Build 2 for iOS, versionCode 2 for Android)
3. Build and upload
4. Release notes: "Bug fixes and stability improvements"
5. Fast-track review (usually 1-2 days)

---

### Feature Update (v1.1.0)

**Timeline:** 3-4 weeks after launch

**Process:**
1. Implement new features
2. Update screenshots if UI changed
3. Update description to highlight new features
4. Version: 1.1.0 (Build 10 for iOS, versionCode 10 for Android)
5. Full review process (2-3 days)

---

## Support Resources

### Documentation
- [ ] `FINDR_APP_STORE_METADATA.md` - All descriptions and keywords
- [ ] `FINDR_SCREENSHOT_SPECIFICATIONS.md` - Screenshot guide
- [ ] `APP_STORE_CONNECT_SUBMISSION_TEMPLATE.md` - iOS step-by-step
- [ ] `GOOGLE_PLAY_CONSOLE_SUBMISSION_TEMPLATE.md` - Android step-by-step
- [ ] `BUILD_GENERATION_GUIDE.md` - Build process (to be created)

### External Resources
- Apple Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Policies: https://play.google.com/about/developer-content-policy/
- Capacitor Docs: https://capacitorjs.com/docs
- Firebase Console: https://console.firebase.google.com

### Contact
- Developer Email: developer@fishfindr.eu
- Support Email: support@fishfindr.eu
- Website: https://fishfindr.eu
- Privacy: https://fishfindr.eu/privacy

---

## Success Criteria

**Phase 4 is complete when:**

✅ iOS submission:
- [ ] App live on App Store
- [ ] 4.0+ star rating
- [ ] 100+ downloads in first week
- [ ] < 1% crash rate

✅ Android submission:
- [ ] App live on Google Play
- [ ] 4.0+ star rating
- [ ] 100+ downloads in first week
- [ ] < 1% crash rate
- [ ] < 0.5% ANR rate

✅ Compliance:
- [ ] No rejection from either store
- [ ] Privacy policies accurate
- [ ] All permissions justified
- [ ] User data handled correctly

---

**Last Updated:** January 6, 2025
**Status:** Ready for Submission
**Version:** 1.0.0 (Build 1)
