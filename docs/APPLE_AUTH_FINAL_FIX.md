# Apple/Google Native Sign In - Final Fix Guide

## The Problem

Native iOS sign-in uses the app bundle ID (`eu.fishfindr.app`) as the token audience, but Supabase only accepts the Services ID (`io.godaisy.login`).

Error:
```
Unacceptable audience in id_token: [eu.fishfindr.app]
```

## The Solution

Configure Supabase to accept BOTH identifiers. Users will have the same account regardless of sign-in method.

---

## Step 1: Supabase Configuration (REQUIRED)

### Apple Sign In

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** → **Providers** → **Apple**
4. Find the **"Authorized Client IDs"** field (might be labeled "Additional Client IDs")
5. Add: `eu.fishfindr.app`
6. The field should now contain both:
   ```
   io.godaisy.login
   eu.fishfindr.app
   ```
7. Click **Save**

### Google Sign In

1. In the same dashboard: **Authentication** → **Providers** → **Google**
2. Find **"Authorized Client IDs"** field
3. Add: `eu.fishfindr.app`
4. Click **Save**

**Why this works:**
- Web OAuth uses `io.godaisy.login` ✅
- Native iOS uses `eu.fishfindr.app` ✅
- Both identifiers point to the same Supabase auth system
- Users get the same account regardless of sign-in method
- Shared auth is preserved

---

## Step 2: Apple Developer Console (Verify)

1. Go to: https://developer.apple.com/account/
2. Navigate to: **Certificates, Identifiers & Profiles**
3. Click: **Identifiers** → **App IDs**
4. Select: `eu.fishfindr.app`
5. Verify: **Sign in with Apple** capability is enabled
6. Click: **Edit** (if needed) and ensure it's configured

**Note:** The Services ID (`io.godaisy.login`) is only used for web OAuth, NOT native iOS.

---

## Step 3: Update Native Code (Use Bundle ID)

The code should use the app bundle ID for native sign-in:

```typescript
// lib/auth/appleSignIn.ts
await SocialLogin.initialize({
  apple: {
    clientId: 'eu.fishfindr.app', // ← Bundle ID for native iOS
  },
});
```

**Why:** Native iOS Sign in with Apple uses the app's bundle ID, not the Services ID.

---

## Step 4: Test

1. Sync Capacitor:
   ```bash
   npx cap sync ios
   ```

2. Build in Xcode and run on device

3. Try sign-in - should work without "Unacceptable audience" errors

---

## How Authentication Works (Shared Auth Explained)

### Web Flow:
```
User on fishfindr.eu → Sign in with Apple
  ↓
OAuth with Services ID (io.godaisy.login)
  ↓
Supabase creates/uses account
  ↓
User signed in ✅
```

### Native iOS Flow:
```
User on iOS app → Sign in with Apple
  ↓
Native Sign in with Bundle ID (eu.fishfindr.app)
  ↓
Supabase creates/uses SAME account (same email)
  ↓
User signed in ✅
```

### Result:
- Same user email = same Supabase account
- Works on web and native
- Shared authentication preserved

---

## Troubleshooting

### Still getting "Unacceptable audience" error?

**Check Supabase:**
1. Dashboard → Authentication → Providers → Apple
2. Verify `eu.fishfindr.app` is in "Authorized Client IDs"
3. May take a few minutes to propagate - try clearing app data and re-testing

**Check Apple Developer Console:**
1. Verify `eu.fishfindr.app` has "Sign in with Apple" capability
2. Verify the app is properly provisioned

### Different error about Services ID?

You may need to remove the Services ID from the native code. Native apps should use bundle ID only.

---

## Summary

✅ **Supabase:** Add `eu.fishfindr.app` to Authorized Client IDs (both Apple and Google providers)
✅ **Native Code:** Use `eu.fishfindr.app` as clientId
✅ **Web Code:** Continues using `io.godaisy.login`
✅ **Result:** Shared auth works across all platforms
