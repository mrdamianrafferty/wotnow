/**
 * Push Notification Debug Page
 * Temporary page to debug push notification registration
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export default function DebugPushPage() {
  const [status, setStatus] = useState<string[]>(['Loading...']);
  const [token, setToken] = useState<string | null>(null);

  const addStatus = (msg: string) => {
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const init = async () => {
      addStatus(`Platform: ${Capacitor.getPlatform()}`);
      addStatus(`Native: ${Capacitor.isNativePlatform()}`);

      if (!Capacitor.isNativePlatform()) {
        addStatus('Not a native platform - push not available');
        return;
      }

      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        addStatus('PushNotifications plugin loaded');

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();
        addStatus(`Current permission: ${permStatus.receive}`);

        // Check localStorage for stored token
        const storedToken = localStorage.getItem('push_notification_token');
        if (storedToken) {
          addStatus(`Stored token found: ${storedToken.substring(0, 20)}...`);
          setToken(storedToken);
        } else {
          addStatus('No stored token found');
        }
      } catch (e) {
        addStatus(`Error: ${e}`);
      }
    };

    init();
  }, []);

  const requestPermission = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      addStatus('Requesting permission...');
      const perm = await PushNotifications.requestPermissions();
      addStatus(`Permission result: ${perm.receive}`);

      if (perm.receive === 'granted') {
        addStatus('Registering for push...');

        // Set up listener before registering
        PushNotifications.addListener('registration', (regToken) => {
          addStatus(`Got token: ${regToken.value.substring(0, 30)}...`);
          setToken(regToken.value);
          localStorage.setItem('push_notification_token', regToken.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          addStatus(`Registration error: ${JSON.stringify(error)}`);
        });

        await PushNotifications.register();
        addStatus('Register called');
      }
    } catch (e) {
      addStatus(`Error: ${e}`);
    }
  };

  const syncToken = async () => {
    const tokenToSync = token || localStorage.getItem('push_notification_token');
    if (!tokenToSync) {
      addStatus('No token to sync');
      return;
    }

    try {
      addStatus('Getting auth session...');
      const { supabase } = await import('@/lib/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        addStatus('Not authenticated');
        return;
      }

      addStatus(`Syncing token to server...`);
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token: tokenToSync,
          platform: 'ios'
        }),
      });

      const result = await response.json();
      addStatus(`Sync result: ${response.status} - ${JSON.stringify(result)}`);
    } catch (e) {
      addStatus(`Sync error: ${e}`);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <h1 className="text-xl font-bold mb-4">Push Debug</h1>

      <div className="flex gap-2 mb-4">
        <button className="btn btn-primary btn-sm" onClick={requestPermission}>
          Request Permission
        </button>
        <button className="btn btn-secondary btn-sm" onClick={syncToken}>
          Sync Token
        </button>
      </div>

      {token && (
        <div className="bg-success/20 p-2 rounded mb-4 text-xs break-all">
          <strong>Token:</strong> {token}
        </div>
      )}

      <div className="bg-base-100 rounded p-2">
        <h2 className="font-bold mb-2">Log:</h2>
        <div className="text-xs space-y-1 font-mono">
          {status.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
