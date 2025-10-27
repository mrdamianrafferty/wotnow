# Authentication Fix Proposal

**Date:** October 27, 2025
**Status:** ✅ PHASE 1 COMPLETE - DEPLOYED
**Last Updated:** October 27, 2025

## Problem Summary

Login is failing on both Go Daisy (`godaisy.io`) and Findr (`fishfindr.eu`) for multiple authentication methods (email/password, Google OAuth, Apple OAuth, magic links).

## Root Causes Identified

### 1. Race Condition in `_app.tsx` (Lines 70-92)

**Issue:** `_app.tsx` has a `useEffect` that intercepts auth callbacks and redirects them:

```typescript
useEffect(() => {
  // ... checks for OAuth code, recovery type, or hash fragment
  if (code || type === 'recovery' || hasOauthFragment) {
    // Redirects to /findr/magic-link or /auth/callback
    window.location.replace(`/auth/callback${search}${hash || ''}`);
  }
}, []);
```

**Problem:**
- This runs on **every page load** before the callback page logic executes
- Creates a redirect loop: callback page → `_app.tsx` detects params → redirects again
- Destroys PKCE verifier in localStorage during redirect
- The exclusion check (`pathname.startsWith('/findr/magic-link') || pathname.startsWith('/auth/callback')`) prevents loops but the redirect still happens once

**Impact:** HIGH - Affects all OAuth flows and magic links

---

### 2. Complex PKCE Verifier Logic in Callback Page

**Issue:** `/pages/auth/callback.tsx` lines 176-206 have complex PKCE verifier checking:

```typescript
const pkceVerifierKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token-code-verifier`;
const pkceVerifier = localStorage.getItem(pkceVerifierKey);
```

**Problems:**
- PKCE verifier key construction is fragile (string splitting)
- If verifier is missing, tries multiple recovery paths
- May not work correctly after `_app.tsx` redirect

**Impact:** MEDIUM - Causes "code verifier not found" errors

---

### 3. Duplicate Session Management

**Issue:** Multiple places check and manage sessions:
1. `AuthContext` (global state)
2. `_app.tsx` (redirect logic)
3. `/pages/auth/callback.tsx` (multiple session checks)
4. Individual auth pages (`simple-auth.tsx`, `auth.tsx`, `login.tsx`)

**Problems:**
- State synchronization issues
- Race conditions between concurrent session checks
- Inconsistent error handling

**Impact:** MEDIUM - Can cause intermittent failures

---

### 4. 15-Second Timeout in Callback Page

**Issue:** Line 105 in `callback.tsx` sets a 15-second timeout:

```typescript
const timeoutId = setTimeout(() => {
  console.error('Auth callback timeout - stuck for 15 seconds');
  setError('Authentication is taking too long. Please try again.');
  setPhase(Phase.Error);
}, 15000);
```

**Problems:**
- May fire during legitimate slow connections
- Does not account for redirect delays
- Can prematurely error out working auth flows

**Impact:** LOW - Causes false positive errors on slow networks

---

## Proposed Fixes

### Fix 1: Remove `_app.tsx` Auth Redirect Logic (HIGH PRIORITY)

**Action:** Remove lines 66-92 from `pages/_app.tsx`

**Reasoning:**
- Supabase's `detectSessionInUrl: true` (in `lib/supabase/client.ts`) already handles this
- `@supabase/ssr` with PKCE flow manages redirects automatically
- Manual redirect logic causes more problems than it solves

**Code to Remove:**
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;

  // Avoid loops on auth pages
  if (pathname.startsWith('/findr/magic-link') || pathname.startsWith('/auth/callback')) return;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type');
  const hasOauthFragment = /(?:^#|&)(access_token|refresh_token|provider_token|expires_in|token_type)=/i.test(hash || '');

  if (code || type === 'recovery' || hasOauthFragment) {
    // ... redirect logic
  }
}, []);
```

**Result:** Let Supabase handle URL detection natively.

---

### Fix 2: Simplify PKCE Verifier Handling

**Action:** Update `/pages/auth/callback.tsx` lines 176-206

