# Lighthouse Fix Plan

**Date:** December 2024
**Current Scores:**

| Category | Go Daisy | Findr | Grow Daisy |
|----------|----------|-------|------------|
| Performance | 54 | 75 | 72 |
| Accessibility | 88 | 92 | 88 |
| Best Practices | 100 | 96 | 96 |
| SEO | 100 | 85 | 82 |

---

## Phase 1: Quick Wins (Global fixes, immediate impact)

These fixes apply to all sites and take minimal effort.

### 1.1 Add `lang` attribute to HTML element
**Impact:** Accessibility +2-3 points (all sites)
**File:** `pages/_document.tsx`
**Fix:** Add `lang="en"` to `<Html>` tag

### 1.2 Fix robots.txt
**Impact:** SEO +5-10 points (Findr, Grow Daisy)
**File:** `public/robots.txt`
**Fix:** Ensure valid robots.txt with proper sitemap reference

### 1.3 Add meta descriptions
**Impact:** SEO +5 points (Grow Daisy)
**Files:** `pages/grow/index.tsx`, relevant page components
**Fix:** Add `<meta name="description">` tags to pages missing them

### 1.4 Add canonical links
**Impact:** SEO +5 points (Findr)
**Files:** `pages/findr/index.tsx`, `pages/_app.tsx`
**Fix:** Add `<link rel="canonical">` to Findr pages

---

## Phase 2: Accessibility Fixes

### 2.1 Fix color contrast issues (All sites)
**Impact:** Accessibility +3-5 points
**Investigation needed:** Run audit to identify specific elements
**Common culprits:**
- Light gray text on white backgrounds
- Placeholder text colors
- Disabled button states

### 2.2 Fix ARIA roles (Go Daisy only)
**Impact:** Accessibility +2 points
**Investigation needed:** Identify elements with incompatible ARIA roles
**File:** Likely in `components/AppHeader.tsx` or navigation components

### 2.3 Fix list structure (Go Daisy only)
**Impact:** Accessibility +2 points
**Investigation needed:** Find `<ul>`/`<ol>` elements containing non-`<li>` children
**Common culprits:** Navigation menus, dropdown lists

### 2.4 Fix touch target sizes (Grow Daisy only)
**Impact:** Accessibility +2 points
**Investigation needed:** Identify small tap targets
**Fix:** Ensure buttons/links are at least 48x48px

---

## Phase 3: Performance - LCP Optimization

Largest Contentful Paint is the biggest issue across all sites.

### 3.1 Optimize LCP element discovery
**Impact:** Performance +10-15 points
**Current:** Go Daisy LCP 6.3s, Findr 4.8s, Grow Daisy 5.0s
**Target:** <2.5s

**Strategies:**
- Add `fetchpriority="high"` to hero images
- Preload critical images with `<link rel="preload">`
- Ensure LCP image is in initial HTML (not lazy-loaded)
- Reduce server response time (check API calls blocking render)

### 3.2 Optimize hero/above-fold images
**Files:** Check main page components for hero images
**Fix:**
- Use Next.js `<Image>` with `priority` prop
- Ensure proper sizing (avoid layout shift)
- Consider using WebP/AVIF formats

### 3.3 Reduce render-blocking resources
**Investigation:** Check which CSS/JS blocks initial render
**Fix:**
- Inline critical CSS
- Defer non-critical JavaScript
- Review third-party script loading

---

## Phase 4: Performance - JavaScript Optimization

### 4.1 Reduce Total Blocking Time
**Current:** Go Daisy 780ms, Grow Daisy 390ms, Findr 270ms
**Target:** <200ms

**Strategies:**
- Code split large components with `dynamic()` imports
- Defer non-critical JavaScript
- Review and optimize heavy computations
- Consider moving work to Web Workers

### 4.2 Reduce JavaScript bundle size
**Investigation:** Analyze bundle with `@next/bundle-analyzer`
**Common culprits:**
- Large libraries (moment.js → date-fns)
- Unused code/dependencies
- Duplicate dependencies

### 4.3 Optimize third-party scripts
**Current third-parties:** Vercel Analytics, Speed Insights, Google Maps, Supabase
**Fix:**
- Lazy load non-critical scripts
- Use `async` or `defer` attributes
- Consider loading maps only when needed

---

## Phase 5: Performance - Network Optimization

### 5.1 Optimize critical request chains
**Impact:** Reduces Time to Interactive
**Fix:**
- Preconnect to required origins
- Preload critical resources
- Reduce request waterfall depth

### 5.2 Enable text compression
**Check:** Ensure Vercel is serving gzip/brotli compressed assets

### 5.3 Optimize caching headers
**Check:** Review Cache-Control headers for static assets

---

## Implementation Order

| Priority | Task | Sites Affected | Effort | Impact |
|----------|------|----------------|--------|--------|
| 1 | Add `lang="en"` | All | 5 min | A11y +2 |
| 2 | Fix robots.txt | Findr, Grow | 10 min | SEO +5 |
| 3 | Add meta descriptions | Grow | 15 min | SEO +5 |
| 4 | Add canonical links | Findr | 10 min | SEO +3 |
| 5 | Fix color contrast | All | 30 min | A11y +3 |
| 6 | Fix ARIA roles | Go Daisy | 20 min | A11y +2 |
| 7 | Fix list structure | Go Daisy | 15 min | A11y +2 |
| 8 | Fix touch targets | Grow | 20 min | A11y +2 |
| 9 | Add image preloading | All | 30 min | Perf +5 |
| 10 | Optimize LCP images | All | 45 min | Perf +10 |
| 11 | Code splitting | All | 1-2 hrs | Perf +5 |
| 12 | Bundle analysis | All | 1-2 hrs | Perf +5 |

---

## Expected Results After All Fixes

| Category | Go Daisy | Findr | Grow Daisy |
|----------|----------|-------|------------|
| Performance | 70-80 | 85-90 | 80-85 |
| Accessibility | 95-100 | 98-100 | 95-100 |
| Best Practices | 100 | 100 | 100 |
| SEO | 100 | 95-100 | 95-100 |

---

## Commands to Re-run Lighthouse

```bash
# Individual site
lighthouse https://godaisy.io --view

# All sites (headless)
for url in godaisy.io fishfindr.eu grow.godaisy.io; do
  lighthouse https://$url --output=html --output-path=/tmp/$url.html --chrome-flags="--headless"
done
```
