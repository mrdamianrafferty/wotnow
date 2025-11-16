import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudDrizzle,
  Wind,
  Thermometer,
  Eye,
  Waves,
  Anchor,
  Compass,
  Gauge,
  Droplets,
  Sunrise,
  Sunset,
  Moon,
  Activity,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Umbrella,
  Zap,
  Leaf,
  Snowflake,
  TreePine,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Clock3,
  CalendarDays
} from 'lucide-react';
import { api } from '../../lib/grow/api';
import { LocationSettings } from './LocationSettings';
import {
  type UnitSystem,
  formatTemperature,
  formatWindSpeed,
  formatVisibility,
  formatPressure
} from '../../lib/grow/units';
import { getClimateZoneInfo, type ClimateZoneCode } from '../../lib/grow/climate';

interface ProgressProps {
  value: number;
  className?: string;
}

const Progress = ({ value, className }: ProgressProps) => {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const containerClass = ['relative h-2 w-full overflow-hidden rounded-full bg-muted', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      <div className="h-full bg-primary transition-all" style={{ width: `${safeValue}%` }} />
    </div>
  );
};

interface HourlyForecastEntry {
  time: string;
  temperature: number;
  precipitation: number;
  condition: string;
  windSpeed: number;
  humidity: number;
}

interface DailyForecastEntry {
  day: string;
  high: number;
  low: number;
  condition: string;
  rainChance: number;
  wind: number;
}

interface MarineConditions {
  waveHeight: number;
  swellDirection: string;
  swellPeriod: number;
  waterTemp: number;
  tideHigh: string;
  tideHighHeight: number;
  tideLow: string;
  tideLowHeight: number;
  surfConditions: string;
  surfRating: number;
  visibility: number;
  windWaves: number;
  gusts: number;
}

interface AirQualityData {
  index: number;
  category: string;
  dominantPollutant: string;
  pollutants: Array<{ name: string; value: number; unit: string }>;
}

interface PollenData {
  trees: number;
  grass: number;
  weeds: number;
  dominant: string;
}

interface SoilData {
  temperature: number;
  moisture: number;
  compaction: string;
  recommendation: string;
}

interface WeatherAlert {
  title: string;
  description: string;
  severity: 'info' | 'watch' | 'warning';
}

interface CurrentWeather {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  high: number;
  low: number;
  windSpeed: number;
  windDirection: string;
  humidity: number;
  uvIndex: number;
  precipitation: number;
  visibility: number;
  pressure: number;
  dewPoint: number;
  sunrise: string;
  sunset: string;
  moonPhase: string;
  lastFrostDate: string;
  nextFrostDate: string;
  growingSeason: boolean;
  growingDaysRemaining: number;
  soilWorkability: string;
  plantingAdvice: string;
}

interface WeatherApiResponse {
  current: CurrentWeather;
  hourly: HourlyForecastEntry[];
  daily: DailyForecastEntry[];
  marine?: MarineConditions;
  airQuality?: AirQualityData;
  pollen?: PollenData;
  soil?: SoilData;
  alerts?: WeatherAlert[];
}

const locationOptions = [
  { value: 'home', label: 'Home Garden' },
  { value: 'greenhouse', label: 'Greenhouse Beds' },
  { value: 'community', label: 'Community Plot' }
];

const marineLocationOptions = [
  { value: 'none', label: 'No marine overlay' },
  { value: 'harbor', label: 'Oyster Point Harbor' },
  { value: 'bay', label: 'Central Bay Buoy' },
  { value: 'coast', label: 'Ocean Beach Pier' }
];

