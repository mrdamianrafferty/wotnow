# Native Authentication Root Cause & Fix

**Date:** November 7, 2025
**Status:** 🔴 CRITICAL - Auth completely broken in iOS app

## The Error

```
invalid request both auth code and code verifier should be non empty
```

## Root Cause

The error occurs because of **localStorage context separation** in Capacitor iOS apps:

### The Broken Flow

1. User clicks "Continue with Apple/Google" in iOS app
2. Auth flow starts in main webview, stores PKCE verifier in localStorage
3. OAuth opens in separate browser (ASWebAuthenticationSession)
4. User authenticates with Apple/Google
5. Provider redirects to `https://fishfindr.eu/auth/callback?code=xxx`
6. Callback page loads in main webview (**DIFFERENT localStorage context**)
7. Tries to exchange code using PKCE
8. Can't find verifier (different localStorage!) → **ERROR**

### Why This Happens

**Capacitor iOS webviews and in-app browsers have SEPARATE localStorage:**
- Main webview: Where the app runs
- ASWebAuthenticationSession: Where OAuth authentication happens
- **They don't share localStorage!**

When `signInWithOAuth()` is called:
1. Supabase stores PKCE code verifier in localStorage
2. But OAuth opens in a different browser context
3. Callback loads back in main webview
4. Verifier is gone → exchange fails

## The Solution

**Use ID token flow, NOT authorization code flow:**

### For Apple Sign In

✅ **Use:** `@capacitor-community/apple-sign-in`
❌ **Don't use:** `@capgo/capacitor-social-login` for Apple

```typescript
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

// Generate and hash nonce
const rawNonce = crypto.randomUUID();
const encoder = new TextEncoder();
const data = encoder.encode(rawNonce);
const hashBuffer = await crypto.subtle.digest('SHA-256', data);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hashedNonce = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

// Authorize (NO redirectURI parameter!)
const result = await SignInWithApple.authorize({
  clientId: 'eu.fishfindr.app', // Bundle ID
  scopes: 'email name',
  nonce: hashedNonce, // SHA-256 hashed for Apple
});

// Exchange ID token for Supabase session
const { error } = await supabase.auth.signInWithIdToken({
  provider: 'apple',
  token: result.response.identityToken,
  nonce: rawNonce, // Raw nonce for Supabase
});
```

**Key Points:**
- ✅ Returns ID token directly (no redirect)
- ✅ No localStorage dependency
- ✅ Native iOS modal (stays in app)
- ✅ No PKCE needed

### For Google Sign In

**Option 1: Use native plugin with proper configuration**

```typescript
import { SocialLogin } from '@capgo/capacitor-social-login';

await SocialLogin.initialize({
  google: {
    webClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  },
});

const result = await SocialLogin.login({
  provider: 'google',
  options: {
    scopes: ['email', 'profile'],
  },
});

// MUST return ID token, not authorization code
if (!result.result.idToken) {
  throw new Error('Google Sign In not properly configured');
}

await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: result.result.idToken,
});
```

**Option 2: Disable if not configured** (current approach)

```typescript
if (!googleIOSClientId) {
  throw new Error('Google Sign In is not available in the app. Please use Apple Sign In or sign in via web.');
}
```

## What NOT to Do

❌ **Don't use `signInWithOAuth()` in native apps**
- Triggers OAuth redirect
- Requires PKCE
- localStorage doesn't work across contexts

❌ **Don't pass `redirectURI` to native sign-in**
- Causes OAuth redirects
- Defeats the purpose of native flow

❌ **Don't try to "fix" PKCE localStorage**
- Can't reliably share localStorage between webview contexts
- Not a solvable problem in Capacitor

## Implementation Checklist

- [ ] Switch Apple Sign In to `@capacitor-community/apple-sign-in`
- [ ] Remove `redirectURI` parameter from native Apple config
- [ ] Add SHA-256 nonce hashing for Apple
- [ ] Configure Google with iOS Client ID OR disable it
- [ ] Test both Apple and Google in iOS app
- [ ] Verify no redirects to `/auth/callback` happen
- [ ] Check Xcode logs for successful session creation

## Testing

### Expected Success Flow (Apple)

```
[AppleSignIn] Starting native Apple Sign In flow
[AppleSignIn] Plugin loaded, requesting Apple Sign In
[AppleSignIn] Generated nonce for Apple Sign In
[AppleSignIn] Hashed nonce for Apple
[AppleSignIn] Apple Sign In successful
[AppleSignIn] Exchanging Apple ID token for Supabase session
[AppleSignIn] Supabase session created successfully
[Findr Auth] Apple Sign In complete, redirecting to /findr
```

### Expected Failure Indicators

❌ Redirect to `/auth/callback`
❌ "invalid request both auth code and code verifier"
❌ "No code verifier found"
❌ Browser opens outside the app

## Why Previous Attempts Failed

1. **Used wrong plugin** - `@capgo/capacitor-social-login` for Apple triggers redirects
2. **Passed `redirectURI`** - Caused OAuth flow instead of native flow
3. **Didn't hash nonce** - Apple requires SHA-256 hashed nonce
4. **Mixed OAuth and native flows** - Tried to use PKCE with native sign-in

## References

- [Supabase Apple OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [@capacitor-community/apple-sign-in](https://github.com/capacitor-community/apple-sign-in)
- [Apple Sign In Nonce Requirements](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/incorporating_sign_in_with_apple_into_other_platforms)

---

**Next Step:** Implement the fix in `lib/auth/appleSignIn.ts`
