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
  AlertCircle,
  CheckCircle2,
  Sprout,
} from 'lucide-react';
import { api } from '../../lib/grow/api';
import { auth } from '../../lib/grow/auth';
import { ClimateZoneInfo } from './ClimateZoneInfo';
import { TaskIcon } from './TaskIcon';
import { TaskFeedbackPrompt } from './TaskFeedbackPrompt';
import { type ClimateZoneCode } from '../../lib/grow/climate';
import { useScreenTracking } from '../../lib/performance';
import { toast } from 'sonner';

type FrostTolerance = 'hardy' | 'half_hardy' | 'tender' | null;

type PlantingCalendarWindow = {
  plantSlug: string;
  plantName: string | null;
  taskCode: string;
  taskName: string | null;
  notes: string | null;
  startMonth: number;
  startWeek: number;
  endMonth: number;
  endWeek: number;
  offsetWeeks: number;
  altitudeWeeks: number;
  zoneWeeks: number;
  source: 'adjusted' | 'default';
  frostTolerance?: FrostTolerance;
  frostProtectionNeeded?: boolean;
};

type FrostContext = {
  riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'severe';
  inFrostPeriod: boolean;
  hasTenderPlants: boolean;
  tenderPlantSlugs: string[];
};

type GardenContext = {
  soilType: string | null;
  sunExposure: string | null;
  moisture: string | null;
  gardenFeatures: string[];
  hasGreenhouse: boolean;
  hasRaisedBeds: boolean;
  hasColdFrame: boolean;
};

type PlantingCalendarResponse = {
  climateZone: string | null;
  altitudeMeters: number | null;
  altitudeWeeks: number;
  fallbackToDefault: boolean;
  windows: PlantingCalendarWindow[];
  userPlantCount: number;
  filteredByUserPlants: boolean;
  frostContext: FrostContext | null;
  gardenContext: GardenContext | null;
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
const TOTAL_WEEKS = WEEK_COUNT * MONTHS_IN_YEAR;

const CLIMATE_ZONE_CODES: ClimateZoneCode[] = [
  'atlantic_mild',
  'cool_maritime',
  'continental_cool',
  'med_marine',
  'southern_hot_dry',
  'mountain_cool',
];

function isClimateZoneCode(value: string | null | undefined): value is ClimateZoneCode {
  if (!value) {
    return false;
  }
  return CLIMATE_ZONE_CODES.includes(value as ClimateZoneCode);
}

function clampWeekIndex(index: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }
  return Math.min(Math.max(index, 0), TOTAL_WEEKS - 1);
}

function toWeekIndex(month: number, week: number): number {
  const safeMonth = Math.min(Math.max(Math.floor(month), 1), MONTHS_IN_YEAR);
  const safeWeek = Math.min(Math.max(Math.floor(week), 1), WEEK_COUNT);
  return (safeMonth - 1) * WEEK_COUNT + (safeWeek - 1);
}

function windowCoversIndex(window: PlantingCalendarWindow, index: number): boolean {
  const start = clampWeekIndex(toWeekIndex(window.startMonth, window.startWeek));
  const end = clampWeekIndex(toWeekIndex(window.endMonth, window.endWeek));
  if (end < start) {
    return clampWeekIndex(index) === start;
  }
  const target = clampWeekIndex(index);
  return target >= start && target <= end;
}

function isTaskCompletionArray(value: unknown): value is TaskCompletion[] {
  return Array.isArray(value);
}

