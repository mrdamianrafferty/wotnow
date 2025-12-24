'use client';

import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { isNative } from '../../lib/capacitor/platform';
import {
  Home,
  Droplets,
  Calendar,
  Clock,
  MapPin,
  Sprout,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Plus,
  X,
  Flame,
  Thermometer,
  CheckCircle,
  ArrowDown
} from 'lucide-react';
import { api } from '../../lib/grow/api';
import { useScreenTracking } from '../../lib/performance';
import { GardenAlertBox } from '../gardening/GardenAlertBox';
import type { GardenAlertResult } from '../../lib/gardening/gardenAlerts';
import { LocationSettings } from './LocationSettings';
import { useTranslationMap } from '../../lib/translation/useTranslationMap';
import { TaskIcon } from './TaskIcon';
import { SkeletonGrowHomepage } from './GrowSkeletons';

type Translator = (value: string) => string;

interface GardenTask {
  id: string;
  taskCode: string;
  title: string;
  emoji: string;
  shortDescription: string;
  fullDescription: string;
  score: number;
  urgency: 'critical' | 'optimal' | 'good' | 'upcoming';
  urgencyBadge: string;
  bestWindow: string;
  timeRequired: number;
  category: string;
  reasoning: string[];
  weatherContext: string;
  soilTemp?: string;
  weatherIcon: string;
  plant?: string;
  inMyTasks?: boolean;
}

interface WeatherContext {
  location: string;
  temperature: number;
  conditions: string;
  icon: string;
  soilMoisture: string;
  lastFrostDate: string;
  daysSinceFrost: number;
  zone: string;
  growingWeek: number;
}

// Static Card Component for Web (no Framer Motion animations)
interface StaticTaskCardProps {
  task: GardenTask;
  onAddTask: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
  t: Translator;
}

