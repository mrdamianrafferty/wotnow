import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Fish } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

export default function UpdatePassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // Handle the auth state change when user clicks password reset link
    const handleAuthStateChange = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }

        // If we have a session, user is authenticated via password reset link
        if (session) {
          setIsValidSession(true);
        } else {
          // Check if there are auth tokens in the URL hash (from email link)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (accessToken && type === 'recovery') {
            // Set the session using the tokens from the URL
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) {
              console.error('Error setting session:', error);
              setError('Invalid or expired reset link. Please request a new one.');
            } else if (data.session) {
              setIsValidSession(true);
              // Clean up the URL hash
              window.history.replaceState(null, '', window.location.pathname);
            }
          } else {
            setError('Invalid or expired reset link. Please request a new one.');
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
        setError('Invalid or expired reset link. Please request a new one.');
      } finally {
        setIsCheckingSession(false);
      }
    };

    handleAuthStateChange();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Success! Redirect to findr
      router.push('/findr?password_updated=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>findr - Update Password</title>
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
              <p className="text-base-content/70 mt-2">Set your new password</p>
            </div>

            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            {isCheckingSession ? (
              <div className="text-center">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-2 text-base-content/70">Verifying reset link...</p>
              </div>
            ) : isValidSession ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">New Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Confirm New Password</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
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
                    'Update Password'
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <p className="mb-4">
                  The password reset link is invalid or has expired.
                </p>
                <Link href="/findr/reset-password" className="btn btn-primary">
                  Request New Link
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
