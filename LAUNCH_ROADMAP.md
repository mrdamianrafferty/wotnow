# Go Daisy & Grow Daisy — Launch Roadmap

**Date:** 26 February 2026
**Status:** Active
**Scope:** All work required to bring Go Daisy and Grow Daisy to a polished, launch-ready state

This roadmap was produced from a multi-agent production readiness audit covering UX, UI, and content. Items are sequenced so that foundational work (design system, translation) lands first, enabling all subsequent improvements to be built on stable ground.

---

## Phase 0: Foundation — Already Complete

The following were completed in the Feb 2026 security hardening PR:

- [x] Delete all debug/test API endpoints and pages (11 files)
- [x] Fix push notification auth bypass (impersonation prevention)
- [x] Add auth to vouchers/validate, Stripe checkout, Google OAuth endpoints
- [x] Create shared `lib/cron-auth.ts` and harden all 8 cron endpoints
- [x] Add security headers (X-Frame-Options, HSTS, etc.) to `next.config.mjs`
- [x] Create Go Daisy password reset page (`pages/auth/reset.tsx`)
- [x] Rewrite `_error.tsx` with proper layout, Sentry, navigation
- [x] Make `SEO.tsx` app-aware (godaisy/findr/grow)
- [x] Fix BottomNav router import (next/navigation → next/router)
- [x] Remove dead code (getWeatherDay, _Head import, babel plugin)
- [x] Update tsconfig moduleResolution to bundler
- [x] Add missing env vars to .env.example

---

## Phase 1: Unify Design System Tokens

**Priority:** Highest — all subsequent UI work depends on this
**Effort:** ~8-12 hours
**Why first:** The codebase currently runs two parallel design systems (DaisyUI for Go Daisy, shadcn/Radix for Grow Daisy) with no bridge. There are 682 shadcn token references (`bg-background`, `text-foreground`, `bg-card`, etc.) across 60 component files. Fixing buttons, cards, themes, or dark mode before unifying tokens means doing the work twice.

### 1.1 Define CSS custom properties bridge

**File:** `styles/index.css`

Add a `:root` block that maps shadcn's expected CSS variables to DaisyUI's OKLCH token values. This makes both component systems render from the same colour source without rewriting either.

```css
:root {
  /* Map shadcn tokens → DaisyUI OKLCH values */
  --background: oklch(var(--b1));
  --foreground: oklch(var(--bc));
  --card: oklch(var(--b1));
  --card-foreground: oklch(var(--bc));
  --muted: oklch(var(--b2));
  --muted-foreground: oklch(var(--bc) / 0.6);
  --accent: oklch(var(--b2));
  --accent-foreground: oklch(var(--bc));
  --border: oklch(var(--bc) / 0.15);
  --ring: oklch(var(--p));
  --primary: oklch(var(--p));
  --primary-foreground: oklch(var(--pc));
  --secondary: oklch(var(--s));
  --secondary-foreground: oklch(var(--sc));
  --destructive: oklch(var(--er));
}
```

**Verification:** After adding these, all `bg-background`, `text-foreground`, `bg-card`, etc. classes should resolve to the active DaisyUI theme's colours. Visual regression test by checking Grow Daisy pages render identically before and after.

### 1.2 Fix default Button variant

**File:** `components/ui/button.tsx` (line 12)

Change:
```
"bg-violet-600 text-white hover:bg-violet-700"
```
To:
```
"bg-primary text-primary-foreground hover:bg-primary/90"
```

This makes the default button respect the active theme (emerald in Grow, cyan in Go Daisy) rather than hardcoded violet.

### 1.3 Activate the custom DaisyUI theme

**File:** `tailwind.config.cjs`

The `wotnow_compact` theme is defined but not set as the default. Evaluate whether to activate it now or create separate `godaisy` and `grow` DaisyUI themes with distinct primary colours:
- Go Daisy: cyan-700 (`#0e7490`) as primary
- Grow Daisy: emerald-600 (`#059669`) as primary

