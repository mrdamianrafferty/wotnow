# AI Fish Identification System

**Status**: ✅ **DEPLOYED** (October 30, 2025)
**Version**: 1.0
**Cost**: €0.01 per identification (GPT-4 Vision API, "low" detail)
**Monthly Budget**: €10 (1000 identifications max)

## Overview

The AI Fish Identification system provides automatic species identification from catch photos using OpenAI's GPT-4 Vision API. The system is designed for cost efficiency through smart routing, regional candidate narrowing, and multiple fallback layers.

### Key Features

- **Smart Routing**: Cache → EXIF → Database → AI → Manual Selection
- **Cost Optimization**: Regional candidate narrowing (8-12 species max sent to AI)
- **EXIF Extraction**: GPS coordinates and timestamps from camera photos
- **Progressive Disclosure**: Auto-trigger AI with inline results
- **Budget Management**: €10/month limit with localStorage tracking
- **High Confidence Auto-Selection**: ≥70% confidence auto-selects species
- **Manual Fallback**: Always available if AI uncertain or budget exceeded

## Architecture

### Smart Routing Flow

```
Photo Captured/Uploaded
        ↓
1. Check Image Cache (perceptual hash)
   └─ HIT → Return cached result (€0.00)
        ↓
2. Extract EXIF Data (GPS, timestamp)
   └─ Found → Use for context enhancement
        ↓
3. Get Regional Candidates (useQuickLogSpecies)
   └─ Fetch top 12 species for location
        ↓
4. Database Match (high confidence filter)
   └─ Single match ≥75% confidence → Return (€0.00)
        ↓
5. AI Identification (OpenAI Vision API)
   ├─ Budget check (€10/month limit)
   ├─ Send photo + 8 regional candidates
   ├─ Parse JSON response
   ├─ Match to candidate species
   └─ Result: €0.01 cost
        ↓
6. Manual Selection Fallback
   └─ Show species grid (€0.00)
```

### Components

**Service Layer:**
- `lib/findr/fishIdentificationService.ts` - Core AI service (568 lines)
  - OpenAI client initialization
  - Smart routing logic
  - EXIF extraction
  - Cache management
  - Budget tracking

**Hook Layer:**
- `hooks/useFishIdentification.ts` - React state management (176 lines)
  - State: `isIdentifying`, `result`, `error`, `stats`
  - Actions: `identify()`, `reset()`
  - Health monitoring: `useFishIdServiceHealth()`

**UI Integration:**
- `pages/findr/log/take-photo.tsx` - Camera capture flow (490 lines)
- `pages/findr/log/with-photo.tsx` - Gallery upload flow (478 lines)

## Cost Management

### Budget Strategy

**Monthly Budget**: €10 (1000 AI calls max)

**Cost Reduction Techniques:**
1. **Low Detail Mode**: Use GPT-4 Vision "low" detail (€0.01 vs €0.03 per call)
2. **Regional Narrowing**: Send only 8 regional species to AI (reduces token count)
3. **Image Caching**: Perceptual hash caching for identical images
4. **Database Shortcuts**: Skip AI for high-confidence database matches
5. **Smart Routing**: Try cheaper methods first (cache, EXIF, database)

**Target**: <20% AI usage rate through smart filtering

### Budget Tracking

Budget tracked in browser localStorage:
```typescript
{
  amount: 2.45,  // €2.45 spent this month
  month: 9       // October (0-indexed)
}
```

**Reset Behavior**: Automatically resets on first day of new month

**Budget Warnings**:
- 80% usage: Console warning logged
- 100% usage: AI disabled until next month

### Cost Per Call

| Method | Cost | When Used |
|--------|------|-----------|
| Cache Hit | €0.00 | Identical image already identified |
| Database Match | €0.00 | Single high-confidence species match |
| EXIF Only | €0.00 | Location extracted, no AI needed |
| AI Identification | €0.01 | OpenAI Vision API call |
| Manual Selection | €0.00 | User selects from grid |

## Integration Points

### Take Photo Flow (`take-photo.tsx`)

**User Journey:**
1. User clicks "Open Camera" button
2. Device camera opens (PWA `capture="environment"`)
3. User captures photo
4. Photo displays with AI identifying animation
5. AI result appears inline:
   - High confidence (≥70%): Auto-select with "Correct!" button
   - Low confidence: Show manual species grid
6. User confirms or changes species
7. User sets quantity and submits catch

