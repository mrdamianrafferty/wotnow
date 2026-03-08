/**
 * Go Daisy+ Promo Code Deep Link Page
 *
 * Handles ?code= query param for promo code redemption.
 * Redirects to login if not authenticated, then redeems code.
 *
 * @module pages/redeem
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RedeemPage() {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<'loading' | 'input' | 'redeeming' | 'success' | 'error'>('loading');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{
    grantedUntil: string;
    durationDays: number;
  } | null>(null);

  // Auto-redeem if code is in URL
  useEffect(() => {
    if (!router.isReady) return;

    const urlCode = typeof router.query.code === 'string' ? router.query.code.trim() : '';
    if (urlCode) {
      setCode(urlCode);
      redeemCode(urlCode);
    } else {
      setStatus('input');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.code]);

  const redeemCode = async (promoCode: string) => {
    try {
      setStatus('redeeming');
      setErrorMsg('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Redirect to login with return URL
        router.push(`/login?redirect=${encodeURIComponent(`/redeem?code=${promoCode}`)}`);
        return;
      }

      const res = await fetch('/api/godaisy/promo/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: promoCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to redeem code');
        setStatus('error');
        return;
      }

      setResult({
        grantedUntil: data.grantedUntil,
        durationDays: data.durationDays,
      });
      setStatus('success');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex items-center justify-center p-4" data-theme="light">
      <Head>
        <title>Redeem Code - Go Daisy+</title>
      </Head>

      <div className="max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-600 mx-auto" />
          </div>
        )}

        {status === 'input' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-14 h-14 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-7 w-7 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Redeem a code</h1>
            <p className="text-gray-600 mb-6">
              Enter your promo code to unlock Go Daisy+
            </p>

            <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) redeemCode(code.trim()); }}>
              <input
                type="text"
                placeholder="Enter promo code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg font-mono uppercase bg-white text-gray-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 mb-4"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                Redeem
              </button>
            </form>
          </div>
        )}

        {status === 'redeeming' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Redeeming code...</h2>
            <p className="text-gray-600">Activating your Go Daisy+ access</p>
          </div>
        )}

        {status === 'success' && result && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Go Daisy+!</h2>
            <p className="text-gray-600 mb-2">
              You have {result.durationDays} days of Go Daisy+ access.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Active until {new Date(result.grantedUntil).toLocaleDateString()}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Sparkles className="h-5 w-5" />
              Start exploring
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Couldn&apos;t redeem code</h2>
            <p className="text-red-600 mb-6">{errorMsg}</p>
            <button
              onClick={() => { setStatus('input'); setErrorMsg(''); }}
              className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try another code
            </button>
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/" className="text-cyan-600 hover:text-cyan-700 text-sm font-medium">
            Back to Go Daisy
          </Link>
        </div>
      </div>
    </div>
  );
}
