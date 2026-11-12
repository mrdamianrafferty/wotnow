/**
 * One drawing from the conditions page, as a card to send.
 *
 * MADE IN THE BROWSER, FROM WHAT IS ON SCREEN. The drawing is already an SVG
 * in the page, in the reader's language, with its wobble seeded by place, day
 * and section. Rendering it again on a server would mean a second renderer
 * that has to agree with the first about every line; drawing the one already
 * on screen onto a canvas cannot disagree with it.
 *
 * Three things an SVG loses when it leaves the page, each handled here:
 *
 *   1. **Its colours.** The drawing is coloured with CSS variables, which mean
 *      nothing in an image. They are resolved to the LIGHT palette, always:
 *      the card is paper and pencil whichever theme the sender reads in.
 *   2. **Its handwriting.** Text in an SVG-as-image cannot see the page's web
 *      fonts, so the Caveat faces are embedded in the SVG as data URIs.
 *   3. **Its size.** Given explicit pixels, so the canvas draws it sharp.
 *
 * Card: 1080 × 1350 (4:5), chosen 12 Nov 2026 — it fills more of a phone in
 * WhatsApp and Instagram than a square, and a tall drawing like the tide has
 * room.
 *
 * @module lib/godaisy/conditions/shareCard
 */

export const CARD = { width: 1080, height: 1350, pad: 64 } as const;

/**
 * The light palette, as `:root` in styles/godaisy-call.css defines it.
 * `__tests__/conditionsShareCard.test.ts` reads that file and fails if these
 * drift from it.
 */
export const CARD_COLOURS: Readonly<Record<string, string>> = {
  '--call-page': '#faf8f5',
  '--call-ink-1': '#1c1917',
  '--call-ink-4': '#736c67',
  '--call-sk-ink': '#2b2824',
  '--call-sk-pencil': '#736c67',
  '--call-sk-wash': '#efe8dc',
  '--call-sk-warm': '#b4501a',
  '--call-sk-cold': '#2b689c',
  '--call-sk-water': '#bcd6e6',
  '--call-sk-water-ink': '#2b689c',
  '--call-sk-moss': '#3d6b4f',
  '--call-sk-amber': '#8a6408',
  '--call-sk-sun': '#f1c84b',
  '--call-sk-lit': '#f6e7a8',
  '--call-sk-mud': '#8a6a48',
  '--call-sk-skin': '#ecd0b2',
  '--call-sk-leather': '#a26a3c',
  '--call-sk-welly': '#3d6b4f',
  '--call-sk-neoprene': '#2f3b42',
  '--call-sk-snow': '#ffffff',
};

/** `var(--call-sk-ink)` → `#2b2824`. An unknown variable becomes ink, never transparent. */
export function resolveVars(svg: string, colours: Readonly<Record<string, string>> = CARD_COLOURS): string {
  return svg.replace(/var\((--[\w-]+)\)/g, (_, name: string) => colours[name] ?? colours['--call-sk-ink']);
}

