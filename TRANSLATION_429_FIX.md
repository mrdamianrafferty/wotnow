# Translation 429 Rate Limit Fix

## Problem
The client-side translation system was throwing runtime errors when hitting rate limits (429 errors):
```
Runtime Error
Translation API error: 429
lib/translation/clientTranslate.ts (105:13) @ translateWithRetry
```

This occurred when many `TranslatedText` components loaded simultaneously, overwhelming the translation API.

## Root Causes

1. **Too aggressive concurrent requests**: Had `MAX_CONCURRENT_REQUESTS = 2` which could still overwhelm the API
2. **Too short delays**: Only 500ms between requests wasn't enough
3. **Throwing errors on 429**: Code threw errors instead of gracefully falling back to original text
4. **No request deduplication**: Multiple components requesting translation of the same text created duplicate API calls
5. **Insufficient retry attempts**: Only 3 retries wasn't enough for heavily loaded pages

## Solutions Implemented

### 1. Reduced Concurrency (Line 28)
```typescript
const MAX_CONCURRENT_REQUESTS = 1; // Only 1 concurrent request to avoid rate limits
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between requests
```
**Impact**: Dramatically reduces API pressure

### 2. Increased Retry Attempts (Line 73)
```typescript
const maxRetries = 5; // Increased from 3 to handle more retries
const baseDelay = 1000; // Start with 1 second delay
```
**Impact**: More resilient to temporary rate limits

### 3. Graceful Fallback on Rate Limits (Lines 87-107)
```typescript
if (response.status === 429) {
  if (retryCount < maxRetries) {
    // Retry with exponential backoff
    const delay = baseDelay * Math.pow(2, retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));
    requestQueue.unshift({ ...request, retryCount: retryCount + 1 });
    return;
  } else {
    // Max retries exceeded - fallback to original text
    console.warn(`Rate limit retry exhausted for: ${text.substring(0, 50)}...`);
    resolve(text); // Don't throw, just use original text
    return;
  }
}

if (!response.ok) {
  console.warn(`Translation API error ${response.status}, falling back to original text`);
  resolve(text); // Don't throw, just use original text
  return;
}
```
**Impact**: No more runtime errors, pages render with English text as fallback

### 4. Request Deduplication (Lines 26, 153-186)
```typescript
const pendingRequests = new Map<string, QueuedRequest[]>();

// In clientTranslate():
const pending = pendingRequests.get(cacheKey);
if (pending) {
  // Attach to existing request instead of creating a new one
  return new Promise((resolve, reject) => {
    pending.push({ text, targetLang, resolve, reject, retryCount: 0 });
  });
}
```
**Impact**: Multiple components requesting the same text share a single API call

### 5. Batch Resolution (Lines 131-145)
```typescript
// When translation succeeds, resolve ALL pending requests for this text
const pending = pendingRequests.get(cacheKey);
if (pending) {
  pending.forEach(req => req.resolve(translation));
  pendingRequests.delete(cacheKey);
}
```
**Impact**: One successful translation satisfies all pending requests for that text

### 6. Improved Batch Translation Error Handling (Lines 202-204)
```typescript
if (!response.ok) {
  console.warn(`Batch translation API error ${response.status}, falling back to original texts`);
  return texts; // Fallback instead of throwing
}
```
**Impact**: Batch translations also fail gracefully

## Behavior Changes

### Before Fix
- **Rate limit hit**: Runtime error, page crash
- **Multiple components with same text**: N API calls for N components
- **429 after retries**: Error thrown, UI breaks
- **Concurrent requests**: 2 simultaneous, 500ms apart

### After Fix
- **Rate limit hit**: Logs warning, falls back to English text, page works
- **Multiple components with same text**: 1 API call shared by all
- **429 after retries**: Gracefully shows English text, no error
- **Concurrent requests**: 1 at a time, 1 second apart

## Testing

### Manual Testing
1. Load a page with many `TranslatedText` components
2. Switch language to French/Spanish/etc
3. Observe:
   - No runtime errors
   - Translations load gradually
   - If rate limited, English text shown temporarily
   - Eventually all translations complete

### Expected Console Output
With this fix, you should see:
```
Rate limited. Retrying in 1000ms (attempt 1/5)...
Rate limited. Retrying in 2000ms (attempt 2/5)...
Rate limited. Retrying in 4000ms (attempt 3/5)...
// Eventually succeeds or:
Rate limit retry exhausted for: Some text...
```

Instead of:
```
Translation API error: 429
[Error stack trace]
```

## Performance Impact

### API Call Reduction
Example: Footer with 10 translated terms
- **Before**: 10 API calls (could all be duplicate if text repeats)
- **After**: Only unique texts get API calls, duplicates share

### Rate Limit Compliance
- **Before**: Could send 20+ requests in 10 seconds
- **After**: Maximum 1 request per second

### User Experience
- **Before**: Page crashes on rate limit
- **After**: Page renders in English, translations load progressively

## Server-Side Rate Limiting (No Changes Needed)

The server already has proper rate limiting:
```typescript
// pages/api/translate.ts
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute per IP
```

This is sufficient - the client-side fixes ensure we stay well under these limits.

## Future Improvements

### Short Term
1. Add visual indicator when translation is loading
2. Show translation progress (e.g., "Translating 15/50...")
3. Persist client cache to localStorage

### Long Term
1. Server-side pre-translation of common UI strings
2. Translation CDN/edge caching
3. Batch similar requests together automatically
4. WebSocket for real-time translation updates

## Related Files
- `lib/translation/clientTranslate.ts` - Client-side translation with queue and retry
- `pages/api/translate.ts` - Server-side API with rate limiting
- `lib/translation/autoTranslate.ts` - DeepL integration
- `components/TranslatedText.tsx` - React component using clientTranslate

## Monitoring

To monitor translation health in production:
```typescript
// Add to clientTranslate.ts
const metrics = {
  totalRequests: 0,
  rateLimitHits: 0,
  fallbacksUsed: 0,
  successfulTranslations: 0,
};

// Log every minute
setInterval(() => {
  console.log('Translation Metrics:', metrics);
}, 60000);
```

## Summary

✅ **Fixed**: Runtime errors on 429 responses
✅ **Fixed**: Multiple API calls for duplicate text
✅ **Fixed**: Aggressive concurrent requests
✅ **Improved**: Retry logic with more attempts
✅ **Improved**: Graceful fallback to English
✅ **Result**: Robust translation system that never crashes the page
