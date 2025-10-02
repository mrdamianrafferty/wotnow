# Findr Mobile Implementation Guide

## ✅ Completed (Phase 1)

### 1. Mobile Navigation (Bottom Tab Bar) ✅
**File Created:** `/components/findr/FindrNavigationMobile.tsx`

**What it does:**
- Desktop: Horizontal menu (unchanged)
- Mobile: Bottom tab bar with 5 main sections
- Floating language selector on mobile (top-right)
- 48px minimum touch targets
- Active state with visual feedback

**Next Step:** Replace old FindrNavigation component
```tsx
// pages/findr/*.tsx
// Change:
import { FindrNavigation } from '../../components/findr/FindrNavigation';
// To:
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
```

### 2. Skeleton Loading States ✅
**File Created:** `/components/findr/SkeletonCard.tsx`

**Components:**
- `<SkeletonCard />` - Full prediction card skeleton
- `<SkeletonCarousel />` - Carousel loading state
- `<SkeletonCardCompact />` - List view skeleton

**Usage:**
```tsx
// pages/findr/index.tsx
import { SkeletonCard, SkeletonCarousel } from '../../components/findr/SkeletonCard';

{isLoading ? (
  <SkeletonCarousel />
) : (
  <CardCarousel cards={predictions} />
)}
```

### 3. PWA Manifest ✅
**File Created:** `/public/manifest.json`

**Features:**
- "Add to Home Screen" enabled
- Standalone display mode
- App shortcuts (Predictions, Favourites, Log)
- Proper theme colors
- Icons configured (need to create actual icon files)

**Icons Needed:**
```bash
# Create these files in /public/icons/
findr-icon-16.png      # 16x16 favicon
findr-icon-32.png      # 32x32 favicon
findr-icon-192.png     # 192x192 Android
findr-icon-512.png     # 512x512 Android
findr-icon-apple-touch.png  # 180x180 iOS
shortcut-predictions.png    # 96x96
shortcut-favourites.png     # 96x96
shortcut-log.png           # 96x96
```

**Quick Icon Generation:**
```bash
# Option 1: Use an online tool
https://realfavicongenerator.net/

# Option 2: ImageMagick
convert source-logo.png -resize 192x192 findr-icon-192.png
convert source-logo.png -resize 512x512 findr-icon-512.png
# etc...
```

---

## 🔧 TODO: Phase 2 (High Priority)

### 4. Fix Touch Targets (44px minimum)

**Files to Update:**
1. `/pages/findr/index.tsx` - Favorite heart buttons
2. `/pages/findr/index.tsx` - Info buttons
3. `/components/favourites/SpeciesCard.tsx` - Interactive elements

**Changes Needed:**

#### A. Favorite Heart Buttons
```tsx
// BEFORE (Line ~122):
<button
  type="button"
  className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-110"
  onClick={() => onToggleFavorite?.(card.id)}
>
  <Heart size={20} />
</button>

// AFTER:
<button
  type="button"
  className="absolute top-2 right-2 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/20 transition-all duration-200 active:scale-95 md:p-2"
  onClick={() => onToggleFavorite?.(card.id)}
  aria-label="Toggle favourite"
>
  <Heart size={24} className="md:w-5 md:h-5" />
</button>
```

#### B. Info Buttons
```tsx
// BEFORE (Line ~178):
className={`btn btn-circle ${interactive ? 'btn-ghost border-base-300 btn-md md:btn-sm' : '...'}`}

// AFTER:
className={`btn btn-circle ${interactive ? 'btn-ghost border-base-300 btn-lg md:btn-md min-w-[44px] min-h-[44px]' : '...'}`}
```

#### C. Expand/Collapse Buttons
```tsx
// Add to all buttons with text
className="btn btn-xs btn-outline gap-1 min-h-[44px] px-4 md:min-h-0 md:px-2"
```

### 5. Image Blur Placeholders

**Files to Update:**
1. `/pages/findr/index.tsx` - Fish images
2. `/pages/findr/favourites-demo.tsx` - Species images
3. `/components/favourites/SpeciesCard.tsx` - All images

**Implementation:**

```tsx
// Create placeholder generator utility
// /lib/image/placeholder.ts
export function generateBlurDataURL(width: number, height: number, color: string = '#e5e7eb'): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
    </svg>
  `;
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Usage in components:
import { generateBlurDataURL } from '../../lib/image/placeholder';

<Image
  src={imageUrl}
  alt={name}
  fill
  className="object-contain"
  placeholder="blur"
  blurDataURL={generateBlurDataURL(400, 300)}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={index === 0} // First image loads immediately
/>
```

### 6. Font Size Audit (iOS Zoom Prevention)

**Check all input fields:**
```bash
# Search for inputs
grep -r "input" pages/findr --include="*.tsx"
grep -r "input" components/findr --include="*.tsx"
```

**Ensure minimum 16px font size:**
```tsx
// Settings form, search inputs, text inputs
<input
  type="text"
  className="input input-bordered w-full text-base" // text-base = 16px ✅
  // NOT: className="input input-bordered w-full text-sm" // ❌ Will cause zoom
/>

// Select dropdowns
<select
  className="select select-bordered w-full text-base"