The theme can be set per-page or per-layout via `data-theme` on the `<html>` element. `GrowLayout` would set `data-theme="grow"`, Go Daisy pages would set `data-theme="godaisy"`.

### 1.4 Remove hardcoded colours from index.css

**File:** `styles/index.css`

Remove or replace:
- `background-color: #121212` fallback on `body` (causes dark flash on load)
- `color: #E5E7EB` hardcoded text
- `a { color: #4a90e2 }` hardcoded link colour
- `background-color: #fff` in header style

Replace with CSS variable references or DaisyUI token classes.

### 1.5 Fix theme-color meta

**File:** `pages/_app.tsx`

Change `<meta name="theme-color" content="#111827">` to a value that matches the active theme. Use `#f0fdf4` (green-50) for Grow, or dynamically set via app context.

### 1.6 Audit `force-light` utility

**File:** `styles/index.css`

The `.force-light` utility uses aggressive `!important` rules that will block future dark mode support. Evaluate whether it can be replaced with `data-theme="light"` on specific subtrees, which is the DaisyUI-native approach.

### Acceptance Criteria
- [ ] All Grow Daisy pages render with correct colours from the unified token bridge
- [ ] Default `<Button>` renders in brand colour, not violet
- [ ] No hardcoded hex colours in `index.css`
- [ ] No visual regression on Go Daisy pages
- [ ] Build passes, no new type errors

---

## Phase 2: Translation Coverage

**Priority:** High — all user-facing copy written after this point should go through i18n from the start
**Effort:** ~6-10 hours
**Why second:** The translation infrastructure is mature (`useTranslationMap` for batch, `useUIText` for keyed DB lookups, `useContextualTranslation` for single strings, DeepL with caching). But several critical user-facing areas bypass it entirely. Fixing these before writing new copy avoids double work.

### 2.1 Translate Grow Daisy onboarding

**File:** `components/grow/onboarding/OnboardingFlow.tsx`

28 occurrences of shadcn tokens but all user-facing strings are hardcoded English. Wrap with `useTranslationMap`:
- Step titles ("Garden Basics", "Growing Conditions", "Interests & Focus", "Experience & Finish")
- Option labels and descriptions (all garden features, soil types, sun levels, interests)
- Validation error messages
- Status messages ("Checking your location...", "Climate zone detected: X")
- Button labels ("Continue", "Skip onboarding", "Finish & View Dashboard")

### 2.2 Translate Grow Daisy premium page

**File:** `pages/grow/premium.tsx`

All premium copy is hardcoded English:
- Tier names and taglines (Seed, Sprout, Bloom, Harvest, Orchard)
- Feature lists per tier
- FAQ questions and answers
- CTA buttons ("Start Free Trial", "Current Plan", "Upgrade")
- Billing toggle labels

### 2.3 Translate Grow Daisy auth page

**File:** `components/grow/AuthPage.tsx`

- "Welcome", "Create Account", "Sign In", "Try Demo Mode"
- Tab labels, form labels, error messages
- Tagline "Perfect gardening weather, every day"

### 2.4 Translate premium gate copy

**File:** `components/grow/premium/GrowPremiumGate.tsx`

The `getFeatureBenefit()` function returns hardcoded English benefit descriptions for each gated feature. These are high-visibility conversion copy and need i18n.

### 2.5 Translate notification copy

**Files:**
- `lib/grow/notifications.ts` — push notification payloads (title/body)
- `lib/godaisy/notifications.ts` — same for Go Daisy
- Email templates in `pages/api/cron/check-notifications.ts`

Push notification content is currently English-only. For a multi-language European launch, notification titles and bodies should be translated based on user language preference stored in Supabase.

### 2.6 Add app-specific SEO keywords

**File:** `components/SEO.tsx`

