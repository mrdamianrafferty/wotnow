# Go Daisy+ Implementation Plan

**Status:** ⏳ PLANNED
**Created:** 2026-03-08
**Estimated Effort:** ~19 dev-days across 4–5 weeks
**Pricing:** €9.99/year (default), €1.49/month

This is the actionable implementation plan for adding a Go Daisy+ (free/paid) subscription tier to the Go Daisy umbrella app. It is designed to be followed sequentially by phase — each task includes the exact files to create or modify, the patterns to follow, and acceptance criteria.

---

## Guiding Principle

**"Today is free. Tomorrow is Plus."**

Free users get a brilliant daily companion: today's weather, today's activity advice, today's safety data. All indoor activities are always free (rainy days shouldn't feel punishing). Free users can track up to 6 outdoor activities. Go Daisy+ unlocks the planning horizon, deeper data, multiple locations, social features, and push intelligence.

---

## Phase 1: Foundation (Week 1–2)

### Task 1 — Database Migration: profiles columns
**Priority:** P0 Critical | **Effort:** 0.5 days | **Dependencies:** None

**What:** Add Go Daisy subscription columns to the existing `profiles` table.

**File to create:** `supabase/migrations/YYYYMMDDHHMMSS_add_godaisy_subscription_columns.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS godaisy_subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS godaisy_subscription_type text,  -- 'monthly' | 'annual' | 'promo'
  ADD COLUMN IF NOT EXISTS godaisy_stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS godaisy_stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS godaisy_subscription_start timestamptz,
  ADD COLUMN IF NOT EXISTS godaisy_subscription_end timestamptz,
  ADD COLUMN IF NOT EXISTS godaisy_revenuecat_product_id text;
```

**Pattern reference:** The `profiles` table already has `grow_subscription_tier`, `grow_stripe_subscription_id`, etc. for Grow Daisy, and `subscription_status`, `stripe_customer_id`, etc. for Findr. This follows the exact same pattern.

**Acceptance criteria:**
- [ ] Migration runs cleanly via `supabase db push`
- [ ] Existing rows get `godaisy_subscription_tier = 'free'` default
- [ ] No RLS policy changes needed (profiles already has user-scoped RLS)

---

### Task 2 — Tier Definitions: lib/godaisy/subscription.ts
**Priority:** P0 Critical | **Effort:** 1 day | **Dependencies:** Task 1

**What:** Create the central subscription definitions file with tier limits and helper functions.

**File to create:** `lib/godaisy/subscription.ts`

**Pattern to follow:** `lib/grow/subscription.ts` — but simplified from 5 tiers to 2 tiers.

**Type definitions needed:**

```typescript
export type GoDaisyTier = 'free' | 'plus';

export interface GoDaisyTierLimits {
  maxOutdoorActivities: number;      // 6 (free) | Infinity (plus)
  indoorActivitiesUnlimited: boolean; // always true
  forecastDays: number;               // 3 (free) | 14 (plus)
  coastalLocation: boolean;           // false (free) | true (plus)
  pushNotifications: boolean;         // false (free) | true (plus) — except extreme weather always free
  environmentalCards: boolean;        // false (free) | true (plus) — pollen, soil, pressure, visibility
  astronomyAlerts: boolean;           // false (free) | true (plus) — ISS, events
  socialFeatures: boolean;            // false (free) | true (plus) — invites, polls, venues
  plannedActivities: boolean;         // false (free) | true (plus)
  offlineMode: boolean;               // false (free) | true (plus)
}

export const GODAISY_TIERS: Record<GoDaisyTier, GoDaisyTierLimits> = {
  free: {
    maxOutdoorActivities: 6,
    indoorActivitiesUnlimited: true,
    forecastDays: 3,
    coastalLocation: false,
    pushNotifications: false,
    environmentalCards: false,
    astronomyAlerts: false,
    socialFeatures: false,
    plannedActivities: false,
    offlineMode: false,
  },
  plus: {
    maxOutdoorActivities: Infinity,
    indoorActivitiesUnlimited: true,
    forecastDays: 14,
    coastalLocation: true,
    pushNotifications: true,
    environmentalCards: true,
    astronomyAlerts: true,
    socialFeatures: true,
    plannedActivities: true,
    offlineMode: true,
  },
};
```

