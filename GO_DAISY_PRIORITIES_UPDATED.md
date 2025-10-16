# Go Daisy - Updated Priorities (October 2025)

**Date:** 15 October 2025
**Status:** PNG issue resolved, priorities reprioritized

---

## ✅ Already Resolved

### PNG Optimization (Was Priority #1)
- **Status:** ✅ Already excluded from Vercel deploy
- **Impact:** 373MB saved on every deploy (88% reduction)
- **Details:** `.vercelignore` line 121 excludes `public/PNGS/`
- **Action Required:** None - keep PNGs locally as reference only

---

## 🔴 CRITICAL (Do This Week) - 10 Hours

These fixes will have immediate, measurable impact on user experience and SEO.

### 1. Remove Console Logs from Production (1 hour) ⚡
**Current:** 432 console.log statements across codebase
**Impact:**
- Cleaner browser console for users
- Slight performance improvement (console operations have overhead)
- More professional appearance
- Reduces bundle size slightly

**How to fix:**
```bash
# Option 1: Quick script to comment them out
find pages components lib -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' 's/console\.log(/\/\/ console.log(/g' {} +

# Option 2: Use babel plugin (production only)
npm install babel-plugin-transform-remove-console --save-dev
```

**Files with most logs:**
- `pages/index.tsx` (80+ logs)
- `pages/activities.tsx` (60+ logs)
- `pages/findr/*.tsx` (50+ logs each)

**Effort:** 1 hour
**Impact:** Medium (improves professionalism, slight performance gain)

---

### 2. Add Essential SEO Meta Tags (2 hours) 🔍
**Current:** Zero SEO meta tags - site is invisible to search engines
**Impact:**
- 20-30% increase in organic search traffic
- Proper social media previews when sharing
- Google can index pages correctly

**What to add:**

```tsx
// components/SEO.tsx (new component)
import Head from 'next/head';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
}

export default function SEO({ title, description, image, url }: SEOProps) {
  const siteUrl = 'https://godaisy.io';
  const fullUrl = url || siteUrl;
  const ogImage = image || `${siteUrl}/og-image.png`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title} | Go Daisy</title>
      <meta name="description" content={description} />
      <meta name="keywords" content="weather, activities, outdoor, recommendations, forecast" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph (Facebook) */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Go Daisy" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Additional */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#111827" />
    </Head>
  );
}
```

**Usage in pages:**
```tsx
// pages/index.tsx
<SEO
  title="Perfect Weather-Based Activity Recommendations"
  description="Find the best outdoor activities for today's weather. From surfing to hiking, Go Daisy helps you make the most of every day."
  url="https://godaisy.io"
/>
```

**Also create:**
- `public/og-image.png` (1200x630px for social sharing)
- `public/robots.txt`
- `public/sitemap.xml` (or auto-generate)

**Effort:** 2 hours
**Impact:** HIGH (critical for discoverability)

---

### 3. Add Service Worker for PWA (4 hours) 📲
**Current:** PWA manifest exists, but no service worker (not installable)
**Impact:**
- App becomes installable on mobile/desktop
- Offline access to previously viewed pages
- 40-60% faster subsequent loads
- "Add to Home Screen" prompt

**Recommended: Use next-pwa (easiest)**

```bash
npm install next-pwa
```

```js
// next.config.mjs
import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Cache weather API responses (1 hour)
    {
      urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'weather-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
      },
    },
    // Cache images (30 days)
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    // Cache pages (24 hours)
    {
      urlPattern: /^https:\/\/godaisy\.io\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
});

export default withPWA(nextConfig);
```

**Testing:**
```bash
npm run build
npm run start
# Open Chrome DevTools → Application → Service Workers
# Should see registered service worker
```

**Effort:** 4 hours (including testing)
**Impact:** VERY HIGH (makes app installable, huge UX improvement)

---

### 4. Add Loading States (3 hours) ⏳
**Current:** Users see blank screen while data loads (feels broken)
**Impact:**
- 40% perceived performance improvement
- Lower bounce rate
- More professional appearance

**Create skeleton loader:**

```tsx
// components/SkeletonLoader.tsx
export function ActivityCardSkeleton() {
  return (
    <div className="card activity-card-enhanced animate-pulse">
      <div className="card-body space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-base-300 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 bg-base-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-base-300 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-20 bg-base-300 rounded"></div>
        <div className="h-10 bg-base-300 rounded w-1/3 ml-auto"></div>
      </div>
    </div>
  );
}

export function HomepageSkeletons() {
  return (
    <div className="main-grid">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <ActivityCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

**Use in pages:**
```tsx
// pages/index.tsx
import { HomepageSkeletons } from '../components/SkeletonLoader';