**AI Hook Integration:**
```typescript
const { identify, isIdentifying, result: aiResult, stats } = useFishIdentification({
  onSuccess: (result) => {
    // Auto-select if high confidence
    if (result.method === 'ai' && !Array.isArray(result.species) && result.confidence >= 0.7) {
      setSelectedSpeciesId(result.species.id);
    }
  }
});

// Auto-trigger AI when photo captured
useEffect(() => {
  if (photoFile && species.length > 0 && !aiResult && !isIdentifying) {
    identify(photoFile, species, {
      location: {
        coords: location?.lat && location?.lon ? [location.lat, location.lon] : undefined,
        rectangleCode: location?.rectangleCode || undefined,
        rectangleLabel: location?.rectangleLabel || undefined
      }
    });
  }
}, [photoFile, species, aiResult, isIdentifying]);
```

### With Photo Flow (`with-photo.tsx`)

**User Journey:**
1. User clicks "Choose Photo from Gallery"
2. File picker opens
3. User selects photo from device gallery
4. Photo displays with AI identifying animation
5. AI result appears inline (same as take-photo flow)
6. User confirms or changes species
7. User sets quantity and submits catch

**Implementation**: Identical AI integration as take-photo flow, only differs in photo source.

## EXIF Extraction

### Capabilities

The system extracts metadata from photos using the `exifr` package:

**Extracted Data:**
- GPS coordinates (latitude, longitude)
- Capture timestamp (DateTimeOriginal)

**Usage:**
```typescript
const exif = await exifr.parse(image, {
  gps: true,
  pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude']
});

if (exif?.latitude && exif?.longitude) {
  return {
    location: [exif.latitude, exif.longitude],
    timestamp: exif.DateTimeOriginal ? new Date(exif.DateTimeOriginal) : undefined
  };
}
```

**Expected Behavior:**
- **Camera photos**: Usually include GPS coordinates and timestamp
- **Gallery/uploaded photos**: May lack EXIF data (gracefully handled)
- **Edited photos**: Often strip EXIF data (not an error)

**Location Enhancement:**
If EXIF GPS differs from user's current location, the system could use photo location for more accurate species suggestions (not yet implemented).

## Configuration

### Environment Variables

**Required:**
```bash
OPENAI_API_KEY=sk-...  # OpenAI API key for GPT-4 Vision
```

**Location**: `.env.local` file (line 56)

### Package Dependencies

**Required packages** (already installed):
```json
{
  "openai": "^6.7.0",      // OpenAI SDK
  "exifr": "^7.1.3",       // EXIF extraction
  "sharp": "^0.34.4"       // Image processing (cache keys)
}
```

### Service Initialization

The service initializes automatically on first import:

```typescript
// Auto-initialization on import
import { fishIdService } from '@/lib/findr/fishIdentificationService';

// Service checks for OPENAI_API_KEY
// If missing: AI disabled, manual selection only
// If present: AI available with budget tracking
```

## User Experience

### UI States

**1. Photo Upload/Capture**
```
┌─────────────────────────────────┐
│  [Camera Icon] Open Camera      │
│                                 │
│  Takes a photo with your device │
│  AI will automatically identify │
└─────────────────────────────────┘
```

**2. AI Identifying Animation**
```
┌─────────────────────────────────┐
│      [Spinning Circle]          │
│                                 │
│  ✨ Identifying your catch...   │
│  Using AI and 12 regional species│
└─────────────────────────────────┘
```

**3. High Confidence Result (≥70%)**
```
┌─────────────────────────────────┐
│ ✨ AI Identified | 87% confident│
│                                 │
│ [Species Photo]  European Bass  │
│                  Dicentrarchus   │
│                  labrax          │
│                                 │
│ Silver body with distinctive... │
│                                 │
│ [Correct!] [Not right? Change]  │
│                                 │
│ AI usage: €0.010                │
└─────────────────────────────────┘
```

**4. Low Confidence / Manual Selection**
```
┌─────────────────────────────────┐
│ ⓘ AI uncertain - please select  │
│                                 │
│ What did you catch?             │
│                                 │
│ ┌───┐ ┌───┐ ┌───┐              │
│ │🐟 │ │🐟 │ │🐟 │              │
│ │   │ │   │ │   │              │
│ └───┘ └───┘ └───┘              │
│  Bass  Cod   Haddock            │
└─────────────────────────────────┘
```

**5. Budget Status (Optional)**
```
✨ AI Budget: €7.55 remaining this month
```

### Response Times

**Expected performance:**
- Cache hit: <100ms (instant)
- Database match: <500ms (fast)
- AI identification: 2-4 seconds (OpenAI API latency)
- Manual fallback: Instant (no wait)

## Testing

### Manual Testing Checklist

**Take Photo Flow:**
- [ ] Open camera on mobile device
- [ ] Capture photo of fish
- [ ] Verify AI identifying animation appears
- [ ] Check AI result displays with confidence score
- [ ] Test "Correct!" button (high confidence)
- [ ] Test "Not right? Change" button
- [ ] Verify manual grid appears after change
- [ ] Check budget display updates after AI call

