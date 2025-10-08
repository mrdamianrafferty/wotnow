# Photo Storage Optimization Guide

## Current Configuration

### Image Compression Settings
- **Max Width**: 600px (maintains aspect ratio)
- **JPEG Quality**: 60%
- **Expected Size Reduction**: 80-90% of original file size
- **Format**: JPEG (best compression for photos)

### Storage Impact
- Original 4MB photo → ~400-800KB compressed
- Original 2MB photo → ~200-400KB compressed
- Typical smartphone photo (3-5MB) → ~300-600KB

## Monitoring Storage Usage

### Key Metrics to Track
1. **Average file size per photo** (target: <500KB)
2. **Total storage usage per user** (consider limits)
3. **Storage growth rate** (monthly increase)
4. **User complaints about quality**

### Storage Alerts
Set up monitoring for:
- Total storage usage > 80% of limit
- Average file size creeping above 700KB
- More than 100 photos uploaded per day

## Optimization Strategies

### If Storage Fills Too Fast

#### Level 1: Minor Adjustments (maintain quality)
```typescript
// In lib/storage/photoStorage.ts
const maxWidth = 500;    // Reduce from 600px
const quality = 0.55;    // Reduce from 0.6 (60%)
```

#### Level 2: Moderate Compression (noticeable quality impact)
```typescript
const maxWidth = 400;    // Thumbnail-like quality
const quality = 0.5;     // 50% quality
```

#### Level 3: Aggressive Compression (significant quality loss)
```typescript
const maxWidth = 300;    // Very small images
const quality = 0.4;     // 40% quality
```

#### Level 4: Advanced Strategies
1. **WebP Format** (better compression, check browser support):
   ```typescript
   canvas.toBlob(blob => { ... }, 'image/webp', 0.6);
   ```

2. **Progressive Photo Deletion**:
   - Delete photos older than 6 months automatically
   - Archive old photos to cheaper storage tier

3. **User Limits**:
   - Max 50 photos per user
   - Max 3 photos per catch entry

4. **Smart Compression by Content**:
   - Fish close-ups: higher quality (0.7)
   - Landscape/scenery: lower quality (0.5)

### If Quality Complaints Arise

#### Improve Quality Settings
```typescript
// Better quality but larger files
const maxWidth = 800;     // Increase from 600px
const quality = 0.75;     // Increase from 0.6 (60%)
```

#### Progressive Enhancement
- Start with current settings
- Allow "HD upload" option for premium users
- Offer different quality tiers based on storage plan

## File Organization Strategy

### Current Structure
```
photos/
├── userId1/
│   ├── catchId1/
│   │   ├── timestamp1.jpg
│   │   └── timestamp2.jpg
│   └── catchId2/
│       └── timestamp3.jpg
└── userId2/
    └── catchId3/
        └── timestamp4.jpg
```

### Benefits
- Easy cleanup by user or catch
- Predictable storage patterns
- Simple permission management

## Alternative Formats Comparison

| Format | Compression | Browser Support | File Size | Quality |
|--------|-------------|-----------------|-----------|---------|
| JPEG   | Good        | 100%           | Medium    | Good    |
| WebP   | Excellent   | 95%+           | Small     | Excellent |
| AVIF   | Best        | 70%            | Smallest  | Best    |

## Implementation Notes

### Current Code Location
- **Compression Function**: `lib/storage/photoStorage.ts` - `compressImage()`
- **Upload Handler**: `pages/findr/log.tsx` - `handlePhotoUpload()`
- **Settings**: Search for `// STORAGE SETTING:` comments

### Quick Setting Changes
1. Edit `maxWidth` and `maxHeight` constants
2. Adjust `quality` parameter in `canvas.toBlob()`
3. Test with real photos before deploying
4. Monitor storage usage after changes

### Testing Recommendations
1. Test with various photo types (close-ups, landscapes, different lighting)
2. Check on different devices (mobile vs desktop viewing)
3. Measure actual file size reductions
4. Get user feedback on quality acceptability

## Emergency Actions

### If Storage Limit Hit Immediately
1. **Temporary**: Disable photo uploads
2. **Quick Fix**: Reduce quality to 0.4 and width to 300px
3. **Clean Up**: Delete photos older than 30 days
4. **Long Term**: Implement progressive deletion policy

### Gradual Storage Management
1. Implement photo aging (automatic quality reduction over time)
2. Add user storage quotas
3. Compress existing photos in background job
4. Offer photo export before deletion