/** Greedy word wrap against a measuring function. A word wider than the line keeps a line of its own. */
export function wrapText(measure: (s: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Where a shared card points: the same place, day and section on the
 * conditions page. Never the verdict or what the call weighed — a card is
 * about the weather, and somebody else's call is not the recipient's.
 */
export function shareLink(o: {
  origin: string; place: string; lat: number; lon: number; coastal: boolean; day: number; section: string;
}): string {
  const q = new URLSearchParams({ n: o.place, lat: o.lat.toFixed(4), lon: o.lon.toFixed(4) });
  if (o.coastal) q.set('c', '1');
  if (o.day > 0) q.set('day', String(o.day));
  return `${o.origin}/weather?${q.toString()}#${o.section}`;
}

/* ── Browser only below ─────────────────────────────────────────────── */

/** The page's Caveat faces, with their files inlined, as CSS for the SVG to carry. */
async function handFontCss(): Promise<string> {
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try { list = sheet.cssRules; } catch { continue; } // cross-origin sheet
    for (const rule of Array.from(list)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue('font-family');
      // next/font also declares a size-adjusted local "Caveat Fallback"; it is not the handwriting.
      if (!/caveat/i.test(family) || /fallback/i.test(family)) continue;
      let css = rule.cssText;
      for (const m of css.matchAll(/url\((["']?)([^)"']+)\1\)/g)) {
        try {
          const buf = await (await fetch(m[2])).arrayBuffer();
          let bin = '';
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          css = css.replace(m[0], `url(data:font/woff2;base64,${btoa(bin)})`);
        } catch { /* a face that cannot be fetched falls back to cursive */ }
      }
      rules.push(css.replace(/font-family:\s*[^;]+;/, 'font-family: "CardHand";'));
    }
  }
  return `${rules.join('\n')}\ntext { font-family: "CardHand", "Comic Sans MS", cursive; }`;
}

async function svgImage(svg: SVGSVGElement, width: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  const height = Math.round((width * vb.height) / vb.width);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.removeAttribute('class');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await handFontCss();
  clone.insertBefore(style, clone.firstChild);
  const text = resolveVars(new XMLSerializer().serializeToString(clone));
  const img = new Image(width, height);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  await img.decode();
  return img;
}

export interface CardInput {
  svg: SVGSVGElement | null;
  /** "NEWQUAY · THURSDAY" — set in capitals here. */
  kicker: string;
  sentence: string;
  facts: Array<{ label: string; value: string }>;
  /** Printed small at the foot, e.g. "godaisy.io". */
  site: string;
}

/** The card as a PNG, or null where this browser cannot make one (the share still goes, as text). */
export async function drawingCard(input: CardInput): Promise<Blob | null> {
  try {
    const { width: W, height: H, pad } = CARD;
    const C = CARD_COLOURS;
    const inner = W - pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await Promise.all([
      document.fonts?.load('700 80px Caveat'),
      document.fonts?.load('700 40px "Daisy Serif"'),
    ].filter(Boolean));

    ctx.fillStyle = C['--call-page'];
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // Kicker.
    let y = pad + 26;
    ctx.fillStyle = C['--call-ink-4'];
    ctx.font = '600 28px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(input.kicker.toLocaleUpperCase(), pad, y);

    // The sentence, as large as fits in four lines.
    let size = 84;
    let lines: string[] = [];
    for (; size >= 52; size -= 4) {
      ctx.font = `700 ${size}px Caveat, "Comic Sans MS", cursive`;
      lines = wrapText((s) => ctx.measureText(s).width, input.sentence, inner);
      if (lines.length <= 4) break;
    }
    ctx.fillStyle = C['--call-sk-ink'];
    y += 34;
    for (const line of lines) { y += size * 1.04; ctx.fillText(line, pad, y); }

    // Footer and readings, laid out from the bottom up.
    const footY = H - pad;
    const factLine = 46;
    const factsTop = footY - 74 - input.facts.length * factLine;

    // The drawing, in whatever room is left between them.
    if (input.svg) {
      const room = factsTop - (y + 36) - 24;
      const natural = (inner * input.svg.viewBox.baseVal.height) / input.svg.viewBox.baseVal.width;
      const scale = Math.min(1, room / natural);
      const w = Math.round(inner * scale);
      const img = await svgImage(input.svg, w);
      ctx.drawImage(img, pad + (inner - w) / 2, y + 36, w, Math.round(natural * scale));
    }

    let fy = factsTop;
    for (const f of input.facts) {
      fy += factLine;
      ctx.font = '400 32px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = C['--call-ink-4'];
      ctx.fillText(f.label, pad, fy);
      const lw = ctx.measureText(`${f.label}  `).width;
      ctx.font = '700 32px -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = C['--call-ink-1'];
      ctx.fillText(f.value, pad + lw, fy);
    }

    // A pencil rule, then the mark.
    ctx.strokeStyle = C['--call-sk-pencil'];
    ctx.setLineDash([10, 9]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, footY - 52);
    ctx.lineTo(W - pad, footY - 52);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C['--call-ink-1'];
    ctx.font = '700 38px "Daisy Serif", Georgia, serif';
    ctx.fillText('Go Daisy', pad, footY);
    ctx.fillStyle = C['--call-ink-4'];
    ctx.font = '400 30px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(input.site, W - pad, footY);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return null;
  }
}
