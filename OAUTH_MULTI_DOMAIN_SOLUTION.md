# OAuth Multi-Domain Solution

## The Problem

**Supabase only allows ONE Site URL**, but GoDaisy and FishFindr are on different domains (godaisy.io and fishfindr.eu). When the Site URL is set to one domain, OAuth from the other domain gets redirected incorrectly.

Current issue:
- Site URL is set to `https://fishfindr.eu`
- GoDaisy users try to sign in → Get redirected to FishFindr
- See "Findr" branding instead of "GoDaisy"
- PKCE verifier is lost in cross-domain redirect

## The Solution

**Use GoDaisy as the primary OAuth domain** and handle FishFindr specially:

### Step 1: Update Supabase Site URL

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to: `https://www.godaisy.io`
3. This makes GoDaisy the "primary" domain for OAuth

### Step 2: Keep All Redirect URLs

Make sure these are ALL in the Redirect URLs list:
```
https://www.godaisy.io/auth/callback
https://godaisy.io/auth/callback
https://www.fishfindr.eu/auth/callback
https://fishfindr.eu/auth/callback
https://www.godaisy.io/**
https://godaisy.io/**
https://www.fishfindr.eu/**
https://fishfindr.eu/**
http://localhost:3000/auth/callback
```

### Step 3: How It Works

#### For GoDaisy (Primary Domain):
1. User clicks OAuth on `www.godaisy.io/login`
2. OAuth flows through Supabase
3. Redirects to `www.godaisy.io/auth/callback`
4. PKCE verifier found → Session created ✅
5. User redirected to GoDaisy homepage

#### For FishFindr (Secondary Domain):
1. User clicks OAuth on `www.fishfindr.eu/findr/auth`
2. OAuth flows through Supabase
3. **Supabase redirects to Site URL: `www.godaisy.io/auth/callback?app=findr`**
4. GoDaisy callback detects `app=findr` parameter
5. Callback exchanges code for session (creates session on GoDaisy domain)
6. **Callback redirects to `www.fishfindr.eu/findr` with session token in URL**
7. FishFindr receives session token → Sets session on fishfindr.eu domain ✅

The key is that the callback handler on GoDaisy will:
- Exchange the OAuth code for a session
- Detect it's for FishFindr (via `app=findr` parameter)
- Redirect to FishFindr with the session token in the URL
- FishFindr will set the session locally

### Step 4: Update Callback Handler

The callback needs to pass the session to FishFindr when redirecting cross-domain.

## Why This Works

1. **GoDaisy OAuth**: Direct flow, no cross-domain issues
2. **FishFindr OAuth**: Uses GoDaisy as OAuth "broker", then passes session to FishFindr
3. **PKCE verifier**: Always preserved because OAuth completes on Site URL domain
4. **Session sharing**: Not needed - each domain gets its own session via Supabase

## Alternative: Use Subdomain

Instead of separate domains, you could:
- Use `fishfindr.godaisy.io` instead of `fishfindr.eu`
- This would share cookies/localStorage across subdomains
- But requires changing your domain strategy

## Next Steps

1. ✅ Update Supabase Site URL to `https://www.godaisy.io`
2. ✅ Verify all redirect URLs are configured
3. ✅ Update callback handler to pass session cross-domain
4. Test GoDaisy OAuth (should work immediately)
5. Test FishFindr OAuth (will need cross-domain session passing)
