# Supabase Apple Authentication Configuration

## The Problem

When using native Apple Sign In on iOS, Apple includes the app's **Bundle ID** (`eu.fishfindr.app`) as the audience in the ID token. However, Supabase's Apple OAuth provider is configured to accept the **Services ID** (`io.godaisy.login`) by default.

This causes the error:
```
Unacceptable audience in id_token: [eu.fishfindr.app]
```

## The Solution

You need to configure Supabase to accept both audiences:
1. **Services ID** (`io.godaisy.login`) - for web-based OAuth
2. **App Bundle ID** (`eu.fishfindr.app`) - for native iOS apps

## Configuration Steps

### 1. Go to Supabase Dashboard

1. Open your Supabase project: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Providers**
3. Click on **Apple**

### 2. Add App Bundle ID

In the Apple provider configuration, you should see:

- **Client ID (Services ID):** `io.godaisy.login` (already configured)
- **Authorized Client IDs:** Add `eu.fishfindr.app` here

**Format:**
```
eu.fishfindr.app
```

**Alternative (if there's a comma-separated list):**
```
io.godaisy.login,eu.fishfindr.app
```

### 3. Save Changes

Click **Save** to apply the configuration.

### 4. Test Native Sign In

1. Rebuild your iOS app in Xcode
2. Run on a device
3. Try "Sign in with Apple"
4. Should now work without audience errors!

## How It Works

### Web Flow (Browser)
```
User clicks "Sign in with Apple" on web
  ↓
Apple OAuth with Services ID (io.godaisy.login)
  ↓
Returns token with audience: io.godaisy.login
  ↓
Supabase accepts ✅
```

### Native iOS Flow
```
User taps "Sign in with Apple" in iOS app
  ↓
Native Apple Sign In with Bundle ID (eu.fishfindr.app)
  ↓
Returns token with audience: eu.fishfindr.app
  ↓
Supabase accepts ✅ (if configured)
```

## Verification

After configuration, check the logs in Xcode:
```
[AppleSignIn] Starting native Apple Sign In flow
[AppleSignIn] Plugin initialized, requesting Apple login
[AppleSignIn] Apple Sign In successful
[AppleSignIn] Supabase session created successfully
```

No "Unacceptable audience" errors should appear.

## Troubleshooting

### Still getting audience errors?

1. **Clear Supabase cache:** Sometimes config changes take a few minutes to propagate
2. **Check Apple Developer Console:** Ensure `eu.fishfindr.app` is registered as an App ID with Sign in with Apple capability
3. **Verify Services ID:** In Apple Developer Console, ensure `io.godaisy.login` is configured correctly
4. **Check Xcode entitlements:** `ios/App/App/App.entitlements` should include Sign in with Apple

### Testing on simulator?

Apple Sign In requires a physical device. You cannot test on simulator.

## References

- [Supabase Apple OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Sign In for iOS](https://developer.apple.com/documentation/sign_in_with_apple)