**Helper functions to implement** (same signatures as `lib/grow/subscription.ts`):
- `hasFeatureAccess(tier: GoDaisyTier, feature: keyof GoDaisyTierLimits): boolean`
- `isOverLimit(tier: GoDaisyTier, feature: 'maxOutdoorActivities', currentCount: number): boolean`
- `getRemainingUsage(tier: GoDaisyTier, feature: 'maxOutdoorActivities', currentCount: number): number`
- `canUse(tier: GoDaisyTier, feature: keyof GoDaisyTierLimits): boolean` — shorthand combining the above

**Pricing constants:**

```typescript
export const GODAISY_PRICING = {
  monthly: { amount: 1.49, currency: 'EUR', stripe_price_id: 'price_godaisy_plus_monthly' },
  annual: { amount: 9.99, currency: 'EUR', stripe_price_id: 'price_godaisy_plus_annual' },
};
```

**Acceptance criteria:**
- [ ] All tier limits match the feature matrix in the analysis document
- [ ] Indoor activities always return unlimited for both tiers
- [ ] Helper functions have matching signatures to Grow Daisy equivalents
- [ ] TypeScript types export cleanly

---

### Task 3 — React Hook: hooks/useGoDaisySubscription.ts
**Priority:** P0 Critical | **Effort:** 1.5 days | **Dependencies:** Task 2

**What:** Create the React hook that pages consume for subscription gating. Offline-first with real-time updates.

**File to create:** `hooks/useGoDaisySubscription.ts`

**Pattern to follow:** `hooks/useGrowSubscription.ts` — this is the primary template. The hook should:

1. **Read from IndexedDB cache first** (instant UI, no flash of free-tier content for Plus users)
2. **Fetch fresh state from Supabase** `profiles` table columns: `godaisy_subscription_tier`, `godaisy_subscription_type`, `godaisy_stripe_subscription_id`, `godaisy_subscription_start`, `godaisy_subscription_end`
3. **Subscribe to real-time `postgres_changes`** on the user's profile row for instant tier updates after purchase
4. **Cache new state to IndexedDB** with 24h TTL

**File to create:** `lib/offline/goDaisySubscriptionCache.ts`

**Pattern to follow:** The equivalent cache file used by `useGrowSubscription.ts`. IndexedDB wrapper with get/set/clear, 24h TTL.

**Hook return type:**

```typescript
interface UseGoDaisySubscriptionReturn {
  tier: GoDaisyTier;
  isPaid: boolean;
  isLoading: boolean;
  canUse: (feature: keyof GoDaisyTierLimits) => boolean;
  isAtLimit: (feature: 'maxOutdoorActivities', currentCount: number) => boolean;
  getRemaining: (feature: 'maxOutdoorActivities', currentCount: number) => number;
  requiresTier: (feature: keyof GoDaisyTierLimits) => GoDaisyTier;
  refetch: () => Promise<void>;
}
```

**Acceptance criteria:**
- [ ] Hook returns correct tier for authenticated users
- [ ] Unauthenticated users default to 'free'
- [ ] IndexedDB cache prevents UI flash on page load
- [ ] Real-time subscription updates work (test by manually updating profiles row)
- [ ] `canUse()` correctly gates all features per tier
- [ ] `isAtLimit()` works for outdoor activity count

---

### Task 4 — Stripe Products + Webhook Extension
**Priority:** P0 Critical | **Effort:** 1 day | **Dependencies:** Task 1

**What:** Create Stripe products and extend the existing webhook handler.

**Stripe Dashboard (manual):**
- Create product: "Go Daisy+"
- Create prices: `godaisy_plus_monthly` (€1.49/mo recurring), `godaisy_plus_annual` (€9.99/yr recurring)
- Note the price IDs for the subscription.ts constants

**File to modify:** `pages/api/stripe/webhook.ts`

The webhook already routes by product ID prefix for Findr and Grow. Add a third route:

