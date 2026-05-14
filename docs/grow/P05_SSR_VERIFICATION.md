# P0.5 SSR — Post-deploy verification

**Author:** Cowork → Code
**Date:** 14 May 2026
**Re:** PR #79 (P0.5 species SSR conversion)

After PR #79 merges and deploys to production, run these checks to confirm SSR is working end-to-end and that AI scrapers + search engines can see the structured content.

Total runtime ~5 minutes for §1–§5 and §9. Sections §6–§8 are slower (Google validators, AI scrapers) and can run async.

---

## §1: SSR content in initial HTML

The content must be in the SSR'd HTML payload, not just in client-side React state. If `curl` (no JavaScript execution) finds the text, AI scrapers and Google can find it too.

```bash
# Tomato — quick-answer text
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c "Sow tomato seeds indoors"
# expect: 1 or more

# Blueberry — acid-soil specialist content
curl -s https://grow.godaisy.io/grow/species/blueberry | grep -c "ericaceous compost"

# Foxglove — toxic plant content
curl -s https://grow.godaisy.io/grow/species/foxglove | grep -c "cardiac glycosides"

# Hellebore (renamed from helleborus by resolver) — verify rename + content together
curl -s https://grow.godaisy.io/grow/species/hellebore | grep -c "cut every leaf down to the crown"

# Chard (renamed from swiss-chard) — verify rename + content
curl -s https://grow.godaisy.io/grow/species/chard | grep -c "Boltardy"

# Aquilegia (renamed from columbine) — verify rename + content
curl -s https://grow.godaisy.io/grow/species/aquilegia | grep -c "granny's bonnet"

# Sweet cherry (Gisela 5 + netting content)
curl -s https://grow.godaisy.io/grow/species/sweet-cherry | grep -c "Gisela 5"

# Wild garlic (lily-of-the-valley confusion safety call)
curl -s https://grow.godaisy.io/grow/species/wild-garlic | grep -c "Convallaria"
```

All should return `1` or more.

---

## §2: JSON-LD schema blocks in initial HTML

Each populated species page should serve 3–4 JSON-LD blocks (`HowTo`, `FAQPage`, `Plant`, optionally `Article`).

```bash
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c 'application/ld+json'
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c '"@type":"HowTo"'
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c '"@type":"FAQPage"'
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c '"@type":"Plant"'
for slug in foxglove hellebore wild-garlic; do
  echo "$slug: $(curl -s https://grow.godaisy.io/grow/species/$slug | grep -c 'application/ld+json') JSON-LD blocks"
done
```

Expected output (in order): `3+`, `1`, `1`, `1`, then the three spot-checks each showing `3+`.

---

## §3: Server-side 308 redirects on alias slugs

The old prefixed URLs and resolver renames should 308-redirect server-side (no JS). Check at HTTP layer.

```bash
curl -sI https://grow.godaisy.io/grow/species/fruit-apple | head -1
curl -sI https://grow.godaisy.io/grow/species/fruit-apple | grep -i location
curl -sI https://grow.godaisy.io/grow/species/herb-lovage | head -1
curl -sI https://grow.godaisy.io/grow/species/tree-silver-birch | head -1
curl -sI https://grow.godaisy.io/grow/species/columbine | head -1
curl -sI https://grow.godaisy.io/grow/species/columbine | grep -i location
curl -sI https://grow.godaisy.io/grow/species/helleborus | head -1
curl -sI https://grow.godaisy.io/grow/species/geranium-hardy | head -1
curl -sI https://grow.godaisy.io/grow/species/swiss-chard | head -1
curl -sI https://grow.godaisy.io/grow/fr/species/fruit-apple | head -1
curl -sI https://grow.godaisy.io/grow/es/species/herb-lovage | head -1
```

Expected: all `head -1` calls return `HTTP/2 308`; `grep -i location` returns the corresponding canonical URL (e.g. `location: /grow/species/apple` for fruit-apple; `location: /grow/species/aquilegia` for columbine).

**Important**: PR #79 changed alias redirects from client-side `router.replace` to server-side 308. Curl now shows the redirect; previously it served 200 with a JS redirect inside.

---

## §4: Localised routes serve content

The `/grow/[lang]/species/[slug]` route was SSR'd in PR #76 and should continue to serve content after PR #79.

```bash
for lang in en fr es de it pt; do
  echo "$lang: $(curl -sI https://grow.godaisy.io/grow/$lang/species/tomato | head -1)"
done
curl -s https://grow.godaisy.io/grow/fr/species/tomato | grep -c "tomato"
curl -s https://grow.godaisy.io/grow/es/species/tomato | grep -c "tomato"
```

Expected: all six language routes return `HTTP/2 200`. Content greps return `1+` (English fallback acceptable for untranslated species).

---

## §5: Content-empty species graceful fallback

The ~50k species rows without content drops should still serve 200 with basic info — no error, no empty JSON-LD schemas.

```bash
RANDOM_SLUG=$(curl -s https://grow.godaisy.io/sitemap.xml \
  | grep -oE '/grow/species/[a-z0-9-]+' \
  | sed 's|/grow/species/||' \
  | shuf | head -1)
echo "Testing fallback for: $RANDOM_SLUG"
curl -sI https://grow.godaisy.io/grow/species/$RANDOM_SLUG | head -1
curl -s https://grow.godaisy.io/grow/species/$RANDOM_SLUG | grep -c '"itemListElement":\[\]'
curl -s https://grow.godaisy.io/grow/species/$RANDOM_SLUG | grep -c '"mainEntity":\[\]'
```

