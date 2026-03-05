/**
 * Haptic feedback for PWA — progressive enhancement.
 * Uses Vibration API where available, no-ops silently elsewhere.
 */
export function haptic(style: 'light' | 'medium' | 'success') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  switch (style) {
    case 'light': navigator.vibrate(10); break;
    case 'medium': navigator.vibrate(20); break;
    case 'success': navigator.vibrate([10, 50, 20]); break;
  }
}
