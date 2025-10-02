# ⏰ SUPABASE CONFIGURATION REMINDER

## Do this in 1 hour (after DNS propagates for fishfindr.eu):

### 1. Configure Supabase Redirect URLs

**Go to:** [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Authentication → URL Configuration

**Add these to "Redirect URLs":**
```
https://fishfindr.eu/**
https://www.fishfindr.eu/**
http://localhost:3000/findr/**
```

**Optionally update "Site URL":**
```
https://fishfindr.eu
```

**Click:** Save

---

### 2. Test Authentication Flow

Once DNS propagates and you've configured Supabase:

**Test 1: Local Development**
```bash
npm run dev
# Visit http://localhost:3000/findr/auth
# Try email/password signup
# Try Google OAuth
# Try Apple OAuth
```

**Test 2: Production Domain**
```bash
# Visit https://fishfindr.eu
# Should redirect to /findr
# Try signing up/logging in
# Check if OAuth avatars work
```

---

### 3. Verify Everything Works

✅ fishfindr.eu loads /findr page
✅ Email signup sends confirmation email
✅ Google OAuth login works
✅ Apple OAuth login works
✅ Profile photos show for OAuth users
✅ Password reset flow works
✅ Sign out redirects properly

---

## Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Google Cloud Console:** https://console.cloud.google.com/
- **Apple Developer:** https://developer.apple.com/account/

---

## If Something Doesn't Work

**Check:**
1. DNS propagated? Run: `nslookup fishfindr.eu`
2. Supabase redirect URLs saved?
3. Google authorized domains include fishfindr.eu?
4. Apple Services ID has fishfindr.eu domain?

**Need help?** Check: `/docs/FINDR_AUTH_SETUP.md`

---

## This File

You can delete this reminder file once you've completed the Supabase configuration! 🎣
