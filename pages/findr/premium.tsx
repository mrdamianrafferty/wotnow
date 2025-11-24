/**
 * Findr Premium Page
 *
 * Shows pricing and allows users to subscribe to Findr Premium.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSubscription } from '@/hooks/useSubscription';
import { getStripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/client';

export default function PremiumPage() {
  const router = useRouter();
  const { isPremium, isLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleSubscribe = async () => {
    try {
      setCheckoutLoading(true);
      setError('');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/findr/auth?redirect=/findr/premium');
        return;
      }

      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          voucherCode: voucherCode.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      if (stripe) {
        await (stripe as any).redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl">You&rsquo;re Premium!</h2>
            <p className="text-base-content/70">
              You already have an active Findr Premium subscription.
            </p>
            <div className="card-actions justify-center mt-4">
              <button
                onClick={() => router.push('/findr/account')}
                className="btn btn-primary"
              >
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-100 to-base-200 p-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Findr Premium</h1>
          <p className="text-xl text-base-content/70">
            Unlock pro-level fishing forecasts
          </p>
        </div>

        {/* Pricing Card */}
        <div className="card bg-base-100 shadow-2xl max-w-md mx-auto">
          <div className="card-body">
            <div className="text-center mb-6">
              <div className="text-5xl font-bold mb-2">€10</div>
              <div className="text-base-content/70">per month</div>
              <div className="badge badge-success mt-2">7-day free trial</div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Unlimited bite predictions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Advanced environmental indicators</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Saved fishing marks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Detailed catch logs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Email alerts for target species</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Early access to new features</span>
              </li>
            </ul>

            {/* Voucher Code */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Have a voucher code?</span>
              </label>
              <input
                type="text"
                placeholder="EARLYBIRD25"
                className="input input-bordered"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            {/* Subscribe Button */}
            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="btn btn-primary btn-block btn-lg"
            >
              {checkoutLoading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Starting checkout...
                </>
              ) : (
                'Start Free Trial'
              )}
            </button>

            <p className="text-xs text-center text-base-content/60 mt-4">
              Cancel anytime. No commitment. VAT included.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">FAQ</h2>

          <div className="space-y-4">
            <div className="collapse collapse-plus bg-base-100 shadow">
              <input type="radio" name="faq" defaultChecked />
              <div className="collapse-title font-medium">
                How does the free trial work?
              </div>
              <div className="collapse-content">
                <p>
                  You get 7 days of free access to all Premium features. You can cancel
                  anytime during the trial and won&rsquo;t be charged.
                </p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-100 shadow">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">
                Can I cancel anytime?
              </div>
              <div className="collapse-content">
                <p>
                  Yes! Cancel anytime from your account page. You&rsquo;ll keep access until
                  the end of your billing period.
                </p>
              </div>
            </div>

            <div className="collapse collapse-plus bg-base-100 shadow">
              <input type="radio" name="faq" />
              <div className="collapse-title font-medium">
                What payment methods do you accept?
              </div>
              <div className="collapse-content">
                <p>
                  We accept all major credit and debit cards through Stripe&rsquo;s secure
                  payment processing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