```typescript
// Existing pattern:
// if (productId.startsWith('grow_')) → update grow_subscription_* columns
// if (productId.startsWith('findr_') || productId.startsWith('price_findr')) → update subscription_* columns

// ADD:
// if (productId.startsWith('godaisy_plus')) → update godaisy_subscription_* columns
```

**Events to handle:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

**On subscription created/renewed:**
```sql
UPDATE profiles SET
  godaisy_subscription_tier = 'plus',
  godaisy_subscription_type = 'annual',  -- or 'monthly'
  godaisy_stripe_subscription_id = :sub_id,
  godaisy_stripe_customer_id = :cust_id,
  godaisy_subscription_start = NOW(),
  godaisy_subscription_end = :period_end
WHERE id = :user_id;
```

**On subscription cancelled/expired:**
```sql
UPDATE profiles SET
  godaisy_subscription_tier = 'free',
  godaisy_subscription_type = NULL,
  godaisy_subscription_end = :cancel_at
WHERE id = :user_id;
```

**Acceptance criteria:**
- [ ] Stripe products created with correct pricing
- [ ] Webhook routes Go Daisy+ events to correct profile columns
- [ ] Existing Findr and Grow webhook routes unaffected
- [ ] Subscription lifecycle works: create → renew → cancel → expire

---

### Task 5 — RevenueCat Products + Webhook Extension
**Priority:** P0 Critical | **Effort:** 1 day | **Dependencies:** Task 4

**What:** Create RevenueCat entitlements for iOS and extend the webhook.

**RevenueCat Dashboard (manual):**
- Create entitlement: `godaisy_plus`
- Create products: `godaisy_plus_monthly`, `godaisy_plus_annual` (auto-renewable subscriptions)
- Map products to entitlement

**App Store Connect (manual):**
- Create subscription group: "Go Daisy+"
- Create subscription products matching RevenueCat product IDs

**File to modify:** `pages/api/revenuecat/webhook.ts`

Add Go Daisy+ product ID mapping alongside existing Findr and Grow routes. Same pattern: check entitlement name, update the corresponding `godaisy_subscription_*` columns.

**Acceptance criteria:**
- [ ] RevenueCat entitlement configured
- [ ] iOS subscription products created
- [ ] Webhook correctly maps RevenueCat events to profile columns
- [ ] Restore purchases works for Go Daisy+ subscriptions

---

## Phase 2: Feature Gating (Week 2–3)

### Task 6 — Upgrade Prompt Component: components/GoDaisyUpgradePrompt.tsx
**Priority:** P0 Critical | **Effort:** 1 day | **Dependencies:** Task 3

**What:** Create a contextual upgrade nudge component that's reused across all gated features.

**File to create:** `components/GoDaisyUpgradePrompt.tsx`

**Design requirements:**
- Context-aware messaging: accepts a `feature` prop that determines the headline
  - `feature="forecast"` → "Unlock 14-day forecasts"
  - `feature="activities"` → "Track unlimited outdoor activities"
  - `feature="environmental"` → "Unlock pollen, soil & more"
  - `feature="coastal"` → "Add a coastal location"
  - `feature="notifications"` → "Get smart notifications"
  - `feature="social"` → "Plan activities with friends"
  - `feature="astronomy"` → "Never miss a celestial event"
