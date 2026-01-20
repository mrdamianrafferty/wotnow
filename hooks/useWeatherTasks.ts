/**
 * useWeatherTasks Hook
 *
 * Fetches weather-based task recommendations from the weather task engine.
 * Returns alerts, watering recommendations, and planting windows.
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WeatherAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  forecastDate: string;
  forecastValue: number;
  affectedPlantIds: string[];
  suggestedAction: string;
}

export interface WateringRecommendation {
  shouldWater: boolean;
  reason: string;
  nextWateringDate: string;
  adjustmentFactor: number;
  details: string[];
}

export interface PlantingWindow {
  plantSlug: string;
  canPlantNow: boolean;
  reason: string;
  soilTempRequired: number;
  currentSoilTemp: number;
  daysUntilReady?: number;
}

export interface TaskAdjustment {
  taskType: string;
  originalUrgency: string;
  newUrgency: string;
  reason: string;
  suggestedDate?: string;
}

export interface WeatherTasksData {
  alerts: WeatherAlert[];
  wateringRecommendation: WateringRecommendation;
  plantingWindows: PlantingWindow[];
  taskAdjustments: TaskAdjustment[];
  forecast: Array<{
    date: string;
    tempMin: number;
    tempMax: number;
    humidity: number;
    precipitation: number;
    precipProbability: number;
  }>;
  soil: {
    temperature6cm: number;
    moisture1to3cm: number;
  };
  plantCount: number;
  generatedAt: string;
}

interface UseWeatherTasksResult {
  data: WeatherTasksData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWeatherTasks(): UseWeatherTasksResult {
  const [data, setData] = useState<WeatherTasksData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  // Check for authenticated user
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchWeatherTasks = useCallback(async () => {
    if (!userId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/grow/weather-tasks', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch weather tasks');
      }

      const result = await response.json();

      if (result.success) {
        setData({
          alerts: result.result?.alerts || [],
          wateringRecommendation: result.result?.wateringRecommendation || {
            shouldWater: false,
            reason: 'No data available',
            nextWateringDate: new Date().toISOString().split('T')[0],
            adjustmentFactor: 1.0,
            details: [],
          },
          plantingWindows: result.result?.plantingWindows || [],
          taskAdjustments: result.result?.taskAdjustments || [],
          forecast: result.forecast || [],
          soil: result.soil || { temperature6cm: 0, moisture1to3cm: 0 },
          plantCount: result.plantCount || 0,
          generatedAt: result.generatedAt || new Date().toISOString(),
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load weather tasks';
      setError(message);
      console.error('[useWeatherTasks] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (userId) {
      fetchWeatherTasks();
    }
  }, [userId, fetchWeatherTasks]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchWeatherTasks,
  };
}

/**
 * Get the icon name for an alert type
 */
export function getAlertIcon(type: string): string {
  const icons: Record<string, string> = {
    frost: 'snowflake',
    heat: 'thermometer-sun',
    wind: 'wind',
    storm: 'cloud-lightning',
    late_blight: 'bug',
    powdery_mildew: 'cloud-fog',
    botrytis: 'cloud-fog',
    aphids: 'bug',
    slugs: 'snail',
    wind_desiccation: 'wind',
    drought: 'sun',
    rain: 'cloud-rain',
  };
  return icons[type] || 'alert-triangle';
}

/**
 * Get the color class for an alert severity
 */
export function getAlertColor(severity: 'info' | 'warning' | 'critical'): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-900',
        icon: 'text-red-600',
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-900',
        icon: 'text-amber-600',
      };
    case 'info':
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        icon: 'text-blue-600',
      };
  }
}

/**
 * Categorize alerts by type
 */
export function categorizeAlerts(alerts: WeatherAlert[]): {
  weather: WeatherAlert[];
  pestDisease: WeatherAlert[];
} {
  const weatherTypes = ['frost', 'heat', 'wind', 'storm', 'drought', 'rain', 'wind_desiccation'];
  const pestDiseaseTypes = ['late_blight', 'powdery_mildew', 'botrytis', 'aphids', 'slugs'];

  return {
    weather: alerts.filter(a => weatherTypes.includes(a.type)),
    pestDisease: alerts.filter(a => pestDiseaseTypes.includes(a.type)),
  };
}
