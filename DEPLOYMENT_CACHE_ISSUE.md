# Vercel Deployment Cache Issue

## Problem
OAuth fixes have been coded correctly and committed to GitHub main branch, but Vercel production is serving OLD JavaScript bundles despite successful builds.

## Evidence

### 1. Code Changes Are Correct
Local repository has correct code:
```typescript
// New code (commit fce0f250):
console.log('[OAuth Debug] Starting code exchange flow...');

// Old code (NOT in repo anymore):
console.log('Exchanging code for session...');
```

Verification:
```bash
$ grep "Exchanging code for session" pages/auth/callback.tsx
# Returns nothing - old log removed ✓

$ grep "Starting code exchange flow" pages/auth/callback.tsx  
# Returns match on line 139 ✓
```

### 2. Builds Are Completing Successfully
- Commit fce0f250 pushed at ~19:07
- Build timestamp in production: 2025-10-20T19:10:18
- Build completed AFTER code changes ✓

### 3. BUT: Old Code Still Running in Production
E2E test console output shows:
```
[Browser Console log]: Exchanging code for session... {code: test-code...}
[Browser Console log]: [WotNow Build Info] {buildTime: 2025-10-20T19:10:18.094Z}
```

**The old log message appears despite build being newer than code changes!**

### 4. Multiple Commits Show Same Pattern
| Commit | Pushed | Key Change | Production Behavior |
|--------|--------|------------|-------------------|
| 53199bcc | ~18:50 | Added session detection | Not deployed |
| ae1e0876 | ~18:51 | Fixed types | Not deployed |
| f6118518 | ~18:57 | Added debug logs | Not deployed |
| 465e94ca | ~19:02 | Fixed indentation | Not deployed |
| fce0f250 | ~19:07 | Enhanced logging | **Still not deployed after 5+ minutes** |

Build timestamps advancing (18:50 → 18:55 → 19:00 → 19:05 → 19:10) but code logic unchanged.

## Root Cause Analysis

**Hypothesis**: Vercel CDN or Edge Network is serving cached JavaScript bundles.

Vercel's build process:
1. ✅ Detects GitHub push
2. ✅ Runs Next.js build
3. ✅ Generates new JavaScript bundles
4. ✅ Updates build metadata (timestamp changes)
5. ❌ **BUT**: Old JS bundles still served to clients

Possible causes:
- **CDN Caching**: Cloudflare/Vercel Edge caching old `_next/static/chunks/*.js` files
- **Browser Caching**: Aggressive caching of static assets
- **Vercel Edge Cache**: Edge functions serving stale bundles
- **Build Output Not Changing**: Next.js detecting no "real" changes and reusing chunks

## Impact on OAuth Fix

The OAuth session detection code IS correct:
```typescript
// This code exists in pages/auth/callback.tsx
const { data: existingSession } = await supabase.auth.getSession();
if (existingSession?.session) {
  // Session exists! Skip PKCE exchange and redirect
  window.location.replace(destination);
  return;
}
```

**If this code were running**, OAuth would work because:
1. User completes Google/Apple OAuth
2. Supabase creates session (stored in localStorage)
3. Callback detects existing session
4. Skips failed PKCE exchange
5. Redirects cleanly to homepage

## Solutions

### Immediate: Force Cache Clear

**Option 1: Vercel Dashboard**
1. Go to https://vercel.com/mrdamianrafferty/wotnow
2. Find latest deployment
3. Click "Redeploy" with "Use existing Build Cache" **UNCHECKED**
4. OR click "Invalidate Cache"

**Option 2: Query String Cache Bust**
Add version query param to force new bundle download:
```typescript
// In _app.tsx or callback.tsx
if (typeof window !== 'undefined') {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('v')) {
    url.searchParams.set('v', Date.now().toString());
    window.location.href = url.toString();
  }
}
```

**Option 3: Modify vercel.json**
Force no-cache for Next.js chunks:
```json
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### Short-Term: Alternative OAuth Flow

If caching issues persist, switch to implicit OAuth (no PKCE):

```typescript
// In lib/supabase/client.ts
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'implicit', // No PKCE verifier needed
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

Pros:
- No PKCE verifier = no localStorage dependency
- Session in URL fragment (browser handles it)
- Simpler flow

Cons:
- Less secure (tokens in URL)
- Not recommended for production long-term

### Long-Term: Investigate Vercel Settings

Check Vercel project settings for:
- **Framework Preset**: Should be "Next.js"
- **Build Command**: Should be `next build` or `npm run build`
- **Output Directory**: Should be `.next`
- **Node.js Version**: Should be 18.x or 20.x
- **Environment Variables**: NEXT_PUBLIC_* vars set correctly

## Testing the Fix

Once cache is cleared, E2E test should show:
```
[Browser Console log]: [OAuth Debug] Starting code exchange flow...
[Browser Console log]: [OAuth Debug] Checked for existing session: {hasSession: true}
[Browser Console log]: [OAuth Debug] Session already exists! Skipping code exchange.
[Browser Console log]: [OAuth Debug] Redirecting to: /
```

And final URL should be `https://www.godaisy.io/` (not stuck on callback).

## Next Steps

1. **Check Vercel Dashboard** for deployment status and cache settings
2. **Force redeploy** with cache invalidation if available
3. **Wait 5-10 minutes** after forced redeploy for CDN to propagate
4. **Re-run E2E test**: `npx playwright test e2e/oauth-godaisy.spec.ts --grep="existing session"`
5. **If still cached**: Try implicit OAuth flow as temporary workaround
6. **If working**: Test actual OAuth with real Google/Apple login

## Contact

If Vercel dashboard shows successful deployment but bundles still cached, contact Vercel support with:
- Project: wotnow
- Issue: "CDN serving stale JavaScript bundles after successful build"
- Evidence: Build timestamps updating but console.log statements unchanged
- Commits affected: 53199bcc through fce0f250 (2025-10-20 18:50-19:10)
