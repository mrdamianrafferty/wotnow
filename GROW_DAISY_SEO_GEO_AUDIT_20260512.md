# Grow Daisy — SEO / GEO / ASO Audit
**Date:** 12 May 2026  
**Auditor:** Claude (claude-sonnet-4-6)  
**Scope:** grow.godaisy.io — organic search, AI answer engines (GEO), App Store/Play Store (ASO)  
**Status:** P0 fixes in progress on branch `grow-daisy/p0-seo-fixes`

---

## Executive Summary

Grow Daisy has strong horticultural content but almost no organic visibility because the technical SEO layer is broken at the foundation. Five P0 issues block crawlers from even indexing the product correctly. The biggest lever — species pages — serves an empty shell to Googlebot today. Fixing all five P0s is expected to unlock indexing of 50k+ plant pages within 4–8 weeks of deployment.

---

## §1  P0 Issues (blocking indexing)

### §1.1  Sitemap returns 405 and lists 404 routes
**Severity:** P0 — crawlers that HEAD-probe the sitemap before fetching see a 405 and may skip it entirely.  
**Root cause:** `pages/api/sitemap.xml.ts` only accepts `GET`. Crawlers commonly send `HEAD`. The Grow branch also lists `/grow/tasks` and `/grow/calendar` which both 404 (routes do not exist in `pages/grow/`).  
**Fix:** Accept `HEAD` in the handler. Replace the hardcoded Grow URL list with real routes + dynamically fetched plant species slugs from `plant_species`.

### §1.2  Canonical and og:url point to godaisy.io, not grow.godaisy.io
**Severity:** P0 — Google sees `<link rel="canonical" href="https://godaisy.io/grow">` on a page served from `grow.godaisy.io`. This signals the page's authoritative version is on a different domain. The Grow domain will not accumulate PageRank.  
**Root cause:** `pages/grow/index.tsx` has `https://godaisy.io/grow` hardcoded in canonical and og:url.  
**Fix:** Switch all canonical/og:url/og:image refs to `https://grow.godaisy.io`.

### §1.3  Species pages are entirely client-rendered — Googlebot sees an empty shell
**Severity:** P0 — The single biggest organic opportunity. There are 50k+ plant species pages. Today Googlebot fetches `/grow/species/tomato` and receives `<h1>Species</h1>` with body text "No species loaded." All species data is fetched client-side via `useEffect` after hydration.  
**Fix:** Add `getStaticProps` + `getStaticPaths` with `fallback: 'blocking'` and ISR (`revalidate: 86400`). Server-render the above-the-fold species content (name, description, planting calendar, quick facts, JSON-LD). See §4 for full spec.

### §1.4  JSON-LD declares "Go Daisy" on the Grow subdomain
**Severity:** P0 — `components/JsonLd.tsx` `getAppConfig()` falls back to "Go Daisy" when `window` is undefined (i.e. during SSR). All server-rendered JSON-LD on grow.godaisy.io names the wrong product.  
**Root cause:** The hostname check uses `window.location.hostname` which is undefined on the server.  
**Fix:** Add an explicit `app` prop to `getAppConfig()` (and components that call it) so the correct identity can be passed from `_app.tsx` where `useRouter()` is available at SSR time.

### §1.5  No robots.txt or sitemap declaration
**Severity:** P0 — grow.godaisy.io serves no `robots.txt`. Googlebot uses a default allow-all policy but cannot discover the sitemap without a declaration.  
**Fix (not yet done, P0.5 below covers the page-level piece):** Add `/public/robots.txt` with:
```
User-agent: *
Allow: /
Sitemap: https://grow.godaisy.io/api/sitemap.xml
```
Also add `Sitemap: https://godaisy.io/api/sitemap.xml` for the Go Daisy domain.  
**Note:** This is a quick follow-up; include in the same PR as P0.1–P0.4.

### §1.6  Root redirect is temporary (307) — no PageRank transfer
**Severity:** P0 — `next.config.mjs` uses `permanent: false` for `grow.godaisy.io/ → /grow` and `fishfindr.eu/ → /findr`. A 307 does not transfer PageRank. Any links pointing at the root domain are wasted.  
**Fix:** Change to `permanent: true` (308).

---

## §2  P1 Issues (high impact, ship within 30 days)

### §2.1  No hreflang tags
The app supports 6 languages (EN, FR, ES, DE, IT, PT) but serves no `hreflang` annotations. Google cannot canonicalise language variants.

### §2.2  Meta description for /grow uses developer copy
"Plan your garden with weather-based task recommendations. Get personalized planting calendars, care reminders, and optimal timing for your growing zone." — functional but not keyword-targeted for UK searches. Target: "UK garden planner — personalised planting calendar, frost dates, and weather-aware tasks for your postcode."

### §2.3  No llms.txt
AI answer engines (Perplexity, ChatGPT, Gemini) look for `/llms.txt` to understand how to use content. Grow Daisy's species content is ideal for GEO attribution if exposed correctly.

### §2.4  No structured data on the /grow homepage
The homepage has zero JSON-LD. At minimum: `WebSite`, `Organization`, `SoftwareApplication`. This blocks rich snippets in SERPs.

### §2.5  RHS hardiness ratings missing
UK gardeners search for "RHS H rating" constantly. The database stores USDA zones. Map USDA → RHS H1–H7 and surface the RHS rating on species pages.

---

## §3  P2 Issues (important, 60-day horizon)

