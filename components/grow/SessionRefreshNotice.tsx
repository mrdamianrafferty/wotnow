import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

type SessionStatus = 'idle' | 'refreshing' | 'success' | 'failed';

export function SessionRefreshNotice() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleRefreshStart = () => {
      setStatus('refreshing');
      setMessage('Refreshing your session...');
    };

    const handleRefreshSuccess = () => {
      setStatus('success');
      setMessage('Session refreshed successfully');
      window.setTimeout(() => setStatus('idle'), 3000);
    };

    const handleRefreshFailed = () => {
      setStatus('failed');
      setMessage('Session expired - please sign in again');
    };

    window.addEventListener('auth:refreshing', handleRefreshStart);
    window.addEventListener('auth:refresh-success', handleRefreshSuccess);
    window.addEventListener('auth:refresh-failed', handleRefreshFailed);

    return () => {
      window.removeEventListener('auth:refreshing', handleRefreshStart);
      window.removeEventListener('auth:refresh-success', handleRefreshSuccess);
      window.removeEventListener('auth:refresh-failed', handleRefreshFailed);
    };
  }, []);

  if (status === 'idle') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert variant={status === 'failed' ? 'destructive' : 'default'}>
        {status === 'refreshing' && <RefreshCw className="h-4 w-4 animate-spin" />}
        {status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
        {status === 'failed' && <XCircle className="h-4 w-4" />}
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