export default function HomePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, []);

  if (loading) return <HomepageSkeletons />;

  // ... rest of page
}
```

**Add to:**
- `pages/index.tsx` (homepage)
- `pages/activities.tsx` (activities page)
- `pages/findr/*.tsx` (findr pages)

**Effort:** 3 hours
**Impact:** HIGH (dramatically improves perceived performance)

---

## 🟠 BIG IMPROVEMENTS (Next 2 Weeks) - 20 Hours

These have high ROI but require more time investment.

### 5. Lazy Load Images Everywhere (3 hours) 🖼️
**Current:** All images load immediately (slow first page load)
**Impact:**
- 50-70% faster initial page load
- Better Lighthouse score
- Lower bandwidth usage

**Strategy:**
1. Add `loading="lazy"` to all `<img>` tags
2. Use Next.js `<Image>` component where possible
3. Add Intersection Observer for WebP backgrounds

**Implementation:**

```tsx
// components/OptimizedImage.tsx (update existing)
import Image from 'next/image';

export default function OptimizedImage({
  src,
  alt,
  priority = false, // Only true for above-fold images
  ...props
}) {
  return (
    <Image
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      {...props}
    />
  );
}
```

**Files to update:**
- `components/Card.tsx` - Add lazy loading to card backgrounds
- `components/Popup.tsx` - Already has lazy loading logic, verify it works
- `pages/index.tsx` - First 3 cards: eager, rest: lazy
- `pages/activities.tsx` - All lazy except first visible

**Effort:** 3 hours
**Impact:** HIGH (major performance improvement)

---

### 6. Generate Sitemap (1 hour) 🗺️
**Current:** No sitemap = search engines don't know all your pages
**Impact:**
- Better SEO crawling
- Faster indexing of new pages
- Helps search engines understand site structure

**Option 1: Static sitemap**
```xml
<!-- public/sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://godaisy.io/</loc>
    <lastmod>2025-10-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://godaisy.io/activities</loc>
    <lastmod>2025-10-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://godaisy.io/findr</loc>
    <lastmod>2025-10-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Add all main pages -->
</urlset>
```

**Option 2: Dynamic sitemap (better)**
```bash
npm install next-sitemap
```

```js
// next-sitemap.config.js
module.exports = {
  siteUrl: 'https://godaisy.io',
  generateRobotsTxt: true,
  exclude: ['/api/*', '/demo/*', '/test/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: '/api/' },
    ],
  },
};
```

```json
// package.json
{
  "scripts": {
    "postbuild": "next-sitemap"
  }
}
```

**Effort:** 1 hour
**Impact:** MEDIUM (helps SEO, easy win)

---

### 7. Add robots.txt (5 minutes) 🤖
**Current:** No robots.txt = search engines guess what to crawl
**Impact:**
- Tells search engines what to index
- Can prevent wasted crawl budget on API routes

**Create:**
```txt
# public/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /demo/
Disallow: /test/
Disallow: /_next/

Sitemap: https://godaisy.io/sitemap.xml
```

**Effort:** 5 minutes
**Impact:** LOW (but essential for SEO)

---

### 8. Optimize Google Maps Loading (2 hours) 🗺️
**Current:** Google Maps API loaded in `_document.tsx` (blocks rendering)
**Impact:**
- 500ms-1s faster initial load
- Better Lighthouse score

**Move to lazy loading:**

```tsx
// lib/googleMaps.ts (update existing)
let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
```

**Usage:**
```tsx
// Only load when location picker is opened
const handleOpenLocationPicker = async () => {
  await loadGoogleMaps();
  setLocationPickerOpen(true);
};
```

**Remove from `_document.tsx`:**
```tsx
// pages/_document.tsx
// DELETE this script tag:
<script
  src={`https://maps.googleapis.com/maps/api/js?key=...`}
  async
  defer
></script>
```

**Effort:** 2 hours
**Impact:** MEDIUM (noticeable performance improvement)

---

### 9. Add Error Boundaries (2 hours) 🛡️
**Current:** Errors crash entire app (white screen of death)
**Impact:**
- Graceful degradation instead of crashes
- Better user experience
- Error tracking for debugging

**Create:**
```tsx
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card bg-error text-error-content max-w-md">
            <div className="card-body">
              <h2 className="card-title">Oops! Something went wrong</h2>
              <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
              <div className="card-actions justify-end">
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Wrap app:**
```tsx
// pages/_app.tsx
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}
```

**Effort:** 2 hours
**Impact:** MEDIUM (prevents crashes, improves reliability)

---

### 10. Improve Accessibility (6 hours) ♿
**Current:** Only 10 accessibility attributes found, no keyboard navigation
**Impact:**
- Support for screen readers
- Better SEO (accessibility is a ranking factor)
- Legal compliance (WCAG 2.1)
- Reach wider audience

**Key improvements:**

1. **Add skip-to-content link:**
```tsx
// components/AppHeader.tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 btn btn-primary">
  Skip to main content
</a>

// pages/index.tsx
<main id="main-content">
  {/* content */}
