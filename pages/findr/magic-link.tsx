import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Fish } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

export default function MagicLink() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        // Get URL params - Supabase magic links can use various formats
        const urlParams = new URLSearchParams(window.location.search);
        const urlHash = window.location.hash;
        
        // Log all parameters for debugging
        console.log('Magic link params:', {
          search: window.location.search,
          hash: urlHash,
          allParams: Object.fromEntries(urlParams.entries())
        });

        // Try different parameter formats that Supabase might use
        const token_hash = urlParams.get('token_hash') || urlParams.get('token');
        const access_token = urlParams.get('access_token');
        const refresh_token = urlParams.get('refresh_token');
        const code = urlParams.get('code');
        const type = urlParams.get('type') || 'magiclink';
        const authError = urlParams.get('error') || urlParams.get('error_description');

        // Check for errors first
        if (authError) {
          throw new Error(authError);
        }

        // Handle PKCE code exchange (newer Supabase)
        if (code) {
          console.log('Using PKCE code exchange');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus('success');
          
          // If this is a recovery flow, send to password update page
          if ((type || '').toLowerCase() === 'recovery') {
            router.push('/findr/update-password');
          } else {
            router.push('/findr');
          }
          return;
        }

        // Handle direct token access (implicit flow)
        if (access_token) {
          console.log('Using direct token access');
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || ''
          });
          if (error) throw error;
          setStatus('success');
          
          // If this is a recovery flow, send to password update page
          if ((type || '').toLowerCase() === 'recovery') {
            router.push('/findr/update-password');
          } else {
            router.push('/findr');
          }
          return;
        }

        // Handle legacy token_hash (older Supabase)
        if (token_hash) {
          console.log('Using legacy token hash');
          const { error } = await supabase.auth.verifyOtp({
            type: (type as 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite'),
            token_hash
          });
          if (error) throw error;
          setStatus('success');
          
          // If this is a recovery flow, send to password update page
          if ((type || '').toLowerCase() === 'recovery') {
            router.push('/findr/update-password');
          } else {
            router.push('/findr');
          }
          return;
        }

        // Check if already authenticated (session from cookies)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Already authenticated via session');
          setStatus('success');
          
          // If this is a recovery flow, send to password update page
          if ((type || '').toLowerCase() === 'recovery') {
            router.push('/findr/update-password');
          } else {
            router.push('/findr');
          }
          return;
        }

        // If we get here, no valid auth parameters found
        throw new Error('No valid authentication parameters found in the link.');
        
      } catch (err) {
        console.error('Magic link error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleMagicLink();
  }, [router]);

  return (
    <>
      <Head>
        <title>Sign In - fishfindr</title>
        <meta name="description" content="Completing your sign-in..." />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <Fish className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">
              {status === 'checking' && 'Signing you in...'}
              {status === 'success' && 'Welcome back!'}
              {status === 'error' && 'Sign-in failed'}
            </h1>
          </div>

          {status === 'checking' && (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Processing your magic link...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="text-green-600">
                <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600">Redirecting you to fishfindr...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="text-red-600">
                <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-600 text-sm">{error}</p>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/findr/simple-auth')}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try signing in again
                </button>
                <button
                  onClick={() => router.push('/findr')}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Continue without signing in
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// Disable static generation for magic link page (requires authentication flow)
export async function getServerSideProps() {
  return { props: {} };
}