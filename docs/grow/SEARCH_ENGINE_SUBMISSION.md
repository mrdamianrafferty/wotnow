# Grow Daisy — Search engine & AI crawler submission

**Date:** 14 May 2026
**Status:** Ready to run after P0.5 SSR deploy (14 May 2026)

After the four green-light verification checks pass, submit the 120 live species URLs to search engines and AI crawler indexes. This document walks through every service with URLs, exact commands, and a recommended order.

---

## Service URLs reference

| Service | URL | Purpose |
|---|---|---|
| **Google Search Console** | https://search.google.com/search-console | Sitemap submission + URL Inspection |
| **Google Rich Results Test** | https://search.google.com/test/rich-results | Validate HowTo / FAQ / Plant schemas |
| **Schema.org Validator** | https://validator.schema.org/ | Deeper structured-data check |
| **Bing Webmaster Tools** | https://www.bing.com/webmasters/ | Sitemap + URL submission (powers ChatGPT Search + Copilot) |
| **IndexNow Protocol** | https://www.indexnow.org/ | Push-notification protocol — Bing, Yandex, Naver participate |
| **IndexNow Setup FAQ** | https://www.indexnow.org/faq#setup-and-installation | Official setup walkthrough — key hosting, endpoints, edge cases |
| **IndexNow API endpoint** | https://api.indexnow.org/indexnow | The POST endpoint for URL submission |
| **Google Search Status Dashboard** | https://status.search.google.com/ | Check for indexing outages before troubleshooting |
| **Bing Search Status** | https://www.bingplaces.com/help/Status | Bing-side status check |

---

## Step 1: Validate the structured data (5 minutes — do first)

If any species page has a schema error, fix it before search engines bake the error into their crawl.

**1a. Google Rich Results Test**

Paste each URL into https://search.google.com/test/rich-results

| URL | Expected detected schemas |
|---|---|
| https://grow.godaisy.io/grow/species/tomato | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/clematis | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/hellebore | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/sweet-cherry | HowTo, FAQ, Plant |
| https://grow.godaisy.io/grow/species/wild-garlic | HowTo, FAQ, Plant |

Each should report **zero errors**. Warnings are acceptable; errors must be fixed.

**1b. Schema.org Validator**

Paste the same five URLs into https://validator.schema.org/ for deeper schema-level validation. Pay attention to:
- `HowTo.step` — each step must have `name` and `text`
- `FAQPage.mainEntity` — each `Question` needs an `Answer`
- `Plant` — must have `name` and `scientificName`

If any errors surface, flag to Code before moving to Step 2.

---

## Step 2: IndexNow (10 minutes — biggest AI-crawler impact)

**Why this matters most**: IndexNow is the fastest path to getting URLs into Bing's index, which directly feeds **ChatGPT Search**, **Microsoft Copilot**, and **DuckDuckGo**. A single API call pushes all 120 species URLs. No daily quota concern.

**Why Google isn't on this list**: Google does not participate in IndexNow. For Google indexing, see Step 4.

**Authoritative reference**: https://www.indexnow.org/faq#setup-and-installation — official setup FAQ from the IndexNow consortium. Covers key-hosting edge cases, alternative endpoints (Bing's direct endpoint, Yandex's), and what to do for multi-host sites.

### 2a. Generate a key and host it as a file

The key is any alphanumeric string 8–128 characters. Generate one:

```bash
openssl rand -hex 16
```

Example output: `7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d`

**Host the key as a file** at the root of the site so IndexNow can verify ownership. Two options:

- **Option A (preferred)**: Add `public/<your-key>.txt` to the Next.js repo with the key as the file content. Single character of content per line is fine. Commit and let Vercel deploy.
- **Option B (quicker)**: Vercel rewrites — add a rewrite rule from `/<your-key>.txt` to a static endpoint serving the key string.

Verify the key is accessible: `curl -s https://grow.godaisy.io/<your-key>.txt` should return the key string.

### 2b. Push all 120 species URLs in a single API call

Save the payload as `/tmp/indexnow-payload.json` (replace `<YOUR-KEY>` with your actual key):