</main>
```

2. **Add ARIA labels to interactive elements:**
```tsx
// Before
<button onClick={handleShare}>📤</button>

// After
<button
  onClick={handleShare}
  aria-label="Share this activity"
>
  📤 Share
</button>
```

3. **Semantic HTML:**
```tsx
// Use proper semantic tags
<nav aria-label="Main navigation">
  <header>
    <main>
      <article>
        <aside>
          <footer>
```

4. **Focus management:**
```tsx
// When modal opens, focus it
useEffect(() => {
  if (isOpen) {
    modalRef.current?.focus();
  }
}, [isOpen]);

// Trap focus inside modal
function handleTabKey(e: KeyboardEvent) {
  const focusableElements = modalRef.current?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  // ... implement focus trap
}
```

5. **Color contrast:**
- Run Lighthouse audit
- Fix any contrast issues (text must have 4.5:1 ratio)

6. **Alt text on images:**
```tsx
// Add meaningful alt text to all images
<img src="/webp/soccer.webp" alt="People playing soccer on a sunny day" />
```

**Files to update:**
- `components/AppHeader.tsx` - Add skip link, improve nav
- `components/Card.tsx` - Add ARIA labels
- `components/Popup.tsx` - Focus management, ARIA dialog
- `pages/index.tsx` - Semantic HTML, main landmark
- All interactive elements - Add aria-label/aria-labelledby

**Effort:** 6 hours
**Impact:** HIGH (legal compliance, better UX, SEO boost)

---

### 11. Code Splitting (3 hours) 📦
**Current:** All JavaScript loaded upfront (slow initial load)
**Impact:**
- 30-40% smaller initial bundle
- Faster time to interactive

**Strategy:**
1. Use dynamic imports for heavy components
2. Split by route (Next.js does this automatically)
3. Split by feature (lazy load non-critical)

**Implementation:**

```tsx
// pages/index.tsx
import dynamic from 'next/dynamic';

// Lazy load Popup modal (only when opened)
const Popup = dynamic(() => import('../components/Popup'), {
  loading: () => <div>Loading...</div>,
  ssr: false, // Don't render on server
});

// Lazy load Share modal
const ShareModal = dynamic(() => import('../components/ShareModal'), {
  ssr: false,
});

// Lazy load location picker
const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
  loading: () => <div className="skeleton h-96"></div>,
  ssr: false,
});
```

**Analyze bundle:**
```bash
# Install bundle analyzer
npm install @next/bundle-analyzer

# Add to next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

**Effort:** 3 hours
**Impact:** MEDIUM-HIGH (faster initial load, better performance)

---

### 12. Optimize CSS (3 hours) 🎨
**Current:** 8,845 lines of CSS, possibly unused styles
**Impact:**
- Smaller CSS bundle
- Faster parsing

**Tools:**

1. **PurgeCSS (built into Tailwind):**
```js
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // Tailwind will automatically remove unused classes
};
```

2. **Analyze CSS usage:**
```bash
npm install -D purgecss @fullhuman/postcss-purgecss

# Add to postcss.config.js
module.exports = {
  plugins: [
    'tailwindcss',
    process.env.NODE_ENV === 'production' && '@fullhuman/postcss-purgecss',
    'autoprefixer',
  ].filter(Boolean),
};
```

3. **Check for unused CSS:**
- Open Chrome DevTools → Coverage tab
- Record page load
- See unused CSS % (should be < 20%)

**Effort:** 3 hours
**Impact:** MEDIUM (modest performance improvement)