The keywords meta tag is hardcoded to generic Go Daisy terms. Add an optional `keywords` prop and set sensible defaults per app:
- Go Daisy: "weather activities, outdoor recommendations, what to do today, weather forecast, hiking weather"
- Grow Daisy: "garden planner, planting calendar, frost alerts, gardening weather, when to plant"
- Findr: "fishing predictions, sea fishing forecast, species confidence, marine weather, tide times"

### Acceptance Criteria
- [ ] Grow onboarding renders correctly in FR, ES, DE, IT, PT
- [ ] Premium page renders correctly in all supported languages
- [ ] Auth page renders correctly in all supported languages
- [ ] Build passes, no new type errors
- [ ] DeepL cache populated for all new strings

---

## Phase 3: Critical UX & Content Fixes

**Priority:** High — these are user-facing issues that affect first impressions and legal compliance
**Effort:** ~8-12 hours

### 3.1 Fix Cookie Policy (LEGAL — Critical)

**File:** `pages/CookiePolicy.tsx` (line 68)

The Cookie Policy has an unfinished sentence ("See our" then nothing) live in production. This is a GDPR compliance risk. Rewrite to completion and ensure the consent banner links to the correct URL.

### 3.2 Add subscription Terms & Conditions (LEGAL — High)

**File:** `pages/TermsAndConditions.tsx`

The current T&Cs were written before subscriptions existed. With live Stripe billing (free trials, monthly/annual/lifetime, cancellation), add sections covering:
- Subscription terms and auto-renewal
- Free trial terms and conversion
- Cancellation and refund policy
- Payment processing (Stripe)
- Account termination

### 3.3 Consolidate privacy policies

**Files:** `pages/PrivacyPolicy.tsx`, `pages/privacy.tsx`

Two contradictory privacy policies exist. Deprecate the older `PrivacyPolicy.tsx`, redirect to `privacy.tsx`, and update the contact email from `privacy@fishfindr.eu` to `privacy@godaisy.io` (or a brand-neutral domain).

### 3.4 Fix Go Daisy bare error/empty states

**File:** `pages/index.tsx` (lines ~777-834)

Three raw `<div>` fallbacks render with no navigation, no header, and no recovery path:
- **Error state** (line ~833): Replace with full layout + retry button
- **Needs-location state** (line ~777): Replace with full layout + prominent location picker
- **No-activities state** (lines ~781-813): Replace with full layout + launch onboarding flow (not just a link to `/interests`)

### 3.5 Replace alert()/confirm() with proper UI

**Files:** `components/grow/ActivityCard.tsx`, `components/grow/WeeklyTaskView.tsx`, `components/grow/IntegrationsCard.tsx`

Native browser `alert()` and `confirm()` calls in production components. Replace with:
- `toast.error()` / `toast.success()` from Sonner (already installed)
- shadcn `Dialog` for confirmation prompts

### 3.6 Fix Grow auth page brand identity

**File:** `components/grow/AuthPage.tsx`

- Replace `<Cloud>` icon with `<Sprout>` (line 6)
- Add green gradient background or hero stripe
- Improve value proposition copy beyond "Perfect gardening weather, every day"

### 3.7 Give onboarding a compelling opening

**File:** `components/grow/onboarding/OnboardingFlow.tsx`

Replace "Grow Daisy Onboarding" heading with a value-forward opening: "Let's set up your garden" + "Four quick questions and we'll tailor every task, alert, and forecast to your specific plot."

### 3.8 Explain "Guild" jargon in garden empty state

**File:** `components/grow/GardenPage.tsx`

The "Make a Guild" CTA assumes familiarity. Add a brief inline explanation or link to the guild explanation in the Info page.

---

## Phase 4: Navigation & Architecture

**Priority:** Medium-High
**Effort:** ~6-8 hours

### 4.1 Unify Grow Daisy navigation

**Files:** `components/grow/GrowExperience.tsx`, `components/grow/GrowLayout.tsx`, `components/grow/GrowBottomNav.tsx`