const StaticTaskCard: React.FC<StaticTaskCardProps> = ({ task, onAddTask, onDismiss, t }) => {
  const getUrgencyColor = () => {
    switch (task.urgency) {
      case 'critical': return 'bg-white border-l-4 border-l-red-500 border-red-200';
      case 'optimal': return 'bg-white border-l-4 border-l-green-500 border-green-200';
      case 'good': return 'bg-white border-l-4 border-l-blue-500 border-blue-200';
      case 'upcoming': return 'bg-white border-l-4 border-l-gray-400 border-gray-200';
    }
  };

  const getUrgencyBadge = () => {
    switch (task.urgency) {
      case 'critical':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 uppercase">
            <Flame className="h-3 w-3" /> {t('Urgent')}
          </Badge>
        );
      case 'optimal':
        return (
          <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1 uppercase">
            <CheckCircle className="h-3 w-3" /> {t('Perfect timing')}
          </Badge>
        );
      case 'good':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 uppercase">
            <Sprout className="h-3 w-3" /> {t('Good timing')}
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="outline" className="flex items-center gap-1 uppercase">
            <Clock className="h-3 w-3" /> {t('Upcoming')}
          </Badge>
        );
    }
  };

  return (
    <Card className={`${getUrgencyColor()} border shadow-xl overflow-hidden transition-transform hover:scale-[1.01]`}>
      {/* Card Image/Visual Area */}
      <div className="h-48 bg-slate-50 border-b flex items-center justify-center">
        <TaskIcon taskCode={task.taskCode} size="hero" />
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Title and Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TaskIcon taskCode={task.taskCode} size="md" /> {task.title}
            </h2>
          </div>
          {getUrgencyBadge()}
        </div>

        {/* Description */}
        <p className="text-base text-muted-foreground leading-relaxed">
          {task.fullDescription}
        </p>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{task.bestWindow}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {task.timeRequired} {t('minutes')}
            </span>
          </div>
          {task.soilTemp && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <span>{task.soilTemp}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm col-span-2">
            <span className="text-lg">{task.weatherIcon}</span>
            <span>
              {t('Weather')}: {task.weatherContext}
            </span>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <h3 className="font-semibold mb-2">{t('Why now?')}</h3>
          <ul className="space-y-1">
            {task.reasoning.map((reason, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onDismiss(task.id)}
            className="border-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
            aria-label={`${t('Dismiss')} ${task.title}`}
          >
            <X className="h-5 w-5 mr-2" aria-hidden="true" />
            {t('Dismiss')}
          </Button>
          <Button
            size="lg"
            onClick={() => onAddTask(task.id)}
            className="bg-green-600 hover:bg-green-700 transition-colors"
            aria-label={`${t('Add to List')}: ${task.title}`}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" aria-hidden="true" />
            {t('Add to List')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Swipeable Card Component (native apps only)
interface SwipeCardProps {
  task: GardenTask;
  onSwipeRight: (taskId: string) => void;
  onSwipeLeft: (taskId: string) => void;
  isTop: boolean;
  index: number;
  t: Translator;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ task, onSwipeRight, onSwipeLeft, isTop, index, t }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  const handleDragEnd = (event: unknown, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    
    if (Math.abs(info.offset.x) > threshold || Math.abs(velocity) > 500) {
      if (info.offset.x > 0) {
        onSwipeRight(task.id);
      } else {
        onSwipeLeft(task.id);
      }
    }
  };

  const getUrgencyColor = () => {
    switch (task.urgency) {
      case 'critical': return 'bg-white border-l-4 border-l-red-500 border-red-200';
      case 'optimal': return 'bg-white border-l-4 border-l-green-500 border-green-200';
      case 'good': return 'bg-white border-l-4 border-l-blue-500 border-blue-200';
      case 'upcoming': return 'bg-white border-l-4 border-l-gray-400 border-gray-200';
    }
  };

  const getUrgencyBadge = () => {
    switch (task.urgency) {
      case 'critical':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 uppercase">
            <Flame className="h-3 w-3" /> {t('Urgent')}
          </Badge>
        );
      case 'optimal':
        return (
          <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1 uppercase">
            <CheckCircle className="h-3 w-3" /> {t('Perfect timing')}
          </Badge>
        );
      case 'good':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 uppercase">
            <Sprout className="h-3 w-3" /> {t('Good timing')}
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="outline" className="flex items-center gap-1 uppercase">
            <Clock className="h-3 w-3" /> {t('Upcoming')}
          </Badge>
        );
    }
  };

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        scale: isTop ? 1 : 0.95 - (index * 0.05),
        zIndex: 10 - index,
        y: index * 12,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={`absolute w-full cursor-grab active:cursor-grabbing`}
      animate={isTop ? {} : { scale: 0.95 - (index * 0.05), y: index * 12 }}
    >
      <Card className={`${getUrgencyColor()} border shadow-xl overflow-hidden`}>
        {/* Card Image/Visual Area */}
        <div className="h-48 bg-slate-50 border-b flex items-center justify-center">
          <TaskIcon taskCode={task.taskCode} size="hero" />
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Title and Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TaskIcon taskCode={task.taskCode} size="md" /> {task.title}
              </h2>
            </div>
            {getUrgencyBadge()}
          </div>

          {/* Description */}
          <p className="text-base text-muted-foreground leading-relaxed">
            {task.fullDescription}
          </p>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{task.bestWindow}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {task.timeRequired} {t('minutes')}
              </span>
            </div>
            {task.soilTemp && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span>{task.soilTemp}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm col-span-2">
              <span className="text-lg">{task.weatherIcon}</span>
              <span>
                {t('Weather')}: {task.weatherContext}
              </span>
            </div>
          </div>

          {/* Reasoning */}
          <div>
            <h3 className="font-semibold mb-2">{t('Why now?')}</h3>
            <ul className="space-y-1">
              {task.reasoning.map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => onSwipeLeft(task.id)}
              className="border-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              aria-label={`${t('Dismiss')} ${task.title}`}
            >
              <X className="h-5 w-5 mr-2" aria-hidden="true" />
              {t('Dismiss')}
            </Button>
            <Button
              size="lg"
              onClick={() => onSwipeRight(task.id)}
              className="bg-green-600 hover:bg-green-700"
              aria-label={`${t('Add to List')}: ${task.title}`}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" aria-hidden="true" />
              {t('Add to List')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Homepage Component
export function Homepage() {
  const { markFirstData, markInteractive } = useScreenTracking('Homepage');
  const [tasks, setTasks] = useState<GardenTask[]>([]);
  const [myTasks, setMyTasks] = useState<string[]>([]);
  const [dismissedTasks, setDismissedTasks] = useState<string[]>([]);
  const [cardDeckIndex, setCardDeckIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherContext, setWeatherContext] = useState<WeatherContext | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'urgency' | 'date' | 'plant' | 'time'>('urgency');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [userLocation, setUserLocation] = useState<string>('');
  const [gardenAlerts, setGardenAlerts] = useState<GardenAlertResult[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const alertCacheRef = useRef<Map<string, GardenAlertResult[]>>(new Map()); // cache alerts per ~0.1 degree to limit refetching

  // Platform detection: use animated deck on native, static on web for better performance
  const [useAnimatedDeck, setUseAnimatedDeck] = useState(false);
  useEffect(() => {
    setUseAnimatedDeck(isNative());
  }, []);

  const staticCopy = React.useMemo(
    () => [
      'My Home',
      "You're All Caught Up!",
      "You've reviewed all high-priority tasks for today.",
      'Show More Tasks',
      'Connected',
      'Urgent',
      'Perfect timing',
      'Good timing',
      'Upcoming',
      'minutes',
      'Weather',
      'Why now?',
      'Dismiss',
      'Add to List',
      'Recommended Tasks',
      'Score',
      'min',
      'Urgent Only',
      'All Tasks',
      'Planting',
      'Watering',
      'Maintenance',
      'Fertilizing',
      'Sort: Urgency',
      'Sort: Time',
      'Sort: Plant',
      'Optimal',
      'Good',
      'Zone',
      'Soil',
      'Last Frost',
      'days ago',
      'Refresh tasks',
      'Added'
    ],
    [],
  );
  const { t } = useTranslationMap(staticCopy);

  const loadTasks = useCallback(async (location?: string) => {
    setIsLoading(true);
    try {
      // Use provided location or fall back to state or default
      const locationToUse = location || userLocation || 'Portland, OR';
      
      // Try to fetch from backend with location
      const response = await api.getRecommendedActivities(locationToUse);
      
      if (response && response.tasks) {
        setTasks(response.tasks);
        markFirstData();
        if (response.context) {
          // Map weather condition to icon
          const conditionIconMap: Record<string, string> = {
            'clear': '☀️',
            'sunny': '☀️',
            'partly cloudy': '🌤️',
            'cloudy': '☁️',
            'overcast': '☁️',
            'light rain': '🌦️',
            'rain': '🌧️',
            'heavy rain': '⛈️',
            'thunderstorm': '⛈️',
            'snow': '🌨️'
          };
          
          const condition = response.context.weather?.conditions || 'sunny';
          const icon = conditionIconMap[condition.toLowerCase()] || '🌤️';
          
          setWeatherContext({
            location: response.context.location || locationToUse,
            temperature: response.context.weather?.temperature || response.context.temperature || 15,
            conditions: condition,
            icon: icon,
            soilMoisture: response.context.weather?.soilMoisture || response.context.soilMoisture || 'Moderate',
            lastFrostDate: response.context.lastFrostDate || 'May 10',
            daysSinceFrost: response.context.daysSinceFrost || 2,
            zone: response.context.zone || '8b',
            growingWeek: response.context.growingWeek || 4
          });

          const latCandidate =
            response.context.coordinates?.lat ??
            response.context.coordinates?.latitude ??
            response.context.lat ??
            response.context.latitude ??
            response.context.weather?.lat ??
            response.context.weather?.latitude ??
            null;
          const lonCandidate =
            response.context.coordinates?.lon ??
            response.context.coordinates?.lng ??
            response.context.coordinates?.longitude ??
            response.context.lon ??
            response.context.longitude ??
            response.context.weather?.lon ??
            response.context.weather?.longitude ??
            null;

          if (latCandidate != null && lonCandidate != null) {
            const latNum = Number(latCandidate);
            const lonNum = Number(lonCandidate);
            if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
              const cacheKey = `${latNum.toFixed(1)},${lonNum.toFixed(1)}`;
              if (alertCacheRef.current.has(cacheKey)) {
                setGardenAlerts(alertCacheRef.current.get(cacheKey) ?? []);
                setAlertsLoading(false);
              } else {
                setAlertsLoading(true);
                try {
                  const alertPayload = await api.getGardenAlerts(latNum, lonNum);
                  const resolvedAlerts = Array.isArray(alertPayload?.alerts) ? alertPayload.alerts : [];
                  alertCacheRef.current.set(cacheKey, resolvedAlerts);
                  setGardenAlerts(resolvedAlerts);
                } catch (_error) {
                  alertCacheRef.current.set(cacheKey, []);
                  setGardenAlerts([]);
                } finally {
                  setAlertsLoading(false);
                }
              }
            } else {
              setGardenAlerts([]);
            }
          } else {
            setGardenAlerts([]);
          }
        }
      } else {
        // Fallback to mock data
        setTasks([]);
      }
    } catch (_error) {
      // Fallback to mock data (offline mode)
      setTasks([]);
      setGardenAlerts([]);
      setAlertsLoading(false);
    } finally {
      setIsLoading(false);
      markInteractive();
    }
  }, [userLocation, markFirstData, markInteractive]);

  useEffect(() => {
    // Load user location from database (if authenticated) or localStorage
    // Wrap in startTransition to avoid Suspense hydration errors
    startTransition(async () => {
      let location = ''; // Will be determined below

      // First, try to get location from authenticated user's database
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../../lib/supabase/env');

          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          });

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: prefs } = await supabase
              .from('user_location_preferences')
              .select('home_place_name')
              .eq('user_id', user.id)
              .maybeSingle();

            if (prefs?.home_place_name) {
              location = prefs.home_place_name;
              setUserLocation(location);
            }
          }
        } catch (_error) {
          // Silent failure - will fall back to localStorage or empty
        }
      }

      // Fall back to localStorage if no database location
      if (!location) {
        const interestsStr = localStorage.getItem('userInterests');
        if (interestsStr) {
          try {
            const interests = JSON.parse(interestsStr);
            if (interests.location) {
              location = interests.location;
              setUserLocation(location);
            }
          } catch (_error) {
            // Invalid JSON
          }
        }
      }

      // If still no location, leave empty (will trigger location picker)
      // Load tasks with the determined location (or empty to prompt user)
      loadTasks(location || undefined);
    });
  }, [loadTasks]);

  const handleLocationUpdate = (newLocation: string) => {
    setUserLocation(newLocation);
    // Reload tasks with new location
    loadTasks(newLocation);
  };

  const handleSwipeRight = async (taskId: string) => {
    setMyTasks(prev => [...prev, taskId]);
    setCardDeckIndex(prev => prev + 1);
    
    // Find the task to get its details
    const task = tasks.find(t => t.id === taskId);
    
    // Try to sync with backend if authenticated
    try {
      const token = localStorage.getItem('access_token');
      console.log('🔑 Swipe right - Token available:', !!token, 'Task found:', !!task);
      if (token && task) {
        const result = await api.addTaskToList(taskId, {
          title: task.title,
          description: task.fullDescription || task.shortDescription,
          taskType: task.category === 'harvest' ? 'harvest' : task.category === 'planting' ? 'planting' : 'maintenance',
          plantSlug: task.plant || undefined
        });
        console.log('✅ Swipe - Task added to backend:', result);
      }
    } catch (error) {
      console.error('❌ Swipe - Failed to add task to backend:', error);
    }
  };

  const handleSwipeLeft = async (taskId: string) => {
    setDismissedTasks(prev => [...prev, taskId]);
    setCardDeckIndex(prev => prev + 1);
    
    // Try to sync with backend if authenticated
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await api.dismissTask(taskId, 'not_interested');
      }
    } catch (_error) {
      // Silent failure - dismissal saved locally
    }
  };

  const handleAddTask = async (taskId: string) => {
    const isCurrentlyAdded = myTasks.includes(taskId);
    
    // Find the task to get its details
    const task = tasks.find(t => t.id === taskId);
    
    if (isCurrentlyAdded) {
      setMyTasks(prev => prev.filter(id => id !== taskId));
      
      // Try to remove from backend
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          await api.removeTaskFromList(taskId);
          console.log('✅ Task removed from backend');
        }
      } catch (error) {
        console.error('❌ Failed to remove task from backend:', error);
      }
    } else {
      setMyTasks(prev => [...prev, taskId]);
      
      // Try to add to backend
      try {
        const token = localStorage.getItem('access_token');
        console.log('🔑 Token available:', !!token, 'Task found:', !!task);
        if (token && task) {
          const result = await api.addTaskToList(taskId, {
            title: task.title,
            description: task.fullDescription || task.shortDescription,
            taskType: task.category === 'harvest' ? 'harvest' : task.category === 'planting' ? 'planting' : 'maintenance',
            plantSlug: task.plant || undefined
          });
          console.log('✅ Task added to backend:', result);
        } else if (!token) {
          console.log('⚠️ No auth token - task only saved locally');
        }
      } catch (error) {
        console.error('❌ Failed to add task to backend:', error);
      }
    }
  };

  const handleDismissTask = async (taskId: string) => {
    setDismissedTasks(prev => [...prev, taskId]);
    
    // Try to sync with backend if authenticated
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await api.dismissTask(taskId, 'not_interested');
      }
    } catch (_error) {
      // Silent failure - dismissal saved locally
    }
  };

  const getActiveCards = () => {
    return tasks
      .filter(task => !dismissedTasks.includes(task.id))
      .slice(cardDeckIndex, cardDeckIndex + 3);
  };

  const getFilteredTasks = () => {
    let filtered = tasks.filter(task => !dismissedTasks.includes(task.id));
    
    if (filterBy !== 'all') {
      if (filterBy === 'urgent') {
        filtered = filtered.filter(t => t.urgency === 'critical');
      } else {
        filtered = filtered.filter(t => t.category === filterBy);
      }
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'urgency':
          return b.score - a.score;
        case 'time':
          return a.timeRequired - b.timeRequired;
        case 'plant':
          return (a.plant || '').localeCompare(b.plant || '');
        default:
          return b.score - a.score;
      }
    });
  };

  const activeCards = getActiveCards();
  const filteredTasks = getFilteredTasks();
  const taskCounts = {
    urgent: tasks.filter(t => t.urgency === 'critical').length,
    optimal: tasks.filter(t => t.urgency === 'optimal').length,
    good: tasks.filter(t => t.urgency === 'good').length,
  };

  if (isLoading) {
    return <SkeletonGrowHomepage />;
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Home className="h-8 w-8 text-green-600" />
            {t('My Home')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Location Settings */}
          <LocationSettings
            currentLocation={userLocation || weatherContext?.location || undefined}
            onLocationUpdate={handleLocationUpdate}
          />
          
          {/* Connection status indicator */}
          {localStorage.getItem('access_token') && (
            <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs hidden sm:flex">
              🔗 {t('Connected')}
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={() => loadTasks()} aria-label={t('Refresh tasks')}>
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {(alertsLoading || gardenAlerts.length > 0) && (
        <GardenAlertBox alerts={gardenAlerts} isLoading={alertsLoading} />
      )}

      {/* Card Deck - animated for native, static for web */}
      {activeCards.length > 0 ? (
        useAnimatedDeck ? (
          /* Animated swipe deck (native apps only) */
          <div className="relative h-[580px] sm:h-[620px] overflow-hidden">
            {activeCards.map((task, index) => (
              <SwipeCard
                key={task.id}
                task={task}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                isTop={index === 0}
                index={index}
                t={t}
              />
            ))}
          </div>
        ) : (
          /* Static card view (web browsers) - shows one card at a time */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-muted-foreground">
                {cardDeckIndex + 1} / {tasks.filter(t => !dismissedTasks.includes(t.id)).length}
              </span>
            </div>
            <StaticTaskCard
              task={activeCards[0]}
              onAddTask={handleSwipeRight}
              onDismiss={handleSwipeLeft}
              t={t}
            />
          </div>
        )
      ) : (
        <Card className="p-12 text-center bg-white border-2 border-green-200">
          <div className="space-y-4">
            <span className="text-6xl">🎉</span>
            <h2 className="text-2xl font-semibold">{t("You're All Caught Up!")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("You've reviewed all high-priority tasks for today.")}
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const element = document.getElementById('task-list');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('Show More Tasks')} <ArrowDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Context Strip */}
      {weatherContext && (
        <Card className="bg-white border border-blue-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium">{userLocation || weatherContext.location}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('Zone')} {weatherContext.zone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{weatherContext.icon}</span>
                <div className="text-sm">
                  <p className="font-medium">{weatherContext.temperature}°C</p>
                  <p className="text-xs text-muted-foreground capitalize">{weatherContext.conditions}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium">
                    {t('Soil')}: {weatherContext.soilMoisture}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-purple-600" />
                <div className="text-sm">
                  <p className="font-medium">
                    {t('Last Frost')}: {weatherContext.lastFrostDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({weatherContext.daysSinceFrost} {t('days ago')})
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      <div id="task-list" className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  {t('Recommended Tasks')} ({filteredTasks.length})
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="destructive" className="text-xs">
                    🔥 {taskCounts.urgent} {t('Urgent')}
                  </Badge>
                  <Badge className="text-xs bg-green-600">
                    ✅ {taskCounts.optimal} {t('Optimal')}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    🌱 {taskCounts.good} {t('Good')}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'urgency' | 'date' | 'plant' | 'time')}
                  className="px-3 py-2 text-sm border rounded-md"
                >
                  <option value="urgency">{t('Sort: Urgency')}</option>
                  <option value="time">{t('Sort: Time')}</option>
                  <option value="plant">{t('Sort: Plant')}</option>
                </select>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-md"
                >
                  <option value="all">{t('All Tasks')}</option>
                  <option value="urgent">{t('Urgent Only')}</option>
                  <option value="planting">{t('Planting')}</option>
                  <option value="watering">{t('Watering')}</option>
                  <option value="maintenance">{t('Maintenance')}</option>
                  <option value="fertilizing">{t('Fertilizing')}</option>
                </select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Task Items */}
        <div className="space-y-3">
          {filteredTasks.map((task, index) => {
            const isExpanded = expandedTaskId === task.id;
            const isInMyTasks = myTasks.includes(task.id);
            
            return (
              <Card
                key={task.id}
                className={`transition-all hover:shadow-md ${
                  task.urgency === 'critical' ? 'border-l-4 border-l-red-500' : ''
                } ${isInMyTasks ? 'bg-green-50 border-green-200' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Priority Badge */}
                    <div className="mt-1">
                      <span className="text-2xl">{task.urgencyBadge}</span>
                    </div>

                    {/* Content */}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold flex items-center gap-2">
                          <span className="text-muted-foreground">{index + 1}.</span>
                          <TaskIcon taskCode={task.taskCode} size="sm" />
                          {task.title}
                        </h3>
                        {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.shortDescription}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          {t('Score')}: {task.score}/100
                        </span>
                        <span>•</span>
                        <span>
                          {t('Weather')}: {task.weatherContext}
                        </span>
                        <span>•</span>
                        <span>
                          {task.timeRequired} {t('min')}
                        </span>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3 pt-3 border-t">
                          <p className="text-sm">{task.fullDescription}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>{task.bestWindow}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{task.weatherIcon}</span>
                              <span>{task.weatherContext}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">{t('Why now?')}</h4>
                            <ul className="space-y-1">
                              {task.reasoning.map((reason, idx) => (
                                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className="text-green-600">•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={isInMyTasks ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAddTask(task.id)}
                        className={isInMyTasks ? "bg-green-600 hover:bg-green-700" : ""}
                        aria-label={isInMyTasks ? `${t('Added')}: ${task.title}` : `${t('Add to List')}: ${task.title}`}
                      >
                        {isInMyTasks ? (
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Plus className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissTask(task.id)}
                        aria-label={`${t('Dismiss')} ${task.title}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
