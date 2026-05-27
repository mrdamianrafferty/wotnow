/**
 * Go Daisy — Android tester signup page at /android-testers.
 *
 * Single-file form that lets anyone offer to be one of the twelve testers
 * Google Play requires for closed-beta-to-production launch.
 *
 * On submit:
 *   - Inserts a row directly into the `android_testers` Supabase table
 *   - Uses the existing browser Supabase client (anon key)
 *   - RLS policy on the table allows anonymous inserts but blocks reads,
 *     so signups can be created from the browser but not enumerated
 *
 * Linked migration: supabase/migrations/20260514016_android_testers.sql
 *
 * What to do with new signups (manual for now):
 *   - Check the table in the Supabase dashboard each day
 *   - Add the tester's Google account email to the Play Console closed test
 *   - Send the opt-in URL to the email they provided
 */

import React, { useState } from 'react';
import Link from 'next/link';
import AppHeader from '../components/AppHeader';
import dynamic from 'next/dynamic';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabase/client';

const Footer = dynamic(() => import('../components/footer'), { ssr: false });

// ============================================================================
// Activity options for the dropdown — mirrors the top-level taxonomy users
// pick from on the home page. Keeps the form short while still capturing
// the signal that helps us prioritise which sister apps to ship on Android.
// ============================================================================

const PRIMARY_ACTIVITIES = [
  '— pick one (optional) —',
  'Hiking / walking',
  'Surfing / water sports',
  'Cycling / mountain biking',
  'Team sports (football, cricket, rugby, GAA)',
  'Padel / tennis / racquet sports',
  'Wild swimming / sea swimming',
  'Stargazing / astronomy',
  'Fishing (sea or freshwater)',
  'Gardening',
  'Winter sports (skiing, snowboarding)',
  'Yoga / pilates / fitness',
  'Indoor / social (pub, cinema, museums)',
  'Something else',
];

// ============================================================================
// Country options — common European markets first, then "other".
// Used to spread testers across timezones, which Google Play seems to
// reward for "real testing" signal.
// ============================================================================

const COUNTRIES = [
  '— pick one (optional) —',
  'United Kingdom',
  'Ireland',
  'Spain',
  'Portugal',
  'France',
  'Italy',
  'Germany',
  'Netherlands',
  'Poland',
  'Sweden',
  'Turkey',
  'Other',
];

// ============================================================================
// Component
// ============================================================================

