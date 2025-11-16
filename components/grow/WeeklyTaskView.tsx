import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sprout,
  Droplets,
  Sun,
  AlertCircle,
  CheckCircle2,
  Leaf,
  Scissors,
  ShoppingBasket,
  Thermometer,
} from 'lucide-react';
import { api } from '../../lib/grow/api';
import { auth } from '../../lib/grow/auth';
import { ClimateZoneInfo } from './ClimateZoneInfo';
import { type ClimateZoneCode } from '../../lib/grow/climate';

type WeeklyTask = {
  week_in_month: number;
  plant_slug: string;
  plant_name: string;
  category?: string;
  task_code: string;
  task_name: string;
  notes?: string;
  start_month: number;
  start_week: number;
  end_month: number;
  end_week: number;
  climate_zone_code?: string;
};

type TaskCompletion = {
  id: string;
  user_id: string;
  plant_slug: string;
  task_code: string;
  completed_at: string;
  notes?: string;
};

interface WeeklyTaskViewProps {
  userId?: string;
}

const WEEK_COUNT = 4;
const MONTHS_IN_YEAR = 12;

function isWeeklyTaskArray(value: unknown): value is WeeklyTask[] {
  return Array.isArray(value);
}

function isTaskCompletionArray(value: unknown): value is TaskCompletion[] {
  return Array.isArray(value);
}