```json
{
  "host": "grow.godaisy.io",
  "key": "<YOUR-KEY>",
  "keyLocation": "https://grow.godaisy.io/<YOUR-KEY>.txt",
  "urlList": [
    "https://grow.godaisy.io/grow/species/alchemilla-mollis",
    "https://grow.godaisy.io/grow/species/apple",
    "https://grow.godaisy.io/grow/species/aquilegia",
    "https://grow.godaisy.io/grow/species/asparagus",
    "https://grow.godaisy.io/grow/species/aubergine",
    "https://grow.godaisy.io/grow/species/basil",
    "https://grow.godaisy.io/grow/species/bay",
    "https://grow.godaisy.io/grow/species/beech",
    "https://grow.godaisy.io/grow/species/beetroot",
    "https://grow.godaisy.io/grow/species/bergenia",
    "https://grow.godaisy.io/grow/species/blackberry",
    "https://grow.godaisy.io/grow/species/blackcurrant",
    "https://grow.godaisy.io/grow/species/blueberry",
    "https://grow.godaisy.io/grow/species/bluebell",
    "https://grow.godaisy.io/grow/species/borage",
    "https://grow.godaisy.io/grow/species/broad-bean",
    "https://grow.godaisy.io/grow/species/broccoli",
    "https://grow.godaisy.io/grow/species/brussels-sprouts",
    "https://grow.godaisy.io/grow/species/cabbage",
    "https://grow.godaisy.io/grow/species/carrot",
    "https://grow.godaisy.io/grow/species/catmint",
    "https://grow.godaisy.io/grow/species/cauliflower",
    "https://grow.godaisy.io/grow/species/celeriac",
    "https://grow.godaisy.io/grow/species/celery",
    "https://grow.godaisy.io/grow/species/chard",
    "https://grow.godaisy.io/grow/species/chervil",
    "https://grow.godaisy.io/grow/species/chicory",
    "https://grow.godaisy.io/grow/species/chilli",
    "https://grow.godaisy.io/grow/species/chives",
    "https://grow.godaisy.io/grow/species/clematis",
    "https://grow.godaisy.io/grow/species/coriander",
    "https://grow.godaisy.io/grow/species/cosmos",
    "https://grow.godaisy.io/grow/species/courgette",
    "https://grow.godaisy.io/grow/species/crocus",
    "https://grow.godaisy.io/grow/species/cucumber",
    "https://grow.godaisy.io/grow/species/daffodil",
    "https://grow.godaisy.io/grow/species/dahlia",
    "https://grow.godaisy.io/grow/species/dill",
    "https://grow.godaisy.io/grow/species/echinacea",
    "https://grow.godaisy.io/grow/species/elder",
    "https://grow.godaisy.io/grow/species/endive",
    "https://grow.godaisy.io/grow/species/fennel-bulb",
    "https://grow.godaisy.io/grow/species/fennel-herb",
    "https://grow.godaisy.io/grow/species/foxglove",
    "https://grow.godaisy.io/grow/species/french-bean",
    "https://grow.godaisy.io/grow/species/french-tarragon",
    "https://grow.godaisy.io/grow/species/garlic",
    "https://grow.godaisy.io/grow/species/german-chamomile",
    "https://grow.godaisy.io/grow/species/globe-artichoke",
    "https://grow.godaisy.io/grow/species/gooseberry",
    "https://grow.godaisy.io/grow/species/hardy-geranium",
    "https://grow.godaisy.io/grow/species/hazelnut",
    "https://grow.godaisy.io/grow/species/hellebore",
    "https://grow.godaisy.io/grow/species/heuchera",
    "https://grow.godaisy.io/grow/species/holly",
    "https://grow.godaisy.io/grow/species/hosta",
    "https://grow.godaisy.io/grow/species/hydrangea",
    "https://grow.godaisy.io/grow/species/hyssop",
    "https://grow.godaisy.io/grow/species/jerusalem-artichoke",
    "https://grow.godaisy.io/grow/species/kale",
    "https://grow.godaisy.io/grow/species/kohlrabi",
    "https://grow.godaisy.io/grow/species/lambs-lettuce",
    "https://grow.godaisy.io/grow/species/lavender",
    "https://grow.godaisy.io/grow/species/leek",
    "https://grow.godaisy.io/grow/species/lemon-balm",
    "https://grow.godaisy.io/grow/species/lettuce",
    "https://grow.godaisy.io/grow/species/lovage",
    "https://grow.godaisy.io/grow/species/mangetout",
    "https://grow.godaisy.io/grow/species/marigold",
    "https://grow.godaisy.io/grow/species/mint",
    "https://grow.godaisy.io/grow/species/mizuna",
    "https://grow.godaisy.io/grow/species/mustard-greens",
    "https://grow.godaisy.io/grow/species/nasturtium",
    "https://grow.godaisy.io/grow/species/onion",
    "https://grow.godaisy.io/grow/species/oregano",
    "https://grow.godaisy.io/grow/species/pak-choi",
    "https://grow.godaisy.io/grow/species/parsley",
    "https://grow.godaisy.io/grow/species/parsnip",
    "https://grow.godaisy.io/grow/species/pea",
    "https://grow.godaisy.io/grow/species/pear",
    "https://grow.godaisy.io/grow/species/peony",
    "https://grow.godaisy.io/grow/species/plum",
    "https://grow.godaisy.io/grow/species/potato",
    "https://grow.godaisy.io/grow/species/primrose",
    "https://grow.godaisy.io/grow/species/pulmonaria",
    "https://grow.godaisy.io/grow/species/pumpkin",
    "https://grow.godaisy.io/grow/species/radish",
    "https://grow.godaisy.io/grow/species/raspberry",
    "https://grow.godaisy.io/grow/species/redcurrant",
    "https://grow.godaisy.io/grow/species/rhubarb",
    "https://grow.godaisy.io/grow/species/rocket",
    "https://grow.godaisy.io/grow/species/rose",
    "https://grow.godaisy.io/grow/species/rosemary",
    "https://grow.godaisy.io/grow/species/runner-bean",
    "https://grow.godaisy.io/grow/species/sage",
    "https://grow.godaisy.io/grow/species/salad-burnet",
    "https://grow.godaisy.io/grow/species/salsify",
    "https://grow.godaisy.io/grow/species/salvia",
    "https://grow.godaisy.io/grow/species/shallot",
    "https://grow.godaisy.io/grow/species/snowdrop",
    "https://grow.godaisy.io/grow/species/sorrel",
    "https://grow.godaisy.io/grow/species/spinach",
    "https://grow.godaisy.io/grow/species/spring-onion",
    "https://grow.godaisy.io/grow/species/strawberry",
    "https://grow.godaisy.io/grow/species/sunflower",
    "https://grow.godaisy.io/grow/species/swede",
    "https://grow.godaisy.io/grow/species/sweet-cherry",
    "https://grow.godaisy.io/grow/species/sweet-chestnut",
    "https://grow.godaisy.io/grow/species/sweet-marjoram",
    "https://grow.godaisy.io/grow/species/sweet-pea",
    "https://grow.godaisy.io/grow/species/sweet-pepper",
    "https://grow.godaisy.io/grow/species/sweetcorn",
    "https://grow.godaisy.io/grow/species/thyme",
    "https://grow.godaisy.io/grow/species/tomato",
    "https://grow.godaisy.io/grow/species/tulip",
    "https://grow.godaisy.io/grow/species/turnip",
    "https://grow.godaisy.io/grow/species/watercress",
    "https://grow.godaisy.io/grow/species/whitecurrant",
    "https://grow.godaisy.io/grow/species/wild-garlic",
    "https://grow.godaisy.io/grow/species/winter-savory"
  ]
}
```

