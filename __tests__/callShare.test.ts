/**
 * Sending the call, on whatever the person is holding.
 *
 * Every branch here is a platform this cannot be run on, which is exactly why
 * it is tested: `/call` called `navigator.share` directly, and that function
 * does not exist inside a Capacitor WebView. So on iOS and Android — the two
 * places Go Daisy ships — the one button the whole redesign is about fell
 * through to the clipboard and silently copied a link. Nothing failed, nothing
 * logged, and a browser could never have shown it.
 */

import { shareCall } from '@/lib/godaisy/call/share';

const CARD = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
const INPUT = { text: 'Today is a day for a walk.', url: 'https://godaisy.io/call?x=1', card: CARD };

/** Swapped per test, since the module asks Capacitor at call time. */
let nativePlatform = false;
const shareSpy = jest.fn();
const writeFileSpy = jest.fn();

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativePlatform },
}), { virtual: true });
jest.mock('@capacitor/share', () => ({
  Share: { share: (...a: unknown[]) => shareSpy(...a) },
}), { virtual: true });
jest.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: (...a: unknown[]) => writeFileSpy(...a) },
  Directory: { Cache: 'CACHE' },
}), { virtual: true });

const nav = () => navigator as unknown as Record<string, unknown>;

beforeEach(() => {
  nativePlatform = false;
  shareSpy.mockReset().mockResolvedValue(undefined);
  writeFileSpy.mockReset().mockResolvedValue({ uri: 'file:///cache/the-call-1.png' });
  delete nav().share;
  delete nav().canShare;
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

describe('inside the app', () => {
  beforeEach(() => { nativePlatform = true; });

  it('uses the native sheet, not the Web Share API that is not there', async () => {
    const r = await shareCall(INPUT);

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ outcome: 'shared', method: 'native', withCard: true });
  });

  it('writes the card to disk first, because the plugin takes a URI not a blob', async () => {
    await shareCall(INPUT);

    expect(writeFileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ directory: 'CACHE', path: expect.stringMatching(/^the-call-\d+\.png$/) }),
    );
    expect(shareSpy.mock.calls[0][0].files).toEqual(['file:///cache/the-call-1.png']);
  });

  it('still sends the words when the card cannot be written', async () => {
    writeFileSpy.mockRejectedValue(new Error('no space'));

    const r = await shareCall(INPUT);

    expect(r).toMatchObject({ outcome: 'shared', withCard: false });
    expect(shareSpy.mock.calls[0][0].files).toBeUndefined();
  });

  it('treats a dismissed sheet as a decision, not a failure', async () => {
    shareSpy.mockRejectedValue(new Error('Share canceled'));

    expect(await shareCall(INPUT)).toMatchObject({ outcome: 'cancelled' });
  });
});

describe('in a browser with the Web Share API', () => {
  beforeEach(() => {
    nav().share = jest.fn().mockResolvedValue(undefined);
    nav().canShare = jest.fn().mockReturnValue(true);
  });

  it('attaches the card when the browser will carry files', async () => {
    const r = await shareCall(INPUT);

    expect(r).toMatchObject({ outcome: 'shared', method: 'web_share', withCard: true });
    expect((nav().share as jest.Mock).mock.calls[0][0].files).toHaveLength(1);
  });

  it('sends the words when it will not', async () => {
    nav().canShare = jest.fn().mockReturnValue(false);

    const r = await shareCall(INPUT);

    expect(r).toMatchObject({ outcome: 'shared', withCard: false });
    expect((nav().share as jest.Mock).mock.calls[0][0].files).toBeUndefined();
  });

  it('keeps the URL out of the text, because the sheet has two fields', async () => {
    await shareCall(INPUT);

    const payload = (nav().share as jest.Mock).mock.calls[0][0];
    expect(payload.text).toBe(INPUT.text);
    expect(payload.text).not.toContain(INPUT.url);
    expect(payload.url).toBe(INPUT.url);
  });

  it('reads AbortError as a dismissal', async () => {
    const abort = new Error('The user aborted a request.');
    abort.name = 'AbortError';
    nav().share = jest.fn().mockRejectedValue(abort);

    expect(await shareCall(INPUT)).toMatchObject({ outcome: 'cancelled' });
  });

  it('falls to the clipboard rather than failing twice', async () => {
    nav().share = jest.fn().mockRejectedValue(new Error('NotAllowedError'));

    const r = await shareCall(INPUT);

    expect(r).toMatchObject({ outcome: 'copied', method: 'clipboard' });
  });
});

describe('in a browser without it — Firefox, and older Safari', () => {
  it('copies, with the link inside the sentence because there is one field', async () => {
    const r = await shareCall(INPUT);

    expect(r).toMatchObject({ outcome: 'copied', method: 'clipboard', withCard: false });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${INPUT.text}\n${INPUT.url}`);
  });

  it('reports a refused clipboard rather than claiming a send', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = jest.fn().mockReturnValue(false);

    expect(await shareCall(INPUT)).toMatchObject({ outcome: 'failed' });
  });
});