Three separate navigation implementations exist:
1. Inline `<nav>` in `GrowExperience.tsx` (state-based, uses `<button>`)
2. `GrowBottomNav.tsx` (route-based, uses `<Link>`)
3. Bottom nav in `GrowLayout.tsx` (renders `GrowBottomNav`)

Plus a label inconsistency: "Conditions" vs "Weather" for the same tab.

Consolidate into `GrowBottomNav.tsx` used consistently everywhere. Remove the internal `currentPage` state machine from `GrowExperience`. Make all Grow pages route-based with `GrowLayout`.

### 4.2 Fix Go Daisy BottomNav to use Link

**File:** `components/BottomNav.tsx`

Currently uses `<button>` + `router.push()`. Change to `<Link>` (matching `GrowBottomNav` pattern) for proper browser behaviour (right-click, new tab, prefetch).

### 4.3 Add missing meta descriptions

**Files:** `pages/FAQs.tsx`, `pages/AboutUs.tsx`, `pages/HowWeDoIt.tsx`, `pages/TermsAndConditions.tsx`

Add `<Head>` with appropriate `<title>` and `<meta name="description">` tags.

---

## Phase 5: Polish & Delight

**Priority:** Medium
**Effort:** ~8-12 hours

### 5.1 Add task completion celebrations

**File:** `components/grow/Homepage.tsx`

Add a brief animation + toast when a task is marked complete. The `TaskFeedbackPrompt` component exists but needs more prominent surfacing. Consider a "Tasks done this week: X" counter.

### 5.2 Add `aria-pressed` to toggle buttons

**Files:** `components/grow/onboarding/OnboardingFlow.tsx`, `components/grow/SettingsPage.tsx`

All onboarding option buttons use visual-only selection state. Add `aria-pressed={isSelected}` for screen reader support.

### 5.3 Fix Framer Motion reduced-motion

**File:** `components/grow/Homepage.tsx`

The swipe card gesture uses `useMotionValue`/`useTransform` which don't respect `prefers-reduced-motion`. Add an explicit media query check.

### 5.4 Reduce task card image placeholder height

**File:** `components/grow/Homepage.tsx`

The `h-48` grey placeholder wastes 192px of vertical space on tasks with no photo. Reduce to `h-24` or use a compact layout with icon-only for tasks without images.

### 5.5 Add weather page section headers

**File:** `pages/weather.tsx`

The weather page assembles many card types with no visual grouping. Add section headers ("Current Conditions", "Marine", "Astronomy", etc.) to help users orient.

### 5.6 FAQ content update

**File:** `pages/FAQs.tsx`

The FAQ is entirely surf-focused (`SurfSiteFAQ`). Add sections for Grow Daisy, subscriptions, and AI plant identification.

### 5.7 Surface "weather moats" concept

**File:** `pages/grow/premium.tsx`

The premium FAQ uses the brilliant term "weather moats" but it's buried in a collapsed accordion. Surface it in the premium page header or Bloom tier description.

### 5.8 Fix GrowPremiumGate loading flash

**File:** `components/grow/premium/GrowPremiumGate.tsx` (lines 92-95)

During loading, the gate renders children unconditionally — briefly showing premium content to non-premium users. Replace with a skeleton during load.

---

## Phase 6: Technical Debt & Code Quality

**Priority:** Medium — improves maintainability, testability, and developer velocity
**Effort:** ~15-20 hours
**Source:** Tech Lead, Code Reviewer, and Security Expert assessments (Feb 2026)

### 6.1 Break up GardenPage.tsx (3081 lines)

**File:** `components/grow/GardenPage.tsx`

Extract into custom hooks and sub-components:
- `usePlantManagement` — plant CRUD, loading, filtering, sorting
- `useGardenPhotos` — gallery photo loading, upload, deletion
- `usePlantIdentification` — AI identification flow, camera/upload
- `usePlantThreats` — threat loading, climate zone matching
- `useSpeciesLookup` — species cache, batch fetching
- Sub-components: `PlantGrid`, `GalleryTab`, `IdentificationTab`, `PhotoUploadModal`, `ThreatsTab`