**Current (Fragile):**
```typescript
const pkceVerifierKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token-code-verifier`;
const pkceVerifier = localStorage.getItem(pkceVerifierKey);
```

**Proposed (Robust):**
```typescript
// Try to get verifier key directly from Supabase internals
const getSupabasePkceKey = (): string | null => {
  try {
    // Supabase stores keys with this pattern
    const keys = Object.keys(localStorage);
    return keys.find(k => k.includes('auth-token-code-verifier')) || null;
  } catch {
    return null;
  }
};

const pkceVerifierKey = getSupabasePkceKey();
const pkceVerifier = pkceVerifierKey ? localStorage.getItem(pkceVerifierKey) : null;
```

**Result:** More resilient to URL format changes.

---

### Fix 3: Consolidate Session Checks

**Action:** Centralize session management in `AuthContext`

**Current Issue:** Multiple components call `supabase.auth.getSession()` independently

**Proposed:**
1. Only `AuthContext` calls `getSession()`
2. Other components use `useAuth()` hook exclusively
3. Remove redundant session checks from callback page

**Example - Update callback page:**

```typescript
// BEFORE: Multiple getSession() calls
const { data: existingSession } = await supabase.auth.getSession();
// ... later
const { data: { session } } = await supabase.auth.getSession();

// AFTER: Single source of truth
import { useAuth } from '../../context/AuthContext';

const { refreshSession } = useAuth();
await refreshSession(); // Force refresh after code exchange
```

---

### Fix 4: Increase Callback Timeout

**Action:** Update timeout from 15s to 30s

```typescript
// Line 105 in callback.tsx
const timeoutId = setTimeout(() => {
  console.error('Auth callback timeout - stuck for 30 seconds');
  setError('Authentication is taking longer than expected. Please try closing this tab and signing in again.');
  setPhase(Phase.Error);
}, 30000); // Increased from 15000
```

---

### Fix 5: Add Comprehensive Error Logging

**Action:** Add structured error logging throughout auth flow

```typescript
// Add at top of callback.tsx
const logAuthStep = (step: string, data?: unknown) => {
  console.log(`[Auth Flow] ${step}`, {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    ...data
  });
};

// Use throughout:
logAuthStep('Started code exchange', { codeLength: code.length });
logAuthStep('Session created', { userEmail: session?.user?.email });
logAuthStep('Redirect to destination', { destination });
```

---

## Implementation Plan

### Phase 1: Critical Fixes ✅ COMPLETED

1. ✅ Remove `_app.tsx` auth redirect logic - **DEPLOYED** (Commit: 8b69980d)
2. ✅ Simplify PKCE verifier handling - **DEPLOYED** (Commit: 8b69980d)
3. ✅ Add comprehensive error logging - **DEPLOYED** (Commit: 8b69980d)
4. ✅ Fix OAuth button styling (white-on-white issue) - **DEPLOYED** (Commit: 9f869665)

### Phase 2: Improvements (Do After Testing Phase 1)

4. ⏳ Consolidate session checks
5. ⏳ Increase callback timeout

### Phase 3: Testing

1. Test email/password login on both Go Daisy and Findr
2. Test Google OAuth on both apps
3. Test Apple OAuth on both apps
4. Test magic links
5. Test password reset flows
6. Test cross-tab session sync

---

## Testing Checklist

### Go Daisy (`godaisy.io`)
- [ ] Email/password sign in
- [ ] Email/password sign up
- [ ] Google OAuth
- [ ] Apple OAuth
- [ ] Password reset
- [ ] Session persistence after reload

### Findr (`fishfindr.eu`)
- [ ] Email/password sign in
- [ ] Email/password sign up
- [ ] Google OAuth
- [ ] Apple OAuth
- [ ] Magic link login
- [ ] Session persistence after reload

### Cross-App
- [ ] Sign in on Go Daisy, verify session on Findr
- [ ] Sign in on Findr, verify session on Go Daisy
- [ ] Sign out on one app, verify sign out on other

---

## Rollback Plan

If fixes cause issues:

1. **Revert `_app.tsx` changes:**
   ```bash
   git checkout HEAD~1 pages/_app.tsx
   ```

2. **Revert callback.tsx changes:**
   ```bash
   git checkout HEAD~1 pages/auth/callback.tsx
   ```

---

## Expected Outcomes

**Before Fixes:**
- OAuth login fails with "code verifier not found"
- Magic links fail with redirect loops
- Email/password login intermittently fails
- Users see "Authentication is taking too long" errors

**After Fixes:**
- All auth methods work consistently
- Clear error messages when auth genuinely fails
- Faster authentication (no unnecessary redirects)
- Better debugging with structured logging

---

## Additional Recommendations

### 1. Add E2E Auth Tests

Create Playwright tests for auth flows:

```typescript
// e2e/auth.spec.ts
test('Google OAuth login on Findr', async ({ page }) => {
  await page.goto('https://fishfindr.eu/findr/auth');
  await page.click('text=Continue with Google');
  // ... complete OAuth flow
  await expect(page).toHaveURL(/\/findr$/);
});
```

### 2. Add Sentry/LogRocket for Production Errors

Capture auth failures in production:

```typescript
import * as Sentry from '@sentry/nextjs';

