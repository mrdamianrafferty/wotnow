# Grow Daisy Mobile App Implementation Plan

## Overview

Transform the existing Grow Daisy web feature (`godaisy.io/grow`) into standalone iOS and Android apps using the same Capacitor hybrid architecture used for Go Daisy and Findr.

### Current Architecture

| App | Web URL | App ID | iOS Project | Android Project |
|-----|---------|--------|-------------|-----------------|
| **Findr** | fishfindr.eu | `eu.fishfindr.app` | `ios/` | `android/` (shared) |
| **Go Daisy** | godaisy.io | `io.godaisy.app` | `ios-godaisy/` | (needs separate) |
| **Grow Daisy** | godaisy.io/grow | `io.growdaisy.app` | `ios-growdaisy/` (new) | `android-growdaisy/` (new) |

### Existing Grow Daisy Features (79 files)

**Pages:**
- `/grow` - Homepage with garden overview
- `/grow/garden` - Plant collection management
- `/grow/plan` - Planting calendar/schedule
- `/grow/activities` - Garden task recommendations
- `/grow/weather` - Soil & weather conditions
- `/grow/species/[slug]` - Plant species details
- `/grow/settings` - User preferences
- `/grow/info` - About page
- `/grow/onboarding` - New user flow

**Components:** 45+ including AddPlantDialog, GardenPage, ActivityCard, CareGuideCard, etc.

---

## Decision: Domain Strategy

### Option A: Subdomain of godaisy.io (Recommended)
- **URL:** `grow.godaisy.io`
- **Pros:** Simpler DNS, shared SSL, unified brand family
- **Cons:** Slightly less standalone identity
- **Cost:** Free (subdomain of existing domain)

### Option B: Separate Domain
- **URL:** `growdaisy.io` or `growdaisy.app`
- **Pros:** Standalone identity, easier future separation
- **Cons:** Extra domain cost (~$12/year), separate SSL, more DNS config
- **Cost:** ~$12-40/year depending on TLD

### Recommendation
**Use `grow.godaisy.io`** initially. Can migrate to separate domain later if needed. The Capacitor config simply points to the URL - easy to change.

---

## Implementation Phases

### Phase 1: Web Preparation (1-2 days)

#### 1.1 Create Subdomain Route Structure
Currently Grow Daisy lives at `/grow/*`. For the native app, we need a clean entry point.

```bash
# Vercel DNS: Add CNAME record
grow.godaisy.io -> cname.vercel-dns.com
```

**Middleware update** (`middleware.ts`):
```typescript
// Add Grow Daisy domain detection
if (hostname === 'grow.godaisy.io' || hostname === 'www.grow.godaisy.io') {
  if (!url.pathname.startsWith('/grow') && !isApiRoute && !isStaticAsset) {
    const growUrl = url.clone();
    growUrl.pathname = '/grow';
    return NextResponse.redirect(growUrl);
  }
}
```

