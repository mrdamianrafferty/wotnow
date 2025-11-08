# Authentication Fix Complete - November 8, 2025

## Summary

**Problem:** iOS app authentication was completely broken - redirecting to Safari and failing with "invalid request both auth code and code verifier should be non empty" error.

**Root Cause:** OAuth authorization code flow with PKCE doesn't work in Capacitor because localStorage is not shared between webview contexts (main webview vs ASWebAuthenticationSession).

**Solution:** Switched from OAuth authorization code flow to ID token flow for both Apple and Google Sign In.

**Result:** ✅ Apple Sign In now working. 🔧 Google Sign In configured and ready for testing.

---

## What Was Fixed

### 1. Identified Root Cause ✅

**The Problem:**
```
User clicks "Sign In with Apple/Google"
  → OAuth flow starts in main webview (stores PKCE verifier in localStorage)
  → Opens ASWebAuthenticationSession (separate browser context)
  → User authenticates
  → Redirects to /auth/callback in main webview
  → Cannot find PKCE verifier (different localStorage!)
  → ERROR: "invalid request both auth code and code verifier should be non empty"
```

**The Insight:** You cannot share localStorage between Capacitor webview contexts. PKCE flow is fundamentally incompatible with native mobile OAuth.

### 2. Switched Apple Sign In to ID Token Flow ✅

**Changed from:**
- `@capgo/capacitor-social-login` (triggers OAuth redirects)
- Authorization code flow with PKCE
- Redirects to Safari and back

**Changed to:**
- `@capacitor-community/apple-sign-in` (official Apple plugin)
- ID token flow (no redirects, no PKCE)
- Native iOS modal (stays in app)

**Implementation:**
```typescript
// lib/auth/appleSignIn.ts
const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');

// Generate SHA-256 hashed nonce (required by Apple)
const rawNonce = crypto.randomUUID();
const encoder = new TextEncoder();
const data = encoder.encode(rawNonce);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

// Sign in with Apple (returns ID token directly)
const result = await SignInWithApple.authorize({
  clientId: 'eu.fishfindr.app', // Bundle ID
  redirectURI: 'fishfindr://auth/callback', // Custom scheme (not used)
  scopes: 'email name',
  nonce: hashedNonce, // SHA-256 hashed nonce
});

// Exchange ID token for Supabase session
await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: result.response.identityToken,
  nonce: rawNonce, // Raw nonce (unhashed)
});
```

**Key differences:**
- ✅ No OAuth redirect to callback URL
- ✅ No localStorage dependency
- ✅ Returns ID token directly
- ✅ Stays in app (native modal)

### 3. Configured Supabase to Accept Bundle ID ✅

**Problem:** Apple returns ID tokens with audience: `eu.fishfindr.app` (bundle ID), but Supabase only accepted `io.godaisy.login` (Services ID).

**Solution:** Added bundle ID to Supabase Authorized Client IDs.

**Configuration:**
- **Provider:** Apple
- **Authorized Client IDs:** `io.godaisy.login,eu.fishfindr.app`

This allows Supabase to accept ID tokens from:
- Web OAuth (audience: `io.godaisy.login`)
- Native iOS (audience: `eu.fishfindr.app`)

Same email = same account = shared auth preserved.

### 4. Configured Google Sign In ✅

**Created iOS OAuth Client ID:**
- Client ID: `666271903016-7mqeehtbrl2osvk3i2fg3320t2au1kps.apps.googleusercontent.com`
- Bundle ID: `eu.fishfindr.app`
- Created in Google Cloud Console

**Added to Vercel environment:**
- `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`

**Fixed environment variable issue:**
- Problem: Variables had `\n` newline characters at the end
- Caused "No provider was initialized" error
- Solution: Removed and re-added without newlines

**Configured Supabase:**
- **Provider:** Google
- **Authorized Client IDs:** `666271903016-pd983f77iaghcdogrik25sipscdpr92q.apps.googleusercontent.com,eu.fishfindr.app`

### 5. Created Comprehensive Documentation ✅

**docs/NATIVE_AUTH_ROOT_CAUSE_FIX.md:**
- Complete root cause analysis
- Technical explanation of localStorage context separation
- Implementation guide for both Apple and Google
- Testing checklist
- Troubleshooting guide

**docs/APPLE_AUTH_FINAL_FIX.md:**
- Apple-specific configuration guide
- Step-by-step Supabase setup
- Bundle ID vs Services ID explanation

---

## Test Results

### Apple Sign In - ✅ WORKING

