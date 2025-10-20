# OAuth Login Troubleshooting Guide

## Current Issue

Google and Apple OAuth login are failing because the redirect is going to the Supabase domain instead of your actual domain (fishfindr.eu).

## Root Cause

The **Supabase Site URL** is not configured correctly in the Supabase Dashboard. When not configured, Supabase defaults to redirecting to `[project-ref].supabase.co` instead of your custom domain.

## Fix Steps

### 1. Configure Supabase Site URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `swmviqpxetwziqxhzldh`
3. Go to **Authentication** → **URL Configuration**
4. Set the following:

#### Site URL
```
https://fishfindr.eu
```

#### Redirect URLs (Add all of these)
```
https://fishfindr.eu/auth/callback
https://fishfindr.eu/findr/magic-link
http://localhost:3000/auth/callback
http://localhost:3000/findr/auth
```

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

1. **Clear browser cookies** for fishfindr.eu
2. Go to https://fishfindr.eu/findr/auth
3. Click "Continue with Google"
4. You should see:
   - Google account picker
   - After selection, redirect to `https://fishfindr.eu/auth/callback?code=...`
   - Then redirect to `https://fishfindr.eu/findr`

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

- [ ] Site URL set to `https://fishfindr.eu` in Supabase Dashboard
- [ ] Redirect URLs include `https://fishfindr.eu/auth/callback` in Supabase Dashboard
- [ ] Google OAuth provider is enabled in Supabase
- [ ] Apple OAuth provider is enabled in Supabase
- [ ] Google Cloud Console has Supabase callback URL authorized
- [ ] Apple Developer has Supabase callback URL authorized
- [ ] Browser cookies cleared
- [ ] Tested on production (not localhost)

## Files in This Project

- `/pages/auth/callback.tsx` - OAuth callback handler ✅ Created
- `/pages/findr/auth.tsx` - Login page with OAuth buttons ✅ Correct
- `/middleware.ts` - Routes OAuth callbacks correctly ✅ Correct

## Contact Support

If issues persist after following these steps, check:
1. Supabase logs: Dashboard → Logs → Auth Logs
2. Browser console: Network tab for failed requests
3. Supabase status page: https://status.supabase.com/
