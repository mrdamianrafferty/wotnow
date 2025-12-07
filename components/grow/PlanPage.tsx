import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { 
  Calendar, 
  Sprout, 
  Scissors, 
  ShoppingBasket, 
  AlertTriangle,
  StickyNote,
  Plus,
  LayoutGrid,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../../lib/grow/api';
import { WeeklyTaskView } from './WeeklyTaskView';
import { SkeletonPlanPage } from './GrowSkeletons';

interface TimelineEvent {
  id: string;
  type: 'planting' | 'maintenance' | 'harvest' | 'alert' | 'reminder';
  title: string;
  description: string;
  dateLabel: string;
  startDate: Date;
  endDate?: Date;
  plant?: string;
  emoji?: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'upcoming' | 'current' | 'completed' | 'missed';
  tags?: string[];
}

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
};

type PlantingCalendarResponse = {
  climateZone: string | null;
  altitudeMeters: number | null;
  altitudeWeeks: number;
  fallbackToDefault: boolean;
  windows: PlantingCalendarWindow[];
};

const WEEKS_PER_MONTH = 4;

function buildDateFromMonthWeek(year: number, month: number, week: number): Date {
  const safeMonth = Math.min(Math.max(Math.floor(month), 1), 12);
  const safeWeek = Math.min(Math.max(Math.floor(week), 1), WEEKS_PER_MONTH);
  const candidateDay = (safeWeek - 1) * 7 + 1;
  const daysInMonth = new Date(year, safeMonth, 0).getDate();
  const day = Math.min(candidateDay, daysInMonth);
  return new Date(year, safeMonth - 1, day);
}

function deriveStatus(start: Date, end?: Date): TimelineEvent['status'] {
  const now = new Date();
  if (end && now > end) {
    return 'completed';
  }
  if (now < start) {
    return 'upcoming';
  }
  if (!end || now <= end) {
    return 'current';
  }
  return 'upcoming';
}

function taskMetaFromCode(taskCode: string): {
  type: TimelineEvent['type'];
  emoji: string;
  priority: TimelineEvent['priority'];
} {
  const code = taskCode.toLowerCase();

  if (code.includes('harvest')) {
    return { type: 'harvest', emoji: '🧺', priority: 'normal' };
  }

  if (code.includes('plant') || code.includes('transplant')) {
    return { type: 'planting', emoji: '🪴', priority: 'high' };
  }

  if (code.includes('sow')) {
    return { type: 'planting', emoji: '🌱', priority: 'high' };
  }

  if (code.includes('harden')) {
    return { type: 'maintenance', emoji: '🧊', priority: 'high' };
  }

  if (code.includes('water') || code.includes('irrigate')) {
    return { type: 'maintenance', emoji: '💧', priority: 'normal' };
  }

  if (code.includes('fertil')) {
    return { type: 'maintenance', emoji: '🪴', priority: 'normal' };
  }

  return { type: 'maintenance', emoji: '🌿', priority: 'normal' };
}

