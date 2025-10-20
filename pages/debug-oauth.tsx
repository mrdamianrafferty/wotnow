import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';

export default function DebugOAuth() {
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    const checkStorage = () => {
      const allLocalStorage: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allLocalStorage[key] = localStorage.getItem(key);
        }
      }

      const allSessionStorage: Record<string, any> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          allSessionStorage[key] = sessionStorage.getItem(key);
        }
      }

      setInfo({
        currentOrigin: window.location.origin,
        currentHostname: window.location.hostname,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        localStorage: allLocalStorage,
        sessionStorage: allSessionStorage,
        supabaseKeys: Object.keys(allLocalStorage).filter(k => k.includes('supabase') || k.includes('sb-')),
      });
    };

    checkStorage();
  }, []);

  const testOAuth = async () => {
    const redirectTo = `${window.location.origin}/auth/callback?app=godaisy&test=true`;
    console.log('Testing OAuth with redirectTo:', redirectTo);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true, // Don't actually redirect, just test
      },
    });

    console.log('OAuth test result:', { data, error });
    alert(`OAuth URL generated: ${data?.url}\n\nCheck console for details`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">OAuth Debug Information</h1>
      
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Environment</h2>
          <pre className="text-xs overflow-auto bg-base-300 p-4 rounded">
            {JSON.stringify({
              currentOrigin: info.currentOrigin,
              currentHostname: info.currentHostname,
              supabaseUrl: info.supabaseUrl,
            }, null, 2)}
          </pre>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Supabase Keys in Local Storage</h2>
          <pre className="text-xs overflow-auto bg-base-300 p-4 rounded max-h-60">
            {JSON.stringify(info.supabaseKeys, null, 2)}
          </pre>
          {info.supabaseKeys?.length === 0 && (
            <p className="text-warning">⚠️ No Supabase keys found in localStorage!</p>
          )}
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">All Local Storage</h2>
          <pre className="text-xs overflow-auto bg-base-300 p-4 rounded max-h-60">
            {JSON.stringify(info.localStorage, null, 2)}
          </pre>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Session Storage</h2>
          <pre className="text-xs overflow-auto bg-base-300 p-4 rounded max-h-60">
            {JSON.stringify(info.sessionStorage, null, 2)}
          </pre>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">Test OAuth (No Redirect)</h2>
          <p className="text-sm">This will generate an OAuth URL without redirecting. Check console for output.</p>
          <button onClick={testOAuth} className="btn btn-primary">
            Test OAuth URL Generation
          </button>
        </div>
      </div>

      <div className="card bg-warning text-warning-content">
        <div className="card-body">
          <h2 className="card-title">⚠️ Common Issues</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><strong>No Supabase keys in localStorage:</strong> PKCE verifier not being stored</li>
            <li><strong>Wrong domain in localStorage keys:</strong> OAuth initiated from different domain</li>
            <li><strong>Supabase Site URL mismatch:</strong> Check Supabase Dashboard → Authentication → URL Configuration</li>
            <li><strong>Required Site URL:</strong> Must be <code>https://www.godaisy.io</code> (exact match including www)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
