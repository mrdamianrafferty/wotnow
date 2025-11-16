import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { auth } from '../../lib/grow/auth';
import { supabase } from '../../lib/supabase/client';

interface DebugInfo {
  hasAccessToken?: boolean;
  accessTokenLength?: number;
  accessTokenPrefix?: string;
  hasSession?: boolean;
  sessionUserId?: string | null;
  sessionUserEmail?: string | null;
  supabaseUserId?: string | null;
  supabaseUserEmail?: string | null;
  supabaseError?: string;
  authUserId?: string | null;
  authUserEmail?: string | null;
  userIdsMatch?: boolean;
  error?: string;
}

export function AuthDebugger() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Check localStorage
      const accessToken = localStorage.getItem('access_token');

      // Check session
      const session = await auth.getSession();

      // Check user via Supabase
      const { data: { user: supabaseUser }, error: supabaseError } = 
        await supabase.auth.getUser(accessToken || '');

      // Check user via auth service
      const authUser = await auth.getUser();

      setDebugInfo({
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length ?? 0,
        accessTokenPrefix: accessToken ? `${accessToken.substring(0, 20)}...` : '',
        hasSession: !!session,
        sessionUserId: session?.user?.id ?? null,
        sessionUserEmail: session?.user?.email ?? null,
        supabaseUserId: supabaseUser?.id ?? null,
        supabaseUserEmail: supabaseUser?.email ?? null,
        supabaseError: supabaseError?.message,
        authUserId: authUser?.id ?? null,
        authUserEmail: authUser?.email ?? null,
        userIdsMatch: !!(session?.user?.id && session?.user?.id === supabaseUser?.id && session?.user?.id === authUser?.id),
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      setDebugInfo({
        error: err.message || 'Failed to check auth',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🔍 Authentication Debugger
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkAuth}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {debugInfo && (() => {
          const userIdsMatch = !!debugInfo.userIdsMatch;
          return (
            <>
              {/* Status Overview */}
              <Alert variant={userIdsMatch ? 'default' : 'destructive'}>
                {userIdsMatch ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {userIdsMatch ? (
                    <p className="font-medium">✅ Authentication is consistent</p>
                  ) : (
                    <p className="font-medium">⚠️ Authentication mismatch detected!</p>
                  )}
                </AlertDescription>
              </Alert>

              {/* Token Info */}
              <div className="space-y-2">
                <h3 className="font-medium">Access Token</h3>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                  <div>Present: {debugInfo.hasAccessToken ? '✅' : '❌'}</div>
                  <div>Length: {debugInfo.accessTokenLength ?? 0}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {debugInfo.accessTokenPrefix ?? ''}
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="space-y-2">
                <h3 className="font-medium">Session (auth.getSession)</h3>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                  <div>Has Session: {debugInfo.hasSession ? '✅' : '❌'}</div>
                  <div>User ID: {debugInfo.sessionUserId ?? 'none'}</div>
                  <div>Email: {debugInfo.sessionUserEmail ?? 'none'}</div>
                </div>
              </div>

              {/* Supabase User Info */}
              <div className="space-y-2">
                <h3 className="font-medium">Supabase User (via token)</h3>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                  <div>User ID: {debugInfo.supabaseUserId ?? 'none'}</div>
                  <div>Email: {debugInfo.supabaseUserEmail ?? 'none'}</div>
                  {debugInfo.supabaseError && (
                    <div className="text-red-600">Error: {debugInfo.supabaseError}</div>
                  )}
                </div>
              </div>

              {/* Auth Service User Info */}
              <div className="space-y-2">
                <h3 className="font-medium">Auth Service User</h3>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                  <div>User ID: {debugInfo.authUserId ?? 'none'}</div>
                  <div>Email: {debugInfo.authUserEmail ?? 'none'}</div>
                </div>
              </div>

              {/* Comparison */}
              {!userIdsMatch && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">User ID Mismatch!</p>
                    <p className="text-sm">
                      The user IDs from different sources do not match. This could cause 
                      &quot;Forbidden&quot; errors when trying to access your data.
                    </p>
                    <p className="text-sm mt-2">
                      <strong>Solution:</strong> Try signing out and signing in again.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {debugInfo.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{debugInfo.error}</AlertDescription>
                </Alert>
              )}
            </>
          );
        })()}
      </CardContent>
    </Card>
  );
}
