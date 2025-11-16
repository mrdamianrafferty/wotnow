import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/grow/api';

interface DiagnosticResults {
  timestamp: string;
  checks: Record<string, unknown>;
}

const safeJsonParse = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch (error) {
    console.warn('Failed to parse JSON', error);
    return 'Invalid JSON';
  }
};

const toStringOrNull = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }
  return null;
};

const getClimateZone = (data: unknown) => {
  if (data && typeof data === 'object' && 'climate_zone' in data) {
    const climateZone = (data as Record<string, unknown>).climate_zone;
    return typeof climateZone === 'string' ? climateZone : null;
  }
  return null;
};

const getCoordinates = (data: unknown) => {
  if (data && typeof data === 'object' && 'coordinates' in data) {
    const coordinates = (data as Record<string, unknown>).coordinates;
    if (
      coordinates &&
      typeof coordinates === 'object' &&
      'lat' in coordinates &&
      'lon' in coordinates
    ) {
      const lat = (coordinates as Record<string, unknown>).lat;
      const lon = (coordinates as Record<string, unknown>).lon;
      if (typeof lat === 'number' && typeof lon === 'number') {
        return { lat, lon };
      }
    }
  }
  return null;
};

export function LocationDiagnostic() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<DiagnosticResults | null>(null);

  const runDiagnostics = async () => {
    setTesting(true);

    const diagnostics: DiagnosticResults = {
      timestamp: new Date().toISOString(),
      checks: {},
    };

    const checks = diagnostics.checks;

    const token = localStorage.getItem('access_token');
    checks.hasToken = Boolean(token);
    checks.tokenPreview = token ? `${token.substring(0, 20)}...` : null;

    checks.localStorageInterests = safeJsonParse(localStorage.getItem('userInterests'));

    try {
      const testLocation = 'Colunga, Spain';
      console.log('🧪 Testing location update with:', testLocation);

      const response = await api.updateUserLocation(testLocation);
      checks.locationUpdateSuccess = true;
      checks.locationUpdateResponse = response;

      console.log('✅ Test location update succeeded:', response);
    } catch (error: unknown) {
      const err = error as { message?: string };
      checks.locationUpdateSuccess = false;
      checks.locationUpdateError = err.message || String(error);

      console.error('❌ Test location update failed:', error);
    }

    checks.localStorageAfterUpdate = safeJsonParse(localStorage.getItem('userInterests'));

    setResults(diagnostics);
    setTesting(false);
  };

  const renderBadge = (condition: boolean) => (
    <Badge variant={condition ? 'default' : 'destructive'}>
      {condition ? 'Success' : 'Failed'}
    </Badge>
  );

  const checks = results?.checks ?? {};
  const hasToken = Boolean(checks.hasToken);
  const locationUpdateSuccess = Boolean(checks.locationUpdateSuccess);
  const locationUpdateError = toStringOrNull(checks.locationUpdateError);
  const locationUpdateResponse = checks.locationUpdateResponse as Record<string, unknown> | undefined;
  const coordinates = getCoordinates(locationUpdateResponse);
  const climateZone = getClimateZone(locationUpdateResponse);
  const localStorageAfterUpdate = checks.localStorageAfterUpdate;
  const storageClimateZone = getClimateZone(localStorageAfterUpdate);

  const isStorageMatching =
    locationUpdateSuccess && climateZone && storageClimateZone && storageClimateZone === climateZone;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🔍 Location Update Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Diagnostic Tests'
          )}
        </Button>

        {results && (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {hasToken ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>Authentication Token</span>
                <Badge variant={hasToken ? 'default' : 'destructive'}>
                  {hasToken ? 'Present' : 'Missing'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {locationUpdateSuccess ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>Location Update API Call</span>
                {renderBadge(locationUpdateSuccess)}
              </div>

              {locationUpdateError && (
                <div className="ml-7 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {locationUpdateError}
                  </p>
                </div>
              )}

              {locationUpdateResponse && (
                <div className="ml-7 space-y-2">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm">
                      <strong>Climate Zone:</strong>{' '}
                      <Badge variant="outline">{climateZone ?? 'Not returned'}</Badge>
                    </p>
                    {coordinates && (
                      <p className="text-sm mt-1">
                        <strong>Coordinates:</strong> {coordinates.lat.toFixed(4)}, {coordinates.lon.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">localStorage Before Update:</h4>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(checks.localStorageInterests, null, 2)}
              </pre>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">localStorage After Update:</h4>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-32">
                {JSON.stringify(localStorageAfterUpdate, null, 2)}
              </pre>
            </div>

            {locationUpdateSuccess ? (
              climateZone ? (
                isStorageMatching ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900">Everything Working! ✅</p>
                      <p className="text-sm text-green-800 mt-1">
                        Climate zone is being properly saved to localStorage. Tasks should load correctly.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Issue Detected</p>
                      <p className="text-sm text-red-800 mt-1">
                        Location update is not working correctly. Check the error details above.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Backend Not Returning Climate Zone</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      The API call succeeded but did not return a climate zone. Check backend logs.
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Issue Detected</p>
                  <p className="text-sm text-red-800 mt-1">
                    Location update is not working correctly. Check the error details above.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
