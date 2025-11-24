# Stripe Subscription - Usage Guide

## Quick Start

Your Stripe subscription system is ready to use! Here's how to implement it in your app.

## Pages Created

### 1. Premium Page (`/findr/premium`)
Shows pricing and starts the checkout flow.

**URL**: `https://fishfindr.eu/findr/premium`

**Features**:
- Displays €10/month pricing with 7-day trial
- Lists premium features
- Voucher code input (EARLYBIRD25, FISHINGSHOP20)
- Redirects to Stripe Checkout
- Shows "Already premium" message if subscribed

### 2. Account Page (`/findr/account`)
Manages subscription and shows status.

**URL**: `https://fishfindr.eu/findr/account`

**Features**:
- Shows subscription status (Free/Premium/Trial)
- Displays subscription dates
- "Manage Subscription" button (opens Stripe Customer Portal)
- Upgrade prompt for free users
- Sign out button

## Components Created

### `<PremiumGate>`
Restricts features to premium users.

**Basic Usage**:
```tsx
import { PremiumGate } from '@/components/findr/premium/PremiumGate';

function MyFeature() {
  return (
    <PremiumGate>
      {/* This content only shows to premium users */}
      <div>Premium feature here</div>
    </PremiumGate>
  );
}
```

**Custom Fallback**:
```tsx
<PremiumGate fallback={<div>Please upgrade to see this</div>}>
  <PremiumFeature />
</PremiumGate>
```

**Hide Instead of Showing Prompt**:
```tsx
<PremiumGate showUpgradePrompt={false}>
  {/* Hidden for free users, no message shown */}
  <PremiumFeature />
</PremiumGate>
```

### `<PremiumBadge>`
Shows a badge if user is premium.

```tsx
import { PremiumBadge } from '@/components/findr/premium/PremiumGate';

function Header() {
  return (
    <div>
      <h1>My Profile</h1>
      <PremiumBadge /> {/* Shows "Premium" badge */}
    </div>
  );
}
```

### `<PremiumLabel>`
Small "PRO" label for buttons/features.

```tsx
import { PremiumLabel } from '@/components/findr/premium/PremiumGate';

function FeatureList() {
  return (
    <button>
      Advanced Stats <PremiumLabel />
    </button>
  );
}
```

## Hook: `useSubscription()`

Access subscription status anywhere in your app.

```tsx
import { useSubscription } from '@/hooks/useSubscription';

function MyComponent() {
  const {
    subscription,    // Full subscription object
    isPremium,       // Boolean: is user premium?
    isTrial,         // Boolean: is user on trial?
    isLoading,       // Boolean: loading state
    error,           // Error object if any
    refetch          // Function to refresh data
  } = useSubscription();

  if (isLoading) return <div>Loading...</div>;

  if (isPremium) {
    return <div>Show premium content</div>;
  }

  return <div>Show free content</div>;
}
```

## Example: Adding Premium Features

### Example 1: Gate a Feature
```tsx
// pages/findr/advanced-analytics.tsx
import { PremiumGate } from '@/components/findr/premium/PremiumGate';

export default function AdvancedAnalytics() {
  return (
    <div>
      <h1>Advanced Analytics</h1>

      <PremiumGate>
        {/* Only premium users see this */}
        <AnalyticsCharts />
        <DetailedStats />
      </PremiumGate>
    </div>
  );
}
```

### Example 2: Show Different Content
```tsx
import { useSubscription } from '@/hooks/useSubscription';

export default function Dashboard() {
  const { isPremium } = useSubscription();

  return (
    <div>
      <h1>Dashboard</h1>

      {isPremium ? (
        <UnlimitedPredictions />
      ) : (
        <div>
          <LimitedPredictions limit={3} />
          <button onClick={() => router.push('/findr/premium')}>
            Upgrade for Unlimited
          </button>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Conditional Button
```tsx
import { useSubscription } from '@/hooks/useSubscription';
import { PremiumLabel } from '@/components/findr/premium/PremiumGate';

export default function Features() {
  const { isPremium } = useSubscription();
  const router = useRouter();

  const handleAdvancedFeature = () => {
    if (!isPremium) {
      router.push('/findr/premium');
      return;
    }

    // Run premium feature
    openAdvancedFeature();
  };

  return (
    <button onClick={handleAdvancedFeature}>
      Advanced Feature {!isPremium && <PremiumLabel />}
    </button>
  );
}
```

## API Endpoints Available

### 1. Create Checkout Session
```typescript
POST /api/stripe/create-checkout-session
Body: { userId: string, email: string, voucherCode?: string }
Response: { sessionId: string, url: string }
```

### 2. Create Portal Session
```typescript
POST /api/stripe/create-portal-session
Body: { userId: string }
Response: { url: string }
```

### 3. Validate Voucher
```typescript
POST /api/vouchers/validate
Body: { voucherCode: string, userId: string }
Response: { valid: boolean, ... }
```

### 4. Webhook (Stripe → Your App)
```typescript
POST /api/stripe/webhook
Headers: stripe-signature
Body: Stripe Event
```

## Testing Locally

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Test the pages**:
   - Premium page: http://localhost:3000/findr/premium
   - Account page: http://localhost:3000/findr/account

3. **Test voucher codes**:
   - `EARLYBIRD25` - 25% off (limit: 100 uses)
   - `FISHINGSHOP20` - 20% off (unlimited uses)

## Before Going Live

### 1. Set Up Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://fishfindr.eu/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### 2. Deploy to Production

```bash
git add .
git commit -m "Add Stripe subscriptions"
git push
```

### 3. Update Environment Variables on Vercel

Add these to your Vercel project environment variables:
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

### 4. Test End-to-End

1. Visit `https://fishfindr.eu/findr/premium`
2. Click "Start Free Trial"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Check that subscription updates in `/findr/account`
5. Verify premium features are unlocked

## Common Issues

### Issue: "Price ID not configured"
**Solution**: Make sure `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID` is set in `.env.local`

### Issue: Webhook signature verification failed
**Solution**: Double-check `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard

### Issue: Subscription not updating after payment
**Solution**: Check webhook is configured correctly and events are being received

### Issue: User can't see premium features after subscribing
**Solution**:
1. Check webhook received `customer.subscription.created` event
2. Verify `profiles` table has `subscription_status = 'premium'`
3. Try refreshing the page (cache may be stale)

## Support

Need help? Check:
- Phase 1 implementation plan: `STRIPE_PHASE_1_IMPLEMENTATION.md`
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Docs: https://docs.stripe.com