**With Photo Flow:**
- [ ] Click "Choose Photo from Gallery"
- [ ] Select fish photo from device
- [ ] Verify AI identifying animation appears
- [ ] Check AI result displays
- [ ] Test species selection buttons
- [ ] Verify quantity picker works
- [ ] Submit catch and verify success

**Budget Testing:**
- [ ] Clear localStorage AI budget data
- [ ] Make 5 AI identifications
- [ ] Verify budget decrements by €0.05
- [ ] Check console warnings at 80% budget
- [ ] Verify AI disables at 100% budget
- [ ] Test manual fallback when budget exceeded

**EXIF Testing:**
- [ ] Take photo with camera (should have GPS)
- [ ] Upload edited photo (may lack EXIF)
- [ ] Check console logs for EXIF extraction status
- [ ] Verify graceful handling of missing EXIF

**Multi-Fish Detection Testing:**
- [ ] Upload photo with multiple fish visible
- [ ] Verify AI detects multiple fish
- [ ] Check for "Multiple fish detected - please identify manually" message
- [ ] Confirm manual species grid is shown
- [ ] Verify AI cost (€0.01) still charged
- [ ] Console log should show: `[FishID] Multiple fish detected in image`

### Testing Commands

**TypeScript Compilation:**
```bash
npm run typecheck
```

**Lint Check:**
```bash
npm run lint:ci
```

**Build Test:**
```bash
npm run build
```

### Testing Scripts

**Clear AI cache for testing:**
```typescript
// In browser console:
localStorage.removeItem('ai_usage_current_month');
location.reload();
```

**Check current AI usage:**
```typescript
// In browser console:
console.log(JSON.parse(localStorage.getItem('ai_usage_current_month')));
```

## Monitoring

### Service Statistics

Access service stats programmatically:

```typescript
const stats = await fishIdService.getStats();

console.log(stats);
// {
//   aiAvailable: true,
//   monthlyUsage: 2.45,
//   monthlyBudget: 10,
//   remainingBudget: 7.55,
//   cacheSize: 12,
//   pricePerCall: 0.01
// }
```

### Health Monitoring

Use the health monitoring hook:

```typescript
const health = useFishIdServiceHealth();

console.log(health);
// {
//   status: 'healthy' | 'degraded' | 'offline' | 'unknown',
//   aiEnabled: true,
//   budgetRemaining: 7.55,
//   monthlyUsage: 2.45,
//   cacheSize: 12
// }
```

**Status Definitions:**
- `healthy`: AI available, budget remaining
- `degraded`: Budget low but AI still available
- `offline`: Budget exceeded or API key missing
- `unknown`: Health check failed

### Console Logging

The service logs detailed information to browser console:

```
[FishID] OpenAI initialized
[FishID] Starting identification: { imageSize: 2048000, candidateCount: 12 }
[FishID] EXIF location found: [38.7223, -9.1393]
[FishID] Using AI identification with 12 candidates
[FishID] AI response: { species: "European Bass", confidence: 87, reasoning: "Silver body with distinctive..." }
[FishID] Identification logged: { method: 'ai', cost: 0.01, confidence: 0.87 }
```

**Warning logs:**
```
[FishID] Budget warning: €8.00 of €10.00 used
[FishID] Monthly budget exceeded
[FishID] AI disabled due to repeated errors
```

## Troubleshooting

### Common Issues

**1. AI Not Working**

**Symptoms:**
- Always shows manual species grid
- No "AI Identified" badge appears
- Console shows API errors

**Diagnosis:**
```bash
# Check OpenAI API key exists
grep OPENAI_API_KEY .env.local

# Check console for initialization errors
# Should see: "[FishID] OpenAI initialized"
```

**Solutions:**
- Verify `OPENAI_API_KEY` in `.env.local`
- Check API key is valid (not expired/revoked)
- Verify budget not exceeded (check localStorage)
- Check network connectivity

**2. Budget Exceeded**

**Symptoms:**
- AI stops working mid-month
- Console warning: "Monthly budget exceeded"
- Manual selection always shown

**Solutions:**
```typescript
// Check current usage
console.log(JSON.parse(localStorage.getItem('ai_usage_current_month')));

// Reset for testing (use sparingly in production)
localStorage.removeItem('ai_usage_current_month');
location.reload();
```

**3. Low Confidence Results**

**Symptoms:**
- AI always returns "uncertain"
- Never auto-selects species
- Always shows manual grid

**Possible Causes:**
- Poor photo quality (blurry, dark, obstructed)
- Species not in regional candidates list
- Unusual angle or partial view
- Non-fish subject in photo

