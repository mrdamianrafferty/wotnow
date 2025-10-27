# Shared Auth Subdomain Implementation

**Date:** October 27, 2025
**Status:** 🚧 PLANNING
**Goal:** Enable multi-domain authentication for Go Daisy (godaisy.io) and Findr (fishfindr.eu) using shared auth subdomain

---

## Problem Statement

Supabase's Site URL configuration only supports ONE domain for CORS. This causes authentication failures on secondary domains:

**Current State:**
- Site URL: `https://www.godaisy.io`
- Go Daisy (godaisy.io): ✅ All auth works
- Findr (fishfindr.eu): ❌ CORS blocks ALL auth operations (OAuth, token refresh, session init)

**Impact:**
- Findr cannot use favorites, catch logging, or any authenticated features
- OAuth users cannot maintain sessions on Findr
- Launching Findr without auth is not viable

---

## Solution: Shared Auth Subdomain

**Architecture:**
```
auth.godaisy.io (or auth.fishfindr.eu)
├── Supabase Site URL points here
├── Hosts OAuth login pages
├── Handles OAuth callbacks
└── Redirects back to originating app with session tokens

User Flow:
1. User visits fishfindr.eu → clicks "Sign in with Google"
2. Redirects to auth.godaisy.io/login?returnTo=https://fishfindr.eu/findr&app=findr
3. OAuth completes on auth.godaisy.io (no CORS - matches Site URL)
4. Callback creates session on auth.godaisy.io
5. Redirects to fishfindr.eu/auth/receive-session?tokens=...
6. fishfindr.eu establishes session from tokens
7. User redirected to /findr (fully authenticated)
```

---

## Implementation Phases

### Phase 1: DNS & Vercel Configuration ⏳

**Vercel Dashboard:**
1. Add domain: `auth.godaisy.io`
2. Configure as additional domain in project settings
3. Ensure domain verification completes

**DNS Provider (Namecheap/Cloudflare):**
```
Type: CNAME
Name: auth.godaisy.io
Value: cname.vercel-dns.com
TTL: Auto
```

**Verification:**
```bash
dig auth.godaisy.io
# Should resolve to Vercel's servers
```

**Alternative:** Could use `auth.fishfindr.eu` instead - either works

---

### Phase 2: Supabase Configuration ⏳

**Supabase Dashboard → Authentication → URL Configuration:**

**Site URL:** `https://auth.godaisy.io`

**Redirect URLs (whitelist these):**
```
https://auth.godaisy.io/**
https://godaisy.io/**
https://www.godaisy.io/**
https://fishfindr.eu/**
https://www.fishfindr.eu/**
http://localhost:3000/**  (for local dev)
```

**Important:** After changing Site URL, existing sessions on godaisy.io and fishfindr.eu will be invalidated. Users will need to re-authenticate.

---

### Phase 3: Code Implementation ⏳

#### File 1: `/pages/auth/shared-login.tsx` (New)
**Purpose:** Unified login page hosted on auth.godaisy.io
**URL:** `https://auth.godaisy.io/auth/shared-login`

**Features:**
- OAuth buttons (Google, Apple)
- Email/password form (optional)
- Detects `returnTo` and `app` query params
- Stores return destination in sessionStorage
- Handles OAuth redirect to Supabase with correct returnTo

**Code:**
```typescript
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/client';
import { mapAuthError } from '../../lib/auth/utils';
import Head from 'next/head';

export default function SharedLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get return destination from query params
  const returnTo = router.query.returnTo as string | undefined;
  const app = router.query.app as string | undefined;

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setLoading(true);
      setError(null);

      // Store return destination
      if (returnTo) sessionStorage.setItem('auth_return_to', returnTo);
      if (app) sessionStorage.setItem('auth_app', app);

      // OAuth redirect goes through auth.godaisy.io
      const redirectTo = `https://auth.godaisy.io/auth/shared-callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            ...(provider === 'google' ? { prompt: 'select_account' } : {}),
          },
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-2xl">
          <div className="card-body">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-primary">
                {app === 'findr' ? 'Findr' : 'Go Daisy'}
              </h1>
              <p className="text-base-content/70 mt-2">
                Sign in to continue
              </p>
            </div>

            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="btn btn-outline btn-block gap-2 disabled:bg-base-200 disabled:text-base-content disabled:border-base-300 disabled:opacity-60"
              >
                {/* Google SVG */}
                Continue with Google
              </button>

              <button
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
                className="btn btn-outline btn-block gap-2 disabled:bg-base-200 disabled:text-base-content disabled:border-base-300 disabled:opacity-60"
              >
                {/* Apple SVG */}
                Continue with Apple
              </button>
            </div>

            <div className="divider text-sm text-base-content/60">Secure Authentication</div>

            <div className="text-center">
              <p className="text-sm text-base-content/70">
                Secure authentication for Go Daisy and Findr
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

