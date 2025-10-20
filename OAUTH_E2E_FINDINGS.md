# OAuth Issues Diagnosed via E2E Testing

## Date: 2025-10-20

## Summary
E2E testing revealed that OAuth authentication **is partially working** but has critical flow issues preventing successful login.

## Key Findings from E2E Tests

### 1. **Session Detection Code Not Deployed**
- Latest commits (`53199bcc`, `ae1e0876`, `f6118518`) pushed successfully
- Build timestamps show deployments happening (18:50:36 → 18:51:49 → 18:55:26)
- BUT: Session detection logs (`[OAuth Debug]`) not appearing in production
- **Conclusion**: Either Vercel is caching aggressively or deployment is failing silently

### 2. **Actual OAuth Flow Status**
From E2E test logs:
```
Auth callback params: {code: test-code-12345, app: godaisy, origin: https://www.godaisy.io}
Exchanging code for session... {code: test-code-...}
Exchange result: {hasSession: false, error: invalid request: both auth code and code verifier should be non-empty}
Code exchange failed: AuthApiError: invalid request: both auth code and code verifier should be non-empty
```

**What this means:**
- ✅ Callback URL structure is correct (`?app=godaisy&code=...`)
- ✅ Code parameter is being extracted
- ❌ PKCE verifier is missing from localStorage
- ❌ `exchangeCodeForSession()` fails with 400 error
- ❌ User gets stuck on error page

### 3. **Root Cause: PKCE Verifier Missing**

**Why verifier is missing:**
1. User clicks OAuth button on `www.godaisy.io/login`
2. Supabase JS client should store PKCE verifier in localStorage
3. User redirects to Google/Apple → back to Supabase → redirects to `www.godaisy.io/auth/callback`
4. Callback tries to find verifier in localStorage → **NOT FOUND**
5. Without verifier, can't exchange code for session

**Possible reasons:**
- localStorage being cleared between OAuth initiation and callback
- Cross-domain issue (though both are `www.godaisy.io`)
- Supabase client not storing verifier due to configuration
- Browser security blocking localStorage access

### 4. **Secondary Issue: Homepage Error**
```
TypeError: Cannot read properties of undefined (reading 'forEach')
at index-bb894651c157fcf6.js:1:36120
```
- Happens when navigating to homepage
- Unrelated to OAuth but breaks user experience
- Needs investigation

## What SHOULD Happen (The Fix I Implemented)

### Intended Flow:
1. **Check for existing session FIRST** before trying code exchange
   ```typescript
   const { data: existingSession } = await supabase.auth.getSession();
   if (existingSession?.session) {
     // Session already exists! OAuth completed via implicit flow
     // Skip PKCE exchange and redirect immediately
     window.location.replace(destination);
     return;
   }
   ```

2. **Only try PKCE exchange if no session**
   - If session doesn't exist, try PKCE exchange
   - If that fails, show error

3. **Use `window.location.replace()` for redirects**
   - Removes callback from history
   - Prevents redirect loops

## Why This Fix Isn't Working Yet

**The code is correct but not deployed!** 

Evidence:
- Console logs show old behavior (immediate code exchange)
- No "[OAuth Debug] Checking for existing session..." log
- Same error pattern as before fix

**Next Steps:**
1. Verify Vercel deployment completed successfully
2. Check Vercel dashboard for build logs/errors  
3. Force cache clear if needed
4. Consider alternative: Use implicit OAuth flow instead of PKCE

## Alternative Fix: Switch to Implicit Flow

If PKCE continues to fail, we can configure Supabase to use implicit flow:

```typescript
// In lib/supabase/client.ts
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'implicit', // Change from 'pkce'
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

**Implicit flow advantages:**
- No PKCE verifier needed
- Session tokens passed directly in URL fragment
- Simpler flow, fewer points of failure

**Implicit flow disadvantages:**
- Less secure (tokens in URL)
- Not recommended for production

## Recommendation

1. **Immediate**: Verify latest deployment is live, clear Vercel cache if needed
2. **Short-term**: If deployment issues persist, switch to implicit OAuth flow temporarily
3. **Long-term**: Debug why PKCE verifier isn't being stored/found in localStorage

## Test Commands

```bash
# Re-run E2E test to see current state
npx playwright test e2e/oauth-godaisy.spec.ts --project=chromium --workers=1

# Check specific test
npx playwright test e2e/oauth-godaisy.spec.ts --project=chromium --grep="existing session"

# View screenshots
open test-results/oauth-*.png
```
