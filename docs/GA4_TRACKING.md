# GA4 tracking — Go Daisy and Grow Daisy

Updated: 2026-11-16 · ✅ in code, ⏳ needs the GA admin settings below

Two properties from one tag:

| App | Property | Stream ID | Loaded when |
|---|---|---|---|
| Go Daisy | godaisy.io | `G-0YDQB1067L` | any page not under `/grow` or `/findr` |
| Grow Daisy | grow.godaisy.io | `G-S895QHFGQH` | host `grow.*` or path `/grow…` |

The property is chosen once, on the page you land on (`pages/_app.tsx`,
`lib/analytics/gaIds.ts`). A client-side hop from `/` into `/grow` stays on the
Go Daisy tag.

## How it is wired

- **One entry point.** `lib/analytics/track.ts` → `track(name, params)`, typed
  by `EventParams`. Add an event there before calling it. `lib/analytics/events.ts`
  (`trackEvent`) is gone; every call site moved over with its event name unchanged.
- **Tag start-up.** `gaInitScript()` runs `config` with `send_page_view: false`,
  dispatches `daisy:ga-ready`, then sends the first `page_view`. Calls made
  before that (identity, content_group, events on mount) are queued in
  `track.ts` and flushed on ready, so the first page_view carries them.
- **Money is sent server-side.** `start_trial` and `purchase` come from
  `pages/api/stripe/webhook.ts` and `pages/api/revenuecat/webhook.ts` through the
  Measurement Protocol (`lib/analytics/measurement-protocol.ts`, mapping in
  `lib/analytics/paymentEvents.ts`). Each event goes to its own property with
  that property's secret: `GA_MP_API_SECRET_GODAISY` / `GA_MP_API_SECRET_GROW`.
  No secret, or `VERCEL_ENV !== 'production'`: nothing is sent. 2.5 s timeout,
  never throws. If Stripe Checkout metadata carries `ga_client_id` (the browser's
  `_ga` id, `gaClientId()`), the server event joins that browser session;
  otherwise it joins on user_id.
- **Identity.** `components/analytics/AnalyticsIdentity.tsx` sets `user_id` =
  first 32 hex of SHA-256(`"<app>:" + supabase user id`), app = `godaisy` | `grow`
  (the same function server-side), and user properties `platform`
  (web / ios / android), `signed_in` (yes / no), `pro_status` (Go Daisy
  `free`/`plus`, Grow `seed`/`sprout`/…, `unknown` while loading). It fires
  `sign_up` / `login` once per real sign-in (`lib/analytics/sign-in-kind.ts`):
  Supabase re-emits `SIGNED_IN` on refocus and token refresh, so it reads
  `last_sign_in_at` instead.
- **Sections.** Every page view carries `content_group` (`contentGroupFor`):
  `call`, `conditions`, `onboarding`, `account`, `support`, `auth`, `studio`,
  `activities`, `activity_page`, `shared_link`, `get_app`, `legal`, `about`,
  `grow_home`, `grow_garden`, `grow_plan`, `grow_species`, `grow_pricing`, ….
- **Hits GA ignores.** `ga-disable-<id>` is set on `/admin`, `/dev`, `/demo`,
  `/test`, `/internal`, and on every host that isn't godaisy.io /
  www.godaisy.io / grow.godaisy.io. Vercel previews build with
  NODE_ENV=production, so before this they counted as live traffic.

## Events

| Event | App | Where | Params | Key event? |
|---|---|---|---|---|
| `sign_up` | both | AnalyticsIdentity | method | ★ |
| `login` | both | AnalyticsIdentity | method | |
| `begin_checkout` | Go Daisy | tip jar: /support, /account | product, product_kind, surface | |
| `start_trial` | both | Stripe + RevenueCat webhooks | product, product_kind, store, value 0, currency | ★ |
| `purchase` | both | Stripe `invoice.payment_succeeded` (paid), lifetime `checkout.session.completed`; RevenueCat INITIAL_PURCHASE / RENEWAL / NON_RENEWING_PURCHASE | transaction_id, value, currency, product, product_kind, billing_reason, store | ★ (built in) |
| `tutorial_complete` | Go Daisy | /start finished | sports_count, has_coastal, has_hour | ★ |
| `view_call` | Go Daisy | the call rendered, once per load | activity_id, band, day_index, alternates, place_kind | ★ |
| `save_location` | Go Daisy | LocationSheet, account, CallHourCard | kind (place/coastal/hour), method, surface | |
| `push_permission` | Go Daisy | useGoDaisyPushNotifications | result, surface | |
| `enable_notifications` | Go Daisy | push subscription saved | surface | ★ |
| `share` | Go Daisy | with `call_shared` / `conditions_shared` | method, content_type, item_id | |
| `call_shared` (history) | Go Daisy | /call | activity_id, day_index, band, with_card, method, place_kind | ★ |
| `call_share_failed`, `call_alternate_viewed`, `call_why_opened` | Go Daisy | /call | as before | |
| `conditions_shared`, `conditions_numbers_opened` | Go Daisy | /weather | as before | |
| `cross_promo_view`, `cross_promo_click` | Go Daisy | footer, GetTheApp, cross-promo cards | from_app, to_app, placement | |
| `rate_link_click`, `review_requested` | Go Daisy | RateGoDaisy, in-app review | placement / moment, platform | |
| `generate_lead` | Go Daisy | Studio brief form sent | lead_source, surface | ★ |

**Grow Daisy client events are not wired.** Grow's code (`pages/grow`,
`components/grow`, `lib/grow`, `pages/api/grow`) is Joe's, so this pass only
gives Grow the shared layer: identity, sign_up/login, content_group, the
kill-switch and server-side start_trial/purchase. For Joe to add:
`begin_checkout` on /grow/premium (and pass `ga_client_id: gaClientId()` into
the checkout metadata in `pages/api/grow/create-checkout-session.ts`), a
`tutorial_complete` for Grow onboarding, adding a plant or bed to the garden,
logging a harvest, and notifications opt-in (`useGrowPushNotifications`).

## GA admin checklist (the owner, not code)

For **each** property (Go Daisy `G-0YDQB1067L`, Grow `G-S895QHFGQH`):

1. Admin → Data streams → the stream → Measurement Protocol API secrets →
   Create. Put it in Vercel **production** as `GA_MP_API_SECRET_GODAISY` or
   `GA_MP_API_SECRET_GROW` (`./scripts/vercel-env-add.sh`).
2. Custom definitions → user-scoped dimensions: `platform`, `signed_in`, `pro_status`.
3. Event-scoped dimensions: `method`, `surface`, `product`, `product_kind`,
   `store`, `billing_reason`. Go Daisy also: `activity_id`, `band`,
   `place_kind`, `kind`, `content_type`, `placement`, `to_app`, `lead_source`, `result`.
   (`content_group` is built in.)
4. Key events: `sign_up`, `start_trial`, `purchase` (already one by default).
   Go Daisy also: `tutorial_complete`, `view_call`, `call_shared`,
   `enable_notifications`, `generate_lead`.
5. Data retention → 14 months.
6. Admin → Data settings → Data collection: User-ID is on by default for
   reporting identity "Blended"; leave it.

In Stripe: the webhook endpoint for `/api/stripe/webhook` must have
`invoice.payment_succeeded` enabled, or subscription revenue never arrives.

## Debugging

gtag.js loads in production only. Elsewhere set
`localStorage.setItem('daisy:ga-debug', '1')` and each call is logged as
`[ga] …`. GA's DebugView needs the Chrome GA Debugger extension on the live site.
Tests: `__tests__/analyticsTracking.test.ts`.
