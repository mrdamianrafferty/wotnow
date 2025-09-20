// src/utils/share.ts
export type SharePayload = {
  title?: string;
  text?: string;         // free text / caption
  url?: string;          // page URL to share
  imageUrl?: string;     // public image URL (for previews + file-share attempt)
  imageFile?: File;      // Direct image file for sharing
  phone?: string;        // optional: specific recipient, full international number, e.g. "447911123456"
};

const isSecure = typeof window !== 'undefined' && window.isSecureContext;

/**
 * Try to fetch an image URL as a File for Web Share Level 2 (files).
 * Returns undefined if anything fails or not secure context.
 */
export async function imageUrlToFile(imageUrl?: string): Promise<File | undefined> {
  if (!imageUrl || !isSecure) return undefined;
  try {
    const res = await fetch(imageUrl, { mode: 'cors', cache: 'no-cache' });
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const ext = (blob.type && blob.type.split('/')[1]) || 'jpg';
    return new File([blob], `wotnow-share.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return undefined;
  }
}

/** Build the human-friendly message for text-only shares and the wa.me fallback */
export function buildMessage({ title, text, url }: SharePayload) {
  return [title, text, url].filter(Boolean).join('\n\n');
}

/** Create a wa.me URL with optional target phone */
export function buildWhatsAppUrl(payload: SharePayload) {
  const message = buildMessage(payload);
  const encoded = encodeURIComponent(message);
  if (payload.phone) {
    return `https://wa.me/${payload.phone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/** Narrow navigator type to include canShare when present */
function canNavigatorShareFiles(files: File[]): boolean {
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { canShare?: (data: { files?: File[] }) => boolean }) : undefined;
  try {
    return !!nav?.canShare?.({ files });
  } catch {
    return false; // Some browsers throw if files are unacceptable
  }
}

/**
 * Primary share function.
 * 1) Web Share with file if possible
 * 2) Web Share without file
 * 3) Open wa.me link (includes imageUrl as a plain URL inside the message for preview)
 * 4) Copy to clipboard (last resort)
 *
 * Returns a short status string you can show in a toast/snackbar.
 */
export async function shareToWhatsApp(payload: SharePayload): Promise<string> {
  const hasNavigatorShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Ensure the text includes image URL in case we end up on the wa.me path
  const textWithImageLink = [payload.text, payload.imageUrl].filter(Boolean).join('\n');

  // Prefer provided imageFile if present and supported
  if (hasNavigatorShare && payload.imageFile && canNavigatorShareFiles([payload.imageFile])) {
    try {
      await navigator.share({
        title: payload.title,
        text: [payload.title, textWithImageLink].filter(Boolean).join('\n\n'),
        files: [payload.imageFile],
      });
      return 'Shared via system sheet';
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'AbortError' || e?.message?.includes('Abort')) return 'Share cancelled';
      // fall through to other strategies
    }
  }

  // Attempt file share from imageUrl (Web Share Level 2)
  if (hasNavigatorShare && isSecure && payload.imageUrl) {
    const file = await imageUrlToFile(payload.imageUrl);
    if (file && canNavigatorShareFiles([file])) {
      try {
        await navigator.share({
          title: payload.title,
          text: [payload.title, textWithImageLink].filter(Boolean).join('\n\n'),
          files: [file],
        });
        return 'Shared via system sheet';
      } catch (err) {
        const e = err as { name?: string; message?: string };
        if (e?.name === 'AbortError' || e?.message?.includes('Abort')) return 'Share cancelled';
        // fall through
      }
    }
  }

  // Attempt text/URL share (no file)
  if (hasNavigatorShare) {
    try {
      await navigator.share({
        title: payload.title,
        text: buildMessage({ ...payload, text: textWithImageLink }),
        url: payload.url, // Some platforms prefer url separate
      });
      return 'Shared via system sheet';
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e?.name === 'AbortError' || e?.message?.includes('Abort')) return 'Share cancelled';
      // fall through
    }
  }

  // WhatsApp Click-to-Chat fallback
  try {
    const href = buildWhatsAppUrl({ ...payload, text: textWithImageLink });
    const w = typeof window !== 'undefined' ? window.open(href, '_blank', 'noopener,noreferrer') : null;
    if (w) return 'Opened WhatsApp';
  } catch {
    // fall through
  }

  // Final fallback: copy to clipboard
  try {
    const toCopy = buildMessage({ ...payload, text: textWithImageLink });
    await navigator.clipboard.writeText(toCopy);
    return 'Copied message to clipboard';
  } catch {
    return 'Unable to share';
  }
}