---

#### File 2: `/pages/auth/shared-callback.tsx` (New)
**Purpose:** Handle OAuth callback and redirect with session tokens
**URL:** `https://auth.godaisy.io/auth/shared-callback`

**Flow:**
1. Receive OAuth code from provider
2. Exchange code for session (no CORS - we're on auth.godaisy.io)
3. Extract access_token and refresh_token
4. Redirect to destination app with tokens in URL
5. Destination app receives tokens and establishes session

**Code:**
```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/client';

export default function SharedCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    (async () => {
      try {
        const code = router.query.code as string | undefined;
        const error_description = router.query.error_description as string | undefined;

        if (error_description) {
          throw new Error(error_description);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for session (works because we're on auth.godaisy.io)
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) throw exchangeError;
        if (!data?.session) throw new Error('No session created');

        // Get return destination from sessionStorage
        const returnTo = sessionStorage.getItem('auth_return_to') || 'https://godaisy.io/';
        const app = sessionStorage.getItem('auth_app');

        // Clean up
        sessionStorage.removeItem('auth_return_to');
        sessionStorage.removeItem('auth_app');

        // Construct return URL with session tokens
        const returnUrl = new URL(returnTo);
        returnUrl.searchParams.set('access_token', data.session.access_token);
        returnUrl.searchParams.set('refresh_token', data.session.refresh_token);
        returnUrl.searchParams.set('expires_at', data.session.expires_at?.toString() || '');

        // Redirect to destination app
        window.location.replace(returnUrl.toString());
      } catch (err) {
        console.error('[Shared Auth Callback] Error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    })();
  }, [router.isReady, router.query]);

  return (
    <main className="max-w-md mx-auto p-6 space-y-4 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold text-center">Completing sign in...</h1>

      {!error && (
        <div className="flex flex-col items-center gap-3">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/70">Please wait...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">Authentication Failed</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </main>
  );
}
```

---

#### File 3: `/pages/auth/receive-session.tsx` (New)
**Purpose:** Receive session tokens from auth.godaisy.io and establish session
**URL:** Called by both `godaisy.io/auth/receive-session` and `fishfindr.eu/auth/receive-session`

**Flow:**
1. Receive tokens from URL query params
2. Use Supabase `setSession()` to establish local session
3. Redirect to app's main page

**Code:**
```typescript
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase/client';

export default function ReceiveSession() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    (async () => {
      try {
        const access_token = router.query.access_token as string | undefined;
        const refresh_token = router.query.refresh_token as string | undefined;

        if (!access_token || !refresh_token) {
          throw new Error('Missing session tokens');
        }

        // Establish session on this domain
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) throw sessionError;

        // Determine destination based on current domain
        const hostname = window.location.hostname;
        const destination = hostname.includes('fishfindr.eu') ? '/findr' : '/';

        // Clean URL and redirect
        router.replace(destination);
      } catch (err) {
        console.error('[Receive Session] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to establish session');
      }
    })();
  }, [router.isReady, router.query, router]);

  return (
    <main className="max-w-md mx-auto p-6 space-y-4 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold text-center">Setting up your session...</h1>

      {!error && (
        <div className="flex flex-col items-center gap-3">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="text-sm text-base-content/70">Please wait...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">Session Setup Failed</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </main>
  );
}
```

---

#### File 4: Update `/pages/findr/auth.tsx`
**Change:** Redirect to shared auth instead of handling locally

```typescript
// OLD: Local OAuth handling
const handleSocialLogin = async (provider: 'google' | 'apple') => {
  const redirectTo = `${window.location.origin}/auth/callback?app=findr`;
  await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
};

// NEW: Redirect to shared auth
const handleSocialLogin = (provider: 'google' | 'apple') => {
  const returnTo = `${window.location.origin}/auth/receive-session`;
  const authUrl = `https://auth.godaisy.io/auth/shared-login?returnTo=${encodeURIComponent(returnTo)}&app=findr`;
  window.location.href = authUrl;
};
```

---

#### File 5: Update `/pages/login.tsx` (Go Daisy)
**Change:** Redirect to shared auth instead of handling locally

```typescript
// Same pattern as Findr
const handleSocialLogin = (provider: 'google' | 'apple') => {
  const returnTo = `${window.location.origin}/auth/receive-session`;
  const authUrl = `https://auth.godaisy.io/auth/shared-login?returnTo=${encodeURIComponent(returnTo)}&app=godaisy`;
  window.location.href = authUrl;
};
```

---

### Phase 4: Testing Plan ⏳

#### Local Development Testing
```bash
# Update /etc/hosts for local testing
127.0.0.1 auth.godaisy.local