**Effort:** 2-3 days

### 6.2 Break up unified-weather.ts (2414 lines)

**File:** `pages/api/unified-weather.ts`

Split into provider modules:
- `lib/weather/providers/metno.ts` — MET Norway
- `lib/weather/providers/noaa.ts` — NOAA/NWS
- `lib/weather/providers/openweather.ts` — OpenWeather
- `lib/weather/providers/stormglass.ts` — Stormglass
- `lib/weather/providers/openmeteo.ts` — Open-Meteo
- `lib/weather/cache.ts` — CacheMetrics class and shared cache logic
- Keep API route as thin orchestrator

**Effort:** 2-3 days

### 6.3 Migrate Grow components to React Query

Replace manual `useState + useEffect + fetch` patterns with React Query hooks:
- `GardenPage.tsx` (5+ fetch patterns)
- `PlanPage.tsx`, `WeatherPage.tsx`, `Homepage.tsx`, `SettingsPage.tsx`

Benefits: automatic request deduplication, background refetching, cache invalidation, consistent loading/error states.

**Effort:** 3-5 days

### 6.4 Remove dead dependencies

Remove from `package.json`:
- `react-router-dom` — not used (Next.js routing)
- `zustand` — not used (React Context instead)
- `swr` — not used (React Query instead)
- `html2canvas` — not used
- `react-hot-toast` — duplicate of `sonner`
- `exifr` — duplicate of `exifreader`
- `apn` — unmaintained (last release 2017)
- `babel-plugin-transform-remove-console` — unused (Terser handles this)

Consolidate date libraries: choose either `dayjs` or `date-fns`, not both.

**Effort:** 2-3 hours

### 6.5 Add test coverage for critical paths

Priority testing targets (currently at ~6% coverage):
1. Stripe/payment handlers (money at stake)
2. Authentication flows (`AuthContext`, `getAuthenticatedClient`, token refresh)
3. Data mutation API routes (`grow/plants`, `findr/favourites`, `findr/catch-log`)
4. Predictions pipeline end-to-end
5. Push notification system

**Effort:** 5+ days

### 6.6 Fix state management fragmentation

Audit and consolidate:
- Remove unused Zustand and SWR imports/configs
- Standardize on React Context + React Query
- Document which pattern to use where

**Effort:** 1 day

### 6.7 Clean up ESLint configuration

Three config files exist (`.eslintrc.json`, `eslint.config.mjs`, and inline overrides). The `no-console` rule is defined but not enforced because the flat config takes precedence.
- Consolidate into single `eslint.config.mjs`
- Enable `no-console` as warning (with allowed methods: `warn`, `error`)
- Remove the 71 unnecessary `eslint-disable` directives where possible

**Effort:** 2-3 hours

### Acceptance Criteria
- [ ] GardenPage.tsx < 500 lines, with logic in hooks
- [ ] unified-weather.ts < 300 lines (orchestrator only)
- [ ] All Grow data fetching uses React Query
- [ ] Dead dependencies removed, `npm audit` clean
- [ ] Test coverage > 20% for API routes
- [ ] Single ESLint config file
- [ ] Build passes, no new type errors

---

## Phase 7: Harvest Tier Feature Completion

**Priority:** High — these features are advertised on the premium page but not yet fully built
**Effort:** ~20-30 hours
**Why now:** Harvest tier is live in App Store. Subscribers will expect these features to exist. Database schemas and tier-gating are already in place — the work is building the UI and connecting the dots.

### 7.1 Yield Predictions UI

**Status:** DB schema ready (`grow_harvest_outcomes`, `grow_outcome_statistics` view), tier-gated (`yieldPredictions: true`)
**What's needed:**
- Page or section in garden dashboard showing predicted yields per plant/bed
- Use historical harvest outcome data + weather forecast to generate predictions
- API endpoint: `/api/grow/predictions/yield` using outcome statistics view
- Surface in `GardenPage` or dedicated `/grow/yields` page
- Gate behind Harvest tier via `GrowPremiumGate`