function formatWeekLabel(window: PlantingCalendarWindow): string {
  const startMonthName = new Date(2024, window.startMonth - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  const endMonthName = new Date(2024, window.endMonth - 1, 1).toLocaleDateString('en-US', { month: 'short' });

  if (window.startMonth === window.endMonth) {
    const range = window.endWeek !== window.startWeek ? `wk ${window.startWeek}-${window.endWeek}` : `wk ${window.startWeek}`;
    return `${startMonthName} ${range}`;
  }

  return `${startMonthName} wk ${window.startWeek} – ${endMonthName} wk ${window.endWeek}`;
}

function formatAdjustments(window: PlantingCalendarWindow): string {
  const adjustments: string[] = [];
  if (window.zoneWeeks !== 0) {
    adjustments.push(`zone ${window.zoneWeeks > 0 ? '+' : ''}${window.zoneWeeks} wk`);
  }
  if (window.altitudeWeeks !== 0) {
    adjustments.push(`altitude ${window.altitudeWeeks > 0 ? '+' : ''}${window.altitudeWeeks} wk`);
  }

  if (adjustments.length === 0) {
    return window.source === 'adjusted' ? 'Adjusted for your climate profile.' : 'Baseline schedule for all zones.';
  }

  return `Adjusted by ${adjustments.join(', ')}.`;
}

function convertWindowToEvent(window: PlantingCalendarWindow, year: number): TimelineEvent {
  const start = buildDateFromMonthWeek(year, window.startMonth, window.startWeek);
  const end = buildDateFromMonthWeek(year, window.endMonth, window.endWeek);
  end.setDate(end.getDate() + 6);
  if (end < start) {
    end.setFullYear(end.getFullYear() + 1);
  }

  const { type, emoji, priority } = taskMetaFromCode(window.taskCode);
  const plantLabel = window.plantName ?? window.plantSlug;
  const taskLabel = window.taskName ?? window.taskCode.replace(/_/g, ' ');
  const dateLabel = formatWeekLabel(window);
  const adjustments = formatAdjustments(window);
  const notes = window.notes ? ` ${window.notes}` : '';
  const description = `${taskLabel} for ${plantLabel}. ${adjustments}${notes}`.trim();

  return {
    id: `calendar-${window.plantSlug}-${window.taskCode}-${window.startMonth}-${window.startWeek}`,
    type,
    title: `${taskLabel} – ${plantLabel}`,
    description,
    dateLabel,
    startDate: start,
    endDate: end,
    plant: plantLabel,
    emoji,
    priority,
    status: deriveStatus(start, end),
    tags: ['planting-calendar', window.source === 'adjusted' ? 'adjusted' : 'default'],
  };
}

export function PlanPage() {
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar' | 'weekly'>('weekly');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<TimelineEvent[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in production, this would come from backend
  const mockEvents = useMemo<TimelineEvent[]>(() => [
    {
      id: '1',
      type: 'planting',
      title: 'Start Tomato Seeds Indoors',
      description: 'Optimal window for starting tomato seeds indoors. Use seed trays with good drainage.',
      dateLabel: 'This Week',
      startDate: new Date(2025, 2, 1),
      endDate: new Date(2025, 2, 15),
      plant: 'Tomatoes',
      emoji: '🍅',
      priority: 'high',
      status: 'current',
      tags: ['planting', 'optimal']
    },
    {
      id: '2',
      type: 'alert',
      title: '⚠️ Frost Warning',
      description: 'Temperatures expected to drop below 32°F. Protect tender plants.',
      dateLabel: 'March 5',
      startDate: new Date(2025, 2, 5),
      priority: 'critical',
      status: 'upcoming',
      tags: ['critical']
    },
    {
      id: '3',
      type: 'maintenance',
      title: 'Fertilize Fruit Trees',
      description: 'Apply balanced fertilizer around drip line of fruit trees.',
      dateLabel: 'March 10',
      startDate: new Date(2025, 2, 10),
      plant: 'Fruit Trees',
      emoji: '🌳',
      priority: 'normal',
      status: 'upcoming'
    },
    {
      id: '4',
      type: 'planting',
      title: 'Direct Sow Peas',
      description: 'Soil temperature is right for peas. Sow directly outdoors.',
      dateLabel: 'March 15-30',
      startDate: new Date(2025, 2, 15),
      endDate: new Date(2025, 2, 30),
      plant: 'Peas',
      emoji: '🫛',
      priority: 'normal',
      status: 'upcoming',
      tags: ['direct-sow']
    },
    {
      id: '5',
      type: 'reminder',
      title: 'Order Summer Seeds',
      description: 'Last chance to order summer vegetable seeds for best selection.',
      dateLabel: 'March 20',
      startDate: new Date(2025, 2, 20),
      priority: 'high',
      status: 'upcoming'
    },
    {
      id: '6',
      type: 'harvest',
      title: '🧺 Spring Greens Ready',
      description: 'Lettuce, spinach, and arugula should be ready to harvest.',
      dateLabel: 'April 1-15',
      startDate: new Date(2025, 3, 1),
      endDate: new Date(2025, 3, 15),
      plant: 'Greens',
      emoji: '🥬',
      priority: 'normal',
      status: 'upcoming',
      tags: ['harvest']
    },
    {
      id: '7',
      type: 'maintenance',
      title: 'Prune Roses',
      description: 'Prime time for rose pruning before new growth begins.',
      dateLabel: 'March 8',
      startDate: new Date(2025, 2, 8),
      plant: 'Roses',
      emoji: '🌹',
      priority: 'normal',
      status: 'upcoming'
    },
    {
      id: '8',
      type: 'planting',
      title: 'Transplant Seedlings Outdoors',
      description: 'After last frost date, transplant hardened-off seedlings.',
      dateLabel: 'April 10-25',
      startDate: new Date(2025, 3, 10),
      endDate: new Date(2025, 3, 25),
      plant: 'Various',
      priority: 'high',
      status: 'upcoming'
    },
    {
      id: '9',
      type: 'harvest',
      title: '🧺 Tomato Harvest Window',
      description: 'Expected yield: 75 days from transplant. Pick when fully colored.',
      dateLabel: 'July 15-31',
      startDate: new Date(2025, 6, 15),
      endDate: new Date(2025, 6, 31),
      plant: 'Tomatoes',
      emoji: '🍅',
      priority: 'normal',
      status: 'upcoming',
      tags: ['harvest']
    },
    {
      id: '10',
      type: 'alert',
      title: '⚠️ First Frost Expected',
      description: 'Harvest tender crops. Protect perennials. Bring pots indoors.',
      dateLabel: 'October 15',
      startDate: new Date(2025, 9, 15),
      priority: 'critical',
      status: 'upcoming',
      tags: ['critical']
    }
  ], []);

  const loadTimelineEvents = useCallback(async () => {
    setIsLoading(true);
    const baseYear = new Date().getFullYear();
    const aggregated: TimelineEvent[] = [];

    try {
      const response = await api.getGardenTimeline();
      if (response?.events) {
        const parsedEvents = response.events.map((event: Record<string, unknown>) => {
          const { startDate, endDate, ...rest } = event as {
            startDate?: string;
            endDate?: string;
          } & Record<string, unknown>;

          return {
            ...rest,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : undefined,
          } as TimelineEvent;
        });
        aggregated.push(...parsedEvents);
        console.log('✅ Timeline events loaded');
      }
    } catch (error) {
      console.log('⚠️ Timeline API unavailable, continuing with local data', error);
    }

    try {
      const calendarResponse = (await api.getPlantingCalendar()) as PlantingCalendarResponse;
      const windows = Array.isArray(calendarResponse?.windows) ? calendarResponse.windows : [];
      if (windows.length) {
        const calendarEvents = windows.map((window) => convertWindowToEvent(window, baseYear));
        aggregated.push(...calendarEvents);
        console.log(`🌱 Added ${calendarEvents.length} planting calendar events`);
      }
    } catch (error) {
      console.log('⚠️ Planting calendar unavailable, skipping calendar events', error);
    }

    if (aggregated.length === 0) {
      setEvents(mockEvents);
    } else {
      setEvents([...aggregated, ...mockEvents]);
    }
    setIsLoading(false);
  }, [mockEvents]);

  useEffect(() => {
    loadTimelineEvents();
  }, [loadTimelineEvents]);

  const getEventColor = (type: string) => {
    switch (type) {
      case 'planting': return 'primary';
      case 'maintenance': return 'secondary';
      case 'harvest': return 'success';
      case 'alert': return 'error';
      case 'reminder': return 'info';
      default: return 'neutral';
    }
  };

  const getColorClasses = (color: string) => {
    const classes = {
      primary: {
        line: 'bg-blue-500',
        border: 'border-blue-500',
        text: 'text-blue-700',
        bg: 'bg-blue-50',
        badge: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      secondary: {
        line: 'bg-purple-500',
        border: 'border-purple-500',
        text: 'text-purple-700',
        bg: 'bg-purple-50',
        badge: 'bg-purple-100 text-purple-800 border-purple-200'
      },
      success: {
        line: 'bg-green-500',
        border: 'border-green-500',
        text: 'text-green-700',
        bg: 'bg-green-50',
        badge: 'bg-green-100 text-green-800 border-green-200'
      },
      error: {
        line: 'bg-red-500',
        border: 'border-red-500',
        text: 'text-red-700',
        bg: 'bg-red-50',
        badge: 'bg-red-100 text-red-800 border-red-200'
      },
      info: {
        line: 'bg-cyan-500',
        border: 'border-cyan-500',
        text: 'text-cyan-700',
        bg: 'bg-cyan-50',
        badge: 'bg-cyan-100 text-cyan-800 border-cyan-200'
      },
      neutral: {
        line: 'bg-gray-400',
        border: 'border-gray-400',
        text: 'text-gray-700',
        bg: 'bg-gray-50',
        badge: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    };
    return classes[color as keyof typeof classes] || classes.neutral;
  };

  const filteredEvents = events
    .filter(event => filterType === 'all' || event.type === filterType)
    .filter(event => selectedCrop === 'all' || event.plant === selectedCrop)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const uniquePlants = ['all', ...new Set(events.filter(e => e.plant).map(e => e.plant!))];

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startOnly = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
      const endOnly = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
      
      return dateOnly >= startOnly && dateOnly <= endOnly;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      setSelectedDate(date);
      setSelectedDayEvents(events);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const renderCalendarGrid = () => {
    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square p-2 border border-border/50"></div>
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = getEventsForDate(date);
      const hasEvents = dayEvents.length > 0;
      const today = isToday(date);
      
      days.push(
        <div
          key={day}
          onClick={() => hasEvents && handleDateClick(date)}
          className={`
            aspect-square min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border border-border/50 transition-all relative
            ${hasEvents ? 'cursor-pointer hover:bg-accent hover:shadow-md active:scale-95' : 'bg-muted/30'}
            ${today ? 'ring-2 ring-green-500 bg-green-50' : ''}
          `}
        >
          <div className="h-full flex flex-col">
            <div className={`text-xs sm:text-sm mb-1 ${today ? 'font-bold text-green-700' : ''}`}>
              {day}
            </div>
            {hasEvents && (
              <div className="flex-1 flex flex-col gap-0.5 sm:gap-1">
                {/* Desktop: Show event badges with text */}
                <div className="hidden md:flex flex-col gap-1">
                  {dayEvents.slice(0, 3).map((event, idx) => {
                    const color = getEventColor(event.type);
                    const colors = getColorClasses(color);
                    return (
                      <div
                        key={`${event.id}-${idx}`}
                        className={`text-xs px-1 py-0.5 rounded truncate ${colors.badge}`}
                        title={event.title}
                      >
                        {event.emoji && <span className="mr-0.5">{event.emoji}</span>}
                        <span>{event.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
                
                {/* Mobile: Show colored dots with count */}
                <div className="flex md:hidden items-center justify-between mt-auto">
                  <div className="flex flex-wrap gap-1">
                    {dayEvents.slice(0, 3).map((event, idx) => {
                      const color = getEventColor(event.type);
                      const colors = getColorClasses(color);
                      return (
                        <div
                          key={`${event.id}-${idx}`}
                          className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${colors.line}`}
                          title={event.title}
                        />
                      );
                    })}
                  </div>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  if (isLoading) {
    return <SkeletonPlanPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-green-600" />
            Garden Plan
          </h1>
          <p className="text-muted-foreground mt-1">
            Your seasonal timeline and upcoming tasks
          </p>
        </div>
        <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4" />
          Add Reminder
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filter by Type</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  All Events
                </Button>
                <Button
                  variant={filterType === 'planting' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('planting')}
                  className={filterType === 'planting' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <Sprout className="h-3 w-3 mr-1" />
                  Planting
                </Button>
                <Button
                  variant={filterType === 'maintenance' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('maintenance')}
                  className={filterType === 'maintenance' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  <Scissors className="h-3 w-3 mr-1" />
                  Maintenance
                </Button>
                <Button
                  variant={filterType === 'harvest' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('harvest')}
                  className={filterType === 'harvest' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <ShoppingBasket className="h-3 w-3 mr-1" />
                  Harvest
                </Button>
                <Button
                  variant={filterType === 'alert' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('alert')}
                  className={filterType === 'alert' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Alerts
                </Button>
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <label className="text-sm font-medium mb-2 block">Filter by Plant</label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                {uniquePlants.map(plant => (
                  <option key={plant} value={plant}>
                    {plant === 'all' ? 'All Plants' : plant}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant={viewMode === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('weekly')}
                title="Weekly Tasks"
              >
                <Calendar className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Week</span>
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
                title="Timeline View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly View - Climate-Aware Tasks */}
      {viewMode === 'weekly' && <WeeklyTaskView />}

      {/* Timeline View - DaisyUI Inspired */}
      {viewMode === 'timeline' && (
        <div className="relative">
          {/* Timeline Container */}
          <ul className="space-y-0">
            {filteredEvents.map((event, index) => {
              const color = getEventColor(event.type);
              const colors = getColorClasses(color);
              const isLast = index === filteredEvents.length - 1;
              
              return (
                <li key={`${event.id}-${index}`} className="relative">
                  {/* Timeline line before */}
                  {index > 0 && (
                    <div className={`absolute left-6 md:left-1/2 md:-ml-px top-0 w-0.5 h-8 ${getColorClasses(getEventColor(filteredEvents[index - 1].type)).line}`} />
                  )}
                  
                  <div className="relative pb-8">
                    <div className="flex items-start md:items-center">
                      {/* Timeline point - mobile on left, desktop center */}
                      <div className="absolute left-6 md:left-1/2 md:-ml-3 flex items-center justify-center">
                        <div className={`w-6 h-6 rounded-full border-4 ${colors.border} bg-card z-10 flex items-center justify-center`}>
                          {event.status === 'completed' && (
                            <CheckCircle2 className={`h-3 w-3 ${colors.text}`} />
                          )}
                        </div>
                      </div>

                      {/* Content - alternating sides on desktop */}
                      <div className={`w-full md:w-5/12 ml-16 md:ml-0 ${index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:ml-auto md:pl-8'}`}>
                        <Card className={`${event.priority === 'critical' ? 'border-2 border-red-400' : ''} hover:shadow-lg transition-shadow`}>
                          <CardContent className="p-4">
                            {/* Date label */}
                            <time className="text-sm font-mono italic text-muted-foreground block mb-2">
                              {event.dateLabel}
                            </time>
                            
                            {/* Title */}
                            <h3 className={`text-lg font-bold mb-1 ${event.priority === 'critical' ? 'text-red-700' : ''}`}>
                              {event.emoji && <span className="mr-2">{event.emoji}</span>}
                              {event.title}
                            </h3>
                            
                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-3">
                              {event.description}
                            </p>
                            
                            {/* Tags and badges */}
                            <div className="flex flex-wrap gap-2">
                              {event.plant && (
                                <Badge variant="secondary" className="text-xs">
                                  {event.emoji} {event.plant}
                                </Badge>
                              )}
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${colors.badge}`}
                              >
                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                              </Badge>
                              {event.status === 'current' && (
                                <Badge className="text-xs bg-green-600 text-white">
                                  Optimal Now
                                </Badge>
                              )}
                              {event.priority === 'critical' && (
                                <Badge variant="destructive" className="text-xs">
                                  Critical
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>

                  {/* Timeline line after */}
                  {!isLast && (
                    <div className={`absolute left-6 md:left-1/2 md:-ml-px bottom-0 w-0.5 h-8 ${colors.line}`} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {(() => {
                    const monthEvents = filteredEvents.filter(e => {
                      const eventDate = new Date(e.startDate);
                      return eventDate.getMonth() === currentMonth.getMonth() && 
                             eventDate.getFullYear() === currentMonth.getFullYear();
                    });
                    return `${monthEvents.length} event${monthEvents.length !== 1 ? 's' : ''} scheduled`;
                  })()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day of week headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0 border border-border rounded-lg overflow-hidden">
              {renderCalendarGrid()}
            </div>

            {/* Empty state if no events in current month */}
            {filteredEvents.filter(e => {
              const eventDate = new Date(e.startDate);
              return eventDate.getMonth() === currentMonth.getMonth() && 
                     eventDate.getFullYear() === currentMonth.getFullYear();
            }).length === 0 && (
              <div className="mt-4 p-6 text-center text-muted-foreground bg-muted/30 rounded-lg">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events scheduled for this month</p>
                <p className="text-sm mt-1">Try navigating to a different month or adjusting your filters</p>
              </div>
            )}

            {/* Instructions and Legend */}
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
                💡 <span className="font-medium">Tip:</span> Click on any date with events to view full details and take actions.
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Event Types:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                    <Sprout className="h-3 w-3 mr-1" /> Planting
                  </Badge>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                    <Scissors className="h-3 w-3 mr-1" /> Maintenance
                  </Badge>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <ShoppingBasket className="h-3 w-3 mr-1" /> Harvest
                  </Badge>
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Alert
                  </Badge>
                  <Badge variant="outline" className="bg-cyan-100 text-cyan-800 border-cyan-200">
                    <StickyNote className="h-3 w-3 mr-1" /> Reminder
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day Details Dialog */}
      <Dialog open={selectedDate !== null} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </DialogTitle>
            <DialogDescription>
              {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} scheduled
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDayEvents.map(event => {
              const color = getEventColor(event.type);
              const colors = getColorClasses(color);
              return (
                <Card key={event.id} className={colors.bg}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      {event.emoji && <span>{event.emoji}</span>}
                      {event.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={`text-xs ${colors.badge}`}>
                        {event.type}
                      </Badge>
                      {event.plant && (
                        <Badge variant="secondary" className="text-xs">
                          {event.plant}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
