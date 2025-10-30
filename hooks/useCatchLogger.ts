import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type {
  CatchLogInput,
  CatchLogRequest,
  CatchLogResponse,
  LogCatchEnrichedResponse,
  UseCatchLoggerOptions,
  CatchLoggerTelemetryEvent,
} from '@/types/findr-enrichment';

export type { CatchLogInput };

interface CatchLoggerState {
  loading: boolean;
  error: Error | null;
  response: CatchLogResponse | null;
}

type LogCatchResult = CatchLogResponse;

export interface UseCatchLoggerResult {
  logCatch: (input: CatchLogInput) => Promise<LogCatchResult | null>;
  reset: () => void;
  loading: boolean;
  error: Error | null;
  response: CatchLogResponse | null;
}

export interface UseQuickCatchLogResult extends UseCatchLoggerResult {
  quickLog: (input: QuickLogParams) => Promise<LogCatchResult | null>;
}

export type QuickLogParams = {
  speciesId: string;
  speciesCommonName: string;
  scientificName?: string | null;
  rectangleCode: string;
  quantity: number;
  photo?: File | Blob | null;
  userLocation?: { lat: number; lon: number };
};

/**
 * React hook to submit enriched catch logs through the API route.
 * Handles FormData construction, Supabase token resolution, and response normalisation.
 */
export function useCatchLogger(options: UseCatchLoggerOptions = {}): UseCatchLoggerResult {
  const [state, setState] = useState<CatchLoggerState>({
    loading: false,
    error: null,
    response: null,
  });
  const telemetryRef = useRef<UseCatchLoggerOptions['onTelemetry']>(options.onTelemetry);
  const authStateRef = useRef<{ anonymous: boolean; provider: string | null; userId: string | null }>({
    anonymous: false,
    provider: null,
    userId: null,
  });
  const telemetryContext = options.telemetryContext ?? 'catch_logger';
  const errorSurface = options.errorSurface ?? (options.onError ? 'unknown' : 'silent');
  const errorVisible = typeof options.onError === 'function';

  useEffect(() => {
    telemetryRef.current = options.onTelemetry;
  }, [options.onTelemetry]);

  const emitTelemetry = useCallback(
    (event: CatchLoggerTelemetryEvent) => {
      telemetryRef.current?.({
        ...event,
        context: event.context ?? telemetryContext,
      });
    },
    [telemetryContext]
  );

  const markTelemetryLogged = (error: Error) => {
    (error as Error & { __catchLoggerTelemetry?: boolean }).__catchLoggerTelemetry = true;
  };

  const hasTelemetryLogged = (error: Error) =>
    (error as Error & { __catchLoggerTelemetry?: boolean }).__catchLoggerTelemetry === true;

  const resolveAccessToken = useCallback(async () => {
    authStateRef.current = { anonymous: false, provider: null, userId: null };

    if (options.resolveAccessToken) {
      const resolved = await options.resolveAccessToken();
      if (!resolved) {
        emitTelemetry({ type: 'auth_missing', reason: 'resolver_returned_null' });
      }
      return resolved;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[useCatchLogger] Failed to get Supabase session:', error.message);
      emitTelemetry({ type: 'auth_missing', reason: 'session_unavailable', context: telemetryContext });
      return null;
    }

    const session = data.session;
    if (!session) {
      return null;
    }

    const anonymous = isSupabaseAnonymousUser(session.user);
    const provider = getSupabaseAuthProvider(session.user);
    const userId = typeof session.user?.id === 'string' ? session.user.id : null;
    authStateRef.current = { anonymous, provider, userId };

    if (anonymous) {
      emitTelemetry({
        type: 'auth_anonymous',
        userId: session.user?.id ?? null,
        provider,
      });
    }

    return session.access_token ?? null;
  }, [options, emitTelemetry, telemetryContext]);

  const logCatch = useCallback(
    async (input: CatchLogInput): Promise<LogCatchResult | null> => {
      setState({ loading: true, error: null, response: null });

      try {
        const token = await resolveAccessToken();
        if (!token) {
          const authError = new Error('Authentication required to log catches.');
          emitTelemetry({
            type: 'auth_missing',
            reason: 'no_token',
            anonymous: authStateRef.current.anonymous,
          });
          markTelemetryLogged(authError);
          throw authError;
        }

        const formData = buildFormData(input);

        const response = await fetch('/api/findr/log-catch-enriched', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const message = await safeErrorMessage(response);
          emitTelemetry({
            type: 'api_error',
            status: response.status,
            message,
            visible: errorVisible,
          });
          const apiError = new Error(message);
          markTelemetryLogged(apiError);
          throw apiError;
        }

        const data = (await response.json()) as CatchLogResponse;
        const normalised = normaliseResponse(data);

        setState({ loading: false, error: null, response: normalised });
        options.onSuccess?.(normalised);
        return normalised;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to log catch.');
        setState({ loading: false, error: err, response: null });
        options.onError?.(err);
        emitTelemetry({
          type: 'error_visibility',
          surface: errorSurface,
          visible: errorVisible,
          message: err.message,
        });
        if (err instanceof Error && !hasTelemetryLogged(err)) {
          emitTelemetry({
            type: 'network_error',
            message: err.message,
            visible: errorVisible,
          });
          markTelemetryLogged(err);
        }
        return null;
      }
    },
    [options, resolveAccessToken, emitTelemetry, errorSurface, errorVisible]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null, response: null });
  }, []);

  return useMemo(
    () => ({
      logCatch,
      reset,
      loading: state.loading,
      error: state.error,
      response: state.response,
    }),
    [logCatch, reset, state.error, state.loading, state.response]
  );
}

