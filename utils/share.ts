// src/utils/share.ts
/**
 * Simplified sharing utility for Go Daisy
 * Fallback chain: Web Share API → WhatsApp → Clipboard
 */

export type SharePayload = {
  title?: string;
  text?: string;  // The main message content
  url?: string;   // Page URL to share
};

/** Build the human-friendly message for sharing */
export function buildMessage({ title, text, url }: SharePayload): string {
  return [title, text, url].filter(Boolean).join('\n\n');
}

/** Create a WhatsApp share URL */
export function buildWhatsAppUrl(payload: SharePayload): string {
  const message = buildMessage(payload);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Share content with intelligent fallback chain:
 * 1. Native Web Share API (best for mobile)
 * 2. WhatsApp direct link (most popular messaging app)
 * 3. Copy to clipboard (last resort)
 *
 * Returns a user-friendly status message
 */
export async function shareToWhatsApp(payload: SharePayload): Promise<string> {
  const hasNavigatorShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Try Web Share API first (works great on mobile)
  if (hasNavigatorShare) {
    try {
      await navigator.share({
        title: payload.title,
        text: buildMessage(payload),
        url: payload.url,
      });
      return 'Shared successfully!';
    } catch (err) {
      const e = err as { name?: string; message?: string };
      // User cancelled the share sheet - not an error
      if (e?.name === 'AbortError' || e?.message?.includes('Abort')) {
        return 'Share cancelled';
      }
      // Fall through to WhatsApp
    }
  }

  // Fallback to WhatsApp direct link
  try {
    const href = buildWhatsAppUrl(payload);
    const opened = typeof window !== 'undefined'
      ? window.open(href, '_blank', 'noopener,noreferrer')
      : null;

    if (opened) {
      return 'Opened in WhatsApp';
    }
  } catch (err) {
    console.error('Failed to open WhatsApp:', err);
    // Fall through to clipboard
  }

  // Final fallback: copy to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const message = buildMessage(payload);
      await navigator.clipboard.writeText(message);
      return 'Copied to clipboard - paste in any app!';
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
  }

  return 'Unable to share. Please try again.';
}