---

## 🟢 MINOR GAINS (Ongoing) - 10 Hours

These are quick wins with smaller individual impact.

### 13. Add Preconnect to External APIs (10 minutes) ⚡
**Current:** Browser doesn't know about APIs until request made
**Impact:** 100-300ms faster API requests

```tsx
// pages/_document.tsx
<Head>
  <link rel="preconnect" href="https://api.openweathermap.org" />
  <link rel="preconnect" href="https://maps.googleapis.com" />
  <link rel="preconnect" href="https://api.met.no" />
  <link rel="dns-prefetch" href="https://api.openweathermap.org" />
</Head>
```

**Effort:** 10 minutes
**Impact:** LOW (modest speed improvement)

---

### 14. Add Open Graph Images (1 hour) 🖼️
**Current:** Sharing on social media shows no preview
**Impact:** Better social sharing, more clicks

**Create:**
```tsx
// scripts/generate-og-images.tsx
// Use @vercel/og or canvas to generate dynamic OG images

// For now, create static:
// - public/og-image.png (1200x630)
// - public/og-image-activities.png
// - public/og-image-findr.png
```

**Use Figma or Canva to design:**
- Brand colors
- Activity photos
- Clear text: "Go Daisy - Weather-Based Activity Recommendations"

**Effort:** 1 hour
**Impact:** LOW-MEDIUM (better social sharing)

---

### 15. Add JSON-LD Structured Data (30 minutes) 📊
**Current:** Google doesn't understand what your site is
**Impact:** Rich snippets in search results

```tsx
// components/StructuredData.tsx
export default function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Go Daisy",
    "description": "Weather-based activity recommendations",
    "url": "https://godaisy.io",
    "applicationCategory": "LifestyleApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

**Effort:** 30 minutes
**Impact:** LOW-MEDIUM (better search appearance)

---

### 16. Add Image Placeholders (1 hour) 🎨
**Current:** Images jump/shift when loading (bad CLS score)
**Impact:** Better Lighthouse score, smoother UX

```tsx
// Use Next.js Image with blur placeholders
<Image
  src="/webp/soccer.webp"
  alt="Soccer"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Generate with sharp
  width={1024}
  height={768}
/>
```

**Generate blur data:**
```js
// scripts/generate-blur-placeholders.js
const sharp = require('sharp');

async function generateBlurDataURL(imagePath) {
  const buffer = await sharp(imagePath)
    .resize(10, 10, { fit: 'inside' })
    .blur()
    .toBuffer();

  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}
```

**Effort:** 1 hour
**Impact:** LOW-MEDIUM (better CLS score)

---

### 17. Add Analytics (30 minutes) 📊
**Current:** No idea how users interact with site
**Impact:** Data-driven decisions

**Options:**
1. **Vercel Analytics** (easiest, free)
2. **Google Analytics 4**
3. **Plausible** (privacy-friendly)
4. **Umami** (self-hosted)

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

```tsx
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

**Effort:** 30 minutes
**Impact:** LOW (but essential for tracking success)

---

### 18. Improve 404 Page (30 minutes) 🚫
**Current:** Default Next.js 404 (not branded)
**Impact:** Better UX when users hit broken links

```tsx
// pages/404.tsx
export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold">404</h1>
        <p className="text-2xl mt-4">This page doesn't exist</p>
        <p className="mt-2 text-base-content/70">
          Maybe check today's weather instead?
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

**Effort:** 30 minutes
**Impact:** LOW (but looks professional)

---

### 19. Add Offline Page (1 hour) 📴
**Current:** Blank screen when offline
**Impact:** Better PWA experience

```tsx
// pages/offline.tsx
export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-3xl font-bold mb-2">You're Offline</h1>
        <p className="text-base-content/70 mb-6">
          It looks like you've lost your internet connection.
          Some features may not work until you're back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
