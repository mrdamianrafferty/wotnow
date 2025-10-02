# findr Authentication Setup Guide

## Overview
This guide will help you configure authentication for findr with:
- ✅ Email/password authentication
- ✅ Google OAuth
- ✅ Apple OAuth
- ✅ Password reset flow
- ✅ Custom domain (fishfindr.eu)

**Important:** findr uses the **same Supabase project** as GoDaisy, but maintains **separate user accounts**. Users can have different emails/passwords for each app. The authentication is isolated by:
- Different redirect URLs (`/findr` vs root)
- Different email branding (findr 🎣 vs GoDaisy)
- App metadata tags (`app: 'findr'` vs `app: 'godaisy'`)
- Separate user experiences (no cross-app session sharing)

## Files Created

### Auth Pages
- `pages/findr/auth.tsx` - Main login/signup page
- `pages/findr/reset-password.tsx` - Request password reset
- `pages/findr/update-password.tsx` - Set new password (from email link)

### Components & Hooks
- `components/findr/FindrUserMenu.tsx` - User avatar/sign-in button (added to navigation)
- `hooks/useRequireAuth.ts` - Protect routes requiring authentication

## Configuration Steps

### 1. Supabase Email Templates

Go to: **Supabase Dashboard → Authentication → Email Templates**

**⚠️ Critical Note:** Since findr and GoDaisy share the same Supabase project, you **cannot** have separate email templates for each app. The templates will be used for **both** applications.

**Two Options:**

#### Option A: Generic Branding (Recommended)
Use neutral branding that works for both apps:
- From Name: "WotNow"
- Subject: Mention neither app specifically
- Body: Generic "your account" language

#### Option B: Conditional Email Server
Set up a custom email service (like SendGrid/Postmark) that reads the user's `app_metadata` and sends different templates. This requires custom edge functions.

#### Option C: Separate Supabase Projects (Most Isolated)
Create a completely separate Supabase project for findr. This gives you:
- ✅ Separate email templates
- ✅ Separate user databases  
- ✅ Complete isolation
- ❌ Requires new environment variables
- ❌ Additional Supabase project costs

For now, I recommend **Option A** with these generic templates:

#### A) Confirm Signup
```
From Name: WotNow
Subject: Confirm your email address
```

```html
<h2>Welcome to WotNow!</h2>
<p>You're signing up for access to <strong>GoDaisy</strong> and <strong>findr</strong> 🎣 - your account works for both apps.</p>
<p>Click the link below to confirm your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
<p>If you didn't create an account, you can ignore this email.</p>
<p>Thanks,<br>The WotNow Team</p>
```

#### B) Magic Link
```
From Name: WotNow
Subject: Your sign-in link
```

```html
<h2>Sign In to WotNow</h2>
<p>Click the link below to sign in to your account (works for GoDaisy and findr 🎣):</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>If you didn't request this, you can ignore this email.</p>
<p>Thanks,<br>The WotNow Team</p>
```

#### C) Reset Password
```
From Name: WotNow
Subject: Reset your password
```

```html
<h2>Reset your WotNow password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link expires in 24 hours.</p>
<p>Your account works for both <strong>GoDaisy</strong> and <strong>findr</strong> 🎣.</p>
<p>If you didn't request this, you can ignore this email.</p>
<p>Thanks,<br>The WotNow Team</p>
```

#### D) Change Email
```
From Name: WotNow
Subject: Confirm your new email
```

```html
<h2>Confirm your new email</h2>
<p>Click the link below to confirm your new email address for your WotNow account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm New Email</a></p>
<p>This account works for both <strong>GoDaisy</strong> and <strong>findr</strong> 🎣.</p>
<p>If you didn't request this change, please contact support immediately.</p>
<p>Thanks,<br>The WotNow Team</p>
```

**✅ Decision: Using Option 1 (Shared Accounts)** - One WotNow account works for both GoDaisy and findr. Email templates mention both apps so users understand their account gives access to both services.

---

## User Account Model: findr vs GoDaisy

### Current Setup (Shared Accounts)

**Important:** With the current implementation, findr and GoDaisy **share the same Supabase authentication system**. This means:

✅ **What Works:**
- User signs up for findr → creates a Supabase account
- That same user can access GoDaisy without signing up again
- One account for both apps (like Google account for Gmail, YouTube, Drive)
- Sessions redirect appropriately (`/findr` for findr, root for GoDaisy)

❌ **What Doesn't Work:**
- User cannot have different emails for findr vs GoDaisy
- If `fisher@email.com` signs up for findr, that email is taken for GoDaisy too
- Sessions aren't truly isolated (logging into one app could theoretically access the other)

### Three Options for Account Separation

#### Option 1: Keep Shared Accounts (Current - Simplest)
**Best for:** Fast launch, simpler UX

- ✅ Already implemented
- ✅ No additional costs
- ✅ Industry standard (one account, many services)
- ✅ Users can switch between apps easily
- ⚠️ Users need to understand one account works for both
- ⚠️ Email branding must be generic ("WotNow" not "findr 🎣")

