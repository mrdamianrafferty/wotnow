import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'

// Minimal test page using the standard Supabase client (not SSR)
// This is JUST to test if OAuth works at all with your Supabase project

export default function TestAuth() {
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    try {
      setError(null)

      // Create a fresh client with NO custom configuration
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      console.log('[Test Auth] Starting OAuth...')

      const { data, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/test-auth`,
        },
      })

      if (authError) {
        console.error('[Test Auth] Error:', authError)
        setError(authError.message)
      } else {
        console.log('[Test Auth] Success:', data)
        console.log('[Test Auth] OAuth URL:', data.url)

        // Explicitly redirect if SDK doesn't do it automatically
        if (data.url) {
          console.log('[Test Auth] Manually redirecting to:', data.url)
          window.location.href = data.url
        }
      }
    } catch (err) {
      console.error('[Test Auth] Caught error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div style={{ padding: '50px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Minimal Auth Test</h1>
      <p>This uses the standard @supabase/supabase-js client with zero custom configuration.</p>

      {error && (
        <div style={{ background: 'red', color: 'white', padding: '10px', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          background: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        Test Google Login
      </button>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>Open DevTools console to see logs.</p>
        <p>Check Application tab → Local Storage and Cookies while logging in.</p>
      </div>
    </div>
  )
}
