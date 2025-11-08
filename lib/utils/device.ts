/**
 * Device detection utilities for responsive layouts
 */

/**
 * Detect if the current device is an iPad
 * Works for both regular Safari and PWA mode
 */
export function isIPad(): boolean {
  if (typeof window === 'undefined') return false;

  // Check user agent for iPad
  const isIPadUA = navigator.userAgent.includes('iPad');

  // Modern iPad detection (iOS 13+ reports as Mac)
  const isIPadPro = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  // Check screen size (iPad Mini: 768x1024, iPad Pro: 1024x1366)
  const hasIPadSize = window.innerWidth >= 768 && window.innerHeight >= 1024;

  return isIPadUA || (isIPadPro && hasIPadSize);
}

/**
 * Get responsive grid columns based on device
 */
export function getGridColumns(): number {
  if (isIPad()) return 2;  // 2 columns on iPad
  return 1;  // 1 column on iPhone
}

/**
 * Get responsive container padding
 */
export function getContainerPadding(): string {
  if (isIPad()) return 'px-8';  // More padding on iPad
  return 'px-4';  // Standard padding on iPhone
}

/**
 * Get responsive modal width
 */
export function getModalWidth(): string {
  if (isIPad()) return 'max-w-2xl';  // Wider on iPad (672px)
  return 'max-w-md';  // Standard on iPhone (448px)
}