export default function AndroidTestersPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [activity, setActivity] = useState(PRIMARY_ACTIVITIES[0]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const { error } = await supabase.from('android_testers').insert({
      email: email.trim().toLowerCase(),
      name: name.trim() || null,
      country: country === COUNTRIES[0] ? null : country,
      primary_activity:
        activity === PRIMARY_ACTIVITIES[0] ? null : activity,
    });

    if (error) {
      // If a duplicate email exists, treat it as success — the person already
      // signed up. Otherwise show a generic error and ask them to email us.
      if (error.code === '23505') {
        setStatus('success');
      } else {
        console.error('android_testers insert error:', error);
        setErrorMsg(
          'Something went wrong. Please email hello@godaisy.io and we will add you manually.'
        );
        setStatus('error');
      }
      return;
    }

    setStatus('success');
  }

  return (
    <>
      <SEO
        title="Help us launch Go Daisy on Android — be one of our 12 testers"
        description="The Android version of Go Daisy is built and in closed beta. Google Play needs 12 testers to use the app for two weeks before we can launch. Sign up to be one of them and get free lifetime access to our specialist sister apps."
        url="https://godaisy.io/android-testers"
      />

      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content">
        <section className="px-4 py-12 md:py-20 bg-gradient-to-b from-base-200 to-base-100">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-5xl mb-4" aria-hidden="true">
              🤖
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-6">
              Help us launch Go Daisy on Android.
            </h1>
            <p className="text-lg text-base-content/80 leading-relaxed">
              The Android version is built and ready. Google Play asks us to
              find twelve testers to use it on real Android phones for two
              weeks before we can release it to the world — so that&rsquo;s
              what we&rsquo;re doing.
            </p>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="max-w-2xl mx-auto">
            <div className="card bg-base-100 shadow-xl border border-base-300">
              <div className="card-body">
                {status === 'success' ? (
                  <SuccessPanel />
                ) : (
                  <>
                    <h2 className="card-title text-2xl mb-2">
                      Sign me up
                    </h2>
                    <p className="text-base-content/70 mb-6">
                      Takes 30 seconds. We&rsquo;ll email you the Google Play
                      opt-in link within 24 hours.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="label" htmlFor="email">
                          <span className="label-text font-medium">
                            Email <span className="text-error">*</span>
                          </span>
                          <span className="label-text-alt text-base-content/50">
                            Use the email tied to your Google account on your
                            Android phone
                          </span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input input-bordered w-full"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </div>

                      <div>
                        <label className="label" htmlFor="name">
                          <span className="label-text font-medium">
                            First name
                          </span>
                          <span className="label-text-alt text-base-content/50">
                            optional — so we can say hi
                          </span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="input input-bordered w-full"
                          placeholder="Alex"
                          autoComplete="given-name"
                        />
                      </div>

                      <div>
                        <label className="label" htmlFor="country">
                          <span className="label-text font-medium">
                            Country
                          </span>
                          <span className="label-text-alt text-base-content/50">
                            optional
                          </span>
                        </label>
                        <select
                          id="country"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="select select-bordered w-full"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="label" htmlFor="activity">
                          <span className="label-text font-medium">
                            What&rsquo;s your main thing?
                          </span>
                          <span className="label-text-alt text-base-content/50">
                            optional
                          </span>
                        </label>
                        <select
                          id="activity"
                          value={activity}
                          onChange={(e) => setActivity(e.target.value)}
                          className="select select-bordered w-full"
                        >
                          {PRIMARY_ACTIVITIES.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>

                      {status === 'error' && (
                        <div role="alert" className="alert alert-error">
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="btn btn-primary btn-lg w-full"
                      >
                        {status === 'loading'
                          ? 'Signing you up...'
                          : 'Sign me up as a tester'}
                      </button>

                      <p className="text-xs text-base-content/60 text-center">
                        We&rsquo;ll only use your email to send you the
                        closed-test opt-in link and one or two check-ins during
                        the two-week test. No marketing.
                      </p>
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* What you get block */}
            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-4">What you get</h2>
              <ul className="space-y-3 text-base-content/80">
                <li className="flex gap-3">
                  <span className="text-success text-xl">✓</span>
                  <span>
                    <strong>Early access to Go Daisy on Android</strong>{' '}
                    before anyone else.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success text-xl">✓</span>
                  <span>
                    <strong>Free lifetime access</strong> to our specialist
                    sister apps (Findr for sea anglers, Rise Daisy for fly
                    fishers, Grow Daisy for gardeners) when they ship on
                    Android.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success text-xl">✓</span>
                  <span>
                    <strong>A direct line to us</strong> for feedback — what
                    works, what doesn&rsquo;t, what&rsquo;s missing.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-success text-xl">✓</span>
                  <span>
                    <strong>Our genuine gratitude.</strong> You&rsquo;re the
                    reason this app gets to launch.
                  </span>
                </li>
              </ul>
            </div>

            {/* How it works */}
            <div className="mt-10">
              <h2 className="text-2xl font-bold mb-4">How the testing works</h2>
              <ol className="space-y-3 text-base-content/80 list-decimal list-inside">
                <li>
                  You sign up (above). We email you the Google Play closed-test
                  opt-in link within 24 hours.
                </li>
                <li>
                  You click the link from your Android phone. Google Play
                  installs Go Daisy for you.
                </li>
                <li>
                  You use the app a few times a week, like a normal app. Set a
                  home location, pick a few activities you actually do.
                </li>
                <li>
                  Two weeks later (Google&rsquo;s requirement) we submit Go
                  Daisy for production review. About a week after that, it&rsquo;s
                  live on Google Play.
                </li>
                <li>
                  You get a thank-you and your codes for free lifetime access
                  to the sister apps.
                </li>
              </ol>
              <p className="mt-4 text-sm text-base-content/60">
                Total of about 10 minutes a week. No bug-hunting expected,
                though feedback is very welcome.
              </p>
            </div>

            <div className="mt-10 text-center">
              <Link href="/" className="link link-primary">
                &larr; Back to Go Daisy
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

// ============================================================================
// Success panel — shown after a successful insert
// ============================================================================

function SuccessPanel() {
  return (
    <div className="text-center py-6">
      <div className="text-6xl mb-4" aria-hidden="true">
        🎉
      </div>
      <h2 className="text-3xl font-bold mb-3">You&rsquo;re in.</h2>
      <p className="text-base-content/80 mb-6 max-w-md mx-auto leading-relaxed">
        Thank you. We&rsquo;ll email you the Google Play closed-test opt-in
        link within 24 hours. Keep an eye on the email you signed up with — if
        you don&rsquo;t see it, check spam.
      </p>
      <p className="text-sm text-base-content/60 mb-8">
        In the meantime, the web app at <Link href="/" className="link">godaisy.io</Link>{' '}
        works on Android browsers if you want a sneak peek.
      </p>
      <Link href="/" className="btn btn-primary btn-lg">
        Back to Go Daisy
      </Link>
    </div>
  );
}
