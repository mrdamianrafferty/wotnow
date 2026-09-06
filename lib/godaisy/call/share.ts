/**
 * Sending the call, on whatever the person is holding.
 *
 * THE APP IS THE PLATFORM THIS WAS WORST ON. `/call` called `navigator.share`
 * directly, and `navigator.share` does not exist inside a Capacitor WebView —
 * WKWebView has never exposed the Web Share API, and Android's WebView is not
 * Chrome. So on iOS and Android, the two places Go Daisy actually ships, the
 * one button the whole redesign is about fell through to
 * `navigator.clipboard.writeText` and silently copied a link. No share sheet,
 * no card, and a "Copied" label where a share sheet should have been.
 *
 * `@capacitor/share` and `@capacitor/filesystem` were both already
 * dependencies. The card has to be written to disk first, because the native
 * plugin takes file URIs rather than blobs — a data URI or a `File` is not
 * something it can hand to the system share sheet.
 *
 * WHAT EACH PLATFORM ACTUALLY GETS:
 *
 *   iOS / Android app     native share sheet, card attached      (was: clipboard)
 *   iOS / Android Safari  Web Share sheet, card attached
 *   Chrome, Edge          Web Share sheet, card where supported
 *   Firefox, older        clipboard, with a text-area fallback
 *
 * CANCELLING IS NOT FAILING. Every path can be dismissed, and all of them
 * signal it by throwing. A share sheet the person closed is a decision, not an
 * error, and it must not paint an error state or count as a send.
 *
 * @module lib/godaisy/call/share
 */

/** What happened, so the caller can label a button and count a number. */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareCallInput {
  /** The sentence. Carries the link on platforms with only one field. */
  text: string;
  url: string;
  /** The card. Absent when the renderer could not build one. */
  card?: Blob;
  /** For the native sheet's own title, and Android's dialog. */
  title?: string;
}

export interface ShareCallResult {
  outcome: ShareOutcome;
  /** Whether the card went with it, which is the difference between a message
   *  somebody looks at and a line of text. */
  withCard: boolean;
  /** How it went out, for the analytics event. */
  method: 'native' | 'web_share' | 'clipboard' | 'none';
  /** Only on `failed`. */
  reason?: string;
}

/** A dismissed sheet, said four different ways by four different platforms. */
function isCancellation(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === 'AbortError') return true;
  return /cancel|dismiss|abort/i.test(e.message);
}

/** Blobs go to the native plugin as base64, which is what `writeFile` takes. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the card'));
    reader.onload = () => {
      const result = String(reader.result);
      // `data:image/png;base64,AAAA…` — the plugin wants only the payload.
      const comma = result.indexOf(',');
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

async function isNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    // No Capacitor in the bundle at all — this is the web.
    return false;
  }
}

/**
 * The native path: write the card to the cache directory, then hand its URI to
 * the system share sheet.
 *
 * The cache directory rather than documents, because this file exists for the
 * two seconds between tapping Send and the sheet opening. It is the OS's to
 * reclaim afterwards and it should not appear in Files.
 */
async function shareNative(input: ShareCallInput): Promise<ShareCallResult> {
  const { Share } = await import('@capacitor/share');

  let files: string[] | undefined;
  if (input.card) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const data = await blobToBase64(input.card);
      // A fresh name each time: a share sheet holding a stale file from an
      // earlier day is worse than one holding no file.
      const written = await Filesystem.writeFile({
        path: `the-call-${Date.now()}.png`,
        data,
        directory: Directory.Cache,
      });
      files = [written.uri];
    } catch {
      // No card is a reason to send words, not a reason to send nothing.
    }
  }

  try {
    await Share.share({
      ...(input.title ? { title: input.title, dialogTitle: input.title } : {}),
      text: input.text,
      url: input.url,
      ...(files ? { files } : {}),
    });
    return { outcome: 'shared', withCard: Boolean(files), method: 'native' };
  } catch (e) {
    if (isCancellation(e)) {
      return { outcome: 'cancelled', withCard: Boolean(files), method: 'native' };
    }
    return {
      outcome: 'failed',
      withCard: false,
      method: 'native',
      reason: e instanceof Error ? e.message : 'unknown',
    };
  }
}

/** The last resort, and the only path on Firefox. */
async function copy(text: string): Promise<ShareCallResult> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { outcome: 'copied', withCard: false, method: 'clipboard' };
    }
    /*
     * `execCommand` is deprecated and still the only thing that works without a
     * secure context, which is where a browser old enough to lack
     * `navigator.clipboard` tends to be.
     */
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok
      ? { outcome: 'copied', withCard: false, method: 'clipboard' }
      : { outcome: 'failed', withCard: false, method: 'none', reason: 'copy refused' };
  } catch (e) {
    return {
      outcome: 'failed',
      withCard: false,
      method: 'none',
      reason: e instanceof Error ? e.message : 'unknown',
    };
  }
}

/**
 * Send the call.
 *
 * Never throws. Every platform's dismissal, refusal and absence is folded into
 * a `ShareOutcome`, because the caller's job is to label a button and the last
 * thing it should have to do is tell four platforms' exceptions apart.
 */
export async function shareCall(input: ShareCallInput): Promise<ShareCallResult> {
  if (await isNativeApp()) return shareNative(input);

  /*
   * The clipboard gets the link INSIDE the sentence; the share sheet gets them
   * as separate fields. One field means the link has to be in the text or it
   * is lost; two means every target composes them itself, and a URL repeated
   * in the text shows up twice in a message.
   */
  const flat = `${input.text}\n${input.url}`;

  if (typeof navigator.share !== 'function') return copy(flat);

  const payload: ShareData = { text: input.text, url: input.url };
  if (input.title) payload.title = input.title;

  let withCard = false;
  if (input.card && typeof navigator.canShare === 'function') {
    try {
      const file = new File([input.card], 'the-call.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        payload.files = [file];
        withCard = true;
      }
    } catch {
      // Some browsers throw from `canShare` rather than returning false.
    }
  }

  try {
    await navigator.share(payload);
    return { outcome: 'shared', withCard, method: 'web_share' };
  } catch (e) {
    if (isCancellation(e)) return { outcome: 'cancelled', withCard, method: 'web_share' };
    /*
     * A share that failed for any other reason still has somewhere to go. A
     * person who tapped Send and got nothing has been failed twice — once by
     * the platform and once by us for not noticing.
     */
    const copied = await copy(flat);
    return copied.outcome === 'copied'
      ? copied
      : { outcome: 'failed', withCard: false, method: 'web_share', reason: e instanceof Error ? e.message : 'unknown' };
  }
}
