import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ActivityCard, type Activity } from './ActivityCard';
import { Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../../lib/grow/api';
import { mainCategories, type ActivityCategory, findCategoryLabel } from '../../utils/activities';

interface ActivitiesPageProps {
  userInterests: unknown;
}

const toStringSafe = (value: unknown) => String(value ?? '');

const toNumberSafe = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function ActivitiesPage({ userInterests: _userInterests }: ActivitiesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('suitability');
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const categories: ActivityCategory[] = mainCategories;

  const createFallbackId = () => `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const normalizeActivity = useCallback(
    (record: unknown): Activity => {
      if (!record || typeof record !== 'object') {
        return {
          id: createFallbackId(),
          name: 'Garden activity',
          suitabilityScore: 0,
        };
      }

      const raw = record as Record<string, unknown>;
      const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : createFallbackId();

      return {
        id,
        name: typeof raw.name === 'string' ? raw.name : undefined,
        category: typeof raw.category === 'string' ? raw.category : undefined,
        suitabilityScore:
          typeof raw.suitabilityScore === 'number'
            ? raw.suitabilityScore
            : Number(raw.suitabilityScore ?? 0),
        weatherReason: typeof raw.weatherReason === 'string' ? raw.weatherReason : undefined,
        duration: typeof raw.duration === 'string' ? raw.duration : undefined,
        difficulty: typeof raw.difficulty === 'string' ? raw.difficulty : undefined,
        location: typeof raw.location === 'string' ? raw.location : undefined,
        participants: raw.participants as Activity['participants'],
        image: typeof raw.image === 'string' ? raw.image : undefined,
      };
    },
    [],
  );

  const fetchActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getActivities();
      const activities = Array.isArray(data?.activities)
        ? data.activities.map((item: unknown) => normalizeActivity(item))
        : [];
      setAllActivities(activities);
      setFilteredActivities(activities);
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to fetch activities:', error);
      setError(err.message || 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, [normalizeActivity]);

  useEffect(() => {
    void fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    let filtered = [...allActivities];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(activity => {
        const name = toStringSafe(activity.name).toLowerCase();
        const location = toStringSafe(activity.location).toLowerCase();
        return name.includes(lowerSearch) || location.includes(lowerSearch);
      });
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(activity => activity.category === categoryFilter);
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(activity => {
        return toStringSafe(activity.difficulty).toLowerCase() === difficultyFilter;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'suitability':
          return toNumberSafe(b.suitabilityScore) - toNumberSafe(a.suitabilityScore);
        case 'participants':
          return toNumberSafe(b.participants) - toNumberSafe(a.participants);
        case 'name':
          return toStringSafe(a.name).localeCompare(toStringSafe(b.name));
        default:
          return 0;
      }
    });

    setFilteredActivities(filtered);
  }, [searchTerm, categoryFilter, difficultyFilter, sortBy, allActivities]);

  const getSuitabilityStats = () => {
    const excellent = filteredActivities.filter((activity) => toNumberSafe(activity.suitabilityScore) >= 90).length;
    const good = filteredActivities.filter((activity) => {
      const score = toNumberSafe(activity.suitabilityScore);
      return score >= 70 && score < 90;
    }).length;
    const fair = filteredActivities.filter((activity) => {
      const score = toNumberSafe(activity.suitabilityScore);
      return score >= 50 && score < 70;
    }).length;
    const poor = filteredActivities.filter((activity) => toNumberSafe(activity.suitabilityScore) < 50).length;

    return { excellent, good, fair, poor };
  };

  const stats = getSuitabilityStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchActivities}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold mb-2">All Garden Tasks</h1>
        <p className="text-muted-foreground">
          Discover gardening tasks and see how well they match today&apos;s weather conditions
        </p>
      </div>

      {/* Weather Suitability Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-green-600">{stats.excellent}</p>
            <p className="text-sm text-muted-foreground">Excellent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-yellow-600">{stats.good}</p>
            <p className="text-sm text-muted-foreground">Good</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-orange-600">{stats.fair}</p>
            <p className="text-sm text-muted-foreground">Fair</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-red-600">{stats.poor}</p>
            <p className="text-sm text-muted-foreground">Poor</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filter & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(({ key, icon, label }) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {icon ? <span>{icon}</span> : null}
                      {label ?? findCategoryLabel(key)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suitability">Weather Suitability</SelectItem>
                <SelectItem value="participants">Most Popular</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredActivities.length} activities
          </p>
          {filteredActivities.length > 0 && (
            <Badge variant="outline">
              Sorted by {sortBy === 'suitability' ? 'Weather Suitability' :
                        sortBy === 'participants' ? 'Popularity' : 'Name'}
            </Badge>
          )}
        </div>

        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No activities match your current filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('all');
                  setDifficultyFilter('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                showWeatherReason
                onJoin={fetchActivities}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