**No changes needed!** Just update branding to reflect "WotNow account" that works for multiple apps.

#### Option 2: Add App-Scoped Profiles (Medium Complexity)
**Best for:** Shared auth, separate app data

Keep same Supabase auth but add app metadata:
- User can sign up for findr and GoDaisy with same email
- Add `app` field to user profile tables
- Use Row Level Security (RLS) to filter data by app
- Requires schema changes and RLS policies

**Requires:**
```sql
-- Add app column to profiles
ALTER TABLE profiles ADD COLUMN app TEXT;

-- RLS policy example
CREATE POLICY "Users can only see their app data"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id AND app = current_setting('app.name'));
```

#### Option 3: Separate Supabase Projects (Complete Isolation)
**Best for:** Totally independent apps, different teams

Create a new Supabase project for findr:
- ✅ Complete separation (different databases)
- ✅ Different email templates (findr 🎣 branding)
- ✅ Independent scaling and billing
- ✅ No shared user data
- ❌ Additional Supabase costs (~$25/month)
- ❌ More environment variables to manage
- ❌ Duplicate configuration work

**Requires:**
1. Create new Supabase project at supabase.com
2. Add environment variables:
   ```bash
   # .env.local
   NEXT_PUBLIC_FINDR_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_FINDR_SUPABASE_ANON_KEY=eyJ...
   ```
3. Create `lib/supabase/findrClient.ts`:
   ```typescript
   import { createBrowserClient } from '@supabase/ssr';

   export const findrSupabase = createBrowserClient(
     process.env.NEXT_PUBLIC_FINDR_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_FINDR_SUPABASE_ANON_KEY!,
     {
       auth: {
         flowType: 'implicit',
         persistSession: true,
         autoRefreshToken: true,
         detectSessionInUrl: true,
       },
     }
   );
   ```
4. Update all findr pages to use `findrSupabase` instead of `supabase`
5. Configure OAuth providers separately
6. Set up findr-branded email templates

### Recommendation

**✅ DECISION MADE: Using Option 1** (shared accounts)
- One WotNow account works for both GoDaisy and findr
- Email templates mention both apps clearly
- Fast, simple, already working
- Industry standard approach (like Google account for multiple services)

**Implementation:**
- Update email templates to mention "GoDaisy and findr 🎣"
- Users understand one account gives access to both apps
- No code changes needed - already implemented!

---

### 2. Configure fishfindr.eu Domain in Vercel

#### A) Add Domain in Vercel
1. Go to your Vercel project dashboard
2. Navigate to **Settings → Domains**
3. Click **Add Domain**
4. Enter: `fishfindr.eu`
5. Click **Add**

#### B) Configure DNS
Vercel will show you nameserver or CNAME records. In your domain registrar (GoDaddy/Namecheap/etc):

**Option 1: Nameservers (Recommended)**
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Option 2: CNAME Records**
```
CNAME  @  cname.vercel-dns.com
CNAME  www  cname.vercel-dns.com
```

#### C) Configure Routing
By default, fishfindr.eu will go to the root (`/`). To make it load `/findr`:

**Option 1: Vercel Rewrites (in `vercel.json`)**
```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/findr/:path*",
      "has": [
        {
          "type": "host",
          "value": "fishfindr.eu"
        }
      ]
    }
  ]
}
```

**Option 2: Next.js Middleware (in `middleware.ts`)**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  if (hostname === 'fishfindr.eu' && !request.nextUrl.pathname.startsWith('/findr')) {
    return NextResponse.redirect(new URL('/findr', request.url));
  }
  
  return NextResponse.next();
}
```

#### D) SSL Certificate
Vercel automatically provisions SSL certificates. Wait 24-48 hours for DNS propagation, then verify HTTPS works.

---

### 3. Supabase Redirect URLs

Go to: **Supabase Dashboard → Authentication → URL Configuration**

#### Site URL
Add your primary domain:
```
https://fishfindr.eu
```

#### Redirect URLs
Add all valid callback URLs (one per line):
```
http://localhost:3000/findr/**
https://fishfindr.eu/**
https://yourdomain.vercel.app/findr/**
```

**Important:** The `**` wildcard allows all sub-paths. This is needed for:
- `/findr/update-password` (password reset callback)
- `/findr/auth` (OAuth callbacks)
- Any other findr pages

#### Additional Redirect URLs
If you have multiple domains:
```
https://fishfindr.eu/**
https://www.fishfindr.eu/**
https://wotnow-production.vercel.app/findr/**
```

---

### 4. OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select existing
3. Enable **Google+ API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs:
   ```
   https://[YOUR-PROJECT].supabase.co/auth/v1/callback
   ```
7. Copy **Client ID** and **Client Secret**
8. In Supabase → Authentication → Providers → Google:
   - Enable Google
   - Paste Client ID and Secret
   - Save

#### Apple OAuth
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Certificates, Identifiers & Profiles → Identifiers
3. Register a new **Services ID**
4. Enable **Sign In with Apple**
5. Configure domains and redirect URLs:
   ```
   Domain: fishfindr.eu
   Redirect URL: https://[YOUR-PROJECT].supabase.co/auth/v1/callback
   ```
6. Get your **Services ID** and **Key ID**
7. In Supabase → Authentication → Providers → Apple:
   - Enable Apple
   - Paste Services ID and Key
   - Save

---

## Testing Authentication

### 1. Email/Password Signup
1. Go to `http://localhost:3000/findr/auth`
2. Toggle to "Sign Up"
3. Enter email and password (min 6 characters)
4. Check email for confirmation link (mentions "GoDaisy and findr 🎣")
5. Click link → redirected to `/findr`
6. User menu shows avatar in top navigation
7. **Note:** This account also works for GoDaisy!