export function WeeklyTaskView({ userId: propUserId }: WeeklyTaskViewProps) {
  // Performance tracking
  const { markFirstData, markInteractive } = useScreenTracking('WeeklyTaskView');

  const now = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => now.getFullYear());
  const [currentWeek, setCurrentWeek] = useState(() => Math.max(1, Math.min(WEEK_COUNT, Math.ceil(now.getDate() / 7))));
  const [calendarWindows, setCalendarWindows] = useState<PlantingCalendarWindow[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [climateZone, setClimateZone] = useState<ClimateZoneCode | null>(null);
  const [calendarMeta, setCalendarMeta] = useState<{
    climateZone: ClimateZoneCode | null;
    altitudeMeters: number | null;
    fallbackToDefault: boolean;
    altitudeWeeks: number;
    userPlantCount: number;
    filteredByUserPlants: boolean;
    frostContext: FrostContext | null;
    gardenContext: GardenContext | null;
  } | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [feedbackTask, setFeedbackTask] = useState<{
    id: string;
    taskCode: string;
    plantSlug: string;
    plantName: string | null;
    taskName: string | null;
  } | null>(null);
  const [userAddedTasks, setUserAddedTasks] = useState<Array<{
    id: string;
    task_id: string;
    title: string | null;
    description: string | null;
    task_type: string;
    plant_slug: string | null;
    scheduled_for: string | null;
    status: string;
  }>>([]);

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
    const monthShort = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('en-US', {
      month: 'short',
    });

    return {
      full: `${monthName} ${startDay}-${endDay}, ${currentYear}`,
      title: `${monthShort} ${startDay}-${endDay}`,
    };
  }, [currentMonth, currentWeek, currentYear]);

  const loadPlantingCalendar = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = (await api.getPlantingCalendar()) as PlantingCalendarResponse;
      const windows = Array.isArray(response?.windows) ? response.windows : [];
      setCalendarWindows(windows);

      // Performance: mark first data loaded
      markFirstData();

      const zoneCode = response?.climateZone && isClimateZoneCode(response.climateZone)
        ? response.climateZone
        : null;

      if (zoneCode) {
        setClimateZone(zoneCode);
      }

      setCalendarMeta({
        climateZone: zoneCode,
        altitudeMeters: typeof response?.altitudeMeters === 'number' ? response.altitudeMeters : null,
        fallbackToDefault: Boolean(response?.fallbackToDefault),
        altitudeWeeks: typeof response?.altitudeWeeks === 'number' ? response.altitudeWeeks : 0,
        userPlantCount: typeof response?.userPlantCount === 'number' ? response.userPlantCount : 0,
        filteredByUserPlants: Boolean(response?.filteredByUserPlants),
        frostContext: response?.frostContext ?? null,
        gardenContext: response?.gardenContext ?? null,
      });
    } catch (err) {
      const errorLike = err as { message?: string };
      const message = errorLike.message ?? 'Failed to load tasks';

      if (message.includes('Not authenticated') || message.includes('Unauthorized')) {
        setError('Please sign in to view your personalized tasks');
      } else {
        setError(message);
      }

      setCalendarWindows([]);
    } finally {
      setIsLoading(false);
      // Performance: mark screen interactive
      markInteractive();
    }
  }, [userId, markFirstData, markInteractive]);

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

  const loadUserTasks = useCallback(async () => {
    if (!userId) {
      setUserAddedTasks([]);
      return;
    }

    try {
      const response = await api.getMyTasks();
      if (response?.tasks && Array.isArray(response.tasks)) {
        setUserAddedTasks(response.tasks);
        console.log('📋 WeeklyTaskView: Loaded', response.tasks.length, 'user tasks');
      }
    } catch (err) {
      console.log('WeeklyTaskView: Unable to load user tasks:', err);
      setUserAddedTasks([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || isAuthChecking) {
      return;
    }

    void loadPlantingCalendar();
    void loadCompletions();
    void loadUserTasks();
  }, [userId, isAuthChecking, loadPlantingCalendar, loadCompletions, loadUserTasks]);

  const isTaskCompleted = useCallback(
    (plantSlug: string, taskCode: string) =>
      completions.some((completion) => completion.plant_slug === plantSlug && completion.task_code === taskCode),
    [completions],
  );

  const handleToggleComplete = useCallback(
    async (task: PlantingCalendarWindow) => {
      if (!userId) {
        toast.error('Please sign in to track task completion');
        return;
      }

      const completed = isTaskCompleted(task.plantSlug, task.taskCode);

      try {
        if (completed) {
          const completion = completions.find(
            (item) => item.plant_slug === task.plantSlug && item.task_code === task.taskCode,
          );

          if (completion) {
            await api.deleteTaskCompletion(completion.id);
            setCompletions((prev) => prev.filter((item) => item.id !== completion.id));
          }
        } else {
          const response = await api.completeTask(
            userId,
            task.plantSlug,
            task.taskCode,
            `Completed in ${getWeekDateRange().full}`,
          );

          const completion = (response as { completion?: TaskCompletion | unknown }).completion;
          if (completion && typeof completion === 'object') {
            setCompletions((prev) => [...prev, completion as TaskCompletion]);

            // Show feedback prompt for the completed task
            setFeedbackTask({
              id: (completion as TaskCompletion).id,
              taskCode: task.taskCode,
              plantSlug: task.plantSlug,
              plantName: task.plantName,
              taskName: task.taskName,
            });
          }
        }
      } catch (err) {
        const errorLike = err as { message?: string };
        toast.error(errorLike.message ?? 'Failed to update task. Please try again.');
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
    const targetIndex = toWeekIndex(currentMonth, currentWeek);
    const weekly = calendarWindows.filter((window) => windowCoversIndex(window, targetIndex));
    const sorted = [...weekly].sort((a, b) => {
      const startDelta = toWeekIndex(a.startMonth, a.startWeek) - toWeekIndex(b.startMonth, b.startWeek);
      if (startDelta !== 0) {
        return startDelta;
      }

      const aName = a.plantName ?? a.plantSlug;
      const bName = b.plantName ?? b.plantSlug;
      return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
    });

    if (showCompleted) {
      return sorted;
    }

    return sorted.filter((task) => !isTaskCompleted(task.plantSlug, task.taskCode));
  }, [calendarWindows, currentMonth, currentWeek, isTaskCompleted, showCompleted]);

  const completionCount = completions.length;
  const weekDateRange = getWeekDateRange();

  const getTaskColor = useCallback((taskCode: string) => {
    const code = taskCode.toLowerCase();

    if (code.includes('sow') || code.includes('plant')) {
      return 'bg-white border border-l-4 border-l-green-500 border-green-200 text-green-700';
    }

    if (code.includes('harvest')) {
      return 'bg-white border border-l-4 border-l-orange-500 border-orange-200 text-orange-700';
    }

    if (code.includes('prune') || code.includes('trim')) {
      return 'bg-white border border-l-4 border-l-[var(--gd-moss)] border-[var(--gd-cream-border)] text-[var(--gd-moss)]';
    }

    if (code.includes('water')) {
      return 'bg-white border border-l-4 border-l-blue-500 border-blue-200 text-blue-700';
    }

    if (code.includes('monitor') || code.includes('inspect')) {
      return 'bg-white border border-l-4 border-l-yellow-500 border-yellow-200 text-yellow-700';
    }

    return 'bg-white border border-l-4 border-l-gray-400 border-gray-200 text-gray-700';
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
                  This Week&apos;s Tasks
                </CardTitle>
                <p className="text-sm text-muted-foreground">{weekDateRange.full}</p>
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

      {/* Personalization info banner */}
      {calendarMeta?.filteredByUserPlants && calendarMeta.userPlantCount > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <span className="font-medium">🌱 Personalized for your garden</span>
          <span className="ml-1">— showing tasks for your {calendarMeta.userPlantCount} plant{calendarMeta.userPlantCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Frost warning when in frost period with tender plants */}
      {calendarMeta?.frostContext?.inFrostPeriod && calendarMeta.frostContext.hasTenderPlants && !calendarMeta.gardenContext?.hasGreenhouse && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <p className="font-medium text-amber-800">❄️ Frost risk period</p>
            <p className="mt-1 text-sm text-amber-700">
              {calendarMeta.frostContext.tenderPlantSlugs.length} frost-sensitive plant{calendarMeta.frostContext.tenderPlantSlugs.length !== 1 ? 's' : ''} may need protection.
              Consider fleece, cloches, or moving containers to shelter.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Garden condition tips based on soil type */}
      {calendarMeta?.gardenContext?.soilType && taskList.some(t => t.taskCode.toLowerCase().includes('water')) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <span className="font-medium">💧 Watering tip for {calendarMeta.gardenContext.soilType} soil:</span>
          <span className="ml-1">
            {calendarMeta.gardenContext.soilType === 'clay' && 'Water less frequently but deeply — clay retains moisture longer.'}
            {calendarMeta.gardenContext.soilType === 'sandy' && 'Water more often — sandy soil drains quickly and dries out fast.'}
            {calendarMeta.gardenContext.soilType === 'loam' && 'Ideal drainage — water when top inch feels dry.'}
            {calendarMeta.gardenContext.soilType === 'chalky' && 'May need more frequent watering — chalk drains fast and can be alkaline.'}
            {calendarMeta.gardenContext.soilType === 'peat' && 'Holds moisture well but watch for waterlogging in wet periods.'}
          </span>
        </div>
      )}

      {/* Greenhouse advantage tip */}
      {calendarMeta?.gardenContext?.hasGreenhouse && calendarMeta?.frostContext?.inFrostPeriod && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <span className="font-medium">🏡 Greenhouse advantage:</span>
          <span className="ml-1">Your tender plants are protected. Consider starting seeds early for a head start on spring.</span>
        </div>
      )}

      {/* Cold frame tip */}
      {calendarMeta?.gardenContext?.hasColdFrame && !calendarMeta?.gardenContext?.hasGreenhouse && calendarMeta?.frostContext?.inFrostPeriod && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800">
          <span className="font-medium">🪟 Cold frame tip:</span>
          <span className="ml-1">Use your cold frame to harden off seedlings or protect overwintering vegetables.</span>
        </div>
      )}

      {calendarMeta?.fallbackToDefault && userId && !error && (
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Showing baseline schedule</p>
            <p className="mt-1 text-sm">
              We haven’t calibrated this task for your zone yet, so you’re seeing the default timing. Adjusted windows will
              appear automatically once we have more data.
            </p>
          </AlertDescription>
        </Alert>
      )}

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
            const weekRange = `Week ${task.startWeek}${task.endWeek !== task.startWeek ? `-${task.endWeek}` : ''}`;
            const monthName = new Date(currentYear, task.startMonth - 1, 1).toLocaleDateString('en-US', {
              month: 'short',
            });
            const completed = isTaskCompleted(task.plantSlug, task.taskCode);
            const taskLabel = task.taskName ?? task.taskCode.replace(/_/g, ' ');
            const plantLabel = task.plantName ?? task.plantSlug;
            const totalOffset = task.offsetWeeks;
            const hasOffset = totalOffset !== 0;
            const zoneOffset = task.zoneWeeks !== 0 ? `Zone ${task.zoneWeeks > 0 ? '+' : ''}${task.zoneWeeks}` : null;
            const altitudeOffset = task.altitudeWeeks !== 0 ? `Altitude ${task.altitudeWeeks > 0 ? '+' : ''}${task.altitudeWeeks}` : null;

            return (
              <Card
                key={`${task.plantSlug}-${task.taskCode}-${index}`}
                className={`border-l-4 transition-all hover:shadow-md ${
                  completed ? 'border-l-green-600 bg-white opacity-80' : 'border-l-green-500 bg-white'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex items-start gap-2">
                        <div className={`rounded-lg p-2 ${getTaskColor(task.taskCode)}`}>
                          <TaskIcon taskCode={task.taskCode} size="sm" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className={`font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>
                              {taskLabel}
                            </h3>
                            <Badge
                              className="text-xs"
                              variant={task.source === 'adjusted' ? 'secondary' : 'outline'}
                            >
                              {task.source === 'adjusted' ? 'Adjusted timing' : 'Default timing'}
                            </Badge>
                            {completed && (
                              <Badge className="bg-green-600 text-xs text-white" variant="default">
                                ✓ Complete
                              </Badge>
                            )}
                          </div>
                          <p className={`text-sm ${completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                            {plantLabel}
                          </p>
                        </div>
                      </div>

                      {task.notes && !completed && (
                        <div className="ml-12 mb-3 border-l-2 border-l-blue-500 bg-white border border-blue-200 p-2 text-sm rounded-r-lg">
                          💡 {task.notes}
                        </div>
                      )}

                      <div className="ml-12 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="mr-1 h-3 w-3" />
                          {monthName} {weekRange}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.taskCode.replace(/_/g, ' ')}
                        </Badge>
                        {hasOffset && (
                          <Badge variant="outline" className="text-xs bg-white border-amber-300">
                            Offset {totalOffset > 0 ? `+${totalOffset}` : totalOffset} wk
                          </Badge>
                        )}
                        {zoneOffset && (
                          <Badge variant="outline" className="text-xs bg-white border-green-300">
                            🌍 {zoneOffset}
                          </Badge>
                        )}
                        {altitudeOffset && (
                          <Badge variant="outline" className="text-xs bg-white border-slate-300">
                            ⛰️ {altitudeOffset}
                          </Badge>
                        )}
                        {calendarMeta?.climateZone && (
                          <Badge variant="outline" className="text-xs bg-white border-emerald-300">
                            Zone {calendarMeta.climateZone.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {task.frostTolerance === 'tender' && (
                          <Badge variant="outline" className="text-xs bg-white border-red-300 text-red-700">
                            ❄️ Frost sensitive
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
              {calendarMeta?.userPlantCount === 0 ? (
                <>
                  <Sprout className="h-12 w-12 opacity-50" />
                  <div>
                    <p className="font-medium">Add plants to see personalized tasks</p>
                    <p className="mt-1 text-sm">
                      Visit your Garden to add plants. Once you have plants, we&apos;ll show you what to do each week.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Calendar className="h-12 w-12 opacity-50" />
                  <div>
                    <p className="font-medium">No tasks scheduled for this week</p>
                    <p className="mt-1 text-sm">Try navigating to a different week or check back later</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetToThisWeek}>
                    Go to This Week
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User-Added Tasks Section */}
      {!isLoading && !isAuthChecking && userId && userAddedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Sprout className="h-4 w-4" />
            Your Added Tasks ({userAddedTasks.length})
          </h3>
          {userAddedTasks.map((task) => (
            <Card
              key={task.id}
              className="border-l-4 border-l-violet-500 transition-all hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-2 flex items-start gap-2">
                      <div className="rounded-lg p-2 bg-white border border-[var(--gd-cream-border)] text-[var(--gd-moss)]">
                        <Sprout className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="font-medium">
                            {task.title || 'Added Task'}
                          </h3>
                          <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                            Added by you
                          </Badge>
                        </div>
                        {task.plant_slug && (
                          <p className="text-sm text-muted-foreground">
                            {task.plant_slug.replace(/-/g, ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {task.description && (
                      <div className="ml-12 mb-3 border-l-2 border-l-[var(--gd-moss)] bg-white border border-[var(--gd-cream-border)] p-2 text-sm rounded-r-lg">
                        {task.description}
                      </div>
                    )}
                    <div className="ml-12 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.task_type?.replace(/_/g, ' ') || 'maintenance'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!error && (
        <div className="rounded-lg border border-l-4 border-l-blue-500 border-blue-200 bg-white p-3 text-xs text-muted-foreground">
          💡 <span className="font-medium">Tip:</span> Tasks lean on your saved home location to adjust for climate
          zone{(calendarMeta?.climateZone || climateZone)
            ? ` (${(calendarMeta?.climateZone || climateZone)?.replace(/_/g, ' ')})`
            : ''}
          {calendarMeta?.altitudeWeeks
            ? ` and altitude (${calendarMeta.altitudeWeeks > 0 ? '+' : ''}${calendarMeta.altitudeWeeks} week shift).`
            : '.'}
          Weather and frost data refine these windows each season.
        </div>
      )}

      {/* Task Feedback Prompt */}
      {feedbackTask && (
        <TaskFeedbackPrompt
          taskId={feedbackTask.id}
          taskType={feedbackTask.taskCode}
          taskName={feedbackTask.taskName || feedbackTask.taskCode.replace(/_/g, ' ')}
          plantId={feedbackTask.plantSlug}
          onClose={() => setFeedbackTask(null)}
          onFeedbackSubmitted={() => {
            // Optional: Could refresh completions or show a success message
            console.log('[WeeklyTaskView] Feedback submitted for task:', feedbackTask.id);
          }}
        />
      )}
    </div>
  );
}