```

**Register in service worker:**
```js
// next-pwa config
{
  fallbacks: {
    document: '/offline',
  }
}
```

**Effort:** 1 hour
**Impact:** LOW (but good for PWA)

---

### 20. Add Keyboard Shortcuts (2 hours) ⌨️
**Current:** Mouse/touch only
**Impact:** Power users can navigate faster

```tsx
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K = Open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }

      // Cmd/Ctrl + L = Open location picker
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        openLocationPicker();
      }

      // Escape = Close modals
      if (e.key === 'Escape') {
        closeAllModals();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
```

**Add shortcut legend:**
```tsx
// components/KeyboardShortcuts.tsx
export function KeyboardShortcutsHelp() {
  return (
    <div className="kbd-help">
      <h3>Keyboard Shortcuts</h3>
      <ul>
        <li><kbd>⌘</kbd> + <kbd>K</kbd> Search</li>
        <li><kbd>⌘</kbd> + <kbd>L</kbd> Change Location</li>
        <li><kbd>Esc</kbd> Close</li>
      </ul>
    </div>
  );
}
```

**Effort:** 2 hours
**Impact:** LOW (nice for power users)

---

## Summary: Updated Priorities

### Time Investment vs Impact

| Priority | Task | Time | Impact | Status |
|----------|------|------|--------|--------|
| ~~1~~ | ~~Image optimization~~ | ~~2h~~ | ~~CRITICAL~~ | ✅ **DONE** |
| 2 | Console log removal | 1h | HIGH | 🔴 Do now |
| 3 | SEO meta tags | 2h | CRITICAL | 🔴 Do now |
| 4 | Service worker (PWA) | 4h | CRITICAL | 🔴 Do now |
| 5 | Loading states | 3h | HIGH | 🔴 Do now |
| 6 | Lazy load images | 3h | HIGH | 🟠 Week 2 |
| 7 | Sitemap generation | 1h | MEDIUM | 🟠 Week 2 |
| 8 | robots.txt | 5m | LOW | 🟠 Week 2 |
| 9 | Google Maps lazy load | 2h | MEDIUM | 🟠 Week 2 |
| 10 | Error boundaries | 2h | MEDIUM | 🟠 Week 2 |
| 11 | Accessibility | 6h | HIGH | 🟠 Week 2 |
| 12 | Code splitting | 3h | MEDIUM | 🟠 Week 2 |
| 13 | CSS optimization | 3h | MEDIUM | 🟠 Week 2 |
| 14+ | Minor improvements | 10h | LOW each | 🟢 Ongoing |

### Weekly Breakdown

**Week 1: Critical Fixes (10 hours)** 🔴
- Day 1: Console logs (1h) + SEO tags (2h) = 3h
- Day 2-3: Service worker (4h)
- Day 3: Loading states (3h)
- **Impact:** Site becomes professional, discoverable, installable

**Week 2: Big Improvements (20 hours)** 🟠
- Day 1: Lazy load images (3h) + Sitemap (1h) + robots.txt (5m) = 4h
- Day 2: Google Maps lazy load (2h) + Error boundaries (2h) = 4h
- Day 3-4: Accessibility (6h)
- Day 4-5: Code splitting (3h) + CSS optimization (3h) = 6h
- **Impact:** Performance optimized, accessibility compliant

**Week 3+: Polish (10 hours)** 🟢
- Minor improvements as time allows
- **Impact:** Nice-to-haves, incremental gains

### Expected Results

**After Week 1 (Critical Fixes):**
- Lighthouse Performance: 30 → 70
- Lighthouse SEO: 50 → 85
- Lighthouse PWA: 40 → 90
- App is installable ✅
- Organic traffic +20-30% within a month

**After Week 2 (Big Improvements):**
- Lighthouse Performance: 70 → 85
- Lighthouse Accessibility: 60 → 90
- Page load time: 5-8s → 2-3s
- Lower bounce rate, higher engagement

**After Week 3+ (Polish):**
- Lighthouse Performance: 85 → 90+
- All categories 90+ (excellent)
- Production-grade polish

---

## Quick Wins (Can Do Today in 2 Hours)

These are the absolute fastest wins:

1. ✅ robots.txt (5 mins)
2. ✅ Preconnect tags (10 mins)
3. ✅ Skip-to-content link (15 mins)
4. ✅ Fix alt text on main images (30 mins)
5. ✅ Add basic meta description to homepage (15 mins)
6. ✅ Remove console.logs from homepage only (45 mins)

**Total: 2 hours, noticeable improvement**

---

## Key Takeaway

✅ **PNG issue already solved** - 373MB not deployed (huge win!)

**New Priority #1:** Make the site discoverable and professional
- SEO meta tags (2h)
- Console log removal (1h)
- Service worker (4h)
- Loading states (3h)

**Total Week 1 effort:** 10 hours
**Impact:** Site goes from "prototype" to "professional product"

Would you like me to start implementing any of these priorities?