>
```

---

## 🎨 TODO: Phase 3 (Nice to Have)

### 7. Haptic Feedback (Mobile Native Feel)

**Create utility:**
```typescript
// /lib/mobile/haptic.ts
export function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[type]);
  }
}
```

**Usage:**
```tsx
const handleToggleFavorite = () => {
  triggerHaptic('light');
  // ... toggle logic
};

const handleDelete = () => {
  triggerHaptic('medium');
  // ... delete logic
};
```

### 8. Reduced Motion Support

**Add to _app.tsx:**
```tsx
import { useEffect, useState } from 'react';

function App({ Component, pageProps }: AppProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
      {/* ... rest of app */}
    </MotionConfig>
  );
}
```

### 9. Dark Mode Support

**Already configured in _app.tsx:**
```tsx
// Theme can be controlled via pageProps
<div data-theme={theme} className="...">
```

**Add theme toggle:**
```tsx
// components/ThemeToggle.tsx
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      setTheme(stored as 'light' | 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <button onClick={toggleTheme} className="btn btn-ghost btn-circle">
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

### 10. Code Splitting (Large Files)

**Split /pages/findr/index.tsx (1019 lines):**

```bash
# Create separate components
components/findr/
  PredictionCard.tsx        # Lines 100-250
  CardCarousel.tsx          # Lines 400-550
  EmptyState.tsx           # Empty state UI
  LoadingState.tsx         # Loading UI
  ErrorState.tsx           # Error UI
```

**Use dynamic imports:**
```tsx
// pages/findr/index.tsx
import dynamic from 'next/dynamic';

const SettingsForm = dynamic(() => import('../../components/findr/SettingsForm'), {
  ssr: false, // Settings don't need SSR
  loading: () => <SkeletonCard />
});

const FishSpeciesModal = dynamic(() => import('../../components/findr/FishSpeciesModal'), {
  ssr: false, // Modal only loads when opened
});
```

---

## 🧪 Testing Checklist

### Before Deploying:

#### 1. Lighthouse Audit
```bash
npm run build
npm start

# Open Chrome DevTools
# Lighthouse > Mobile > Generate Report
# Target scores:
# - Performance: 90+
# - Accessibility: 95+
# - Best Practices: 95+
# - SEO: 90+
```

#### 2. Real Device Testing
- [ ] iPhone SE (small screen 375px)
- [ ] iPhone 14 Pro (standard)
- [ ] iPad (tablet 768px)
- [ ] Android phone (Samsung/Pixel)
- [ ] Test in Safari iOS
- [ ] Test in Chrome Android

#### 3. Network Testing
```bash
# Chrome DevTools > Network
# Throttle: Fast 3G
# Test:
# - Page loads in < 5 seconds
# - Images load progressively
# - No layout shift
# - Interactions feel responsive
```

#### 4. Touch Testing
- [ ] All buttons easy to tap with thumb
- [ ] No accidental taps on nearby elements
- [ ] Swipe gestures work smoothly
- [ ] No double-tap zoom on buttons

#### 5. PWA Testing
- [ ] Visit site on mobile browser
- [ ] "Add to Home Screen" prompt appears
- [ ] Install app to home screen
- [ ] Launch from home screen (standalone mode)
- [ ] App icon displays correctly
- [ ] Splash screen shows on launch

---

## 📦 Quick Commands

### Development:
```bash
npm run dev
# Visit http://localhost:3000/findr on mobile device
# Or use ngrok for remote testing:
npx ngrok http 3000
```

### Production Build:
```bash
npm run build
npm start
# Test production optimizations
```

### Bundle Analysis:
```bash
npm run build
npx @next/bundle-analyzer
# Check for large dependencies
```

### Lighthouse CI (Automated):
```bash
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:3000/findr
```

---

## 📊 Success Criteria

### Before Marking Complete:
- [ ] Lighthouse Mobile Score: 90+
- [ ] All touch targets: 44px minimum
- [ ] Font sizes: 16px minimum
- [ ] PWA installable on iOS/Android
- [ ] Bottom navigation works on mobile
- [ ] Skeleton loaders show while loading
- [ ] Images have blur placeholders
- [ ] Tested on 3 real devices
- [ ] No horizontal scroll on 320px width
- [ ] Page loads in < 3 seconds on 3G

---

## 🚀 Deployment Steps

1. **Create app icons** (required for PWA)
2. **Test on real device** (iPhone or Android)
3. **Run Lighthouse audit** (get baseline scores)
4. **Implement touch target fixes** (30 minutes)
5. **Add blur placeholders** (1 hour)
6. **Deploy to staging** (test PWA install)
7. **Get user feedback** (friends/family)
8. **Deploy to production** 🎉

---

## 📝 Notes

- **Icons:** Use a fish emoji 🐟 or fishing rod 🎣 as placeholder if needed
- **Testing:** Real device testing > emulator testing
- **Performance:** Asturias may have poor 3G - optimize for this!
- **PWA:** Test "Add to Home Screen" on both iOS and Android
- **Navigation:** Bottom tabs are standard on mobile apps - familiar UX

**Estimated Time to Complete:**
- Phase 1: ✅ Done (2 hours)
- Phase 2: 4-6 hours
- Phase 3: 4-8 hours (optional)

**Total: 8-14 hours for full mobile optimization**