const MOCK_WEATHER_DATA: WeatherApiResponse = {
  current: {
    location: 'San Francisco, CA',
    temperature: 18,
    feelsLike: 18,
    condition: 'overcast clouds',
    high: 20,
    low: 14,
    windSpeed: 12,
    windDirection: 'W',
    humidity: 82,
    uvIndex: 3,
    precipitation: 40,
    visibility: 14,
    pressure: 1015,
    dewPoint: 13,
    sunrise: '6:42 AM',
    sunset: '7:23 PM',
    moonPhase: 'Waxing Gibbous',
    lastFrostDate: 'Mar 12',
    nextFrostDate: 'Nov 28',
    growingSeason: true,
    growingDaysRemaining: 58,
    soilWorkability: 'Ideal',
    plantingAdvice: 'Transplant leafy greens and brassicas this week while soil moisture is balanced.'
  },
  hourly: [
    { time: '06:00', temperature: 14, precipitation: 10, condition: 'cloudy', windSpeed: 8, humidity: 90 },
    { time: '09:00', temperature: 16, precipitation: 15, condition: 'cloudy', windSpeed: 10, humidity: 86 },
    { time: '12:00', temperature: 18, precipitation: 25, condition: 'light rain', windSpeed: 14, humidity: 78 },
    { time: '15:00', temperature: 19, precipitation: 35, condition: 'light rain', windSpeed: 16, humidity: 76 },
    { time: '18:00', temperature: 17, precipitation: 40, condition: 'light rain', windSpeed: 18, humidity: 82 },
    { time: '21:00', temperature: 15, precipitation: 20, condition: 'cloudy', windSpeed: 12, humidity: 88 },
    { time: '00:00', temperature: 14, precipitation: 10, condition: 'cloudy', windSpeed: 10, humidity: 90 },
    { time: '03:00', temperature: 13, precipitation: 10, condition: 'cloudy', windSpeed: 9, humidity: 92 }
  ],
  daily: [
    { day: 'Today', high: 20, low: 14, condition: 'light rain', rainChance: 55, wind: 20 },
    { day: 'Tomorrow', high: 19, low: 13, condition: 'light rain', rainChance: 50, wind: 18 },
    { day: 'Thu', high: 18, low: 12, condition: 'cloudy', rainChance: 30, wind: 16 },
    { day: 'Fri', high: 21, low: 13, condition: 'partly-cloudy', rainChance: 10, wind: 14 },
    { day: 'Sat', high: 22, low: 14, condition: 'sunny', rainChance: 5, wind: 12 }
  ],
  marine: {
    waveHeight: 1.8,
    swellDirection: 'W',
    swellPeriod: 9,
    waterTemp: 14,
    tideHigh: '2:34 PM',
    tideHighHeight: 1.9,
    tideLow: '8:45 PM',
    tideLowHeight: 0.3,
    surfConditions: 'Poor',
    surfRating: 2,
    visibility: 8,
    windWaves: 1.2,
    gusts: 24
  },
  airQuality: {
    index: 52,
    category: 'Moderate',
    dominantPollutant: 'PM2.5',
    pollutants: [
      { name: 'PM2.5', value: 12, unit: 'µg/m³' },
      { name: 'PM10', value: 28, unit: 'µg/m³' },
      { name: 'O₃', value: 21, unit: 'ppb' }
    ]
  },
  pollen: {
    trees: 3,
    grass: 4,
    weeds: 2,
    dominant: 'Grass'
  },
  soil: {
    temperature: 16,
    moisture: 58,
    compaction: 'Loose',
    recommendation: 'Maintain mulched beds to keep soil moisture steady ahead of weekend winds.'
  },
  alerts: [
    {
      title: 'Coastal Wind Advisory',
      severity: 'watch',
      description: 'Gusts up to 30 mph expected near the shoreline after 3 PM. Secure row covers and trellises.'
    }
  ]
};

function isWeatherApiResponse(candidate: unknown): candidate is WeatherApiResponse {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  const data = candidate as Partial<WeatherApiResponse>;
  return Boolean(data.current && data.hourly && data.daily);
}