// In callback.tsx catch blocks:
Sentry.captureException(error, {
  contexts: {
    auth: {
      flow: 'oauth',
      provider: 'google',
      hasCode: !!code,
      hasPkceVerifier: !!pkceVerifier,
    }
  }
});
```

### 3. Simplify Auth Pages

Consider consolidating:
- `/pages/login.tsx` (Go Daisy)
- `/pages/findr/auth.tsx` (Findr)
- `/pages/findr/simple-auth.tsx` (Findr alternative)

Into a single component with app-specific styling.

---

## References

- **Supabase PKCE Flow Docs:** https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr
- **Supabase Auth Helpers:** https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- **Current Auth Implementation:** `lib/supabase/client.ts`, `context/AuthContext.tsx`
- **Callback Handler:** `pages/auth/callback.tsx`

---

## Implementation Summary (October 27, 2025)

### What Was Fixed

**Phase 1 Fixes - Commit 8b69980d:**

1. **Removed problematic auth redirect logic from `_app.tsx` (lines 66-92)**
   - Deleted manual URL detection and redirect code
   - Now relies on Supabase's built-in `detectSessionInUrl: true` configuration
   - Eliminates race condition that was destroying PKCE verifiers

2. **Improved PKCE verifier detection in `callback.tsx`**
   - Replaced fragile string-splitting approach with robust `Object.keys(localStorage).find()` pattern
   - Added fallback logic to check for existing session if verifier is missing
   - More resilient to Supabase internal implementation changes

3. **Added comprehensive structured logging**
   - Created `logAuthStep()` helper function with timestamps
   - Logs at all critical points: callback init, PKCE verification, code exchange, redirects
   - Easier debugging for production issues

**OAuth Button Styling Fix - Commit 9f869665:**

4. **Fixed white-on-white text on disabled OAuth buttons**
   - Applied to both `pages/login.tsx` (Go Daisy) and `pages/findr/auth.tsx` (Findr)
   - Added explicit disabled state classes:
     - `disabled:bg-base-200` - Light gray background
     - `disabled:text-base-content` - Readable text color
     - `disabled:border-base-300` - Subtle border
     - `disabled:opacity-60` - Visual indication of disabled state

### Files Modified

- `pages/_app.tsx` - Removed auth redirect logic
- `pages/auth/callback.tsx` - Improved PKCE handling and logging
- `pages/login.tsx` - Fixed OAuth button styling
- `pages/findr/auth.tsx` - Fixed OAuth button styling
- `docs/AUTH_FIX_PROPOSAL.md` - This document

### Expected Results

**Before Fixes:**
- OAuth login fails with "code verifier not found"
- Magic links cause redirect loops
- Email/password login works intermittently
- OAuth buttons have poor visibility when disabled

**After Fixes:**
- All authentication methods should work consistently
- OAuth flow completes without PKCE errors
- No more redirect loops from `_app.tsx`
- OAuth buttons are visible and readable in all states
- Better debugging information via structured logs

### Testing Status

⏳ **Awaiting production testing of:**
- Google OAuth on Go Daisy and Findr
- Apple OAuth on both apps
- Email/password sign in/sign up
- Magic link authentication
- Session persistence after page reload
- OAuth button visibility in enabled/disabled/loading states

### Next Steps

1. Deploy changes to production (if not already deployed)
2. Test all authentication flows on both Go Daisy and Findr
3. Monitor browser console logs for auth flow debugging info
4. If Phase 1 tests successfully, consider implementing Phase 2 improvements:
   - Consolidate session checks to AuthContext only
   - Increase callback timeout from 15s to 30s

---

**Status:** Phase 1 complete and deployed. Ready for production testing.