Then push:

```bash
curl -X POST -H "Content-Type: application/json; charset=utf-8" \
  --data @/tmp/indexnow-payload.json \
  https://api.indexnow.org/indexnow
```

**Expected response**: `HTTP/2 200` with empty body. **`HTTP/2 202`** means accepted-for-processing — also success. Anything else = error in payload or key verification.

### 2c. Verify acceptance

After IndexNow accepts, Bing's index typically picks up the URLs within hours; full crawl can take 1–3 days. Check progress in Bing Webmaster Tools (Step 3) under "Submit URLs" history.

---

## Step 3: Bing Webmaster Tools (15 minutes)

**Bing's reach matters because**: Bing's index powers ChatGPT Search, Microsoft Copilot, and DuckDuckGo. Visibility here is visibility across all of those.

### 3a. Account and property setup

URL: https://www.bing.com/webmasters/

1. Sign in (Microsoft account or import from Google Search Console — Bing has a one-click GSC import that pre-fills properties)
2. If `grow.godaisy.io` isn't already a property, add it. Verification options: DNS TXT record, HTML file upload, or meta tag.
3. Confirm the site shows verified status.

### 3b. Sitemap submission

In Bing Webmaster Tools sidebar: **Sitemaps** → **Submit sitemap**

Submit: `https://grow.godaisy.io/sitemap.xml`

Bing auto-detects updates. One-time submission.

### 3c. URL Submission (the big quota)

In sidebar: **URL Inspection** → **Submit URLs** (or **URL Submission** depending on UI version)