export function WeatherPage() {
  const [selectedLocation, setSelectedLocation] = useState('home');
  const [marineLocation, setMarineLocation] = useState('none');
  const [weatherData, setWeatherData] = useState<WeatherApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [climateZone, setClimateZone] = useState<ClimateZoneCode | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  useEffect(() => {
    const loadUserSettings = async () => {
      const interestsStr = localStorage.getItem('userInterests');
      if (interestsStr) {
        try {
          const interests = JSON.parse(interestsStr);
          if (interests.location) {
            setUserLocation(interests.location);
          }
          if (interests.climate_zone) {
            setClimateZone(interests.climate_zone);
          }
        } catch (_error) {
          console.warn('Failed to parse user interests');
        }
      }

      const savedUnit = localStorage.getItem('unitSystem') as UnitSystem;
      if (savedUnit === 'imperial' || savedUnit === 'metric') {
        setUnitSystem(savedUnit);
      }

      try {
        const { unitSystem: supabaseUnit } = await api.getUserPreferences();
        if (supabaseUnit && supabaseUnit !== savedUnit) {
          setUnitSystem(supabaseUnit);
          localStorage.setItem('unitSystem', supabaseUnit);
        }
      } catch (_error) {
        console.debug('Could not sync unit preference from server');
      }
    };

    loadUserSettings();
  }, []);

  const fetchWeatherData = useCallback(async () => {
    if (!userLocation) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const data = await api.getWeather(userLocation, marineLocation !== 'none');
      if (isWeatherApiResponse(data)) {
        setWeatherData(data);
      } else {
        throw new Error('Invalid weather payload');
      }
    } catch (err) {
      console.error('Failed to fetch weather data, using mock data:', err);
      setError('Showing demo weather data (live service unavailable)');
      setWeatherData(null);
    } finally {
      setIsLoading(false);
    }
  }, [marineLocation, userLocation]);

  useEffect(() => {
    if (userLocation) {
      fetchWeatherData();
    }
  }, [fetchWeatherData, selectedLocation, userLocation]);

  const handleUnitToggle = async () => {
    const newUnit: UnitSystem = unitSystem === 'imperial' ? 'metric' : 'imperial';
    setUnitSystem(newUnit);
    localStorage.setItem('unitSystem', newUnit);

    try {
      await api.updateUserPreferences(newUnit);
      console.log(`✅ Unit preference synced to server: ${newUnit}`);
    } catch (_error) {
      console.debug('Unit preference saved locally (server sync unavailable)');
    }
  };

  const currentWeatherData = weatherData || MOCK_WEATHER_DATA;
  const currentWeather = currentWeatherData.current;
  const isMarineMode = marineLocation !== 'none';
  const marineData = isMarineMode ? currentWeatherData.marine ?? null : null;
  const alerts = currentWeatherData.alerts ?? [];
  const WeatherIcon = getConditionIcon(currentWeather.condition);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <ErrorBanner error={error} alerts={alerts} />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Garden Location</p>
                <p className="font-medium">
                  {userLocation || 'Location not set'}
                  {climateZone ? (
                    <span className="font-normal text-muted-foreground">
                      {' — '}
                      {getClimateZoneInfo(climateZone).name}
                    </span>
                  ) : null}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue placeholder="Select bed" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={marineLocation} onValueChange={setMarineLocation}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Marine overlay" />
                    </SelectTrigger>
                    <SelectContent>
                      {marineLocationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleUnitToggle} className="gap-1">
                <Thermometer className="h-4 w-4" />
                {unitSystem === 'imperial' ? '°F' : '°C'}
              </Button>
              <LocationSettings
                currentLocation={userLocation}
                onLocationUpdate={(newLocation) => {
                  setUserLocation(newLocation);
                  const interestsStr = localStorage.getItem('userInterests');
                  if (interestsStr) {
                    try {
                      const interests = JSON.parse(interestsStr);
                      if (interests.climate_zone) {
                        setClimateZone(interests.climate_zone);
                      }
                    } catch (_error) {
                      console.warn('Failed to parse interests on update');
                    }
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={fetchWeatherData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <HeroWeatherCard data={currentWeather} marine={marineData} WeatherIcon={WeatherIcon} unitSystem={unitSystem} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wind className="h-5 w-5" />
              Wind
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatWindSpeed(currentWeather.windSpeed, unitSystem, false)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {currentWeather.windDirection} {getWindDirectionIndicator(currentWeather.windDirection)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Humidity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold">{currentWeather.humidity}%</div>
              <Progress value={currentWeather.humidity} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              UV Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold">{currentWeather.uvIndex}</div>
              <Badge variant="secondary" className="mt-2">
                {getUvCategory(currentWeather.uvIndex)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {marineData ? <MarineConditionsCard data={marineData} unitSystem={unitSystem} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HourlyForecastCard data={currentWeatherData.hourly} unitSystem={unitSystem} />
        <DailyForecastCard data={currentWeatherData.daily} unitSystem={unitSystem} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SunCycleCard data={currentWeather} />
        <GrowingSeasonCard data={currentWeather} />
        <VisibilityPressureCard data={currentWeather} unitSystem={unitSystem} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TemperatureTrendCard data={currentWeatherData.daily} unitSystem={unitSystem} />
        {currentWeatherData.airQuality ? <AirQualityCard data={currentWeatherData.airQuality} /> : null}
        {currentWeatherData.pollen ? <PollenCard data={currentWeatherData.pollen} /> : null}
        {currentWeatherData.soil ? <SoilConditionsCard data={currentWeatherData.soil} unitSystem={unitSystem} /> : null}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((group) => (
        <Card key={group} className="border-dashed">
          <CardContent className="h-32 animate-pulse rounded-lg bg-muted/40" />
        </Card>
      ))}
    </div>
  );
}

function ErrorBanner({ error, alerts }: { error?: string; alerts: WeatherAlert[] }) {
  if (!error && alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="flex items-center gap-2 py-3 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      ) : null}

      {alerts.map((alert) => (
        <Card
          key={alert.title}
          className={
            alert.severity === 'warning'
              ? 'border-rose-300 bg-rose-50/80'
              : alert.severity === 'watch'
              ? 'border-amber-300 bg-amber-50/80'
              : 'border-sky-200 bg-sky-50/70'
          }
        >
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4" />
              {alert.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">{alert.description}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function HeroWeatherCard({
  data,
  marine,
  WeatherIcon,
  unitSystem
}: {
  data: CurrentWeather;
  marine: MarineConditions | null;
  WeatherIcon: React.ComponentType<{ className?: string }>;
  unitSystem: UnitSystem;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <WeatherIcon className="h-20 w-20 text-blue-600" />
            <div>
              <div className="text-5xl font-bold">{formatTemperature(data.temperature, unitSystem, false)}</div>
              <div className="mt-1 text-lg capitalize text-muted-foreground">{data.condition}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Feels like {formatTemperature(data.feelsLike, unitSystem, false)}
              </div>
              <div className="text-sm text-muted-foreground">
                High {formatTemperature(data.high, unitSystem, false)} | Low {formatTemperature(data.low, unitSystem, false)}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-center">
              <Wind className="mx-auto h-5 w-5 text-muted-foreground" />
              <div className="text-sm font-medium">{formatWindSpeed(data.windSpeed, unitSystem, false)}</div>
              <div className="text-xs text-muted-foreground">Wind</div>
            </div>
            {marine && marine.waveHeight ? (
              <div className="text-center">
                <Waves className="mx-auto h-5 w-5 text-muted-foreground" />
                <div className="text-sm font-medium">{formatWaveHeight(marine.waveHeight, unitSystem)}</div>
                <div className="text-xs text-muted-foreground">Wave</div>
              </div>
            ) : (
              <div className="text-center">
                <Umbrella className="mx-auto h-5 w-5 text-muted-foreground" />
                <div className="text-sm font-medium">{data.precipitation}%</div>
                <div className="text-xs text-muted-foreground">Precip</div>
              </div>
            )}
            <div className="text-center">
              <Sun className="mx-auto h-5 w-5 text-muted-foreground" />
              <div className="text-sm font-medium">{data.uvIndex}</div>
              <div className="text-xs text-muted-foreground">UV</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MarineConditionsCard({ data, unitSystem }: { data: MarineConditions; unitSystem: UnitSystem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Anchor className="h-5 w-5" />
          Marine Overlay
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatBlock label="Wave Height" icon={<Waves className="h-4 w-4" />} value={formatWaveHeight(data.waveHeight, unitSystem)} />
        <StatBlock label="Swell" icon={<Compass className="h-4 w-4" />} value={`${data.swellDirection} • ${data.swellPeriod}s`} />
        <StatBlock label="Water Temp" icon={<Thermometer className="h-4 w-4" />} value={formatTemperature(data.waterTemp, unitSystem, false)} />
        <StatBlock label="Wind Waves" icon={<Wind className="h-4 w-4" />} value={formatWaveHeight(data.windWaves, unitSystem)} />
        <StatBlock label="High Tide" icon={<ArrowUp className="h-4 w-4" />} value={`${data.tideHigh} • ${formatWaveHeight(data.tideHighHeight, unitSystem)}`} />
        <StatBlock label="Low Tide" icon={<ArrowDown className="h-4 w-4" />} value={`${data.tideLow} • ${formatWaveHeight(data.tideLowHeight, unitSystem)}`} />
        <StatBlock label="Surf" icon={<Waves className="h-4 w-4" />} value={`${data.surfConditions} (${data.surfRating}/5)`} />
        <StatBlock label="Gusts" icon={<Zap className="h-4 w-4" />} value={formatWindSpeed(data.gusts, unitSystem, false)} />
      </CardContent>
    </Card>
  );
}

function HourlyForecastCard({ data, unitSystem }: { data: HourlyForecastEntry[]; unitSystem: UnitSystem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-5 w-5" />
          Hourly Outlook
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.slice(0, 8).map((entry) => {
          const Icon = getConditionIcon(entry.condition);
          return (
            <div key={entry.time} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-sm font-medium">{entry.time}</p>
              <Icon className="mx-auto my-2 h-5 w-5 text-blue-500" />
              <p className="text-lg font-semibold">{formatTemperature(entry.temperature, unitSystem, false)}</p>
              <div className="mt-1 text-xs text-muted-foreground">
                Rain {entry.precipitation}% • {formatWindSpeed(entry.windSpeed, unitSystem, false)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DailyForecastCard({ data, unitSystem }: { data: DailyForecastEntry[]; unitSystem: UnitSystem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          5-Day Forecast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.slice(0, 5).map((entry) => {
          const Icon = getConditionIcon(entry.condition);
          return (
            <div key={entry.day} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">{entry.day}</p>
                  <p className="text-xs text-muted-foreground">Rain chance {entry.rainChance}%</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                  {formatTemperature(entry.high, unitSystem, false)}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-sky-500" />
                  {formatTemperature(entry.low, unitSystem, false)}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Wind className="h-4 w-4" />
                  {formatWindSpeed(entry.wind, unitSystem, false)}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function SunCycleCard({ data }: { data: CurrentWeather }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sunrise className="h-5 w-5" />
          Sun & Moon
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatBlock label="Sunrise" icon={<Sunrise className="h-4 w-4" />} value={data.sunrise} />
        <StatBlock label="Sunset" icon={<Sunset className="h-4 w-4" />} value={data.sunset} />
        <StatBlock label="Moon Phase" icon={<Moon className="h-4 w-4" />} value={data.moonPhase} />
        <StatBlock label="Daylight" icon={<Sun className="h-4 w-4" />} value={calculateDaylightHours(data.sunrise, data.sunset)} />
      </CardContent>
    </Card>
  );
}

function GrowingSeasonCard({ data }: { data: CurrentWeather }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          Growing Season
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Season Status</p>
            <p className="text-xs text-muted-foreground">{data.soilWorkability}</p>
          </div>
          <Badge variant={data.growingSeason ? 'default' : 'secondary'}>
            {data.growingSeason ? 'Active' : 'Dormant'}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Days Remaining</p>
            <p className="text-lg font-semibold">{data.growingDaysRemaining}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Next Frost</p>
            <p className="flex items-center gap-2 text-lg font-semibold">
              <Snowflake className="h-4 w-4 text-sky-500" />
              {data.nextFrostDate}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-muted/60 bg-muted/20 p-3 text-sm text-muted-foreground">
          {data.plantingAdvice}
        </div>
      </CardContent>
    </Card>
  );
}

function VisibilityPressureCard({ data, unitSystem }: { data: CurrentWeather; unitSystem: UnitSystem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visibility & Pressure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            <p className="font-medium">Visibility</p>
          </div>
          <p>{formatVisibility(data.visibility, unitSystem)}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-green-500" />
            <p className="font-medium">Pressure</p>
          </div>
          <p>{formatPressure(data.pressure, unitSystem)}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            <p className="font-medium">Dew Point</p>
          </div>
          <p>{formatTemperature(data.dewPoint, unitSystem, false)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TemperatureTrendCard({ data, unitSystem }: { data: DailyForecastEntry[]; unitSystem: UnitSystem }) {
  const upcoming = data.slice(0, 3);
  const maxHigh = Math.max(...upcoming.map((entry) => entry.high));
  const minLow = Math.min(...upcoming.map((entry) => entry.low));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          Temperature Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium">Next 3 days</p>
          <p>
            {formatTemperature(minLow, unitSystem, false)} – {formatTemperature(maxHigh, unitSystem, false)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {upcoming.map((entry) => (
            <div key={entry.day} className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">{entry.day}</p>
              <p className="mt-1 text-sm font-semibold">{formatTemperature(entry.high, unitSystem, false)}</p>
              <p className="text-xs text-muted-foreground">{formatTemperature(entry.low, unitSystem, false)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AirQualityCard({ data }: { data: AirQualityData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Air Quality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">AQI {data.index}</p>
            <p className="text-xs text-muted-foreground">{data.category}</p>
          </div>
          <Badge variant="secondary">Dominant: {data.dominantPollutant}</Badge>
        </div>
        <div className="space-y-2">
          {data.pollutants.map((pollutant) => (
            <div key={pollutant.name} className="flex items-center justify-between rounded bg-muted/30 p-2">
              <span className="text-xs text-muted-foreground">{pollutant.name}</span>
              <span className="text-sm font-medium">
                {pollutant.value}
                <span className="ml-1 text-xs text-muted-foreground">{pollutant.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PollenCard({ data }: { data: PollenData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreePine className="h-5 w-5" />
          Pollen Outlook
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium">Dominant</p>
          <Badge variant="outline">{data.dominant}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <PollenLevel label="Trees" value={data.trees} />
          <PollenLevel label="Grass" value={data.grass} />
          <PollenLevel label="Weeds" value={data.weeds} />
        </div>
      </CardContent>
    </Card>
  );
}

function SoilConditionsCard({ data, unitSystem }: { data: SoilData; unitSystem: UnitSystem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          Soil Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <StatBlock label="Soil Temp" icon={<Thermometer className="h-4 w-4" />} value={formatTemperature(data.temperature, unitSystem, false)} />
          <StatBlock label="Moisture" icon={<Droplets className="h-4 w-4" />} value={`${data.moisture}%`} />
        </div>
        <div className="rounded border border-dashed border-muted/60 bg-muted/20 p-3 text-muted-foreground">
          <p className="text-xs uppercase tracking-wide">Recommendation</p>
          <p className="mt-1 text-sm">{data.recommendation}</p>
        </div>
        <div className="rounded bg-muted/20 p-3 text-xs text-muted-foreground">Soil structure: {data.compaction}</div>
      </CardContent>
    </Card>
  );
}

function StatBlock({ label, icon, value }: { label: string; icon: React.ReactNode; value: string | number }) {
  return (
    <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function PollenLevel({ label, value }: { label: string; value: number }) {
  const level = value <= 2 ? 'Low' : value <= 4 ? 'Moderate' : 'High';
  return (
    <div className="rounded bg-muted/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{level}</p>
      <Progress value={(value / 5) * 100} className="mt-2" />
    </div>
  );
}

function formatWaveHeight(heightMeters: number, unitSystem: UnitSystem) {
  if (unitSystem === 'imperial') {
    return `${(heightMeters * 3.28084).toFixed(1)} ft`;
  }
  return `${heightMeters.toFixed(1)} m`;
}

function calculateDaylightHours(sunrise: string, sunset: string) {
  try {
    const sunriseTime = parseTimeString(sunrise);
    const sunsetTime = parseTimeString(sunset);
    if (!sunriseTime || !sunsetTime) {
      return '—';
    }

    const sunriseDate = new Date();
    sunriseDate.setHours(sunriseTime.hour, sunriseTime.minute, 0, 0);
    const sunsetDate = new Date();
    sunsetDate.setHours(sunsetTime.hour, sunsetTime.minute, 0, 0);
    if (sunsetDate <= sunriseDate) {
      sunsetDate.setDate(sunsetDate.getDate() + 1);
    }

    const diffHours = (sunsetDate.getTime() - sunriseDate.getTime()) / (1000 * 60 * 60);
    return `${diffHours.toFixed(1)} hrs`;
  } catch (_error) {
    console.debug('Failed to compute daylight hours', _error);
    return '—';
  }
}

function parseTimeString(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) {
    hour += 12;
  }
  if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }
  return { hour, minute };
}

function getConditionIcon(condition: string) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    sunny: Sun,
    clear: Sun,
    'partly-cloudy': Cloud,
    'partly cloudy': Cloud,
    cloudy: Cloud,
    rain: CloudRain,
    rainy: CloudRain,
    'light rain': CloudDrizzle,
    'overcast clouds': Cloud
  };
  const key = condition.toLowerCase();
  return map[key] || Cloud;
}

function getWindDirectionIndicator(direction: string) {
  const directions: Record<string, string> = {
    N: '↑',
    NE: '↗',
    E: '→',
    SE: '↘',
    S: '↓',
    SW: '↙',
    W: '←',
    NW: '↖'
  };
  return directions[direction] || '→';
}

function getUvCategory(index: number) {
  if (index <= 2) return 'Low';
  if (index <= 5) return 'Moderate';
  if (index <= 7) return 'High';
  return 'Very High';
}