Expected: `HTTP/2 200`, then two `0` values (no empty schema arrays — broken JSON-LD attracts Google penalties).

---

## §6: Google Rich Results Test (manual, 5 spot-checks)

Run each URL through https://search.google.com/test/rich-results

| URL | Expected detected schemas |
|---|---|
| https://grow.godaisy.io/grow/species/tomato | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/clematis | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/hellebore | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/sweet-cherry | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/wild-garlic | HowTo, FAQ, Plant |

Each should report all three schemas detected with **zero errors**. Warnings are acceptable; errors mean the schema won't be eligible for rich snippets.

---

## §7: Schema.org validator (deeper schema check)

For each of the 5 URLs above, run through https://validator.schema.org/

Should validate cleanly. Pay attention to:
- `HowTo.step` — each step has `name` and `text`
- `FAQPage.mainEntity` — each `Question` has an `Answer`
- `Plant` — has `name`, `scientificName`, hardiness if Bioschemas extension supported

---

## §8: AI scraper visibility check (asynchronous, 4–8 weeks)

The slow part — AI tools update their crawl/training snapshot on different cycles. Visibility will build over weeks.

**Test queries** (run periodically):
- "How do I grow tomatoes in the UK?"
- "When should I plant snowdrops in the UK?"
- "What's the best way to grow blueberries in containers in the UK?"
- "How do I tell English bluebells from Spanish bluebells?"
- "When do I prune a plum tree and why never in winter?"

**On each platform**:
- ChatGPT — look for grow.godaisy.io in cited sources (Search-enabled chats)
- Perplexity — cited sources panel
- Claude.ai — cited sources where shown
- Google AI Overviews — cited sources in the panel

**Expected timeline**: first citations within 2–4 weeks. Established presence within 2–3 months.

---

## §9: Response-time baseline

SSR adds latency. Capture baseline now for ongoing monitoring.

```bash
echo "Cold-cache cohort:"
for slug in tomato blueberry foxglove aquilegia hellebore wild-garlic; do
  T=$(curl -s -o /dev/null -w "%{time_total}" https://grow.godaisy.io/grow/species/$slug)
  echo "  $slug: ${T}s"
done

echo "Repeated (cached) cohort:"
for slug in tomato blueberry foxglove aquilegia hellebore wild-garlic; do
  T=$(curl -s -o /dev/null -w "%{time_total}" https://grow.godaisy.io/grow/species/$slug)
  echo "  $slug: ${T}s"
done
```

**Acceptable ranges**:
- Cold first request: < 800ms (Vercel cold start + DB query)
- Cached/repeat: < 200ms (Vercel edge / ISR cache hit)

**Concerning if**: consistently > 1.5s. Investigate Vercel caching headers or ISR revalidate window.

---

## §10: Sitemap freshness

The sitemap should still serve 200 (not 405 — PR #76 fix) and include all 120 content-populated species.

```bash
# Sitemap loads
curl -sI https://grow.godaisy.io/sitemap.xml | head -1    # expect 200

# Includes our 120 species
curl -s https://grow.godaisy.io/sitemap.xml | grep -c '/grow/species/' # expect 1000+ (total) — but check 120 specifically

# Spot-check key new slugs are in sitemap (post-resolver additions)
for slug in aquilegia hellebore hardy-geranium chard brussels-sprouts globe-artichoke swede \
            lambs-lettuce chicory mangetout salad-burnet wild-garlic alchemilla-mollis \
            bergenia bluebell clematis crocus daffodil hydrangea snowdrop tulip \
            strawberry blackberry blueberry raspberry; do
  count=$(curl -s https://grow.godaisy.io/sitemap.xml | grep -c "/grow/species/$slug<")
  echo "$slug: $count"
done
# All should be 1
```

---

## Quick green-light check

If you only have 2 minutes, run these four:

```bash
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c "Sow tomato"
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c 'application/ld+json'
curl -sI https://grow.godaisy.io/grow/species/columbine | head -1
curl -sI https://grow.godaisy.io/sitemap.xml | head -1
```

Expected outputs, in order:

1. `1` or more (SSR content present in initial HTML)
2. `3` or more (JSON-LD schema blocks present)
3. `HTTP/2 308` (alias redirect working server-side)
4. `HTTP/2 200` (sitemap healthy)

If all four green: P0.5 SSR is live and the GEO compound interest starts ticking.

**zsh note (macOS default shell)**: if you're running these from a fresh terminal session, inline `#` comments after commands break the paste because zsh doesn't enable `INTERACTIVE_COMMENTS` by default. The bash blocks in this doc have inline comments stripped for paste-safety; expected outputs are documented in surrounding prose. If you want to add inline comments yourself, run `setopt interactive_comments` first.

---

## After deploy: what to expect over time

| Window | What surfaces |
|---|---|
| Day 0 (deploy) | Pages serve SSR'd content + JSON-LD; AI scrapers and search bots can see structured data on next crawl |
| Day 1–7 | Google starts re-crawling species URLs; rich-snippet eligibility detected within ~14 days for high-quality content |
| Week 2–4 | First AI tool citations (Perplexity refreshes more often than ChatGPT) — manually check the test queries in §8 |
| Month 2–3 | Established AI presence; Google rich snippets potentially live in SERPs (depends on relevance + competition) |
| Month 6+ | Long-tail organic search begins to compound — each species page becomes an SEO asset |

The 30 remaining species drafts (16 flowers + 14 trees/shrubs) become drift-target additions over time. The infrastructure is now in place; further content is pure additive value.
