# Findr Apple Sign In Setup - Remaining Steps

**Date:** January 7, 2025
**Status:** Code Complete - Needs Apple Developer Portal Configuration

---

## ✅ What's Already Done:

- ✅ Code implemented (native Apple Sign In wrapper)
- ✅ Using shared Go Daisy Services ID: `io.godaisy.login`
- ✅ Supabase Apple provider already configured
- ✅ App Identifier created: `eu.fishfindr.app`
- ✅ Team ID: T7754BV8QM
- ✅ Key ID: WLS9RZ2P22

---

## 🔧 Configuration Steps (Apple Developer Portal)

### **Step 1: Add Findr Domain to Services ID**

1. Go to [Apple Developer Portal > Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Select **Services IDs** tab
3. Click on **`io.godaisy.login`**
4. Click **Configure** next to "Sign in with Apple"
5. **Add Findr Domain:**
   - In the **Domains and Subdomains** section
   - Click **+** (if not already listed)
   - Add: `fishfindr.eu` (no https://)
6. **Add Findr Return URL:**
   - In the **Return URLs** section
   - Click **+**
   - Add: `https://fishfindr.eu/auth/callback`
7. Click **Save**
8. Click **Continue** → **Save** again

**Expected result:**
```
Domains and Subdomains:
- godaisy.io
- fishfindr.eu

Return URLs:
- https://godaisy.io/auth/callback
- https://fishfindr.eu/auth/callback
- https://YOUR_SUPABASE_URL.supabase.co/auth/v1/callback
```

---

### **Step 2: Enable Apple Sign In on Findr App Identifier**

1. Still in [Apple Developer Portal > Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Select **App IDs** tab
3. Click on **`eu.fishfindr.app`** (your new Findr app)
4. Scroll down to **Sign in with Apple**
5. ✅ **Check the box** to enable it
6. Click **Edit** or **Configure** (if available)
   - **Primary App ID:** Select `eu.fishfindr.app`
7. Click **Save** at the top-right
8. Confirm changes

**Visual check:** Sign in with Apple should show as "Enabled" or have a checkmark

---

### **Step 3: Verify Supabase Configuration**

Your Supabase is already configured for Apple Sign In (Go Daisy works), but verify Findr URLs are included:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. **Authentication** → **URL Configuration**
4. **Redirect URLs** should include:
   ```
   https://godaisy.io/*
   https://godaisy.io/auth/callback
   https://fishfindr.eu/*
   https://fishfindr.eu/auth/callback
   ```
5. If missing, add them and click **Save**

**Site URL** can remain: `https://godaisy.io` (primary domain)

---

### **Step 4: Enable Sign in with Apple in Xcode**

1. Open iOS project:
   ```bash
   npm run cap:open:ios
   ```

2. In Xcode, select **App** target (left sidebar)
3. Go to **Signing & Capabilities** tab
4. Verify settings:
   - **Bundle Identifier:** `eu.fishfindr.app`
   - **Team:** Your Apple Developer Team (T7754BV8QM)
5. Click **+ Capability** (top-left)
6. Search for and add: **"Sign in with Apple"**
7. Verify it appears in the list with no errors

---

## 🧪 Testing

### **Test on iOS Device (Required)**

Apple Sign In only works on physical devices or simulators with Apple ID signed in.

```bash
# Connect iPhone via USB, then:
npm run cap:open:ios

# In Xcode:
# 1. Select your device from device dropdown
# 2. Click Run (▶️)
```

**Test scenarios:**
1. ✅ Tap "Sign in with Apple" button
2. ✅ Native iOS dialog appears (not Safari)
3. ✅ Authenticate with Face ID/Touch ID
4. ✅ User is signed in and redirected to app
5. ✅ User data saved to Supabase
6. ✅ Open Go Daisy web → should already be signed in (shared auth)

### **Test Web Fallback**

On web browser (should use OAuth redirect):
```bash
# Open in browser
open https://fishfindr.eu

# Click "Sign in with Apple"
# → Should redirect to Apple OAuth page
# → Authenticate
# → Redirects back to fishfindr.eu
```

---

## 📱 Architecture Summary

**How It Works:**

```
┌─────────────────────────────────────────────────┐
│         Apple Developer Account                 │
│                                                 │
│  App ID: eu.fishfindr.app                       │
│  ↓                                              │
│  Services ID: io.godaisy.login                  │
│  ├─ Domain: godaisy.io                          │
│  ├─ Domain: fishfindr.eu                        │
│  ├─ Return URL: https://godaisy.io/auth/...    │
│  └─ Return URL: https://fishfindr.eu/auth/...  │
│                                                 │
│  Key: WLS9RZ2P22                                │
│  Team: T7754BV8QM                               │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│         Supabase Authentication                 │
│                                                 │
│  Apple Provider (Enabled)                       │
│  ├─ Client ID: io.godaisy.login                 │
│  ├─ Team ID: T7754BV8QM                         │
│  ├─ Key ID: WLS9RZ2P22                          │
│  └─ Private Key: (from .p8 file)                │
│                                                 │
│  Shared auth.users table                        │
│  (Both Go Daisy and Findr use same database)    │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│              User Signs In                      │
│                                                 │
│  iOS Native App:                                │
│  └─ Native dialog (Face ID/Touch ID)            │
│                                                 │
│  Web (godaisy.io or fishfindr.eu):              │
│  └─ Redirects to Apple OAuth                    │
│                                                 │
│  Result: Same user account across both apps     │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Verification Checklist

Before considering this complete:

- [ ] `io.godaisy.login` Services ID includes `fishfindr.eu` domain
- [ ] `io.godaisy.login` Services ID includes `https://fishfindr.eu/auth/callback` return URL
- [ ] `eu.fishfindr.app` App ID has "Sign in with Apple" enabled
- [ ] Xcode project has "Sign in with Apple" capability added
- [ ] Supabase has `https://fishfindr.eu/*` and `https://fishfindr.eu/auth/callback` in redirect URLs
- [ ] Tested on iOS device - native dialog appears
- [ ] Tested on web - OAuth redirect works
- [ ] User created in Supabase `auth.users` table
- [ ] Same user can sign in to both Go Daisy and Findr

---

## ⚠️ Common Issues

### "Invalid Client" Error

**Cause:** Services ID doesn't include fishfindr.eu domain

**Fix:** Add `fishfindr.eu` to Services ID domains (Step 1)

### Native Dialog Doesn't Appear on iOS

**Cause:** Capability not added in Xcode

**Fix:** Add "Sign in with Apple" capability (Step 4)

### Works on iOS, Fails on Web

**Cause:** Missing return URL in Services ID

**Fix:** Add `https://fishfindr.eu/auth/callback` to Services ID return URLs (Step 1)

### User Not Redirected After Sign In

**Cause:** Supabase redirect URLs not configured

**Fix:** Add Findr URLs to Supabase redirect URLs (Step 3)

---

## 📚 Reference

**Files:**
- `lib/auth/appleSignIn.ts` - Native Apple Sign In implementation
- `app/login/AuthClient.tsx` - Go Daisy login (uses native on iOS)
- `docs/NATIVE_APPLE_SIGN_IN_SETUP.md` - Full setup guide

**Configuration:**
- **Services ID:** io.godaisy.login
- **Team ID:** T7754BV8QM
- **Key ID:** WLS9RZ2P22
- **App ID:** eu.fishfindr.app

**Testing:**
```bash
# iOS
npm run cap:open:ios

# Android (uses web OAuth)
npm run cap:open:android

# Web
npm run dev
open http://localhost:3000
```

---

## ✅ Next Steps

1. Complete Step 1: Add fishfindr.eu to Services ID
2. Complete Step 2: Enable Apple Sign In on eu.fishfindr.app
3. Complete Step 3: Verify Supabase redirect URLs
4. Complete Step 4: Add capability in Xcode
5. Test on iOS device
6. Test on web browser
7. Verify shared auth works between Go Daisy and Findr

**Estimated time:** 10-15 minutes

Once complete, native Apple Sign In will work seamlessly across both apps! 🎉
