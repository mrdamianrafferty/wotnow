import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  CheckCircle,
  Database,
  Cloud,
  User,
  Activity,
  ChevronDown,
  Info,
  MapPin,
} from 'lucide-react';

interface BackendStatusState {
  authenticated: boolean;
  username: string | null;
  location: string | null;
  tasksCount: number;
  lastSync: string | null;
  usingDatabase: boolean;
}

const safeParseJson = (value: string | null): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('Failed to parse JSON from localStorage', error);
  }

  return null;
};

const getOptionalString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return null;
};

const getField = (data: Record<string, unknown> | null, key: string): unknown => {
  if (!data) {
    return undefined;
  }
  return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : undefined;
};

export function BackendStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<BackendStatusState>({
    authenticated: false,
    username: null,
    location: null,
    tasksCount: 0,
    lastSync: null,
    usingDatabase: false,
  });

  const checkStatus = () => {
    const token = localStorage.getItem('access_token');
    const userData = safeParseJson(localStorage.getItem('currentUser'));
    const interestsData = safeParseJson(localStorage.getItem('userInterests'));

    const username =
      getOptionalString(getField(userData, 'name')) ??
      getOptionalString(getField(userData, 'email'));

    const location =
      getOptionalString(getField(userData, 'location')) ??
      getOptionalString(getField(interestsData, 'location'));

    setStatus({
      authenticated: Boolean(token),
      username,
      location,
      tasksCount: 0,
      lastSync: token ? new Date().toLocaleTimeString() : null,
      usingDatabase: Boolean(token),
    });
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const isConnected = status.authenticated;

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="shadow-lg"
        >
          <Database className="h-4 w-4 mr-2" />
          Backend Status
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80">
      <Card className="shadow-2xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backend Status
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Cloud className={isConnected ? 'h-4 w-4 text-green-600' : 'h-4 w-4 text-gray-400'} />
              <span className="text-sm font-medium">Supabase</span>
            </div>
            {isConnected ? (
              <Badge className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Info className="h-3 w-3 mr-1" />
                Demo Mode
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <User className={isConnected ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-gray-400'} />
              <span className="text-sm font-medium">User</span>
            </div>
            {isConnected ? (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {status.username ?? 'Logged in'}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Not logged in</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <MapPin className={status.location ? 'h-4 w-4 text-orange-600' : 'h-4 w-4 text-gray-400'} />
              <span className="text-sm font-medium">Location</span>
            </div>
            {status.location ? (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {status.location}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Not set</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Database className={status.usingDatabase ? 'h-4 w-4 text-blue-600' : 'h-4 w-4 text-gray-400'} />
              <span className="text-sm font-medium">Storage</span>
            </div>
            {status.usingDatabase ? (
              <span className="text-xs text-muted-foreground">PostgreSQL</span>
            ) : (
              <span className="text-xs text-muted-foreground">Local only</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Activity className={isConnected ? 'h-4 w-4 text-purple-600' : 'h-4 w-4 text-gray-400'} />
              <span className="text-sm font-medium">Sync</span>
            </div>
            {status.lastSync ? (
              <span className="text-xs text-muted-foreground">{status.lastSync}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Not synced</span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-900">
              {isConnected ? (
                <>
                  <strong>✓ Connected:</strong> All data is syncing to Supabase backend. Your tasks
                  persist across devices.
                </>
              ) : (
                <>
                  <strong>Demo Mode:</strong> App works fully, but data is stored locally.
                  <a href="#auth" className="underline ml-1 font-medium">
                    Sign up
                  </a>{' '}
                  to enable sync.
                </>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => {
                console.log('=== BACKEND STATUS ===');
                console.log('Connected:', isConnected);
                console.log('User:', status.username ?? 'None');
                console.log('Location:', status.location ?? 'Not set');
                console.log('Token:', localStorage.getItem('access_token') ? 'Present' : 'None');
                console.log('=====================');
              }}
            >
              Log Details
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={checkStatus}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
