import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Loader2, Mountain, MapPin, CloudSun, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/grow/api';

interface HomeLocationResponse {
  lat?: number;
  lon?: number;
  latBucket?: number;
  lonBucket?: number;
  elevationM: number | null;
  elevationSource?: string | null;
  gardeningClimateZoneCode: string;
}

const formatCoordinate = (value?: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value.toFixed(4)}°`;
  }
  return 'N/A';
};

const formatBucket = (value?: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}°`;
  }
  return 'N/A';
};

export function ElevationExample() {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HomeLocationResponse | null>(null);
  const [error, setError] = useState('');

  const exampleLocations: Array<{ name: string; lat: number; lon: number }> = [
    { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
    { name: 'Paris, France', lat: 48.8566, lon: 2.3522 },
    { name: 'Barcelona, Spain', lat: 41.3874, lon: 2.1686 },
    { name: 'Asturias, Spain (coast)', lat: 43.3614, lon: -5.8493 },
    { name: 'Swiss Alps (mountain)', lat: 46.5197, lon: 7.9661 },
  ];

  const getUserIdFromStorage = () => {
    const userRaw = localStorage.getItem('currentUser');
    if (!userRaw) {
      return 'demo-user';
    }

    try {
      const parsed = JSON.parse(userRaw);
      if (parsed && typeof parsed === 'object' && 'id' in parsed) {
        const id = (parsed as Record<string, unknown>).id;
        if (typeof id === 'string' && id.trim()) {
          return id;
        }
      }
    } catch (parseError) {
      console.warn('Could not parse user from localStorage', parseError);
    }

    return 'demo-user';
  };

  const handleUpdateLocation = async () => {
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        setError('Please enter valid latitude and longitude values');
        return;
      }

      if (lat < -90 || lat > 90) {
        setError('Latitude must be between -90 and 90');
        return;
      }

      if (lon < -180 || lon > 180) {
        setError('Longitude must be between -180 and 180');
        return;
      }

      const userId = getUserIdFromStorage();
      console.log(`🌍 Updating home location for user ${userId}: ${lat}, ${lon}`);

      const response = (await api.updateHomeLocation(userId, lat, lon)) as HomeLocationResponse;
      setResult(response);
      console.log('✅ Home location updated:', response);
    } catch (err: unknown) {
      const requestError = err as { message?: string };
      console.error('❌ Error updating location:', err);
      setError(requestError.message || 'Failed to update location');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentPosition = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setIsLoading(false);
      },
      (geoError) => {
        setError(`Unable to retrieve your location: ${geoError.message}`);
        setIsLoading(false);
      },
    );
  };

  const isValidCoordinateInput = latitude.trim() !== '' && longitude.trim() !== '';

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mountain className="h-5 w-5 text-green-600" />
          Elevation & Climate Zone Demo
        </CardTitle>
        <CardDescription>
          Set your home location coordinates to automatically fetch elevation and determine your gardening climate zone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="0.000001"
              placeholder="e.g. 51.5074"
              value={latitude}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLatitude(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="0.000001"
              placeholder="e.g. -0.1278"
              value={longitude}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLongitude(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleUpdateLocation} disabled={isLoading || !isValidCoordinateInput}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Mountain className="h-4 w-4 mr-2" />
                Update Home Location
              </>
            )}
          </Button>
          <Button variant="outline" onClick={loadCurrentPosition} disabled={isLoading}>
            <MapPin className="h-4 w-4 mr-2" />
            Use Current Location
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Quick Examples:</Label>
          <div className="flex flex-wrap gap-2">
            {exampleLocations.map((location) => (
              <Button
                key={location.name}
                variant="outline"
                size="sm"
                onClick={() => {
                  setLatitude(location.lat.toString());
                  setLongitude(location.lon.toString());
                }}
              >
                {location.name}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Location updated successfully!</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-xs text-muted-foreground mb-1">Coordinates</div>
                <div className="text-sm font-medium">
                  {formatCoordinate(result.lat)} {', '} {formatCoordinate(result.lon)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Bucketed: {formatBucket(result.latBucket)}, {formatBucket(result.lonBucket)}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  Elevation
                </div>
                <div className="text-sm font-medium">
                  {typeof result.elevationM === 'number' ? `${result.elevationM} m` : 'N/A'}
                </div>
                {result.elevationSource && (
                  <div className="text-xs text-muted-foreground mt-1">Source: {result.elevationSource}</div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-blue-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CloudSun className="h-4 w-4 text-green-600" />
                <div className="text-sm font-medium text-green-900">Climate Zone</div>
              </div>
              <Badge className="mb-2" variant="secondary">
                {(result.gardeningClimateZoneCode || '').replace(/_/g, ' ').toUpperCase()}
              </Badge>
              <div className="text-xs text-green-800">
                {typeof result.elevationM === 'number' && result.elevationM > 800 ? (
                  <>Mountain climate detected due to elevation above 800m</>
                ) : (
                  <>Climate zone automatically inferred from coordinates{typeof result.elevationM === 'number' ? ` and elevation (${result.elevationM}m)` : ''}</>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-xs text-blue-900 mb-2 font-medium">What this means:</div>
              <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                <li>Elevation data is cached and reused for nearby locations (~1km radius)</li>
                <li>Climate zone determines your growing season, frost dates, and task timing</li>
                <li>This data is stored in your profile for personalized gardening recommendations</li>
              </ul>
            </div>
          </div>
        )}

        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              <strong>How it works:</strong>
            </div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>Coordinates are bucketed to 2 decimal places (~1km) for caching</li>
              <li>Elevation is fetched from Google Maps Elevation API if not cached</li>
              <li>Elevation is rounded to nearest 10m for stability</li>
              <li>Climate zone is automatically inferred using coordinates plus elevation</li>
              <li>All data is saved to your profile for future use</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