#### 1.2 Create Grow-Specific PWA Manifest
Create `public/manifest-growdaisy.json`:
```json
{
  "name": "Grow Daisy",
  "short_name": "Grow Daisy",
  "description": "Your personal garden planner & growing guide",
  "start_url": "/grow",
  "scope": "/grow",
  "display": "standalone",
  "background_color": "#065f46",
  "theme_color": "#10b981",
  "icons": [
    { "src": "/grow/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/grow/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### 1.3 Update `_app.tsx` for Grow Daisy Detection
```typescript
// Add to existing app detection logic
const isGrowDaisy = typeof window !== 'undefined' && (
  window.location.hostname === 'grow.godaisy.io' ||
  window.location.pathname.startsWith('/grow')
);
```

---

### Phase 2: Capacitor Configuration (1 day)

#### 2.1 Create Grow Daisy Capacitor Config
Create `capacitor.config.growdaisy.ts`:
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.growdaisy.app',
  appName: 'Grow Daisy',
  webDir: '.capacitor-assets-growdaisy',

  server: {
    url: 'https://grow.godaisy.io',  // or godaisy.io/grow
    cleartext: false,
  },

  ios: {
    scheme: 'growdaisy',
  },
  android: {
    scheme: 'growdaisy',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#065f46',  // Emerald dark (garden theme)
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#10b981',  // Emerald primary
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

#### 2.2 Add npm Scripts
Add to `package.json`:
```json
{
  "scripts": {
    "cap:sync:growdaisy": "CAPACITOR_CONFIG=capacitor.config.growdaisy.ts npx cap sync",
    "cap:open:growdaisy:ios": "CAPACITOR_CONFIG=capacitor.config.growdaisy.ts npx cap open ios",
    "cap:open:growdaisy:android": "CAPACITOR_CONFIG=capacitor.config.growdaisy.ts npx cap open android",
    "cap:build:growdaisy:ios": "npx cap copy ios && cd ios-growdaisy && pod install",
    "cap:build:growdaisy:android": "npx cap copy android-growdaisy"
  }
}
```

---

### Phase 3: iOS Project Setup (2-3 days)

#### 3.1 Create iOS Project Directory
```bash
# Create new iOS project for Grow Daisy
mkdir -p ios-growdaisy
cp -R ios-godaisy/* ios-growdaisy/

# Rename Xcode project
cd ios-growdaisy/App
mv "Go Daisy.xcodeproj" "Grow Daisy.xcodeproj"
mv "Go Daisy.xcworkspace" "Grow Daisy.xcworkspace"
```

#### 3.2 Update iOS Configuration

**Bundle ID:** `io.growdaisy.app`

**Info.plist updates:**
```xml
<key>CFBundleDisplayName</key>
<string>Grow Daisy</string>
<key>CFBundleName</key>
<string>Grow Daisy</string>
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>growdaisy</string>
    </array>
  </dict>
</array>
```

**capacitor.config.json** (in `ios-growdaisy/App/App/`):
```json
{
  "appId": "io.growdaisy.app",
  "appName": "Grow Daisy",
  "webDir": ".capacitor-assets-growdaisy",
  "server": {
    "url": "https://grow.godaisy.io",
    "cleartext": false
  },
  "ios": {
    "scheme": "growdaisy"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#065f46",
      "spinnerColor": "#10b981"
    }
  }
}
```

#### 3.3 App Icons & Splash Screen

**Required icon sizes (iOS):**
- 20x20, 29x29, 40x40, 58x58, 60x60, 76x76, 80x80, 87x87
- 120x120, 152x152, 167x167, 180x180, 1024x1024

**Icon design theme:** Daisy flower with leaf/plant motif, emerald green palette

**Create assets:**
```bash
mkdir -p ios-growdaisy/App/App/Assets.xcassets/AppIcon.appiconset/
mkdir -p ios-growdaisy/App/App/Assets.xcassets/Splash.imageset/
```

#### 3.4 Apple Developer Configuration

1. **App ID:** Create `io.growdaisy.app` in Apple Developer Portal
2. **Capabilities:**
   - Push Notifications
   - Sign in with Apple
   - Associated Domains (for universal links)
3. **Provisioning Profiles:** Development & Distribution
4. **App Store Connect:** Create new app listing

---

### Phase 4: Android Project Setup (2-3 days)

#### 4.1 Create Android Project Directory
```bash
# Create new Android project for Grow Daisy
mkdir -p android-growdaisy
cp -R android/* android-growdaisy/
```

#### 4.2 Update Android Configuration

**`android-growdaisy/app/build.gradle`:**
```groovy
android {
    namespace "io.growdaisy.app"
    defaultConfig {
        applicationId "io.growdaisy.app"
        versionCode 1
        versionName "1.0.0"
    }
}
```

**`android-growdaisy/app/src/main/res/values/strings.xml`:**
```xml
<resources>
    <string name="app_name">Grow Daisy</string>
    <string name="title_activity_main">Grow Daisy</string>
    <string name="package_name">io.growdaisy.app</string>
    <string name="custom_url_scheme">growdaisy</string>
</resources>
```

**`android-growdaisy/app/src/main/AndroidManifest.xml`:**
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="io.growdaisy.app">

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/AppTheme">

        <!-- Deep linking for OAuth -->
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="growdaisy" />
        </intent-filter>
    </application>
</manifest>
```

#### 4.3 Android App Icons

**Required sizes:**
- `mipmap-mdpi`: 48x48
- `mipmap-hdpi`: 72x72
- `mipmap-xhdpi`: 96x96
- `mipmap-xxhdpi`: 144x144
- `mipmap-xxxhdpi`: 192x192
- Adaptive icons: foreground + background layers

#### 4.4 Google Play Configuration

1. **Package name:** `io.growdaisy.app`
2. **Signing key:** Generate new keystore
3. **Google Play Console:** Create new app listing

---

### Phase 5: Shared Auth Configuration (1 day)

#### 5.1 Supabase Auth Updates

Add Grow Daisy redirect URLs to Supabase Auth settings:
```
https://grow.godaisy.io/auth/callback
growdaisy://auth/callback
```

#### 5.2 OAuth Provider Updates

**Google OAuth:**
- Add `grow.godaisy.io` to authorized domains
- Add `growdaisy://` to redirect URIs

**Apple Sign In:**
- Add `io.growdaisy.app` to Services ID
- Configure return URL: `https://grow.godaisy.io/auth/callback`

#### 5.3 Auth Callback Handling

Update `pages/auth/callback.tsx` or `app/auth/callback/`:
```typescript
// Detect app origin for post-auth redirect
const getAppRedirect = () => {
  const app = searchParams.get('app');
  if (app === 'growdaisy') return '/grow';
  if (app === 'findr') return '/findr';
  return '/'; // Go Daisy default
};
```

---

### Phase 6: Native Features Integration (2-3 days)

#### 6.1 Push Notifications for Garden Reminders

```typescript
// lib/grow/notifications.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from '@/lib/capacitor/platform';

export async function scheduleWateringReminder(plantId: string, time: Date) {
  if (!isNative()) return;

  await LocalNotifications.schedule({
    notifications: [{
      id: hashCode(plantId),
      title: 'Time to Water! 💧',
      body: 'Your tomatoes need watering today',
      schedule: { at: time },
      extra: { plantId, action: 'water' }
    }]
  });
}
```

#### 6.2 Camera for Plant Photos

Already implemented in `lib/capacitor/camera.ts` - reuse for:
- Adding plant photos to garden
- Plant identification (future feature)

#### 6.3 Location for Climate Zone Detection

Already implemented in `lib/capacitor/geolocation.ts` - reuse for:
- Automatic hardiness zone detection
- Local weather data

---

### Phase 7: App Store Preparation (3-5 days)

#### 7.1 App Store Assets

**iOS App Store:**
- Screenshots (6.5", 5.5", 12.9" iPad)
- App icon (1024x1024)
- App Preview video (optional)
- Description, keywords, privacy policy

**Google Play:**
- Screenshots (phone, 7" tablet, 10" tablet)
- Feature graphic (1024x500)
- App icon (512x512)
- Description, privacy policy

#### 7.2 App Store Descriptions

**Short Description:**
> Your personal garden planner with weather-smart planting recommendations.

**Full Description:**
> Grow Daisy is your intelligent gardening companion that helps you plan, track, and nurture your garden with confidence.
>
> Features:
> • Smart planting calendar based on your local climate
> • Real-time soil temperature and moisture tracking
> • Personalized activity recommendations
> • Extensive plant species database
> • Weather-aware garden planning
> • Plant care reminders and tips
>
> Whether you're a beginner or experienced gardener, Grow Daisy helps you grow more successfully.

#### 7.3 Privacy Policy & Terms

Create/update:
- `grow.godaisy.io/privacy`
- `grow.godaisy.io/terms`

---

### Phase 8: Testing & Launch (3-5 days)

#### 8.1 Testing Checklist

- [ ] OAuth flows (Google, Apple) work in native app
- [ ] Deep links open correct pages
- [ ] Push notifications schedule and fire
- [ ] Camera captures and uploads photos
- [ ] Location detection works
- [ ] Offline graceful degradation
- [ ] All pages load correctly via Capacitor
- [ ] Back button behavior correct
- [ ] Splash screen displays properly
- [ ] App icons display correctly

#### 8.2 Beta Testing

**TestFlight (iOS):**
1. Upload build to App Store Connect
2. Add internal testers
3. Gather feedback, fix issues

**Google Play Internal Testing:**
1. Upload AAB to Play Console
2. Add internal testers
3. Gather feedback, fix issues

#### 8.3 Production Launch

1. Submit to App Store Review
2. Submit to Google Play Review
3. Prepare launch announcement
4. Monitor crash reports and reviews

---

## File Structure After Implementation

```
WotNow/
├── capacitor.config.ts              # Findr (default)
├── capacitor.config.growdaisy.ts    # Grow Daisy
├── ios/                             # Findr iOS
├── ios-godaisy/                     # Go Daisy iOS
├── ios-growdaisy/                   # Grow Daisy iOS (NEW)
│   └── App/
│       ├── Grow Daisy.xcodeproj
│       ├── App/
│       │   ├── Assets.xcassets/
│       │   │   ├── AppIcon.appiconset/
│       │   │   └── Splash.imageset/
│       │   ├── Info.plist
│       │   └── capacitor.config.json
│       └── Podfile
├── android/                         # Findr Android
├── android-growdaisy/               # Grow Daisy Android (NEW)
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── res/
│               ├── mipmap-*/
│               └── values/strings.xml
├── public/
│   ├── manifest.json               # Findr
│   ├── manifest-godaisy.json       # Go Daisy
│   └── manifest-growdaisy.json     # Grow Daisy (NEW)
└── pages/grow/                      # Existing Grow Daisy pages
```

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Web Preparation | 1-2 days | None |
| Phase 2: Capacitor Config | 1 day | Phase 1 |
| Phase 3: iOS Project | 2-3 days | Phase 2, Apple Dev account |
| Phase 4: Android Project | 2-3 days | Phase 2, Google Play account |
| Phase 5: Auth Configuration | 1 day | Phases 3-4 |
| Phase 6: Native Features | 2-3 days | Phases 3-5 |
| Phase 7: App Store Assets | 3-5 days | Phases 3-6, Design assets |
| Phase 8: Testing & Launch | 3-5 days | All phases |

**Total: 15-23 days** (can parallelize iOS and Android work)

---

## Cost Considerations

| Item | One-time | Annual |
|------|----------|--------|
| Apple Developer Program | - | $99 |
| Google Play Developer | $25 | - |
| Domain (if separate) | - | $12-40 |
| Push notification service | - | Free tier |
| **Total** | $25 | $99-139 |

*Note: You likely already have Apple and Google developer accounts from Go Daisy/Findr.*

---

## Next Steps

1. **Decision:** Confirm domain strategy (subdomain vs. separate domain)
2. **Design:** Create app icon and splash screen assets
3. **Start Phase 1:** Set up subdomain routing
4. **Parallel:** Begin iOS and Android project setup

---

## Questions to Resolve

1. Do you want `grow.godaisy.io` or a separate domain like `growdaisy.app`?
2. What color palette for the app theme? (Current: emerald green #10b981)
3. Any features to add/remove before mobile launch?
4. Target launch timeline?
