# Supabase Apple Authentication Configuration

## Shared Authentication Architecture

Go Daisy and Findr share the same authentication system using the Services ID: `io.godaisy.login`

This Services ID is used for:
- ✅ Web-based OAuth (both apps)
- ✅ Native iOS Sign In (both apps)
- ✅ Native Android Sign In (future)

## The Setup

The native iOS app is configured to use `io.godaisy.login` as the clientId. This requires proper configuration in **Apple Developer Console** to associate the Services ID with your app bundle IDs.

## Apple Developer Console Configuration

### Critical: Services ID Must Be Associated With App Bundle IDs

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **Services IDs**
4. Select `io.godaisy.login`

### Verify Configuration:

**App IDs:**
The Services ID should be associated with:
- `eu.fishfindr.app` (Findr iOS app)
- `io.godaisy.app` (Go Daisy iOS app - if exists)

**Domains and Subdomains:**
- Primary: `fishfindr.eu`
- Additional: `godaisy.io`

**Return URLs:**
- `https://fishfindr.eu/auth/callback`
- `https://godaisy.io/auth/callback`
- Your Supabase callback URL (usually `https://[project-id].supabase.co/auth/v1/callback`)

### If Services ID Not Properly Configured:

You'll see this error:
```
Unacceptable audience in id_token
```

**Fix:** Ensure the Services ID (`io.godaisy.login`) is configured with your app bundle IDs in Apple Developer Console.

## Supabase Configuration

### Should Already Be Configured

Since you're using `io.godaisy.login` for web OAuth, Supabase should already accept this Services ID. No additional configuration needed in Supabase Dashboard.

**To Verify:**
1. Go to Supabase Dashboard → Authentication → Providers → Apple
2. Check that **Client ID (Services ID)** is set to: `io.godaisy.login`
3. That's it! No need to add app bundle IDs to Supabase.

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
