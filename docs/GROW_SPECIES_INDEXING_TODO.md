# Grow species pages: 318 crawled and not indexed

**Date:** 8 September 2026
**Status:** ⏳ PLANNED — not started, and **not to be started from this side**
**Owner:** Joe (Grow Daisy)
**Source:** Search Console, `sc-domain:godaisy.io` → Page indexing → Crawled – currently not indexed

Written up so whoever picks this up does not have to re-derive it. No code
change has been made. Go Daisy work in this repo should leave the Grow species
pages, their sitemap and their templates alone.

---

## The finding

450 English species pages are submitted in `sitemap-core.xml`. **318 have been
crawled and declined**, so at most 132 are indexed. First detected 25 July 2026.

The `Source` column reads *Google systems*, not *Website*. There is no error to
fix: Google fetched each page, judged it, and chose not to index it.

## Why, measured

`plant_species` splits cleanly on how much prose a species actually has:

| unique prose (description + advice) | species | has `howto_steps` | has `faqs` | avg chars |
| --- | --- | --- | --- | --- |
| under 200 chars | **330** | 0 | 0 | 129 |
| 400–800 | 32 | 32 | 32 | 746 |
| 800+ | 88 | 88 | 88 | 920 |

330 thin against 318 declined.

Rendered, the thinness is starker than the character counts suggest — visible
words on the live page, Googlebot user-agent:

```
rue            217 words     62 chars unique to rue, about ten words
purslane       254 words
rosemary       604 words
sweet-cherry  1118 words
```

`rue` has one sentence and no advice at all. Roughly **95% of that page is
template** — nav, headings, related species, footer — shared byte-for-byte with
the other 449. A boilerplate page with a sentence swapped in is precisely what
"crawled – currently not indexed" describes.

## The complication, and it matters

**Enrichment alone has not been sufficient.** Rosemary (604 words, `howto_steps`
and `faqs`) and sweet-cherry (1,118 words, both) are also in the declined list.

That fits a property with 8 clicks against 2.65k impressions over 90 days at
average position 44.5 — some of this is site authority, and no amount of content
per page addresses that directly.

**Confidence:** Search Console's UI would only surrender 10 of the 318 example
URLs (the rows-per-page control did not take). Two enriched pages in a sample of
ten is suggestive, not conclusive. Anyone acting on this should pull the full
list via EXPORT or the Search Console API first — the ratio of enriched to thin
in the full 318 is the number that decides whether enrichment is worth doing.

## Options, in the order they were considered

1. **Enrich the remaining 330.** The real fix, and content work rather than code
   — 120 species already have `howto_steps` and `faqs` through Cowork's CSV/SQL
   workflow, so the pipeline exists. Caveat above: verify enrichment actually
   correlates with indexing before spending the effort on 330 more.

2. **Gate `sitemap-core.xml` on enrichment.** List the 120 that are ready, hold
   back the 330 that are not. Deindexes nothing and hides nothing; it stops
   asking Google to judge pages it has already judged, and concentrates crawl
   budget. There is precedent in the same codebase: the seven per-language
   sitemaps already gate on translation-cache state, for the same reason.

3. **Nothing.** It is a quality signal, not a defect, and the pages cost little
   where they are.

## Related, and already done

- The **296 "Alternative page with proper canonical tag"** in the same report
  were a different fault on the *localised* species pages — they canonicalised
  to the English page while their own hreflang advertised them as alternates.
  Fixed and deployed, PR #193.
- The **crawler 503 gate** in `pages/grow/[lang]/species/[slug].tsx` is separate
  again and deliberate. It leaves 2,360 of the 3,150 localised pages unservable
  until the translation cache warms; a plan exists to warm French and Spanish on
  the next DeepL cycle.
