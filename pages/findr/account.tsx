/**
 * Findr Account Page
 *
 * Shows subscription status and allows management via Stripe Customer Portal.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { FindrUserSettings } from '@/pages/api/findr/user-settings';

export default function AccountPage() {
  const router = useRouter();
  const { subscription, isPremium, isTrial, isLoading, refetch } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const sessionId = router.query.session_id;

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      // Get user info
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!isMounted || !authUser) return;
      
      setUser(authUser);

      // Fetch user settings to get display name
      try {
        const response = await fetch('/api/findr/user-settings', {
          credentials: 'include',
        });
        const data = await response.json();
        
        if (data.success && data.settings) {
          setDisplayName(data.settings.displayName || '');
        }
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserData();

    // Check for successful checkout
    if (sessionId) {
      // Refetch subscription after successful checkout
      refetch();
      // Remove session_id from URL
      router.replace('/findr/account', undefined, { shallow: true });
    }

    return () => {
      isMounted = false;
    };
  }, [refetch, router, sessionId, supabase]);

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);

      if (!user) {
        router.push('/findr/auth?redirect=/findr/account');
        return;
      }

      // Create portal session
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open subscription portal');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (err) {
      console.error('Portal error:', err);
      alert('Failed to open subscription portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);

      if (!user) {
        router.push('/findr/auth?redirect=/findr/account');
        return;
      }

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Refresh subscription data
      await refetch();
      setShowCancelModal(false);

      // Show success message
      alert(`Subscription cancelled. You'll retain access until ${formatDate(data.cancelsAt)}`);
    } catch (err) {
      console.error('Cancel error:', err);
      alert(err instanceof Error ? err.message : 'Failed to cancel subscription. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setProfileSaving(true);
      setProfileMessage(null);

      const response = await fetch('/api/findr/user-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ displayName }),
      });

      const data = await response.json();

      if (data.success) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        // Clear success message after 3 seconds
        setTimeout(() => setProfileMessage(null), 3000);
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  if (isLoading || profileLoading) {
    return (
      <>
        <Head>
          <title>Account - Findr</title>
          <meta name="description" content="Manage your Findr account and subscription" />
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </>
    );
  }

  if (!user) {
    router.push('/findr/auth?redirect=/findr/account');
    return null;
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <Head>
        <title>Account - Findr</title>
        <meta name="description" content="Manage your Findr account and subscription" />
      </Head>
      <div className="min-h-screen bg-base-200 p-4 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Account</h1>
            <p className="text-base-content/70">{user.email}</p>
          </div>

          {/* Profile Section */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Profile</h2>
              
              {profileMessage && (
                <div className={`alert ${profileMessage.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Display Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Captain Hook"
                    className="input input-bordered w-full"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <label className="label">
                    <span className="label-text-alt">How we address you in Findr</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    value={user.email || ''}
                    disabled
                    readOnly
                  />
                  <label className="label">
                    <span className="label-text-alt">Your account email (cannot be changed here)</span>
                  </label>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="btn btn-primary"
                >
                  {profileSaving ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Subscription Status Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Subscription Status</h2>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`badge ${
                  isPremium ? 'badge-success' : 'badge-ghost'
                } badge-lg`}
              >
                {isPremium ? 'Premium' : 'Free'}
              </div>
              {isTrial && <div className="badge badge-info">Trial</div>}
            </div>

            {isPremium && subscription ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-base-content/70">Platform:</div>
                  <div className="font-medium capitalize">
                    {subscription.paymentPlatform}
                  </div>

                  {subscription.subscriptionStartDate && (
                    <>
                      <div className="text-base-content/70">Started:</div>
                      <div className="font-medium">
                        {formatDate(subscription.subscriptionStartDate)}
                      </div>
                    </>
                  )}

                  {isTrial && subscription.trialEndsAt && (
                    <>
                      <div className="text-base-content/70">Trial ends:</div>
                      <div className="font-medium">
                        {formatDate(subscription.trialEndsAt)}
                      </div>
                    </>
                  )}

                  {subscription.subscriptionEndDate && (
                    <>
                      <div className="text-base-content/70">
                        {isTrial ? 'Next billing:' : 'Renews:'}
                      </div>
                      <div className="font-medium">
                        {formatDate(subscription.subscriptionEndDate)}
                      </div>
                    </>
                  )}
                </div>

                {subscription.paymentPlatform === 'web' && (
                  <div className="card-actions mt-4 flex flex-col gap-2">
                    <button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="btn btn-primary btn-block"
                    >
                      {portalLoading ? (
                        <>
                          <span className="loading loading-spinner"></span>
                          Opening portal...
                        </>
                      ) : (
                        'Manage Subscription'
                      )}
                    </button>

                    <button
                      onClick={() => setShowCancelModal(true)}
                      disabled={cancelLoading}
                      className="btn btn-outline btn-error btn-block"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                )}

                {subscription.paymentPlatform === 'ios' && (
                  <div className="alert alert-info mt-4">
                    <span>
                      Your subscription is managed through the App Store. Open the
                      Findr iOS app to manage your subscription.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-base-content/70">
                  You&rsquo;re currently on the free plan. Upgrade to Premium to unlock
                  advanced features!
                </p>

                <div className="card-actions">
                  <button
                    onClick={() => router.push('/findr/premium')}
                    className="btn btn-primary btn-block"
                  >
                    Upgrade to Premium
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Premium Features Preview (for free users) */}
        {!isPremium && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Premium Features</h2>

              <ul className="space-y-2">
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
              </ul>
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Account Actions</h2>

            <div className="space-y-2">
              <button
                onClick={() => router.push('/findr/settings')}
                className="btn btn-outline btn-block justify-start"
              >
                Settings
              </button>

              <button
                onClick={() => supabase.auth.signOut().then(() => router.push('/findr'))}
                className="btn btn-outline btn-error btn-block justify-start"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Cancel Subscription?</h3>

            <p className="mb-4">
              Your subscription will be cancelled, but you&apos;ll keep access to Premium features
              until the end of your current billing period on{' '}
              <span className="font-semibold">{formatDate(subscription?.subscriptionEndDate)}</span>.
            </p>

            <p className="text-sm text-base-content/70 mb-6">
              You won&apos;t be charged again, and you can resubscribe anytime.
            </p>

            <div className="modal-action">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="btn btn-ghost"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="btn btn-error"
              >
                {cancelLoading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Cancelling...
                  </>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !cancelLoading && setShowCancelModal(false)}></div>
        </div>
      )}
    </div>
    </>
  );
}
