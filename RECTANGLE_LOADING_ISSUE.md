# Rectangle Loading Issue - Production

## 🔴 Problem
Location selector is stuck on one rectangle when changing location in header.

## 📊 Symptoms
```
[Findr Conditions] Using fallback ICES rectangle options. Swap in Supabase catalogue.
  fallbackCount: 100
  sampleCodes: Array(3)
```

- Frontend falls back to hardcoded 100 rectangles
- `/api/findr/rectangles` works locally but times out on production
- Users can't select from full 99-rectangle catalogue

## 🔍 Root Cause
**Production `/api/findr/rectangles` API is hanging/timing out**

### Local (Working ✅)
```bash
curl http://localhost:3000/api/findr/rectangles
# Returns: 99 rectangles from findr_rectangles table
```

### Production (Broken ❌)
```bash
curl https://wotnow.fish/api/findr/rectangles
# Hangs indefinitely (no response)
```

## 🎯 Investigation Steps

### 1. Check Vercel Logs
```bash
npx vercel logs --production
```
Look for:
- `/api/findr/rectangles` requests
- Timeout errors
- Supabase connection errors

### 2. Check Environment Variables
Verify these are set in Vercel production environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side queries)

```bash
# Check via Vercel dashboard or CLI
npx vercel env pull .env.production.local
grep SUPABASE .env.production.local
```

### 3. Test Supabase Connection
Try accessing Supabase directly from production:

```bash
# Test a simpler query first
curl 'https://wotnow.fish/api/debug/rectangles'
```

### 4. Check Database Table
Verify `findr_rectangles` table exists and has data:

```sql
SELECT COUNT(*) FROM findr_rectangles;
SELECT * FROM findr_rectangles LIMIT 3;
```

## 💡 Quick Fixes

### Option A: Increase API Timeout (Client-Side)
Add timeout to the fetch in `hooks/useFindrRectangleOptions.ts`:

```typescript
const response = await fetch('/api/findr/rectangles', {
  method: 'GET',
  headers: {
    Accept: 'application/json',
  },
  signal: controller.signal,
  // Add this:
  next: { revalidate: 3600 }, // Cache for 1 hour
});

// Or add a manual timeout
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
```

### Option B: Increase Supabase Connection Timeout (Server-Side)
In `lib/supabase/serverClient.ts`, add connection timeout:

```typescript
export function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      db: {
        // Add this:
        connectionTimeout: 10000, // 10 seconds
      }
    }
  );
}
```

### Option C: Use Fallback Permanently
If production Supabase is consistently slow, we can improve the fallback:

1. Expand `FALLBACK_RECTANGLE_OPTIONS` from 100 to all 99 production rectangles
2. Add retry logic with exponential backoff
3. Cache successful API responses in localStorage

### Option D: Deploy Rectangle Data as Static JSON
Export rectangles to static JSON file during build:

```bash
# Create script to fetch and save rectangles
node scripts/export-rectangles.js > public/rectangles.json

# Update hook to fetch from static JSON first
fetch('/rectangles.json')
```

## 🚀 Recommended Action

**Immediate (5 minutes):**
1. Check Vercel logs to see the actual error
2. Verify Supabase env vars in production
3. Check if `findr_rectangles` table is accessible

**Short-term (30 minutes):**
1. Add connection timeout to Supabase client
2. Add fetch timeout to rectangle loading hook
3. Improve error logging to identify bottleneck

**Long-term (2 hours):**
1. Implement static JSON fallback
2. Add caching layer (Redis/Vercel KV)
3. Pre-render rectangle options at build time

## 📝 Files Involved
- `hooks/useFindrRectangleOptions.ts` - Client-side loading
- `pages/api/findr/rectangles.ts` - Server-side API
- `lib/supabase/serverClient.ts` - Database connection
- `lib/findr/fallbackRectangles.ts` - Fallback data

## ✅ Success Criteria
- `/api/findr/rectangles` responds in < 2 seconds on production
- Location selector shows full 99-rectangle catalogue
- Users can switch between rectangles smoothly
- No "Using fallback" console warnings
