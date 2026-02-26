import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { Flower2 } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
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
        <title>Reset Password | Go Daisy</title>
        <meta name="description" content="Reset your Go Daisy account password." />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-100 flex items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-2xl">
          <div className="card-body">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <Flower2 className="w-16 h-16 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-primary">Go Daisy</h1>
              <p className="text-base-content/70 mt-2">Reset your password</p>
            </div>

            {success ? (
              <div className="alert alert-success mb-4">
                <div className="flex flex-col gap-2 w-full">
                  <span className="font-bold">Check your email!</span>
                  <span className="text-sm">
                    We&apos;ve sent you a password reset link. Click the link in the email to set a new password.
                  </span>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="alert alert-error mb-4">
                    <span>{error}</span>
                  </div>
                )}

                <p className="text-sm text-base-content/70 mb-4">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email</span>
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
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
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Back to sign in */}
            <div className="text-center mt-4">
              <Link href="/login" className="btn btn-ghost btn-sm">
                &larr; Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
