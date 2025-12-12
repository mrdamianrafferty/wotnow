import { EDGE_FUNCTION_BASE, SUPABASE_ANON_KEY } from '../supabase/env';
import { auth } from './auth';
import type { PlantSpecies, PlantSpeciesCategoriesResponse, PlantSpeciesSearchResponse } from './species';

/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE = EDGE_FUNCTION_BASE;
const GROW_PLANTS_API_BASE = '/api/grow/plants';
const GROW_SPECIES_API_BASE = '/api/grow/species';
const GROW_ONBOARDING_COMPLETE_API = '/api/grow/onboarding/complete';

// Local weather API endpoint - uses same data source as Go Daisy, always returns metric
const GROW_WEATHER_API = '/api/grow/weather';

type GrowPlantsResponse = {
  plants: any[];
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
};

export class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getHeaders(includeAuth: boolean = false) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } else {
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    return headers;
  }

  private async refreshTokenIfNeeded(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start refresh
    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const session = await auth.refreshSession();
        if (session) {
          console.log('✅ Token refreshed successfully');
          return true;
        }
        console.log('❌ Token refresh failed - session expired');
        return false;
      } catch (error) {
        console.error('❌ Token refresh error:', error);
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      const fallback = error instanceof Error ? error : new Error('Request failed');
      throw fallback;
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}, timeoutMs: number = 10000, retryOn401: boolean = true): Promise<Response> {
    const response = await this.fetchWithTimeout(url, options, timeoutMs);

    // If 401 and we haven't retried yet, try refreshing token
    if (response.status === 401 && retryOn401) {
      console.log('🔄 Got 401 error, attempting to refresh token...');
      
      const refreshed = await this.refreshTokenIfNeeded();
      
      if (refreshed) {
        console.log('✅ Token refreshed, retrying request...');
        // Retry the request with new token
        const newOptions = {
          ...options,
          headers: this.getHeaders(true), // Get fresh headers with new token
        };
        return this.fetchWithTimeout(url, newOptions, timeoutMs);
      } else {
        console.error('❌ Token refresh failed - user needs to sign in again');
        // Emit event to trigger re-authentication
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }

    return response;
  }

  async signup(email: string, password: string, name: string, interests: any) {
    const response = await this.fetchWithTimeout(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, name, interests }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to sign up');
    }

    return response.json();
  }

  async getUserProfile() {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/user/profile`, {
        headers: this.getHeaders(true),
      }, 5000); // Shorter timeout for profile

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
        throw new Error(error.error || 'Failed to fetch profile');
      }

      return response.json();
    } catch (error: unknown) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        const debugMessage = error instanceof Error ? error.message : String(error);
        console.debug('Profile fetch failed (expected in offline mode):', debugMessage);
      }
      throw new Error('Profile service unavailable');
    }
  }

  async updateUserInterests(interests: any) {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/user/interests`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ interests }),
      }, 5000); // Shorter timeout

      if (!response.ok) {
        throw new Error('Service unavailable');
      }

      return response.json();
    } catch (_error) {
      // Silently fail for interests sync - app works offline
      throw new Error('Sync service unavailable');
    }
  }

  async updateUserLocation(location: string) {
    try {
      // Check if user is authenticated first
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('🌍 Updating location:', location);
      const response = await this.fetchWithTimeout(`${API_BASE}/user/location`, {
        method: 'PUT',
        headers: this.getHeaders(true),
        body: JSON.stringify({ location }),
      }, 10000); // Increased timeout to 10 seconds for geocoding

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
        console.error('❌ Location update failed:', response.status, error);
        throw new Error(error.error || 'Service unavailable');
      }

      const result = await response.json();
      console.log('✅ Location update response:', result);
      return result;
    } catch (error: any) {
      console.error('❌ Location update error:', error.message || error);
      // Re-throw with original message
      throw error;
    }
  }

  async updateHomeLocation(userId: string, lat: number, lon: number) {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/profile/home-location`, {
        method: 'POST',
        headers: this.getHeaders(false), // Uses service role key on server
        body: JSON.stringify({ userId, lat, lon }),
      }, 10000); // Longer timeout for Google API call

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
        throw new Error(error.error || 'Failed to update home location');
      }

      return response.json();
    } catch (error: any) {
      console.error('❌ Update home location error:', error.message || error);
      throw error;
    }
  }

  async getActivities(location?: string) {
    const url = new URL(`${API_BASE}/activities`);
    if (location) {
      url.searchParams.set('location', location);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch activities');
    }

    return response.json();
  }

  async joinActivity(activityId: string) {
    const response = await fetch(`${API_BASE}/activities/${activityId}/join`, {
      method: 'POST',
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join activity');
    }

    return response.json();
  }

  async shareActivity(activityId: string, inviteEmails: string[], message?: string) {
    const response = await fetch(`${API_BASE}/activities/${activityId}/share`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({ inviteEmails, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to share activity');
    }

    return response.json();
  }

  async getWeather(location?: string, includeMarine: boolean = false) {
    // Use local API endpoint - same data source as Go Daisy, always returns metric (Celsius)
    const url = new URL(GROW_WEATHER_API, window.location.origin);
    if (location) {
      url.searchParams.set('location', location);
    }
    if (includeMarine) {
      url.searchParams.set('marine', 'true');
    }

    const response = await this.fetchWithTimeout(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to fetch weather');
    }

    // API always returns Celsius - no conversion needed
    return response.json();
  }

  // ========================================
  // GROW DAISY GARDENING ENDPOINTS
  // ========================================

  async getRecommendedActivities(location?: string, limit?: number) {
    // Build URL with query parameters
    const params = new URLSearchParams();
    if (location) {
      params.set('location', location);
    }
    if (limit) {
      params.set('limit', limit.toString());
    }

    const url = `/api/garden/tasks${params.toString() ? '?' + params.toString() : ''}`;

    try {
      const response = await this.fetchWithTimeout(url, {
        headers: this.getHeaders(false), // Don't require auth
      }, 10000); // Increased timeout for weather API calls

      if (!response.ok) {
        throw new Error('Service unavailable');
      }

      return response.json();
    } catch (error) {
      // Fallback handled by caller
      throw error;
    }
  }

  async addTaskToList(taskId: string, options?: { scheduledFor?: string; notes?: string; title?: string; description?: string; taskType?: string; plantSlug?: string }) {
    // Use local API route for task storage
    const response = await this.fetchWithTimeout('/api/grow/user-tasks', {
      method: 'POST',
      headers: this.getHeaders(true), // Requires auth
      body: JSON.stringify({
        taskId,
        scheduledFor: options?.scheduledFor,
        notes: options?.notes,
        title: options?.title,
        description: options?.description,
        taskType: options?.taskType,
        plantSlug: options?.plantSlug
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to add task');
    }

    return response.json();
  }

  async removeTaskFromList(taskId: string) {
    // Use local API route for task removal
    const response = await this.fetchWithTimeout(`/api/grow/user-tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(true), // Requires auth
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to remove task');
    }

    return response.json();
  }

  async dismissTask(taskId: string, reason: string, completedAt?: string) {
    const response = await this.fetchWithTimeout(`${API_BASE}/garden/tasks/${taskId}/dismiss`, {
      method: 'POST',
      headers: this.getHeaders(true), // Requires auth
      body: JSON.stringify({ reason, completedAt }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to dismiss task');
    }

    return response.json();
  }

  async getMyTasks() {
    // Use local API route for fetching user tasks
    console.log('📋 API: Fetching user tasks from /api/grow/user-tasks');
    const response = await this.fetchWithTimeout('/api/grow/user-tasks', {
      headers: this.getHeaders(true), // Requires auth
    });

    console.log('📋 API: getMyTasks response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      console.error('📋 API: getMyTasks error:', error);
      throw new Error(error.error || 'Failed to fetch my tasks');
    }

    const data = await response.json();
    console.log('📋 API: getMyTasks returned:', data);
    return data;
  }

  // Task dismissals (done/skipped for year) - for Plan page timeline
  async getTaskDismissals(year?: number) {
    const url = new URL('/api/grow/task-dismissals', window.location.origin);
    if (year) {
      url.searchParams.set('year', year.toString());
    }

    const response = await this.fetchWithTimeout(url.toString(), {
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to fetch dismissals');
    }

    return response.json();
  }

  async dismissPlanTask(taskKey: string, dismissalType: 'done' | 'skipped', year?: number) {
    const response = await this.fetchWithTimeout('/api/grow/task-dismissals', {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        taskKey,
        dismissalType,
        year: year || new Date().getFullYear()
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to dismiss task');
    }

    return response.json();
  }

  async getWeeklyTasks(month: number, week: number) {
    const url = new URL(`${API_BASE}/user/tasks/weekly`);
    url.searchParams.set('month', month.toString());
    url.searchParams.set('week', week.toString());

    console.log(`📡 Fetching weekly tasks: ${url.toString()}`);
    
    const response = await this.fetchWithAuth(url.toString(), {
      headers: this.getHeaders(true), // Requires auth
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      console.error(`❌ Weekly tasks error (${response.status}):`, error);
      throw new Error(error.error || error.message || 'Failed to fetch weekly tasks');
    }

    const data = await response.json();
    console.log('📡 Weekly tasks data:', data);
    return data;
  }

  async markTaskComplete(plantSlug: string, taskCode: string, year: number, month: number, week: number, notes?: string) {
    const response = await this.fetchWithAuth(`${API_BASE}/user/tasks/complete`, {
      method: 'POST',
      headers: this.getHeaders(true), // Requires auth
      body: JSON.stringify({ plantSlug, taskCode, year, month, week, notes }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to mark task complete');
    }

    return response.json();
  }

  async unmarkTaskComplete(plantSlug: string, taskCode: string, year: number, month: number, week: number) {
    const response = await this.fetchWithAuth(`${API_BASE}/user/tasks/complete`, {
      method: 'DELETE',
      headers: this.getHeaders(true), // Requires auth
      body: JSON.stringify({ plantSlug, taskCode, year, month, week }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to unmark task');
    }

    return response.json();
  }

  async getTaskCompletionsByWeek(year: number, month: number, week: number) {
    const url = new URL(`${API_BASE}/user/tasks/completions`);
    url.searchParams.set('year', year.toString());
    url.searchParams.set('month', month.toString());
    url.searchParams.set('week', week.toString());

    console.log(`📡 Fetching completions: ${url.toString()}`);

    const response = await this.fetchWithAuth(url.toString(), {
      headers: this.getHeaders(true), // Requires auth
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      console.error(`❌ Completions error (${response.status}):`, error);
      throw new Error(error.error || error.message || 'Failed to fetch completions');
    }

    const data = await response.json();
    console.log('📡 Completions data:', data);
    return data;
  }

  async getTaskCompletionStats(year?: number) {
    const url = new URL(`${API_BASE}/user/tasks/stats`);
    if (year) {
      url.searchParams.set('year', year.toString());
    }

    const response = await this.fetchWithTimeout(url.toString(), {
      headers: this.getHeaders(true), // Requires auth
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to fetch stats');
    }

    return response.json();
  }

  async getUserPlants() {
    try {
      console.log('📡 [API] getUserPlants: Fetching plants...');
      const token = localStorage.getItem('access_token');
      console.log('📡 [API] Auth token present:', !!token);
      
      const response = await this.fetchWithAuth(GROW_PLANTS_API_BASE, {
        headers: this.getHeaders(true), // Require auth to get user-specific plants
      }, 15000);

      console.log('📡 [API] Response status:', response.status);

      if (!response.ok) {
        let errorPayload: Record<string, unknown> | null = null;
        let errorText = '';
        try {
          errorText = await response.text();
          errorPayload = errorText ? JSON.parse(errorText) : null;
        } catch (_parseError) {
          // keep original text for logging, fall through to fallback handling
        }

        console.error('📡 [API] getUserPlants error:', response.status, errorText || '<no-body>');

        if (response.status === 401) {
          throw new Error('Not authenticated');
        }

        if (response.status >= 500) {
          console.warn('📡 [API] getUserPlants fallback: treating 5xx as empty garden');
          return { plants: [], onboardingCompleted: false } satisfies GrowPlantsResponse;
        }

        const message = typeof errorPayload?.error === 'string'
          ? errorPayload.error
          : `Service unavailable (${response.status})`;
        throw new Error(message);
      }

      const data = await response.json() as GrowPlantsResponse;
      console.log('📡 [API] getUserPlants response:', data);
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('📡 [API] getUserPlants exception:', message);

      if (typeof message === 'string') {
        const normalized = message.toLowerCase();
        if (normalized.includes('timed out') || normalized.includes('network') || normalized.includes('failed to fetch')) {
          console.warn('📡 [API] getUserPlants fallback: treating network issue as empty garden');
          return { plants: [], onboardingCompleted: false } satisfies GrowPlantsResponse;
        }
      }

      throw error instanceof Error ? error : new Error(message);
    }
  }

  async completeOnboarding(payload: Record<string, unknown> = {}) {
    const response = await this.fetchWithAuth(GROW_ONBOARDING_COMPLETE_API, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to update onboarding status');
    }

    return response.json();
  }

  async addPlant(plantData: any) {
    const response = await this.fetchWithAuth(GROW_PLANTS_API_BASE, {
      method: 'POST',
      headers: this.getHeaders(true), // Requires auth
      body: JSON.stringify(plantData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to add plant');
    }

    return response.json();
  }

  async bulkAddPlants(plants: any[]) {
    try {
      console.log('📡 [API] bulkAddPlants: Adding', plants.length, 'plants...');
      console.log('📡 [API] First plant:', plants[0]);
      
      const response = await this.fetchWithAuth(`${GROW_PLANTS_API_BASE}/bulk`, {
        method: 'POST',
        headers: this.getHeaders(true), // Requires auth
        body: JSON.stringify({ plants }),
      });

      console.log('📡 [API] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('📡 [API] bulkAddPlants error:', response.status, error);
        throw new Error(error.error || 'Failed to add plants');
      }

      const data = await response.json();
      console.log('📡 [API] bulkAddPlants response:', data);
      return data;
    } catch (error: any) {
      console.error('📡 [API] bulkAddPlants exception:', error.message || error);
      throw error;
    }
  }

  async searchPlantSpecies(params: {
    query?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlantSpeciesSearchResponse> {
    const searchParams = new URLSearchParams();

    if (params.query && params.query.trim().length > 0) {
      searchParams.set('q', params.query.trim());
    }

    if (params.category && params.category.trim().length > 0) {
      searchParams.set('category', params.category.trim());
    }

    if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
      searchParams.set('limit', Math.max(1, Math.min(50, Math.floor(params.limit))).toString());
    }

    if (typeof params.offset === 'number' && Number.isFinite(params.offset)) {
      searchParams.set('offset', Math.max(0, Math.floor(params.offset)).toString());
    }

    const url = searchParams.size > 0
      ? `${GROW_SPECIES_API_BASE}?${searchParams.toString()}`
      : GROW_SPECIES_API_BASE;

    const response = await this.fetchWithTimeout(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to search plant species');
    }

    return response.json() as Promise<PlantSpeciesSearchResponse>;
  }

  async getPlantCategories(): Promise<PlantSpeciesCategoriesResponse> {
    const response = await this.fetchWithTimeout(`${GROW_SPECIES_API_BASE}/categories`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Failed to load plant categories');
    }

    return response.json() as Promise<PlantSpeciesCategoriesResponse>;
  }

  async getPlantSpeciesByName(name: string): Promise<PlantSpecies | null> {
    try {
      const encodedName = encodeURIComponent(name.trim());
      const response = await this.fetchWithTimeout(`${GROW_SPECIES_API_BASE}/${encodedName}`, {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Failed to load plant species');
      }

      const data = await response.json();
      return data.species as PlantSpecies;
    } catch (error) {
      console.error('Failed to fetch plant species by name:', error);
      return null;
    }
  }

  async getPlantSpeciesBatch(names: string[]): Promise<Map<string, PlantSpecies>> {
    const results = new Map<string, PlantSpecies>();
    
    const uniqueNames = [...new Set(names.map(n => n.trim().toLowerCase()))];
    
    if (uniqueNames.length === 0) {
      return results;
    }

    try {
      // Use batch endpoint for efficiency (single request instead of N requests)
      const response = await this.fetchWithTimeout(`${GROW_SPECIES_API_BASE}/batch`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ names: uniqueNames }),
      });

      if (!response.ok) {
        console.error('Batch species fetch failed, falling back to individual requests');
        // Fallback to individual requests if batch fails
        const fetchPromises = uniqueNames.map(async (name) => {
          const species = await this.getPlantSpeciesByName(name);
          if (species) {
            results.set(name, species);
          }
        });
        await Promise.all(fetchPromises);
        return results;
      }

      const data = await response.json() as { species: Record<string, PlantSpecies>; notFound: string[] };
      
      // Populate results map
      for (const [name, species] of Object.entries(data.species)) {
        results.set(name, species);
      }

      if (data.notFound.length > 0) {
        console.log('🌱 [Species] Not found:', data.notFound);
      }

      return results;
    } catch (error) {
      console.error('Batch species fetch error:', error);
      // Fallback to individual requests on error
      const fetchPromises = uniqueNames.map(async (name) => {
        const species = await this.getPlantSpeciesByName(name);
        if (species) {
          results.set(name, species);
        }
      });
      await Promise.all(fetchPromises);
      return results;
    }
  }

  async deletePlant(plantId: string) {
    try {
      console.log('📡 [API] deletePlant: Deleting plant', plantId);
      const token = localStorage.getItem('access_token');
      console.log('📡 [API] Auth token present:', !!token);
      
      const response = await this.fetchWithAuth(`${GROW_PLANTS_API_BASE}/${plantId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true), // Requires auth
      });

      console.log('📡 [API] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('📡 [API] deletePlant error:', response.status, error);
        throw new Error(error.error || 'Failed to delete plant');
      }

      const data = await response.json();
      console.log('📡 [API] deletePlant response:', data);
      return data;
    } catch (error: any) {
      console.error('📡 [API] deletePlant exception:', error.message || error);
      throw error;
    }
  }

  async updatePlant(plantId: string, updates: any) {
    try {
      const response = await this.fetchWithAuth(`${GROW_PLANTS_API_BASE}/${plantId}`, {
        method: 'PUT',
        headers: this.getHeaders(true), // Requires auth
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Failed to update plant');
      }

      return response.json();
    } catch (error: any) {
      console.error('❌ Update plant error:', error.message || error);
      throw error;
    }
  }

  async getGardenTimeline() {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/garden/timeline`, {
        headers: this.getHeaders(false), // Can work without auth
      }, 5000);

      if (!response.ok) {
        throw new Error('Service unavailable');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  async getGardenAlerts(lat?: number, lon?: number) {
    try {
      // Use local Next.js API route (not edge function)
      const url = new URL('/api/garden/alerts', window.location.origin);
      if (lat !== undefined && lon !== undefined) {
        url.searchParams.set('lat', lat.toString());
        url.searchParams.set('lon', lon.toString());
      }

      const response = await this.fetchWithTimeout(url.toString(), {
        headers: this.getHeaders(false),
      }, 5000);

      if (!response.ok) {
        throw new Error('Service unavailable');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  async getPlantingCalendar(lat?: number, lon?: number) {
    try {
      // Use local Next.js API route (not edge function)
      const url = new URL('/api/grow/planting-calendar', window.location.origin);
      if (lat !== undefined && lon !== undefined) {
        url.searchParams.set('lat', lat.toString());
        url.searchParams.set('lon', lon.toString());
      }

      const response = await this.fetchWithTimeout(url.toString(), {
        headers: this.getHeaders(true), // Requires auth
      }, 5000);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Service unavailable' }));
        throw new Error(errorData.error || 'Service unavailable');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  // Unit preferences
  async getUserPreferences() {
    try {
      // Check if user is authenticated first
      const token = localStorage.getItem('access_token');
      if (!token) {
        // Return default if not authenticated
        return { unitSystem: null, preferences: {} };
      }

      const response = await this.fetchWithTimeout(`${API_BASE}/user/preferences`, {
        headers: this.getHeaders(true), // Requires auth
      }, 5000);

      if (!response.ok) {
        // If unauthorized, just return null (not an error)
        if (response.status === 401) {
          return { unitSystem: null, preferences: {} };
        }
        throw new Error('Service unavailable');
      }

      return response.json();
    } catch (_error) {
      // Return default if not authenticated or service unavailable
      return { unitSystem: null, preferences: {} };
    }
  }

  async updateUserPreferences(unitSystem: 'imperial' | 'metric') {
    try {
      // Check if user is authenticated first
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await this.fetchWithTimeout(`${API_BASE}/user/preferences`, {
        method: 'PUT',
        headers: this.getHeaders(true), // Requires auth
        body: JSON.stringify({ unitSystem }),
      }, 5000);

      if (!response.ok) {
        // If unauthorized, throw specific error
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error('Service unavailable');
      }

      return response.json();
    } catch (error) {
      // Re-throw to let caller handle
      throw error;
    }
  }

  // ========================================
  // PLANT TASK RPC FUNCTIONS
  // ========================================

  /**
Get tasks for a specific user and month using the Supabase RPC function
@param userId - The user's ID (from auth)
@param month - Month number (1-12)
@returns Array of tasks with plant and climate zone information
   */
  async getTasksForUserMonth(userId: string, month: number) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!month || month < 1 || month > 12) {
      throw new Error('Valid month (1-12) is required');
    }

    try {
      console.log(`🌱 API: Getting tasks for userId=${userId}, month=${month}`);
      const token = localStorage.getItem('access_token');
      console.log(`🔑 API: Auth token present: ${!!token}`);
      
      const response = await this.fetchWithTimeout(`${API_BASE}/plant-tasks/month`, {
        method: 'POST',
        headers: this.getHeaders(true), // Requires auth
        body: JSON.stringify({ userId, month }),
      }, 10000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
        console.error(`❌ API: Task fetch failed (${response.status}):`, error);
        throw new Error(error.error || 'Failed to fetch tasks');
      }

      return response.json();
    } catch (error: any) {
      console.error('❌ Get tasks for month error:', error.message || error);
      throw error;
    }
  }

  /**
Mark a task as completed
@param userId - The user's ID
@param plantSlug - The plant slug (e.g., 'lettuce-looseleaf')
@param taskCode - The task code (e.g., 'sow_outdoors')
@param notes - Optional completion notes
   */
  async completeTask(userId: string, plantSlug: string, taskCode: string, notes?: string) {
    if (!userId || !plantSlug || !taskCode) {
      throw new Error('User ID, plant slug, and task code are required');
    }

    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/plant-tasks/complete`, {
        method: 'POST',
        headers: this.getHeaders(true), // Requires auth
        body: JSON.stringify({ userId, plantSlug, taskCode, notes }),
      }, 5000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
        throw new Error(error.error || 'Failed to complete task');
      }

      return response.json();
    } catch (error: any) {
      console.error('❌ Complete task error:', error.message || error);
      throw error;
    }
  }

  /**
Get all task completions for a user
@param userId - The user's ID
   */
  async getTaskCompletions(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      console.log(`📋 API: Getting completions for userId=${userId}`);
      const token = localStorage.getItem('access_token');
      console.log(`🔑 API: Auth token present: ${!!token}`);
      
      const response = await this.fetchWithTimeout(`${API_BASE}/plant-tasks/completions`, {
        method: 'POST',
        headers: this.getHeaders(true), // Requires auth
        body: JSON.stringify({ userId }),
      }, 5000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
        console.error(`❌ API: Completions fetch failed (${response.status}):`, error);
        throw new Error(error.error || 'Failed to fetch completions');
      }

      return response.json();
    } catch (error: any) {
      console.error('❌ Get completions error:', error.message || error);
      throw error;
    }
  }

  /**
Delete a task completion
@param completionId - The completion ID to delete
   */
  async deleteTaskCompletion(completionId: string) {
    if (!completionId) {
      throw new Error('Completion ID is required');
    }

    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/plant-tasks/completions/${completionId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true), // Requires auth
      }, 5000);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Service unavailable' }));
        throw new Error(error.error || 'Failed to delete completion');
      }

      return response.json();
    } catch (error: any) {
      console.error('❌ Delete completion error:', error.message || error);
      throw error;
    }
  }
}

export const api = new ApiClient();