**Effort:** 8-10 hours

### 7.2 Analytics Dashboard

**Status:** DB views ready (`grow_outcome_statistics`), tier-gated (`analyticsAccess: true`)
**What's needed:**
- Dedicated `/grow/analytics` page with charts (harvest success rate, seasonal trends, plant health over time)
- Use existing `grow_outcome_statistics` view + `grow_harvest_outcomes` data
- Chart library: recharts (already a dependency) or lightweight alternative
- Sections: harvest success rate, yield trends, weather impact, top performing plants
- Gate behind Harvest tier via `GrowPremiumGate`
- Add to `GrowBottomNav` or as a tab within the garden section

**Effort:** 8-12 hours

### 7.3 Crop Rotation Planner

**Status:** Feature flag defined (`cropRotation: true`), `pages/grow/plan.tsx` exists but incomplete
**What's needed:**
- Bed/zone selection with plant history timeline
- Rotation recommendations based on plant family groupings (legumes → brassicas → roots → alliums)
- Visual calendar or timeline showing what was planted where and when
- Suggestions for next season based on soil nutrient cycling
- API endpoint or client-side logic using plant family data
- Gate behind Bloom+ tier (already set)

**Effort:** 6-10 hours

### Acceptance Criteria
- [ ] Yield predictions page renders with data from harvest outcomes
- [ ] Analytics dashboard shows charts with real user data
- [ ] Crop rotation planner shows bed history and recommendations
- [ ] All three features gated behind correct tiers
- [ ] Build passes, no new type errors

---

## Phase 8: Deferred / Tracked

These items are important but out of scope for the initial launch sprint.

| Item | Reason | Tracked? |
|------|--------|----------|
| Rate limiting (Upstash Redis) | Requires new infrastructure | Yes |
| Replace `next-pwa` with `@serwist/next` | Major migration | Yes |
| Replace `@supabase/auth-helpers-nextjs` with `@supabase/ssr` | Breaking API changes | Yes |
| Dark mode support | Requires design decisions + testing | Yes |
| Console.log cleanup (2028+ instances) | Massive scope, phased approach | Yes |
| Grow-specific favicon | Needs designer | Yes |
| OG image design | Needs designer (placeholder only) | Yes |
| iOS/Android native apps | Not yet started | Yes |
| N+1 cron loop optimization | Performance, needs profiling | Yes |
| Content-Security-Policy header | Needs careful audit of all inline scripts | Yes |
| Replace direct localStorage token access | 8 files bypass auth context | Yes |
| Hardcoded `atlantic_mild` climate zone | Needs Koppen classification lookup | Yes |

---

## Summary Timeline

| Phase | Focus | Effort | Depends On |
|-------|-------|--------|------------|
| **0** | Security hardening | Done | — |
| **1** | Unify design tokens | 8-12h | — |
| **2** | Translation coverage | 6-10h | — (can parallel with Phase 1) |
| **3** | Critical UX & content fixes | 8-12h | Phase 1 (for UI fixes) |
| **4** | Navigation & architecture | 6-8h | Phase 1 |
| **5** | Polish & delight | 8-12h | Phases 1-4 |
| **6** | Technical debt & code quality | 15-20h | Phases 1-5 |
| **7** | Harvest tier feature completion | 20-30h | Phase 1 (for UI tokens) |

**Total estimated effort:** ~75-105 hours across all phases

Phases 1 and 2 can run in parallel. Phase 3 should follow Phase 1 (so UI fixes use the unified tokens). Phases 4 and 5 can begin once the foundation is stable. Phase 6 can begin at any time but benefits from stable foundations. **Phase 7 is urgent** — Harvest subscribers are paying for these features, so prioritize alongside or immediately after Phase 3.