# Test URLs
http://auth.godaisy.local:3000/auth/shared-login
http://localhost:3000/auth/receive-session
```

#### Production Testing Checklist

**Go Daisy (godaisy.io):**
- [ ] Google OAuth
- [ ] Apple OAuth
- [ ] Session persists after redirect
- [ ] Favorites work after auth
- [ ] No CORS errors in console

**Findr (fishfindr.eu):**
- [ ] Google OAuth
- [ ] Apple OAuth
- [ ] Session persists after redirect
- [ ] Favorites work after auth
- [ ] Catch logging works after auth
- [ ] No CORS errors in console

**Cross-Domain:**
- [ ] Sign in on Go Daisy, open Findr → still authenticated
- [ ] Sign in on Findr, open Go Daisy → still authenticated
- [ ] Sign out on one app → signed out on both

---

## Deployment Steps

### Step 1: Add Domain to Vercel
1. Vercel Dashboard → Project Settings → Domains
2. Add `auth.godaisy.io`
3. Configure DNS CNAME record
4. Wait for verification ✅

### Step 2: Update Supabase Configuration
1. Supabase Dashboard → Authentication → URL Configuration
2. Change Site URL to `https://auth.godaisy.io`
3. Add all redirect URLs
4. Save changes
5. **Important:** Existing sessions will be invalidated

### Step 3: Deploy Code Changes
```bash
git add .
git commit -m "Implement shared auth subdomain for multi-domain support"
git push origin main
```

### Step 4: Verify Deployment
```bash
# Check DNS resolution
dig auth.godaisy.io

# Test auth flow manually
open https://fishfindr.eu/findr
# Click sign in → should redirect to auth.godaisy.io
```

---

## Rollback Plan

If shared auth causes issues:

1. **Revert Supabase Site URL:**
   - Change back to `https://www.godaisy.io`

2. **Revert Code Changes:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Temporary Workaround:**
   - Keep Go Daisy with full auth
   - Run Findr without auth temporarily

---

## Alternative Approaches Considered

### ❌ Separate Supabase Projects
- **Pro:** Complete isolation, no CORS issues
- **Con:** Duplicate data, separate user bases, higher cost
- **Verdict:** Overkill for current scale

### ❌ Disable Auth on Findr
- **Pro:** Quick fix, no infrastructure changes
- **Con:** No favorites, no catch logging (deal-breaker)
- **Verdict:** Not viable per user requirement

### ✅ Shared Auth Subdomain
- **Pro:** Proper multi-domain support, single user base
- **Con:** Requires DNS setup, more complex auth flow
- **Verdict:** Best solution for production app family

---

## Future Enhancements

1. **Add Email/Password to Shared Auth:**
   - Include email/password form on shared-login.tsx
   - Same token-based redirect flow

2. **Add Magic Links:**
   - Send magic link emails with auth.godaisy.io callback
   - Handle magic link verification on shared domain

3. **Session Sync Improvements:**
   - Use WebSocket or BroadcastChannel for real-time session sync
   - Update one app → immediately update other app

4. **Native App Integration:**
   - When iOS/Android apps launch, use same auth.godaisy.io flow
   - Deep link back to native app with session tokens

---

**Next Step:** Set up DNS for auth.godaisy.io and add to Vercel
