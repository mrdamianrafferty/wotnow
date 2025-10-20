# OAuth Login Troubleshooting Guide

## Current Issue

Google and Apple OAuth login are failing because **GoDaisy and FishFindr share the same Supabase project** but have different domains (godaisy.io and fishfindr.eu). The Supabase Site URL can only be set to one domain.

## Solution

The OAuth callback handler now uses **domain detection and sessionStorage** to route users back to the correct app after authentication.

## How It Works

1. **User clicks OAuth button** on either GoDaisy or FishFindr
2. **App stores context** in sessionStorage (origin domain + app name)
3. **OAuth flow completes** via Supabase
4. **Callback handler detects** which app initiated the flow
5. **User redirected** to correct domain and app

This allows both apps to share authentication while maintaining separate user experiences.

## Fix Steps

### 1. Configure Supabase Site URL

**Important**: Since GoDaisy and FishFindr share the same Supabase project, set the Site URL to your **primary domain** (the one you use most or want as default).

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `swmviqpxetwziqxhzldh`
3. Go to **Authentication** → **URL Configuration**
4. Set the following:

#### Site URL
Choose ONE (recommendation: use your primary domain):
```
https://www.godaisy.io
```
OR
```
https://fishfindr.eu
```

**Note**: The Site URL is used as a fallback when no `redirectTo` is specified. Our code explicitly sets `redirectTo` for each app, so this mainly affects email confirmations and password resets.

#### Redirect URLs (Add ALL of these)
```
https://www.godaisy.io/auth/callback
https://godaisy.io/auth/callback
https://fishfindr.eu/auth/callback
https://www.fishfindr.eu/auth/callback
https://fishfindr.eu/findr/magic-link
https://www.godaisy.io/**
https://godaisy.io/**
https://fishfindr.eu/**
https://www.fishfindr.eu/**
http://localhost:3000/auth/callback
http://localhost:3000/findr/auth
```

**IMPORTANT**: `https://www.godaisy.io/auth/callback` MUST be in this list. Vercel automatically redirects `godaisy.io` → `www.godaisy.io`, so users will always be on the www subdomain. The OAuth redirect URL must match the exact domain where the user initiated the login to preserve the PKCE verifier in localStorage.

### 2. Verify OAuth Provider Settings

#### Google OAuth
1. In Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Verify it's enabled
3. The redirect URI should automatically be: `https://swmviqpxetwziqxhzldh.supabase.co/auth/v1/callback`
   - This is correct - Supabase handles the OAuth callback first, then redirects to your Site URL

#### Apple OAuth  
1. In Supabase Dashboard → **Authentication** → **Providers** → **Apple**
2. Verify it's enabled
3. The redirect URI should automatically be: `https://swmviqpxetwziqxhzldh.supabase.co/auth/v1/callback`
   - This is correct - Supabase handles the OAuth callback first, then redirects to your Site URL

### 3. Update Google Cloud Console (if needed)

If Google OAuth still doesn't work after step 1, you may need to add authorized redirect URIs in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Add these **Authorized redirect URIs**:
   ```
   https://swmviqpxetwziqxhzldh.supabase.co/auth/v1/callback
   https://fishfindr.eu/auth/callback
   ```

### 4. Update Apple Developer Console (if needed)

If Apple OAuth doesn't work after step 1:

1. Go to [Apple Developer](https://developer.apple.com/account/)
2. Go to **Certificates, Identifiers & Profiles**
3. Select your **Services ID**
4. Add these **Return URLs**:
   ```
   https://swmviqpxetwziqxhzldh.supabase.co/auth/v1/callback
   ```

## How OAuth Flow Works

1. **User clicks "Sign in with Google/Apple"**
   - App redirects to Google/Apple with redirect_uri = `https://swmviqpxetwziqxhzldh.supabase.co/auth/v1/callback`

2. **User authenticates with Google/Apple**
   - Google/Apple redirects back to Supabase: `https://swmviqpxetwziqxhzldh.supabase.co/auth/v1/callback?code=...`

3. **Supabase exchanges code for tokens**
   - Supabase validates the code
   - Creates a session
   - Redirects to your **Site URL** + the `redirectTo` parameter you specified

4. **User lands on your callback page**
   - URL: `https://fishfindr.eu/auth/callback?code=...&app=findr`
   - Your callback page (`/pages/auth/callback.tsx`) exchanges the code for a session
   - Redirects user to `/findr`

## Testing After Configuration

### For FishFindr:
1. **Clear browser cookies** for fishfindr.eu
2. Go to https://fishfindr.eu/findr/auth
3. Click "Continue with Google" or "Continue with Apple"
4. You should see:
   - Google/Apple account picker
   - After selection, redirect to `https://fishfindr.eu/auth/callback?code=...&app=findr&origin=...`
   - Then redirect to `https://fishfindr.eu/findr`

### For GoDaisy:
1. **Clear browser cookies** for godaisy.io
2. Go to https://www.godaisy.io/login
3. Click "Continue with Google" or "Continue with Apple"
4. You should see:
   - Google/Apple account picker
   - After selection, redirect to `https://www.godaisy.io/auth/callback?code=...&app=godaisy&origin=...`
   - Then redirect to `https://www.godaisy.io/`

## Common Issues

### "Too many redirects"
- **Cause**: Site URL not configured in Supabase
- **Fix**: Set Site URL to `https://fishfindr.eu` in Supabase Dashboard

### "Invalid redirect URI" from Google/Apple
- **Cause**: Redirect URI not authorized in Google Cloud Console / Apple Developer
- **Fix**: Add `https://swmviqpxetwziqxhzldh.supabase.co/auth/v1/callback` to authorized redirects

### "Missing tokens" / "Invalid code"
- **Cause**: Code already used or expired
- **Fix**: Clear cookies and try again

### Still redirecting to swmviqpxetwziqxhzldh.supabase.co
- **Cause**: Site URL not set correctly
- **Fix**: Double-check Site URL in Supabase Dashboard is exactly `https://fishfindr.eu` (no trailing slash)

## Environment Variables

Make sure these are set in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://swmviqpxetwziqxhzldh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These should already be set correctly.

## Debug Checklist

- [ ] Site URL set to either `https://www.godaisy.io` OR `https://fishfindr.eu` in Supabase Dashboard
- [ ] Redirect URLs include BOTH GoDaisy and FishFindr callback URLs in Supabase Dashboard
- [ ] Google OAuth provider is enabled in Supabase
- [ ] Apple OAuth provider is enabled in Supabase
- [ ] Google Cloud Console has Supabase callback URL authorized
- [ ] Apple Developer has Supabase callback URL authorized
- [ ] Browser cookies cleared
- [ ] Tested on production (not localhost)
- [ ] SessionStorage is working (check browser dev tools → Application → Session Storage)

## Files in This Project

- `/pages/auth/callback.tsx` - **Unified OAuth callback handler** for both GoDaisy and FishFindr ✅ Created
- `/pages/findr/auth.tsx` - FishFindr login page with OAuth buttons ✅ Updated
- `/pages/login.tsx` - **GoDaisy login page** with OAuth buttons ✅ Created
- `/middleware.ts` - Routes OAuth callbacks correctly ✅ Correct

## Key Implementation Details

### Multi-Domain OAuth Support

The callback handler (`/pages/auth/callback.tsx`) detects which app initiated the OAuth flow using:
1. `?app=findr` or `?app=godaisy` query parameter
2. `?origin=https://fishfindr.eu` or `?origin=https://www.godaisy.io` query parameter  
3. SessionStorage values: `oauth_app` and `oauth_origin`
4. Hostname detection (fishfindr.eu vs godaisy.io)

This ensures users are always redirected back to the correct domain after authentication.

## Contact Support

If issues persist after following these steps, check:
1. Supabase logs: Dashboard → Logs → Auth Logs
2. Browser console: Network tab for failed requests
3. Supabase status page: https://status.supabase.com/