- Slide-up sheet pattern (not full-page redirect) — use Framer Motion
- Shows pricing: "€9.99/year (less than €1/month)" with monthly fallback
- CTA button links to `/godaisy-plus` checkout page
- Dismiss button (don't be aggressive)
- DaisyUI card styling consistent with existing app

**Soft gate variant:** For features that exist but are locked (e.g., forecast days 4–14):
- Show the content but blurred/dimmed
- Small lock icon + "Go Daisy+" badge overlay
- On tap: show the upgrade prompt

**Acceptance criteria:**
- [ ] Component renders for each feature context
- [ ] Framer Motion slide-up animation
- [ ] Links to checkout page
- [ ] Dismissable without friction
- [ ] Consistent with existing DaisyUI design language

---

### Task 7 — Homepage Gating: pages/index.tsx
**Priority:** P0 Critical | **Effort:** 1 day | **Dependencies:** Task 6

**What:** Gate the homepage to enforce outdoor activity limits and astronomy features.

**File to modify:** `pages/index.tsx`

**Changes:**
1. Import `useGoDaisySubscription` hook
2. Import `GoDaisyUpgradePrompt` component
3. Filter `getSuggestionsByDay()` output:
   - All indoor activities: always shown (use existing `isOutdoor()` helper from `activityHelpers.ts`)
   - Outdoor activities: limited to user's tracked 6 for free tier, unlimited for Plus
4. After the 6th outdoor activity card, show a "More outdoor activities with Go Daisy+" card for free users
5. `AstronomyCard`: wrap ISS/event highlights behind `canUse('astronomyAlerts')`
6. Hero activity selection: no change needed (works with whatever activities are tracked)

**Key logic:**

```typescript
const { canUse, isAtLimit } = useGoDaisySubscription();
const userOutdoorCount = userTrackedActivities.filter(isOutdoor).length;

// In activity list rendering:
const visibleActivities = suggestions.filter(s => {
  if (!isOutdoor(s.activityId)) return true; // indoor always shown
  if (canUse('maxOutdoorActivities')) return true; // Plus users see all
  return userTrackedOutdoor.includes(s.activityId); // Free: only their tracked 6
});
```

**Acceptance criteria:**
- [ ] Free users see all indoor activities
- [ ] Free users see only their 6 tracked outdoor activities
- [ ] Plus users see all activities
- [ ] Upgrade prompt appears after 6th outdoor activity
- [ ] Astronomy alerts gated for free users
- [ ] No regression in hero activity selection

---

### Task 8 — Weather Page Gating: pages/weather.tsx
**Priority:** P0 Critical | **Effort:** 1.5 days | **Dependencies:** Task 6

**What:** Gate forecast days and environmental cards on the weather dashboard.

**File to modify:** `pages/weather.tsx`

**Changes:**
1. Import `useGoDaisySubscription` hook
2. **NextFewDaysCard:** Show 3 days free, days 4–14 blurred with lock overlay and upgrade prompt
3. **HourlyCard:** Only show today's hours for free; future days' hourly data behind gate
4. **Environmental cards** (wrap in `canUse('environmentalCards')`):
   - `PollenCard` → gated
   - `SoilCard` → gated
   - `PressureCardDial` → gated
   - `VisibilityCard` → gated
5. **Always free** (no change needed):
   - `UVCard` — safety feature
   - `AirQualityCard` — health feature
   - `FeelsLikeCard` — core weather
   - `WindCard` (basic) — core weather
6. **Marine cards:** Basic data free (tide times, water temp), detailed views (swell period, current strength, wave direction) gated
7. **CoastalLocationDialog:** Only show toggle if `canUse('coastalLocation')`

**Soft gate pattern for forecast days:**

```typescript
const { tier, canUse } = useGoDaisySubscription();
const maxDays = GODAISY_TIERS[tier].forecastDays; // 3 or 14

// In NextFewDaysCard:
{forecastDays.map((day, i) => (
  i < maxDays
    ? <DayCard key={i} data={day} />
    : <LockedDayCard key={i} day={day} onTap={() => setShowUpgrade(true)} />
))}
```

**Acceptance criteria:**
- [ ] Free users see 3 forecast days, days 4+ blurred with lock
- [ ] Hourly data only for today (free), all days (Plus)
- [ ] Pollen, soil, pressure, visibility cards gated
- [ ] UV, AQI, feels-like always visible
- [ ] Coastal location toggle only for Plus
- [ ] Upgrade prompts are contextual ("Unlock 14-day forecasts")

---

### Task 9 — Activities Page Gating: pages/activities.tsx
**Priority:** P1 High | **Effort:** 1 day | **Dependencies:** Task 6

**File to modify:** `pages/activities.tsx`

**Changes:**
1. Indoor activities always visible, outdoor limited to tracked 6 (free) / unlimited (Plus)
2. Forward-day activity scores: today + 2 days free; 7–14 day scores gated
3. Share button: basic share free; invite/venue/poll features gated behind `canUse('socialFeatures')`

**Acceptance criteria:**
- [ ] Same indoor/outdoor split as homepage
- [ ] Forward scoring limited by forecast day gate
- [ ] Social share features properly gated

---

### Task 10 — Interests/Onboarding Activity Limit
**Priority:** P1 High | **Effort:** 0.5 days | **Dependencies:** Task 6

**Files to modify:** `pages/interests.tsx`, `pages/onboarding.tsx` (whichever handles activity selection)

**Changes:**
1. Allow browsing ALL 117 activities during onboarding (discovery is free)
2. When saving, enforce the 6-outdoor-activity limit for free users
3. Show message: "Pick your top 6 outdoor activities — or go Plus for unlimited. Indoor activities are always free!"
4. Show a "Popular with Go Daisy+ members" badge on activities that benefit most from extended data (e.g., surfing, sailing, hiking — activities that use marine/environmental cards)

**Acceptance criteria:**
- [ ] Free users can browse all activities
- [ ] Save enforces 6-outdoor limit with clear messaging
- [ ] Indoor activities don't count toward the limit
- [ ] Plus badge shown on relevant activities

---

### Task 11 — Coastal Location Gating
**Priority:** P1 High | **Effort:** 0.5 days | **Dependencies:** Task 6

**File to modify:** Components related to `CoastalLocationDialog` (referenced in `pages/index.tsx` and `pages/weather.tsx`)

**Changes:**
- Hide the coastal location toggle entirely for free users
- On the Go Daisy+ checkout page, feature this as a selling point: "Add a coastal location with quick-switch toggle"

**Acceptance criteria:**
- [ ] Coastal toggle hidden for free users
- [ ] Plus users see and can use the toggle
- [ ] No errors when coastal location is not set

---

## Phase 3: Monetisation & Polish (Week 3–4)

### Task 12 — Checkout Page: pages/godaisy-plus.tsx
**Priority:** P0 Critical | **Effort:** 2 days | **Dependencies:** Tasks 4, 5

**What:** Dedicated upgrade/checkout page.

**File to create:** `pages/godaisy-plus.tsx`

**Pattern to follow:** `pages/grow/premium.tsx` and `pages/findr/premium.tsx`

**Page sections:**
1. Hero with value proposition headline
2. Feature comparison table (free vs Plus) — mirror the matrix from the analysis doc
3. Pricing cards: monthly (€1.49) and annual (€9.99) with "Save 38%" callout on annual
4. Annual promoted as default (pre-selected)
5. Stripe Checkout for web users, RevenueCat/StoreKit for iOS users
6. "Restore Purchases" button for iOS
7. Vertical module cross-sell cards at bottom: "Go deeper with Grow Daisy (gardening)" and "Go deeper with Findr (fishing)" — links to their premium pages
8. Promo code entry field: "Have a code?" expandable input

**Payment flow:**
- Web: Create Stripe Checkout session via API → redirect to Stripe → webhook updates profile
- iOS: RevenueCat purchase flow → webhook updates profile

**Acceptance criteria:**
- [ ] Page renders feature comparison accurately
- [ ] Both pricing options work (monthly and annual)
- [ ] Stripe Checkout flow completes successfully
- [ ] RevenueCat/StoreKit flow completes (when iOS is ready)
- [ ] Restore Purchases works
- [ ] Cross-sell cards link to Grow/Findr premium pages
- [ ] Promo code entry works (links to Task 18)

---

### Task 13 — Account Page: Plan Management
**Priority:** P1 High | **Effort:** 1 day | **Dependencies:** Task 12

**File to modify:** `pages/account.tsx`

**Changes:**
1. Add "Your Plan" section at the top showing current tier:
   - Free users: "Go Daisy Free" with upgrade CTA button
   - Plus users: "Go Daisy+" with subscription end date, manage link
2. For Plus users: "Manage Subscription" link to Stripe Customer Portal (web) or App Store subscriptions (iOS)
3. Keep Tip Jar as optional "Extra Support" section below subscription for paid users
4. Move existing Tip Jar products (`GODAISY_TIP_PRODUCTS` from `lib/godaisy/tipProducts.ts`) below subscription management
5. Push notification preferences: show all categories but grey out Plus-only types for free users with small "Plus" badges

**Push notification types (from `useGoDaisyPushNotifications.ts`):**
- `extreme_weather` → always free (safety)
- `weather_alert` → Plus only
- `activity_recommendation` → Plus only
- `astronomy_alert` → Plus only
- `tide_alert` → Plus only

**Acceptance criteria:**
- [ ] Your Plan section displays correct tier
- [ ] Upgrade CTA for free users
- [ ] Manage Subscription for paid users
- [ ] Tip Jar still works alongside subscription
- [ ] Notification preferences show Plus badges on gated types

---

### Task 14 — Push Notification Gating
**Priority:** P1 High | **Effort:** 1 day | **Dependencies:** Task 3

**File to modify:** `hooks/useGoDaisyPushNotifications.ts` and the push registration API

**Changes:**
- When registering push subscriptions, check tier and only register for allowed notification types
- `extreme_weather`: always registered (safety, free for all)
- All other types: only registered for Plus users
- If a user downgrades from Plus, deregister Plus-only notification types

**Acceptance criteria:**
- [ ] Free users only receive extreme weather alerts
- [ ] Plus users receive all notification types they've enabled
- [ ] Downgrade correctly removes Plus-only registrations

---

### Task 15 — Social Features Gating
**Priority:** P2 Medium | **Effort:** 1 day | **Dependencies:** Task 6

**Files to modify:** Components related to activity sharing, invites, venue search, polls

**Changes:**
- Basic share (share activity card image): free for all
- Invite friends to activities: gated behind `canUse('socialFeatures')`
- Venue search & attach: gated
- Activity polls: gated

**Acceptance criteria:**
- [ ] Basic sharing works for all users
- [ ] Social features show upgrade prompt for free users

---

### Task 16 — Planned Activities Journal
**Priority:** P2 Medium | **Effort:** 1.5 days | **Dependencies:** Task 3

**What:** New Plus-only feature for tracking and logging planned activities.

**Files to create:**
- `components/PlannedActivitiesJournal.tsx`
- `pages/api/godaisy/planned-activities.ts`

**Database:** Consider a new table `godaisy_planned_activities` or use existing patterns.

This is a new feature (not gating an existing one), so it can be scoped and built after the core gating is done.

**Acceptance criteria:**
- [ ] Only accessible to Plus users
- [ ] Users can plan future activities with date/location
- [ ] Journal shows past planned activities with weather that actually occurred

---

## Phase 4: Growth & Promo Codes (Week 4)

### Task 17 — Promo Code Database Tables
**Priority:** P1 High | **Effort:** 0.5 days | **Dependencies:** Task 1

**File to create:** `supabase/migrations/YYYYMMDDHHMMSS_add_godaisy_promo_codes.sql`

```sql
-- Promo codes table
CREATE TABLE godaisy_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  campaign text NOT NULL,
  max_redemptions integer,              -- NULL = unlimited
  current_redemptions integer NOT NULL DEFAULT 0,
  grant_days integer NOT NULL DEFAULT 365,
  expires_at timestamptz,               -- NULL = never expires
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Redemptions audit trail
CREATE TABLE godaisy_promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES godaisy_promo_codes(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  granted_until timestamptz NOT NULL,
  UNIQUE(promo_code_id, user_id)        -- prevent double redemption
);

-- RLS policies
ALTER TABLE godaisy_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE godaisy_promo_redemptions ENABLE ROW LEVEL SECURITY;

-- Promo codes: readable by all authenticated (for validation), writable only by service role
CREATE POLICY "Promo codes readable by authenticated users"
  ON godaisy_promo_codes FOR SELECT
  TO authenticated
  USING (true);

-- Redemptions: users can only see their own
CREATE POLICY "Users can view own redemptions"
  ON godaisy_promo_redemptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own redemptions"
  ON godaisy_promo_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Index for fast code lookup
CREATE INDEX idx_promo_codes_code ON godaisy_promo_codes(code);
CREATE INDEX idx_promo_redemptions_user ON godaisy_promo_redemptions(user_id);
```

**Acceptance criteria:**
- [ ] Tables created with correct schema
- [ ] RLS policies in place
- [ ] Unique constraint prevents double redemption per user per code
- [ ] Indexes for performance

---

### Task 18 — Promo Redemption API: /api/godaisy/promo/redeem
**Priority:** P1 High | **Effort:** 1 day | **Dependencies:** Task 17

**File to create:** `pages/api/godaisy/promo/redeem.ts`

**Pattern reference:** Extends the existing `/api/vouchers/validate` pattern.

**Flow:**
1. Accept `POST { code: string }`
2. Require authenticated user (Supabase auth from request)
3. Look up code in `godaisy_promo_codes` where `is_active = true`
4. Validate:
   - Code exists and is active
   - Code hasn't expired (`expires_at IS NULL OR expires_at > NOW()`)
   - Code hasn't hit redemption cap (`max_redemptions IS NULL OR current_redemptions < max_redemptions`)
   - User hasn't already redeemed this code (unique constraint)
5. In a transaction:
   - Insert into `godaisy_promo_redemptions` with `granted_until = NOW() + grant_days * interval '1 day'`
   - Increment `godaisy_promo_codes.current_redemptions`
   - Update `profiles` set `godaisy_subscription_tier = 'plus'`, `godaisy_subscription_type = 'promo'`, `godaisy_subscription_end = granted_until`
6. Return `{ success: true, grantedUntil: date, campaign: string }`

**Error responses:**
- `400` — Missing code
- `401` — Not authenticated
- `404` — Code not found or inactive
- `409` — Already redeemed by this user
- `410` — Code expired or maxed out

**Important:** Use service role client for the profile update (same pattern as species queries — see CLAUDE.md note about species RLS).

**Acceptance criteria:**
- [ ] Valid codes grant Plus access immediately
- [ ] Expiry and cap checks work
- [ ] Double-redemption prevented
- [ ] Profile updated atomically
- [ ] Error codes are clear and useful

---

### Task 19 — Deep Link Page: pages/redeem.tsx
**Priority:** P1 High | **Effort:** 1 day | **Dependencies:** Task 18

**What:** A public page at `/redeem` that reads `?code=` from the URL, handles auth, and calls the redemption API.

**File to create:** `pages/redeem.tsx`

**Flow:**
1. Read `code` from URL query params
2. If not authenticated: show sign-in/sign-up form (or redirect to auth page with return URL)
3. If authenticated: call `/api/godaisy/promo/redeem` with the code
4. On success: show celebration screen with "You've got Go Daisy+ for free until [date]!" and CTA to explore the app
5. On error: show appropriate message (expired, already used, invalid)

**Use case:** This is the URL shared in magazines, blog posts, QR codes: `godaisy.io/redeem?code=TRAILMAG`

**Acceptance criteria:**
- [ ] Unauthenticated users can sign up and redeem in one flow
- [ ] Code from URL auto-fills
- [ ] Success state is celebratory and clear
- [ ] Error states are helpful
- [ ] Works as QR code destination

---

### Task 20 — Promo Code Entry UI
**Priority:** P1 High | **Effort:** 0.5 days | **Dependencies:** Task 18

**Files to modify:**
- `pages/account.tsx` — Add "Have a promo code?" section in account settings
- `pages/godaisy-plus.tsx` — Add expandable promo code input on checkout page
- Optionally: `pages/onboarding.tsx` — "Have a code?" during onboarding

**UI pattern:**
- Collapsible section: "Have a promo code?" text link
- On expand: text input + "Redeem" button
- On success: inline confirmation with granted period
- On error: inline error message

**Acceptance criteria:**
- [ ] Promo code entry works from account page
- [ ] Promo code entry works from checkout page
- [ ] Success/error states are clear and inline

---

## Launch Code Batches

Seed these promo codes before any press or blog outreach:

| Code | Campaign | Max Uses | Use Case |
|------|----------|----------|----------|
| `PRESS2026` | Launch press kit | 50 | Individual journalist codes |
| `TRAILMAG` | Trail Running Magazine | 500 | Print ad QR code |
| `SURFLIFE` | Surf Life blog | 200 | Blog post affiliate link |
| `YTOUTDOOR` | YouTube outdoor creators | 1000 | Video description link |
| `BETATESTERS` | Early adopter thank-you | 100 | Email to existing users |

Seed via Supabase SQL or a seed script.

---

## Files Reference

### New Files to Create
| File | Phase | Task |
|------|-------|------|
| `supabase/migrations/..._add_godaisy_subscription_columns.sql` | 1 | 1 |
| `lib/godaisy/subscription.ts` | 1 | 2 |
| `hooks/useGoDaisySubscription.ts` | 1 | 3 |
| `lib/offline/goDaisySubscriptionCache.ts` | 1 | 3 |
| `components/GoDaisyUpgradePrompt.tsx` | 2 | 6 |
| `pages/godaisy-plus.tsx` | 3 | 12 |
| `supabase/migrations/..._add_godaisy_promo_codes.sql` | 4 | 17 |
| `pages/api/godaisy/promo/redeem.ts` | 4 | 18 |
| `pages/redeem.tsx` | 4 | 19 |
| `components/PlannedActivitiesJournal.tsx` | 3 | 16 |
| `pages/api/godaisy/planned-activities.ts` | 3 | 16 |

### Existing Files to Modify
| File | Phase | Task | What Changes |
|------|-------|------|--------------|
| `pages/api/stripe/webhook.ts` | 1 | 4 | Add godaisy_plus route |
| `pages/api/revenuecat/webhook.ts` | 1 | 5 | Add godaisy_plus mapping |
| `pages/index.tsx` | 2 | 7 | Activity limit + astronomy gate |
| `pages/weather.tsx` | 2 | 8 | Forecast day + env card gates |
| `pages/activities.tsx` | 2 | 9 | Activity limit + forward scoring |
| `pages/interests.tsx` | 2 | 10 | Outdoor activity selection limit |
| `pages/account.tsx` | 3 | 13, 20 | Plan section + promo code input |
| `hooks/useGoDaisyPushNotifications.ts` | 3 | 14 | Tier-based registration |

### Pattern Reference Files (read these first)
| File | What to learn |
|------|---------------|
| `lib/grow/subscription.ts` | 5-tier system → simplify to 2-tier |
| `hooks/useGrowSubscription.ts` | Offline-first hook pattern, real-time updates |
| `hooks/useSubscription.ts` | Findr's simpler free/premium (closer to Go Daisy+) |
| `pages/grow/premium.tsx` | Checkout page template |
| `pages/findr/premium.tsx` | Alternative checkout page template |
| `pages/api/stripe/webhook.ts` | Multi-app webhook routing |
| `lib/godaisy/tipProducts.ts` | Existing Go Daisy IAP products (keep alongside subscription) |
| `data/activityTypes.ts` | Activity definitions (117 total) |
| `utils/getSuggestionsByDay.ts` | Activity scoring engine |

---

## Important Reminders

1. **Indoor activities are ALWAYS free** — use `isOutdoor()` helper to distinguish
2. **Safety features are ALWAYS free** — UV, AQI, extreme weather alerts
3. **Soft gates > hard gates** — show locked content blurred rather than hiding it entirely
4. **Context-aware upgrade prompts** — the prompt should explain what the user is missing, not just say "upgrade"
5. **Existing Tip Jar stays** — it becomes "Extra Support" below subscription management
6. **Don't break Findr or Grow Daisy** — test that existing subscription routes still work after webhook changes
7. **Use service role client** for profile updates in API routes (same pattern as species queries)
8. **CSS: DO NOT modify** Tailwind/PostCSS config — see `DO_NOT_TOUCH_CSS_CONFIG.md`
9. **Promo codes bypass Stripe entirely** — they update profiles directly, no payment flow involved