### 2. Email/Password Sign In
1. Go to `/findr/auth`
2. Enter credentials
3. Should redirect to `/findr`
4. **Note:** If you have a GoDaisy account, same credentials work here!

### 3. Password Reset
1. Go to `/findr/auth`
2. Click "Forgot password?"
3. Enter email
4. Check email for reset link (mentions both apps)
5. Click link → redirected to `/findr/update-password`
6. Enter new password
7. Submit → redirected to `/findr?password_updated=true`
8. **Note:** Password is updated for both GoDaisy and findr

### 4. Social Login
1. Go to `/findr/auth`
2. Click "Continue with Google" or "Continue with Apple"
3. Authorize in OAuth popup
4. Should redirect back to `/findr`
5. **Note:** OAuth account works for both apps

### 5. Cross-App Account Testing
1. Sign up for findr with `test@example.com`
2. Open GoDaisy in a new tab
3. Try to sign up with same email → should say "Email already registered"
4. Sign in with same credentials → works! ✅
5. Your WotNow account gives access to both apps
When you want to require login for a page:
```tsx
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function ProtectedPage() {
  useRequireAuth(); // Redirects to /findr/auth if not logged in
  
  return <div>Protected content</div>;
}
```

---

## User Experience Flow

### New User
1. Lands on `/findr` (no login required)
2. Clicks "🎣 Sign In" in navigation
3. Chooses signup method:
   - Email/password + email confirmation → IdCard icon (🪪)
   - Google (instant) → **Google profile photo displayed!**
   - Apple (instant) → **Apple profile photo displayed!**
4. Redirected to `/findr`
5. Avatar/icon shows in navigation (mobile & desktop)

### Returning User
1. Session persists (auto-login)
2. Avatar/icon shows immediately
   - OAuth users: See their Google/Apple profile photo
   - Email users: See IdCard icon
3. Can sign out → redirects to `/findr`

### Forgot Password
1. Click "Forgot password?" on auth page
2. Enter email
3. Check email → click reset link
4. Enter new password
5. Redirected to `/findr`

---

## Profile Photos (OAuth)

**Google & Apple OAuth users automatically get their profile photos displayed!**

- ✅ Google avatar: From `user.user_metadata.avatar_url`
- ✅ Apple avatar: From `user.user_metadata.avatar_url`
- ✅ Email/password: Shows IdCard icon (no photo)
- ✅ Rounded 40x40px circle in navigation
- ✅ Graceful fallback to icon if photo unavailable

This gives OAuth users a personalized experience while maintaining clean design for email/password users.

---

## Environment Variables

Make sure these are set (already configured):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

No additional environment variables needed!

---

## Troubleshooting

### OAuth Redirect Errors
**Problem:** "URL not allowed" error after OAuth login

**Solution:** Check Supabase → Authentication → URL Configuration
- Make sure `https://fishfindr.eu/**` is in Redirect URLs
- Verify OAuth provider callback URL matches Supabase

### Email Not Sending
**Problem:** Confirmation emails not arriving

**Solution:**
1. Check spam folder
2. Verify email templates saved correctly
3. Check Supabase logs: Dashboard → Logs → Auth Logs
4. For development, use mailtrap.io

### Password Reset Link Expired
**Problem:** "Invalid or expired reset link"

**Solution:** Links expire in 24 hours. Request a new one.

### Domain Not Loading /findr
**Problem:** fishfindr.eu loads root instead of `/findr`

**Solution:**
1. Implement rewrite rule (see Section 2C)
2. Or add client-side redirect in `pages/index.tsx`

---

## Next Steps

✅ **All code files created**
⏳ **Pending configuration:**
1. Update Supabase email templates (Section 1)
2. Add fishfindr.eu in Vercel (Section 2)
3. Configure Supabase redirect URLs (Section 3)
4. (Optional) Set up Google/Apple OAuth (Section 4)

**Start with Steps 1-3** to get email/password auth working. Google/Apple can be added later.

---

## Files Modified

- ✅ Created `pages/findr/auth.tsx`
- ✅ Created `pages/findr/reset-password.tsx`
- ✅ Created `pages/findr/update-password.tsx`
- ✅ Created `hooks/useRequireAuth.ts`
- ✅ Created `components/findr/FindrUserMenu.tsx`
- ✅ Updated `components/findr/FindrNavigationMobile.tsx` (added user menu)

All files use findr branding (🎣 emoji, cyan colors, gradient backgrounds).
