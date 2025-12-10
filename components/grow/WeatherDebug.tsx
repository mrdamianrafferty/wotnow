import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Bug, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface WeatherDebugCoords {
  lat?: number;
  lon?: number;
}

interface WeatherDebugStep {
  success?: boolean;
  location?: string;
  coords?: WeatherDebugCoords;
}

interface WeatherDebugPreview {
  temperature?: number;
  description?: string;
  humidity?: number;
  hasSoilData?: boolean;
  hasMarineData?: boolean;
}

interface WeatherDebugResult {
  success?: boolean;
  message?: string;
  step?: string;
  geocoding?: WeatherDebugStep;
  weatherApi?: WeatherDebugStep;
  preview?: WeatherDebugPreview;
  error?: string;
  details?: string;
  url?: string;
  suggestion?: string;
}

export function WeatherDebug() {
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WeatherDebugResult | null>(null);

  const testWeather = async () => {
    if (!location) return;

    setIsLoading(true);
    try {
      // Use Next.js API route instead of Edge Function
      const requestUrl = `/api/weather-debug?location=${encodeURIComponent(location)}`;
      const response = await fetch(requestUrl);

      const data = (await response.json()) as WeatherDebugResult;
      setResult({ ...data, url: data.url ?? requestUrl });
    } catch (error: unknown) {
      const err = error as { message?: string };
      setResult({
        success: false,
        error: err.message || 'Network error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      testWeather();
    }
  };

  const isSuccess = Boolean(result?.success);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Weather API Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter location (e.g., Colunga, Spain)"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={testWeather} disabled={isLoading || !location}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <Alert className={isSuccess ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <AlertDescription className="flex items-center gap-2">
                {isSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-800">{result.message || 'Weather request succeeded'}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800">Failed at: {result.step || 'unknown'}</span>
                  </>
                )}
              </AlertDescription>
            </Alert>

            {result.geocoding && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">1. Geocoding</span>
                    {result.geocoding.success ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                  {result.geocoding.coords && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Location: {result.geocoding.location}</div>
                      <div>Lat: {result.geocoding.coords.lat ?? '—'}</div>
                      <div>Lon: {result.geocoding.coords.lon ?? '—'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {result.weatherApi && (
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">2. Go Daisy Weather API</span>
                    {result.weatherApi.success ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                  {result.preview && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Temperature: {result.preview.temperature ?? '—'}°C</div>
                      <div>Conditions: {result.preview.description || '—'}</div>
                      <div>Humidity: {result.preview.humidity ?? '—'}%</div>
                      <div>Soil Data: {result.preview.hasSoilData ? 'Yes' : 'No'}</div>
                      <div>Marine Data: {result.preview.hasMarineData ? 'Yes' : 'No'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {result.error && (
              <Alert className="border-red-500 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="font-medium mb-1">Error:</div>
                  <div className="text-sm mb-2">{result.error}</div>
                  {result.details && (
                    <div className="text-xs opacity-75 mb-2">Details: {result.details}</div>
                  )}
                  {result.url && (
                    <div className="text-xs opacity-75 mb-2">URL: {result.url}</div>
                  )}
                  {result.suggestion && (
                    <div className="text-sm font-medium mt-2">💡 {result.suggestion}</div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Show raw response
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <div>📍 Test how the weather API handles your location</div>
          <div>🔍 See detailed error messages if something fails</div>
          <div>💡 Get suggestions for fixing common issues</div>
        </div>
      </CardContent>
    </Card>
  );
}
