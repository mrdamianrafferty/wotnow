# iOS Safe Area Fix for WebViews and Safari

**Date:** December 2024
**Status:** ✅ DEPLOYED
**Files Modified:** `components/AppHeader.tsx`, `pages/login.tsx`

## The Problem

The Go Daisy header was being "crunched" against the iOS notch/Dynamic Island. Despite multiple attempts using CSS `env(safe-area-inset-top)`, the header remained stuck under the notch.

### What We Tried (All Failed)

1. **CSS padding with env():**
   ```css
   padding-top: env(safe-area-inset-top);
   ```

2. **Tailwind arbitrary values:**
   ```html
   <div class="pt-[env(safe-area-inset-top)]">
   ```

3. **Inline styles with height/min-height:**
   ```tsx
   style={{
     height: 'env(safe-area-inset-top, 0px)',
     minHeight: 'env(safe-area-inset-top, 0px)',
   }}
   ```

4. **Changed `apple-mobile-web-app-status-bar-style`** from `black-translucent` to `default`

5. **Verified `viewport-fit=cover`** was set in the viewport meta tag

**None of these worked.**

## Root Cause

After research, we discovered:

> **`env(safe-area-inset-top)` returns `0px` in regular Safari browser and WebViews.**
>
> It only returns actual values in **PWA standalone mode** (when the app is added to home screen and launched from there).

This is a known iOS behavior. When viewing a website in:
- Safari browser → `env()` returns `0px`
- Capacitor/Cordova WebView → `env()` returns `0px`
- WKWebView → `env()` returns `0px`
- PWA standalone mode → `env()` returns actual safe area value (e.g., `47px`)

## The Solution

Implement a **JavaScript-based fallback** that:

1. Tests if `env(safe-area-inset-top)` returns a value
2. If it returns `0px` on iOS, calculate a fallback based on device detection
3. Apply the fallback value via inline styles

### Implementation

```tsx
// Detect iOS for safe area fallback (env() returns 0px in regular Safari)
const [iosSafeAreaHeight, setIosSafeAreaHeight] = React.useState(0);

React.useEffect(() => {
  if (typeof window === 'undefined') return;

  // Detect iOS devices (iPhone, iPad)
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!isIOS) return;

  // Check if env(safe-area-inset-top) is working
  const testEl = document.createElement('div');
  testEl.style.paddingTop = 'env(safe-area-inset-top, 0px)';
  document.body.appendChild(testEl);
  const computedPadding = parseInt(window.getComputedStyle(testEl).paddingTop) || 0;
  document.body.removeChild(testEl);

  // If env() returns 0 on iOS, we need a fallback
  if (computedPadding === 0) {
    // Detect iPhone models by screen aspect ratio
    const screenHeight = window.screen.height;
    const screenWidth = window.screen.width;
    const aspectRatio = screenHeight / screenWidth;

    // iPhone X and later have aspect ratio > 2.0 (compared to ~1.78 for older iPhones)
    const hasNotch = aspectRatio > 2.0 ||
      (screenHeight >= 1024 && navigator.maxTouchPoints > 1); // iPad Pro

    if (hasNotch) {
      // Use 47px as minimum safe fallback for all notched iPhones
      setIosSafeAreaHeight(47);
    } else {
      // Older iPhones (8 and below) - just need status bar height (20px)
      setIosSafeAreaHeight(20);
    }
  }
}, []);
```

### Usage in JSX

```tsx
{/* Safe area spacer */}
<div
  className="w-full bg-white"
  style={{
    height: iosSafeAreaHeight > 0
      ? `${iosSafeAreaHeight}px`
      : 'env(safe-area-inset-top, 0px)',
    minHeight: iosSafeAreaHeight > 0
      ? `${iosSafeAreaHeight}px`
      : 'env(safe-area-inset-top, 0px)',
  }}
  aria-hidden="true"
/>
```

## Device Detection Logic

| Device | Screen Aspect Ratio | Fallback Applied |
|--------|---------------------|------------------|
| iPhone X, XS, 11 Pro, 12, 13, 14, 15 | > 2.0 | 47px |
| iPhone 14 Pro, 15 Pro (Dynamic Island) | > 2.0 | 47px |
| iPhone 8, 7, 6, SE (no notch) | ~1.78 | 20px |
| iPad Pro (with Face ID) | < 2.0 but touch > 1 | 47px |
| Android / Desktop | N/A | 0px (uses CSS env) |

## Why This Works

1. **CSS `env()` is still preferred** when it works (PWA mode)
2. **JavaScript fallback activates only when needed** (Safari/WebView)
3. **Device detection uses screen dimensions**, not unreliable user agent strings for model detection
4. **Aspect ratio > 2.0** reliably identifies notched iPhones vs older models

## Files Modified

- `components/AppHeader.tsx` - Go Daisy main header
- `pages/login.tsx` - Go Daisy login page

## Applying to Other Components

If you add new pages/components that need safe area handling, use this pattern:

1. Add the `iosSafeAreaHeight` state and useEffect from above
2. Apply the height using the conditional style pattern
3. Always provide the CSS `env()` fallback for PWA mode

## Related Meta Tags (Still Required)

These must be in `_app.tsx` or the page's `<Head>`:

```tsx
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

- `viewport-fit=cover` tells the browser to extend content into safe areas
- `status-bar-style="default"` shows a white status bar (use `black-translucent` for dark backgrounds, but content will render under it)

## References

- [Apple: Designing for iPhone X](https://developer.apple.com/design/human-interface-guidelines/layout)
- [WebKit: CSS Environment Variables](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Stack Overflow: env() returns 0 in Safari](https://stackoverflow.com/questions/52492922/css-safe-area-inset-returns-0-on-ios-11-safari)