### §3.1  No Open Graph image for species pages
Species pages have no `og:image`. Shares on social/WhatsApp show a blank card. This reduces CTR from social referrals.

### §3.2  Internal linking
No "related plants" or "companion plants" links on species pages. Google uses internal links to discover and weight pages. Each species page should link to 3–6 related species.

### §3.3  Page speed — LCP on species page
Because content is client-rendered, LCP is driven by JavaScript execution rather than the hero image. Expected LCP after SSR fix: < 2.5s. Before: likely > 4s.

### §3.4  Universal Links / App Clips not registered
The `.well-known/apple-app-site-association` file exists but the Grow Daisy app bundle ID may not be listed. Deep links from Google Search (iOS) to the native app require a valid AASA.

---

## §4  P0.5 Species Page SSR — Full Spec

### What goes server-side
The following content is rendered to HTML in `getStaticProps` and visible to crawlers without JavaScript:

- `<h1>{name} ({scientificName}) — UK growing guide</h1>`
- **Quick-answer paragraph** (80–150 words): when to sow, when to plant out, when to harvest, RHS hardiness equivalent in plain English. This paragraph is the text AI answer engines will quote.
- Description (species.description or Wikipedia fallback)
- Quick facts (size, sun, soil, watering)
- Hardiness range (USDA + derived RHS equivalent)
- Planting calendar — generic UK windows (no user location required)
- Companion planting list
- Pest resilience score
- Visual characteristics (flower colour, fruit, leaf)
- Wildlife & ecology
- Breadcrumbs

### JSON-LD blocks added per species page
- `Article` — `datePublished`, `dateModified`, `author: "Grow Daisy editorial"`
- `HowTo` — steps: sow, transplant, water, feed, harvest
- `FAQPage` — 4–6 questions: "When to sow [crop] in the UK?", "Does [crop] need full sun?", etc.
- `BreadcrumbList`
- Bioschemas `Plant` — `scientificName`, `taxonRank`, `nativeRange`

### What stays client-side
- "Add to Garden" button (auth required)
- Location dialog and personalised calendar refinement
- "My tasks" status badges
- Hero image expand-on-tap

### Pre-build list (top 200 by UK search volume)
See handoff doc for full list. Pre-rendered with `getStaticPaths` returning these slugs + `fallback: 'blocking'` for the long tail.

### ISR strategy
`revalidate: 86400` (24h) — species data changes infrequently. On-demand revalidation via `/api/revalidate?secret=X&path=/grow/species/tomato` to be wired up in P1.

---

## §5  GEO (AI Answer Engine Optimisation)

Grow Daisy's species content is highly answerable — every page should be a candidate for ChatGPT/Perplexity citations. Current blockers:

1. Content is not crawlable (species pages are client-rendered) — fixed by P0.5
2. No quick-answer paragraph above the fold — added in P0.5
3. No `llms.txt` — P1
4. No structured `HowTo` or `FAQPage` — added in P0.5

After P0.5, each species page should contain a paragraph that directly answers "How do I grow tomatoes in the UK?" in 100 words. This is the GEO equivalent of a featured snippet.

---

## §6  ASO (App Store Optimisation)

### §6.1  Current state
- App Store listing not reviewed in this audit (no TestFlight access)
- Play Store listing not reviewed

### §6.2  Recommended actions (P1)
- Title: "Grow Daisy — UK Garden Planner" (include keyword "UK" in title, max 30 chars)
- Subtitle: "Planting calendar & frost alerts"
- Keywords field: prioritise "garden planner", "planting calendar", "when to plant", "frost dates", "UK garden"
- Screenshots: show the planting calendar prominently (highest value feature for search)
- Ratings prompt: trigger after first successful "Add to Garden" action, not on app open

---

## §7  90-Day Action Plan

| Week | Work |
|------|------|
| 1–2 | P0.1–P0.5 deployed (this branch) |
| 3   | robots.txt, llms.txt, homepage JSON-LD |
| 4–5 | hreflang + language sitemap |
| 6–7 | USDA → RHS H-rating mapping, surface on species pages |
| 8   | Internal linking (related + companion plants) |
| 9–10 | "When to plant in [postcode]" dynamic pages |
| 11–12 | ASO audit + App Store listing rewrite |

---

## §8  Acceptance Criteria (P0 only)

```bash
# 308, not 307
curl -sI https://grow.godaisy.io/ | grep "HTTP/"

# 200, not 405
curl -sI https://grow.godaisy.io/api/sitemap.xml | grep "HTTP/"

# Must not contain /grow/tasks or /grow/calendar
curl -s https://grow.godaisy.io/api/sitemap.xml | grep -E "tasks|calendar"

# Must contain species pages
curl -s https://grow.godaisy.io/api/sitemap.xml | grep "species/tomato"

# Canonical must be grow.godaisy.io
curl -sL -H "User-Agent: Googlebot/2.1" https://grow.godaisy.io/grow \
  | grep 'rel="canonical"'

# JSON-LD must name Grow Daisy
curl -sL -H "User-Agent: Googlebot/2.1" https://grow.godaisy.io/grow \
  | grep '"name":"Grow Daisy"'

# Species h1 must have real content
curl -sL -H "User-Agent: Googlebot/2.1" https://grow.godaisy.io/grow/species/tomato \
  | grep -oE '<h1[^>]*>[^<]+</h1>'
# Expected: something containing "Tomato" not "Species"
```