/**
 * Quick catch logging hook that wraps useCatchLogger with sensible defaults.
 */
export function useQuickCatchLog(options: UseCatchLoggerOptions = {}): UseQuickCatchLogResult {
  const base = useCatchLogger(options);

  const quickLog = useCallback(
    async ({
      speciesId,
      speciesCommonName,
      scientificName,
      rectangleCode,
      quantity,
      photo,
      userLocation,
    }: QuickLogParams) => {
      const now = new Date();
      const catchDate = now.toISOString().split('T')[0];
      const catchTime = now.toISOString().split('T')[1]?.slice(0, 8) ?? null;

      return base.logCatch({
        speciesId,
        speciesCommonName,
        scientificName: scientificName ?? null,
        rectangleCode,
        quantity,
        catchDate,
        catchTime,
        entryType: 'quick',
        sizeCategory: 'mixed',
        baitUsed: 'Quick log - bait not specified',
        method: 'shore',
        photo: photo ?? null,
        userLocation: userLocation ?? null,
      });
    },
    [base]
  );

  return {
    ...base,
    quickLog,
  };
}

function buildFormData(input: CatchLogInput): FormData {
  const formData = new FormData();

  const payload: CatchLogRequest = {
    species_name: input.speciesCommonName, // API expects 'species_name'
    quantity: input.quantity,
    catch_date: input.catchDate,
    catch_time: input.catchTime ?? null,
    species_id: input.speciesId ?? null,
    scientific_name: input.scientificName ?? null,
    rectangle_code: input.rectangleCode ?? null,
    size_category: input.sizeCategory ?? null,
    weight_kg: input.weightKg ?? null,
    length_cm: input.lengthCm ?? null,
    bait_used: input.baitUsed ?? null,
    tackle_used: input.tackleUsed ?? null,
    method: input.method ?? null,
    habitat_type: input.habitatType ?? null,
    depth_range: input.depthRange ?? null,
    notes: input.notes ?? null,
    entry_type: input.entryType ?? 'detailed',
    session_id: input.sessionId ?? null,
    environmental_conditions: input.environmentalConditions ?? undefined,
    user_location: input.userLocation ?? null,
    rectangle_center: input.rectangleCenter ?? null,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (value == null || value === '') continue;
    formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }

  // Note: user_id is extracted from Authorization header by API, not sent in form data

  // Send user location as separate lat/lon fields for API compatibility
  if (input.userLocation) {
    formData.append('user_latitude', String(input.userLocation.lat));
    formData.append('user_longitude', String(input.userLocation.lon));
  }

  if (input.photo) {
    const filename = input.photo instanceof File ? input.photo.name : 'catch-photo.jpg';
    formData.append('photo', input.photo, filename);
  }

  return formData;
}

function normaliseResponse(response: CatchLogResponse): CatchLogResponse {
  const enrichment = response.enrichment ?? {
    has_exif_gps: false,
    depth_found: false,
    substrate_found: false,
    conditions_found: false,
    enrichment_timestamp: new Date().toISOString(),
    depth_meters: null,
    substrate: null,
  };
  const depthMeters = response.catch?.depth_meters ?? enrichment.depth_meters ?? null;
  const substrate = response.catch?.substrate ?? enrichment.substrate ?? null;
  const hasExifGps = Boolean(enrichment.has_exif_gps);
  const conditionsFound = Boolean(enrichment.conditions_found);
  const enrichmentTimestamp = enrichment.enrichment_timestamp;

  return {
    success: response.success,
    message: response.message,
    points_earned: response.points_earned ?? 0,
    enrichment: {
      has_exif_gps: hasExifGps,
      depth_found: depthMeters != null,
      substrate_found: substrate != null,
      conditions_found: conditionsFound,
      enrichment_timestamp: enrichmentTimestamp,
      depth_meters: depthMeters,
      substrate,
    },
    catch: {
      id: response.catch?.id ?? null,
      depth_meters: response.catch?.depth_meters ?? depthMeters,
      substrate: response.catch?.substrate ?? substrate,
    },
    warnings: response.warnings ?? [],
    raw: response.raw ?? (response as unknown as LogCatchEnrichedResponse),
  };
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (body?.error) {
      return body.error;
    }
  } catch (error) {
    console.warn('[useCatchLogger] Failed to parse error payload:', error);
  }

  return `Failed to submit catch (${response.status})`;
}

function getSupabaseAuthProvider(user: unknown): string | null {
  if (!user || typeof user !== 'object' || user === null) {
    return null;
  }

  const candidate = user as { app_metadata?: Record<string, unknown> };
  const provider = candidate.app_metadata?.provider;
  return typeof provider === 'string' ? provider : null;
}

function isSupabaseAnonymousUser(user: unknown): boolean {
  if (!user || typeof user !== 'object' || user === null) {
    return false;
  }

  const candidate = user as { is_anonymous?: boolean };
  if (typeof candidate.is_anonymous === 'boolean') {
    return candidate.is_anonymous;
  }

  const provider = getSupabaseAuthProvider(user);
  return provider === 'anonymous' || provider === 'anon';
}