**Solutions:**
- Retake photo with better lighting
- Ensure full fish visible in frame
- Check regional candidates include expected species
- Use manual selection as fallback

**4. Multiple Fish Detected**

**Symptoms:**
- Message: "Multiple fish detected - please identify manually"
- Manual species grid shown immediately
- AI cost (€0.01) still charged
- Console: `[FishID] Multiple fish detected in image`

**Expected Behavior:**
This is intentional and working correctly. When the AI detects multiple different fish species in a single photo, it cannot reliably identify which one to log, so it falls back to manual selection.

**Why This Happens:**
- Photo contains multiple fish of different species
- AI explicitly trained to detect this scenario
- Prevents incorrect automated species selection

**Solutions:**
- This is not an error - simply select the correct species from the grid
- For best AI performance, capture photos with a single fish clearly visible
- If you consistently catch multiple species together, consider taking individual photos

**Note:** AI still charges €0.01 for the multi-fish detection since it performed analysis. This is expected behavior.

**5. EXIF Extraction Fails**

**Symptoms:**
- Console: "No EXIF data found"
- Location not extracted from photo

**Note**: This is normal and expected behavior for:
- Gallery/uploaded photos
- Edited/filtered photos
- Screenshots
- Photos without GPS enabled

**No action needed** - system gracefully handles missing EXIF.

**5. TypeScript Errors**

**Error:**
```
Property 'id' does not exist on type 'QuickLogSpecies | QuickLogSpecies[]'
```

**Cause**: Accessing `.id` on union type without type guard

**Fix:**
```typescript
// Bad
onClick={() => setSelectedSpeciesId(aiResult.species.id)}

// Good
onClick={() => {
  if (!Array.isArray(aiResult.species)) {
    setSelectedSpeciesId(aiResult.species.id);
  }
}}
```

### Debug Mode

**Enable detailed logging:**
```typescript
// Add to fishIdentificationService.ts temporarily
console.log('[FishID] Cache key:', cacheKey);
console.log('[FishID] EXIF data:', exif);
console.log('[FishID] Candidates:', context.candidates);
console.log('[FishID] AI raw response:', response);
```

### Error Recovery

**AI Errors:**
The system automatically handles AI failures:
1. Catches OpenAI API errors
2. Increments error counter
3. After 3 consecutive errors: Disables AI for 1 hour
4. Falls back to manual selection
5. User experience unaffected (no error messages)

**Budget Recovery:**
- Budget automatically resets on 1st of each month
- No manual intervention needed
- Monthly usage tracked per-browser (localStorage)

## Future Enhancements

### Planned Improvements

**1. Database Caching**
- Move cache from memory to Supabase
- Enable cross-device cache sharing
- Persist across browser sessions

**2. EXIF Location Usage**
- Use photo GPS for species suggestions
- Compare photo location to current location
- Warn if locations differ significantly

**3. Confidence Tuning**
- Adjust auto-select threshold based on accuracy metrics
- Track false positive/negative rates
- Dynamic threshold per species

**4. Visual Similarity**
- Pre-AI color/shape matching
- Filter candidates by visual features
- Further reduce AI call rate

**5. Batch Processing**
- Process multiple photos at once
- Shared context for efficiency
- Bulk catch logging

**6. Model Upgrades**
- Test newer OpenAI models
- Evaluate cost/accuracy tradeoffs
- A/B test model versions

### Performance Targets

**Current Goals:**
- AI usage rate: <20% (target through smart routing)
- AI response time: 2-4 seconds
- Cache hit rate: >30%
- Database match rate: >40%

**Success Metrics:**
- Monthly cost: <€10
- User satisfaction: >80% correct identifications
- Fallback rate: <15% (manual selection needed)

## References

### Documentation
- Project README: `/README.md`
- Getting Started: `/docs/GETTING_STARTED.md`
- Findr Architecture: `/docs/CLAUDE.md` (Findr section)
- API Testing: `/docs/TESTING_FIXES_SUMMARY.md`

### Code Locations
- Service: `/lib/findr/fishIdentificationService.ts`
- Hook: `/hooks/useFishIdentification.ts`
- Take Photo: `/pages/findr/log/take-photo.tsx`
- With Photo: `/pages/findr/log/with-photo.tsx`

### External Resources
- OpenAI Vision API: https://platform.openai.com/docs/guides/vision
- exifr Documentation: https://mutiny.cz/exifr/
- Sharp Documentation: https://sharp.pixelplumbing.com/

---

**Last Updated**: October 30, 2025
**Authors**: Damian Rafferty, Claude (Anthropic)
**Status**: ✅ Production Ready
