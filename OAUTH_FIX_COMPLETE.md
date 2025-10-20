# OAuth Authentication Fix - Google & Apple Sign-In

## Problem Summary

Users were unable to sign in with Google or Apple OAuth providers:
- **Google**: "Too many redirects" error when trying to sign in
- **Apple**: "Missing tokens" error during authentication

## Root Cause

The application uses **Next.js Pages Router** (`/pages` directory) for all routes, but the OAuth callback handler was only implemented in the **App Router** (`/app/auth/callback`).

When users clicked "Sign in with Google" or "Sign in with Apple":
1. OAuth provider (Google/Apple) would redirect back to: `https://fishfindr.eu/auth/callback?code=...`
2. Next.js would try to serve this route from Pages Router
3. The `/pages/auth/` directory existed but was **empty** - no callback handler
4. This caused a redirect loop or missing parameter errors

### Why This Happened

The project has a hybrid structure with both `/app` and `/pages` directories, but **Pages Router takes precedence** for routing. The App Router callback at `/app/auth/callback/page.tsx` was never reached.

## Solution

Created `/pages/auth/callback.tsx` - a proper Pages Router callback handler that:

### Features
✅ **PKCE Flow Support** - Modern OAuth flow (Google, Apple)
✅ **Implicit Flow Support** - Legacy OAuth tokens
✅ **Email OTP/Magic Links** - Password reset, email verification
✅ **Smart Routing** - Automatically routes to `/findr` or `/` based on context
✅ **Error Handling** - Clear error messages with retry options
✅ **Debug Logging** - Console logs for troubleshooting

### How It Works

1. **OAuth Redirect**: Google/Apple redirects to `/auth/callback?code=ABC123&app=findr`
2. **Code Exchange**: Handler calls `supabase.auth.exchangeCodeForSession(code)`
3. **Session Created**: Supabase creates authenticated session
4. **Smart Routing**: 
   - If `app=findr` → redirects to `/findr`
   - If recovery flow → redirects to password update page
   - Otherwise → redirects to `/`

## Files Changed

- ✅ `pages/auth/callback.tsx` - **NEW** - Pages Router OAuth callback handler

## Deployment

Deployed in commit: `9582bffa`

```
Fix OAuth login: Add missing Pages Router auth callback handler
- Create /pages/auth/callback.tsx to handle OAuth redirects
- Supports PKCE flow (Google, Apple OAuth)
- Supports implicit flow tokens
- Supports email OTP/magic links
- Intelligently routes to /findr or / based on app context
- Fixes 'too many redirects' issue with Google login
- Fixes missing token handler for Apple login
```

## Testing

After deployment, test:

1. **Google Sign-In**:
   - Go to https://fishfindr.eu/findr/auth
   - Click "Continue with Google"
   - Select account
   - Should redirect back and sign in successfully

2. **Apple Sign-In**:
   - Go to https://fishfindr.eu/findr/auth
   - Click "Continue with Apple"
   - Authenticate
   - Should redirect back and sign in successfully

## Notes

- The `/app/auth/callback` directory still exists but is not used for Findr (Pages Router)
- All existing email/password authentication continues to work unchanged
- Magic link authentication now also routes through this callback handler
- The middleware (`middleware.ts`) correctly routes auth callbacks to `/auth/callback`

## Related Configuration

Make sure these URLs are configured in Supabase dashboard:

**Site URL**: `https://fishfindr.eu`

**Redirect URLs** (under Authentication → URL Configuration):
- `https://fishfindr.eu/auth/callback`
- `https://fishfindr.eu/findr/magic-link` (legacy support)
- `http://localhost:3000/auth/callback` (development)

**Google OAuth** (if separate config needed):
- Authorized redirect URIs should include: `https://fishfindr.eu/auth/callback`

**Apple OAuth** (if separate config needed):
- Return URLs should include: `https://fishfindr.eu/auth/callback`
