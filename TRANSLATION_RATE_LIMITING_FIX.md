# Translation Rate Limiting Fix

## Problem Identified

**Error:** `Too many requests, DeepL servers are currently experiencing high load`

### Root Cause
When loading Findr pages with 150+ TranslatedText components (after wrapping all footer pages), all translations fired simultaneously, overwhelming DeepL's rate limits:

- **DeepL Free API Limits:**
  - 500,000 characters/month
  - Rate limiting on requests per second (not publicly documented but enforced)
  - HTTP 429 errors when limits exceeded

- **Our Issue:**
  - 20-30+ TranslatedText components per page
  - All firing translation requests at once on page load
  - No delay between requests
  - No retry logic for rate limit errors

## Solutions Implemented

### 1. Client-Side Request Queue ✅

**File:** `lib/translation/clientTranslate.ts`

**Features Added:**
- **Request Queue:** Translations queued instead of fired immediately
- **Concurrency Limit:** Max 2 concurrent requests (configurable)
- **Request Throttling:** 500ms delay between requests
- **Exponential Backoff:** Automatic retry with increasing delays (2s, 4s, 8s)
- **Smart Caching:** Duplicate requests deduplicated before queuing

**Configuration:**
```typescript
const MAX_CONCURRENT_REQUESTS = 2;     // Only 2 translations at once
const DELAY_BETWEEN_REQUESTS = 500;    // 500ms between each request
```

**How It Works:**
1. User loads page with 30 TranslatedText components
2. All 30 requests added to queue
3. Queue processes 2 at a time with 500ms delays
4. If rate limited (429), retry after 2s, then 4s, then 8s
5. Cached translations skip queue entirely (instant)

### 2. Server-Side Rate Limiting ✅

**File:** `pages/api/translate.ts`

**Features Added:**
- **IP-based Rate Limiting:** 20 requests per minute per IP
- **429 Response Handling:** Proper HTTP status codes
- **Retry-After Headers:** Tell clients when to retry
- **DeepL Error Detection:** Specific handling for DeepL rate limits

**Configuration:**
```typescript
const RATE_LIMIT_WINDOW = 60000;        // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;     // 20 requests per IP per minute
```

**Benefits:**
- Prevents single client from overwhelming API
- Protects against accidental DOS from bugs
- Provides clear error messages with retry timing

### 3. Enhanced Error Handling ✅

**Both Client & Server:**
- Fallback to original English text on failure
- Detailed error logging for debugging
- User-friendly error messages
- Automatic retry with exponential backoff

## Expected Behavior Now

### First Load (No Cache)
```
User loads /findr/support page with 25 translations
├─ Request 1 & 2: Start immediately
├─ Wait 500ms
├─ Request 3 & 4: Start
├─ Wait 500ms
├─ Request 5 & 6: Start
└─ ... continues until all 25 complete (~7 seconds total)
```

### Subsequent Loads (Cached)
```
User loads /findr/support page
└─ All 25 translations: Instant (from localStorage cache)
```

### If Rate Limited
```
Request fails with 429
├─ Wait 2 seconds
├─ Retry 1: Fails with 429
├─ Wait 4 seconds
├─ Retry 2: Fails with 429
├─ Wait 8 seconds
├─ Retry 3: Success or fallback to English
```

## Testing Instructions

### 1. Clear Translation Cache
```javascript
// In browser console:
localStorage.clear(); // Clear all cached translations
location.reload();    // Reload page
```

### 2. Monitor Translation Progress
```javascript
// Watch the network tab for:
// - POST /api/translate requests
// - Should see them spaced out (500ms apart)
// - Max 2 concurrent requests at a time
```

### 3. Check for Rate Limiting
```bash
# In terminal watching dev server:
# Should see translations succeeding with delays
# No more "Too many requests" errors (or very few)
```

## Configuration Tuning

If you still see rate limit errors, adjust these values:

### Make It Slower (More Conservative)
```typescript
// lib/translation/clientTranslate.ts
const MAX_CONCURRENT_REQUESTS = 1;     // Only 1 at a time
const DELAY_BETWEEN_REQUESTS = 1000;   // 1 second between requests
```

### Make It Faster (If You Have DeepL Pro)
```typescript
// lib/translation/clientTranslate.ts
const MAX_CONCURRENT_REQUESTS = 5;     // 5 at a time
const DELAY_BETWEEN_REQUESTS = 200;    // 200ms between requests
```

## DeepL Usage Estimates

### Current Setup (150 wrapped texts across 6 pages)

**Average text length:** ~50 characters per TranslatedText

**Per page load (no cache):**
- Support: 25 texts × 50 chars = 1,250 chars
- How It Works: 30 texts × 50 chars = 1,500 chars
- About: 25 texts × 50 chars = 1,250 chars
- Terms: 35 texts × 60 chars = 2,100 chars (longer legal text)
- Privacy: 30 texts × 60 chars = 1,800 chars
- Cookies: 25 texts × 50 chars = 1,250 chars

**Total per language:** ~9,150 characters

**All 6 supported languages:** ~55,000 characters

**Monthly limit:** 500,000 characters

**You can afford:** ~9 full page loads per language before hitting monthly limit (after that, cache kicks in)

## Monitoring & Alerts

### Check Usage
```bash
# Log in to DeepL console
https://www.deepl.com/pro-account/usage

# Watch for:
# - Character usage approaching 500k
# - API errors increasing
```

### Set Up Alerts
Consider adding monitoring for:
- Translation failure rate
- Average translation time
- Cache hit ratio
- DeepL quota remaining

## Alternative Solutions

If rate limiting persists:

### 1. Upgrade to DeepL Pro API
- Higher rate limits
- No character limit
- Cost: ~$5-25/month depending on usage

### 2. Pre-translate Static Content
```typescript
// Generate translations at build time for static pages
// Store in JSON files instead of hitting API at runtime
```

### 3. Server-Side Rendering with Translation
```typescript
// Use Next.js SSR to translate server-side
// Send fully translated HTML to client
// No client-side API calls needed
```

### 4. Reduce Wrapped Text
- Only wrap user-visible headings and key text
- Leave body paragraphs in English
- Provide "Translate Page" button instead of automatic

## Files Modified

```
✅ lib/translation/clientTranslate.ts    - Added queue + retry logic
✅ pages/api/translate.ts                - Added rate limiting
```

## Testing Checklist

- [ ] Load `/findr/support` in Spanish - check for rate limit errors
- [ ] Load `/findr/how-it-works` in French - verify staggered requests
- [ ] Load `/findr/about` in German - confirm exponential backoff works
- [ ] Switch languages rapidly - ensure queue handles it
- [ ] Clear cache and reload - verify all text translates eventually
- [ ] Check browser console for errors
- [ ] Monitor DeepL usage in dashboard

## Success Criteria

✅ No "Too many requests" errors under normal use  
✅ Translations complete within 10 seconds on first load  
✅ Subsequent loads instant (cached)  
✅ Graceful degradation (English fallback) on failure  
✅ User experience smooth (no frozen UI)  

---

**Status:** ✅ Implemented - Ready for Testing

**Next Steps:**
1. Test on a fresh browser session (no cache)
2. Monitor DeepL quota usage over next few days
3. Consider upgrading to DeepL Pro if heavy usage expected
4. Optionally reduce number of wrapped texts if issues persist