**Date:** November 8, 2025
**Platform:** iOS physical device
**Build:** Uploaded to App Store Connect

**What works:**
- ✅ Native Apple modal appears (no Safari redirect)
- ✅ User authentication completes successfully
- ✅ ID token returned from Apple
- ✅ Supabase session created
- ✅ Redirects to `/findr` page
- ✅ No "auth code and code verifier" errors
- ✅ No "unacceptable audience" errors

**Xcode logs:**
```
[AppleSignIn] Starting native Apple Sign In flow with official plugin
[AppleSignIn] Plugin loaded, preparing nonce
[AppleSignIn] Nonce prepared
[AppleSignIn] Apple Sign In successful
[AppleSignIn] Exchanging Apple ID token for Supabase session
[AppleSignIn] Supabase session created successfully
```

### Google Sign In - 🔧 PENDING TEST

**Configuration:** Complete and deployed
**Status:** Ready for testing after App Store Connect upload

**Expected behavior:**
- Native Google modal (stays in app)
- ID token flow (no PKCE)
- Successful session creation

---

## Files Changed

### Core Authentication
- `lib/auth/appleSignIn.ts` - Rewrote to use official Apple plugin with ID token flow
- `pages/findr/auth.tsx` - Added platform detection for native vs web sign-in

### Configuration
- `.env.local` - Added Google OAuth Client IDs
- Vercel environment variables - Added and fixed Google Client IDs (removed newlines)
- `next.config.mjs` - Already had Capacitor externals (prevented bundle bloat)

### Documentation
- `docs/NATIVE_AUTH_ROOT_CAUSE_FIX.md` - Complete technical guide
- `docs/APPLE_AUTH_FINAL_FIX.md` - Apple-specific setup
- `docs/AUTH_FIX_COMPLETE_2025_11_08.md` - This file

---

## Deployment History

1. **1611e7f0** - Switch to official Apple Sign In plugin
2. **ff523c37** - Configure Google iOS Client ID
3. **61de17e4** - Redeploy to pick up Google env vars (had newlines)
4. **e38d1fce** - Redeploy with clean Google env vars (fixed newlines)

**Final deployment:** wotnow-35sqle6vv (Ready)

---

## What Didn't Work (Lessons Learned)

### Attempt 1: Use Services ID for Native iOS ❌
**Problem:** Native iOS must use bundle ID, not Services ID
**Error:** "Unacceptable audience in id_token: [eu.fishfindr.app]"
**Lesson:** Services ID is only for web OAuth

### Attempt 2: Use `@capgo/capacitor-social-login` for Apple ❌
**Problem:** Triggers OAuth authorization code flow with redirects
**Error:** "invalid request both auth code and code verifier should be non empty"
**Lesson:** Must use official Apple plugin for ID token flow

### Attempt 3: Added Google Client IDs via `vercel env add` ❌
**Problem:** Command added newline characters (`\n`) to values
**Error:** "No provider was initialized"
**Lesson:** Use `printf` instead of heredoc/echo to avoid newlines

---

## Key Takeaways

1. **PKCE + Capacitor = Incompatible**
   - localStorage not shared between webview contexts
   - Cannot use OAuth authorization code flow
   - Must use ID token flow for native mobile

2. **Native iOS Uses Bundle ID**
   - Apple Sign In returns tokens with bundle ID as audience
   - Google Sign In returns tokens with bundle ID as audience
   - Supabase must accept bundle ID in Authorized Client IDs

3. **Shared Auth Still Works**
   - Same email = same account
   - Supabase accepts multiple client IDs
   - Web uses Services ID, native uses bundle ID

4. **Environment Variables Need Care**
   - Check for invisible characters (newlines, spaces)
   - Use `printf` instead of `echo`
   - Verify with `vercel env pull` before deploying

---

## Next Steps

### Immediate
- [ ] Test Google Sign In after App Store upload completes
- [ ] Verify both providers work consistently
- [ ] Monitor Sentry for any auth errors

### Future
- [ ] Consider adding email/password auth as backup
- [ ] Add auth state persistence across app restarts
- [ ] Add biometric authentication (Face ID/Touch ID)

---

## References

- [Supabase Apple OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [@capacitor-community/apple-sign-in](https://github.com/capacitor-community/apple-sign-in)
- [Apple Sign In with Nonce](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/incorporating_sign_in_with_apple_into_other_platforms)
- [Capacitor Webview Contexts](https://capacitorjs.com/docs/guides/security#webview-storage)

---

**Status:** ✅ Apple Sign In working, ready for App Store
**Prepared by:** Claude Code
**Date:** November 8, 2025