Bing allows **10,000 URLs per day** (vs Google's ~10). Paste the 120 species URLs in one go — easy to do by copying from Step 2's payload.

Bing typically crawls submitted URLs within 24 hours.

---

## Step 4: Google Search Console (5 minutes today + ongoing for 2 weeks)

### 4a. Sitemap submission

URL: https://search.google.com/search-console

1. Sign in, confirm `grow.godaisy.io` property exists.
2. Sidebar: **Sitemaps** → **Add a new sitemap**
3. Enter: `sitemap.xml`
4. Submit. Status should show "Success" within minutes.

### 4b. URL Inspection — measured pace

Google severely ratelimits URL inspection requests (~10/day) and **penalises bulk-submission patterns**. Don't try to push all 120.

**Daily for 12 days**: pick 10 species, run them through URL Inspection (paste each URL in the search bar at the top of Search Console), click **Request indexing**.

**Suggested priority order** (highest commercial value first, alphabetical within tier):

**Tier 1 (days 1–3 — UK veg staples)**:
tomato, potato, carrot, courgette, runner-bean, broad-bean, garlic, onion, lettuce, kale, leek, parsnip, beetroot, spinach, chard, pea, sweetcorn, sweet-pepper, chilli, aubergine, brussels-sprouts, broccoli, cauliflower, cabbage, turnip, swede, radish, pumpkin, cucumber, french-bean

**Tier 2 (days 4–6 — herbs + soft fruit)**:
basil, parsley, coriander, mint, rosemary, thyme, sage, chives, oregano, dill, bay, lemon-balm, sorrel, borage, strawberry, raspberry, blackcurrant, blueberry, gooseberry, redcurrant, whitecurrant, blackberry, rhubarb

**Tier 3 (days 7–9 — fruit trees + ornamentals)**:
apple, pear, plum, sweet-cherry, elder, hazelnut, holly, beech, sweet-chestnut, rose, dahlia, sunflower, sweet-pea, cosmos, marigold, nasturtium, lavender, hydrangea, peony

**Tier 4 (days 10–12 — long-tail)**:
foxglove, salvia, echinacea, catmint, hardy-geranium, clematis, hosta, aquilegia, hellebore, pulmonaria, primrose, heuchera, bergenia, alchemilla-mollis, snowdrop, crocus, daffodil, tulip, bluebell — and everything else not yet covered.

After 12 days you'll have prompted indexing for the full 120 without triggering Google's anti-spam thresholds.

---

## Step 5: Submit to other AI-aware tools

**llms.txt** — already serving at `https://grow.godaisy.io/llms.txt` (PR #76 chunk E). No submission needed; AI crawlers like Claude and Perplexity check this file when discovering sites.

**Common Crawl** — open-source web crawl used by many AI training pipelines. No submission process — they crawl from a seed list. Inclusion happens organically once Google or Bing have you indexed.

---

## Monitoring cadence

| Week | Action |
|---|---|
| **Week 1** | Run Steps 1–4 in the orders described. End of week: check Bing Webmaster Tools dashboard for first indexed pages. |
| **Week 2** | Continue Google URL Inspection daily. Check Bing's "Page Reports" for indexed pages. First Perplexity citation attempts via test queries (see verification doc §8). |
| **Week 3–4** | Google Search Console **Coverage Report** should start showing indexed species pages. First ChatGPT/Copilot AI citations possible. |
| **Month 2** | Established indexing. Google rich-snippet eligibility detected. Test Rich Results Test on 5 fresh species to confirm. |
| **Month 3+** | Long-tail organic search begins to compound. Capture AI citations as they appear — case study material. |

---

## Quick reference: the four submission URLs

If you're working through this in one sitting and just need the bookmark bar:

| Service | URL |
|---|---|
| Rich Results Test | https://search.google.com/test/rich-results |
| Schema.org Validator | https://validator.schema.org/ |
| Google Search Console | https://search.google.com/search-console |
| Bing Webmaster Tools | https://www.bing.com/webmasters/ |
| IndexNow API | https://api.indexnow.org/indexnow |

---

## Common errors & troubleshooting

**Rich Results Test reports "missing field"** — schema is incomplete. The JSON-LD blocks PR #76 added should be complete; if a field is missing, it likely needs a code fix in the species page template. Report to Code with the URL and the missing field.

**IndexNow returns 422** — key verification failed. Check `https://grow.godaisy.io/<your-key>.txt` returns the key string. The file content must exactly match the key value used in the JSON payload.

**Bing URL submission rejected** — too many submissions too fast, or non-https URL. Bing accepts only https URLs. Wait an hour and retry.

**Google URL Inspection: "URL is not on Google"** — page exists but hasn't been crawled yet. Click "Request indexing" — usually crawled within 24–48 hours.

**Google URL Inspection: "Discovered — currently not indexed"** — Google found the URL but chose not to index. Common for low-value or duplicate pages. Wait 1–2 weeks; if it persists, check the page has unique, valuable content (our 120 should easily clear this bar).

---

## After deploy verification

Confirm the four green-light checks pass first:

```bash
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c "Sow tomato"
curl -s https://grow.godaisy.io/grow/species/tomato | grep -c 'application/ld+json'
curl -sI https://grow.godaisy.io/grow/species/columbine | head -1
curl -sI https://grow.godaisy.io/sitemap.xml | head -1
```

Expected: `1+`, `3+` (currently `7`), `HTTP/2 308`, `HTTP/2 200`. If those four are green, the submission pipeline is ready to run.

See `/docs/grow/P05_SSR_VERIFICATION.md` for the full verification suite.