export function WeeklyTaskView({ userId: propUserId }: WeeklyTaskViewProps) {
  const now = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => now.getFullYear());
  const [currentWeek, setCurrentWeek] = useState(() => Math.max(1, Math.min(WEEK_COUNT, Math.ceil(now.getDate() / 7))));
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [climateZone, setClimateZone] = useState<ClimateZoneCode | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    if (propUserId) {
      setUserId(propUserId);
      setIsAuthChecking(false);
      return;
    }

    let cancelled = false;

    const loadUser = async () => {
      setIsAuthChecking(true);
      try {
        const session = await auth.getSession();
        if (!cancelled) {
          if (session?.user?.id) {
            setUserId(session.user.id);
          } else {
            setUserId(null);
          }
        }
      } catch (err) {
        console.log('WeeklyTaskView: Auth lookup failed (likely no session):', err);
        if (!cancelled) {
          setUserId(null);
        }
      } finally {
        if (!cancelled) {
          setIsAuthChecking(false);
        }
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [propUserId]);

  useEffect(() => {
    try {
      const interestsRaw = localStorage.getItem('userInterests');
      if (!interestsRaw) {
        return;
      }

      const parsed = JSON.parse(interestsRaw) as { climate_zone?: ClimateZoneCode } | null;
      if (parsed?.climate_zone) {
        setClimateZone(parsed.climate_zone);
      }
    } catch (err) {
      console.warn('WeeklyTaskView: Failed to parse stored user interests', err);
    }
  }, []);

  const getWeekDateRange = useCallback(() => {
    const startDay = (currentWeek - 1) * 7 + 1;
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const endDay = Math.min(currentWeek * 7, lastDayOfMonth);
    const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
    });

    return `${monthName} ${startDay}-${endDay}, ${currentYear}`;
  }, [currentMonth, currentWeek, currentYear]);

  const loadWeeklyTasks = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getTasksForUserMonth(userId, currentMonth);
      const extracted = (response as { tasks?: WeeklyTask[] | unknown }).tasks;
      const allTasks = isWeeklyTaskArray(extracted) ? extracted : [];
      const weekTasks = allTasks.filter((task) => task.week_in_month === currentWeek);
      setTasks(weekTasks);
    } catch (err) {
      const errorLike = err as { message?: string };
      const message = errorLike.message ?? 'Failed to load tasks';

      if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
        setError('Please sign in to view your personalized tasks');
      } else if (message.includes('get_tasks_for_user_month')) {
        setError('Database function not yet configured. Please check the setup guide.');
      } else {
        setError(message);
      }

      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, currentWeek, userId]);

  const loadCompletions = useCallback(async () => {
    if (!userId) {
      setCompletions([]);
      return;
    }

    try {
      const response = await api.getTaskCompletions(userId);
      const extracted = (response as { completions?: TaskCompletion[] | unknown }).completions;
      const completionsList = isTaskCompletionArray(extracted) ? extracted : [];
      setCompletions(completionsList);
    } catch (err) {
      const errorLike = err as { message?: string };
      console.log('WeeklyTaskView: Unable to load completions (expected if not authenticated):', errorLike?.message);
      setCompletions([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || isAuthChecking) {
      return;
    }

    void loadWeeklyTasks();
    void loadCompletions();
  }, [userId, isAuthChecking, loadWeeklyTasks, loadCompletions]);

  useEffect(() => {
    if (!userId || isAuthChecking) {
      return;
    }

    void loadWeeklyTasks();
  }, [currentWeek, userId, isAuthChecking, loadWeeklyTasks]);

  const isTaskCompleted = useCallback(
    (plantSlug: string, taskCode: string) =>
      completions.some((completion) => completion.plant_slug === plantSlug && completion.task_code === taskCode),
    [completions],
  );

  const handleToggleComplete = useCallback(
    async (task: WeeklyTask) => {
      if (!userId) {
        alert('Please sign in to track task completion');
        return;
      }

      const completed = isTaskCompleted(task.plant_slug, task.task_code);

      try {
        if (completed) {
          const completion = completions.find(
            (item) => item.plant_slug === task.plant_slug && item.task_code === task.task_code,
          );

          if (completion) {
            await api.deleteTaskCompletion(completion.id);
            setCompletions((prev) => prev.filter((item) => item.id !== completion.id));
          }
        } else {
          const response = await api.completeTask(
            userId,
            task.plant_slug,
            task.task_code,
            `Completed in ${getWeekDateRange()}`,
          );

          const completion = (response as { completion?: TaskCompletion | unknown }).completion;
          if (completion && typeof completion === 'object') {
            setCompletions((prev) => [...prev, completion as TaskCompletion]);
          }
        }
      } catch (err) {
        const errorLike = err as { message?: string };
        alert(errorLike.message ?? 'Failed to update task. Please try again.');
      }
    },
    [completions, getWeekDateRange, isTaskCompleted, userId],
  );

  const navigateWeek = useCallback(
    (direction: 'prev' | 'next') => {
      setCurrentWeek((prevWeek) => {
        if (direction === 'next') {
          if (prevWeek < WEEK_COUNT) {
            return prevWeek + 1;
          }

          setCurrentMonth((prevMonth) => {
            if (prevMonth < MONTHS_IN_YEAR) {
              return prevMonth + 1;
            }

            setCurrentYear((prevYear) => prevYear + 1);
            return 1;
          });

          return 1;
        }

        if (prevWeek > 1) {
          return prevWeek - 1;
        }

        setCurrentMonth((prevMonth) => {
          if (prevMonth > 1) {
            return prevMonth - 1;
          }

          setCurrentYear((prevYear) => prevYear - 1);
          return MONTHS_IN_YEAR;
        });

        return WEEK_COUNT;
      });
    },
    [],
  );

  const resetToThisWeek = useCallback(() => {
    const resetDate = new Date();
    setCurrentMonth(resetDate.getMonth() + 1);
    setCurrentYear(resetDate.getFullYear());
    setCurrentWeek(Math.max(1, Math.min(WEEK_COUNT, Math.ceil(resetDate.getDate() / 7))));
  }, []);

  const taskList = useMemo(() => {
    if (!showCompleted) {
      return tasks.filter((task) => !isTaskCompleted(task.plant_slug, task.task_code));
    }

    return tasks;
  }, [isTaskCompleted, showCompleted, tasks]);

  const completionCount = completions.length;
  const weekDateRange = getWeekDateRange();

  const getTaskIcon = useCallback((taskCode: string) => {
    const code = taskCode.toLowerCase();

    if (code.includes('sow') || code.includes('seed')) {
      return <Sprout className="h-4 w-4" />;
    }

    if (code.includes('harvest') || code.includes('pick')) {
      return <ShoppingBasket className="h-4 w-4" />;
    }

    if (code.includes('plant') || code.includes('transplant')) {
      return <Leaf className="h-4 w-4" />;
    }

    if (code.includes('water') || code.includes('irrigate')) {
      return <Droplets className="h-4 w-4" />;
    }

    if (code.includes('prune') || code.includes('trim')) {
      return <Scissors className="h-4 w-4" />;
    }

    if (code.includes('fertilize') || code.includes('feed')) {
      return <Sun className="h-4 w-4" />;
    }

    if (code.includes('monitor') || code.includes('inspect')) {
      return <Thermometer className="h-4 w-4" />;
    }

    return <Leaf className="h-4 w-4" />;
  }, []);

  const getTaskColor = useCallback((taskCode: string) => {
    const code = taskCode.toLowerCase();

    if (code.includes('sow') || code.includes('plant')) {
      return 'bg-green-50 border-green-200 text-green-700';
    }

    if (code.includes('harvest')) {
      return 'bg-orange-50 border-orange-200 text-orange-700';
    }

    if (code.includes('prune') || code.includes('trim')) {
      return 'bg-purple-50 border-purple-200 text-purple-700';
    }

    if (code.includes('water')) {
      return 'bg-blue-50 border-blue-200 text-blue-700';
    }

    if (code.includes('monitor') || code.includes('inspect')) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    }

    return 'bg-gray-50 border-gray-200 text-gray-700';
  }, []);

  const getPriorityBadge = useCallback((priority?: string) => {
    switch (priority) {
      case 'critical':
        return (
          <Badge variant="destructive" className="text-xs">
            Critical
          </Badge>
        );
      case 'high':
        return (
          <Badge className="text-xs bg-orange-600">
            High Priority
          </Badge>
        );
      case 'normal':
        return (
          <Badge variant="secondary" className="text-xs">
            Normal
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-xs">
            Low
          </Badge>
        );
      default:
        return null;
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Week {currentWeek} Tasks
                </CardTitle>
                <p className="text-sm text-muted-foreground">{weekDateRange}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetToThisWeek}>
                  This Week
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {completionCount > 0 && (
              <div className="flex items-center justify-between border-t pt-2">
                <div className="text-sm text-muted-foreground">
                  ✅ {completionCount} task{completionCount !== 1 ? 's' : ''} completed this week
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleted((prev) => !prev)}
                  className="text-xs"
                >
                  {showCompleted ? 'Hide' : 'Show'} Completed
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {climateZone && userId && <ClimateZoneInfo climateZone={climateZone} variant="compact" />}

      {!isAuthChecking && !userId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Sign in to view your personalized garden tasks</p>
            <p className="mt-1 text-sm">
              Tasks are customized based on your location, climate zone, and gardening preferences.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {error && userId && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>{error}</p>
              <p className="mt-2 text-xs">
                Make sure your profile has a gardening_climate_zone_code set and the database schema is properly
                configured.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {(isLoading || isAuthChecking) && (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <Card key={item}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !isAuthChecking && !error && userId && taskList.length > 0 && (
        <div className="space-y-3">
          {taskList.map((task, index) => {
            const weekRange = `Week ${task.start_week}${task.end_week !== task.start_week ? `-${task.end_week}` : ''}`;
            const monthName = new Date(currentYear, task.start_month - 1, 1).toLocaleDateString('en-US', {
              month: 'short',
            });
            const completed = isTaskCompleted(task.plant_slug, task.task_code);
            const priorityBadge = getPriorityBadge(task.category ?? '');

            return (
              <Card
                key={`${task.plant_slug}-${task.task_code}-${index}`}
                className={`border-l-4 transition-all hover:shadow-md ${
                  completed ? 'border-l-green-600 bg-green-50/30 opacity-80' : 'border-l-green-500'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex items-start gap-2">
                        <div className={`rounded-lg p-2 ${getTaskColor(task.task_code)}`}>{getTaskIcon(task.task_code)}</div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className={`font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.task_name}
                            </h3>
                            {completed && (
                              <Badge className="bg-green-600 text-xs text-white" variant="default">
                                ✓ Complete
                              </Badge>
                            )}
                            {priorityBadge}
                          </div>
                          <p className={`text-sm ${completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            {task.plant_name}
                            {task.category && <span className="ml-2 text-xs opacity-70">• {task.category}</span>}
                          </p>
                        </div>
                      </div>

                      {task.notes && !completed && (
                        <div className="ml-12 mb-3 border-l-2 border-blue-300 bg-blue-50 p-2 text-sm">
                          💡 {task.notes}
                        </div>
                      )}

                      <div className="ml-12 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {monthName} {weekRange}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.task_code.replace(/_/g, ' ')}
                        </Badge>
                        {task.climate_zone_code && (
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200">
                            🌍 {task.climate_zone_code.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      title={completed ? 'Unmark task' : 'Mark complete'}
                      onClick={() => handleToggleComplete(task)}
                    >
                      <CheckCircle2
                        className={`h-5 w-5 transition-colors ${
                          completed ? 'fill-green-600 text-green-600' : 'text-muted-foreground hover:text-green-600'
                        }`}
                      />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !isAuthChecking && !error && userId && taskList.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Calendar className="h-12 w-12 opacity-50" />
              <div>
                <p className="font-medium">No tasks scheduled for this week</p>
                <p className="mt-1 text-sm">Try navigating to a different week or check back later</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetToThisWeek}>
                Go to This Week
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-muted-foreground">
          💡 <span className="font-medium">Tip:</span> Tasks are personalized based on your location
          {climateZone ? ` and climate zone (${climateZone.replace('_', ' ')})` : ''}. Weather conditions and frost
          dates help determine optimal timing.
        </div>
      )}
    </div>
  );
}
