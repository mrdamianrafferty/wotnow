import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Fish } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

export default function QuickReset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Send magic link instead of password reset
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/findr/magic-link`,
        },
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - findr</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-2xl">
          <div className="card-body">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Fish className="w-16 h-16 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary">findr</h1>
              <p className="text-base-content/70 mt-2">Quick sign in with email link</p>
            </div>

            {success ? (
              <div className="text-center">
                <div className="alert alert-success mb-4">
                  <span>✓ Check your email for a sign-in link!</span>
                </div>
                <p className="text-sm text-base-content/70 mb-4">
                  We sent you a magic link to <strong>{email}</strong>. 
                  Click the link in your email to sign in instantly - no password needed!
                </p>
                <Link href="/findr" className="btn btn-outline btn-sm">
                  ← Back to findr
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="alert alert-error mb-4">
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email Address</span>
                    </label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      className="input input-bordered"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading loading-spinner"></span>
                    ) : (
                      '🪄 Send Magic Link'
                    )}
                  </button>
                </form>

                <div className="text-center mt-4">
                  <Link href="/findr/auth" className="link link-primary text-sm">
                    ← Back to sign in
                  </Link>
                </div>

                <div className="divider text-xs">How it works</div>
                <p className="text-xs text-base-content/60 text-center">
                  Magic links let you sign in instantly without remembering passwords. 
                  Just click the link in your email and you&apos;re in! 🎣
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
