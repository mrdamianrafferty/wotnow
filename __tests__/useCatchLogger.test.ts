import { act, renderHook } from '@testing-library/react';
import { useCatchLogger } from '@/hooks/useCatchLogger';
import type { CatchLogInput, CatchLoggerTelemetryEvent } from '@/types/findr-enrichment';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('@/lib/supabase/client') as {
  supabase: { auth: { getSession: jest.Mock } };
};

const minimalCatchInput: CatchLogInput = {
  speciesCommonName: 'Sea Bass',
  quantity: 1,
  catchDate: '2024-01-01',
};

describe('useCatchLogger telemetry', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    supabase.auth.getSession.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('emits anonymous auth telemetry and blocks submissions without tokens', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: null,
          user: {
            id: 'anon-user',
            is_anonymous: true,
            app_metadata: { provider: 'anonymous' },
          },
        },
      },
      error: null,
    });

    const telemetry: CatchLoggerTelemetryEvent[] = [];
    const errorSpy = jest.fn();

    const { result } = renderHook(() =>
      useCatchLogger({
        onTelemetry: (event) => telemetry.push(event),
        onError: errorSpy,
        telemetryContext: 'test_context',
        errorSurface: 'toast',
      })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.logCatch(minimalCatchInput);
    });

    expect(response).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));

    expect(telemetry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'auth_anonymous', context: 'test_context' }),
        expect.objectContaining({ type: 'auth_missing', anonymous: true, context: 'test_context' }),
        expect.objectContaining({
          type: 'error_visibility',
          visible: true,
          surface: 'toast',
          context: 'test_context',
        }),
      ])
    );
  });

  it('reports API failures with visibility metadata', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
          user: { id: 'user-123', is_anonymous: false, app_metadata: { provider: 'email' } },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ error: 'Internal failure' }),
    });

    const telemetry: CatchLoggerTelemetryEvent[] = [];
    const errorSpy = jest.fn();

    const { result } = renderHook(() =>
      useCatchLogger({
        onTelemetry: (event) => telemetry.push(event),
        onError: errorSpy,
        telemetryContext: 'test_context',
        errorSurface: 'toast',
      })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.logCatch(minimalCatchInput);
    });

    expect(response).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // user_id is extracted from Authorization header by API, not sent in form data
    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers.Authorization).toBe('Bearer token-123');
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));

    expect(telemetry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'api_error',
          status: 500,
          visible: true,
          context: 'test_context',
        }),
        expect.objectContaining({
          type: 'error_visibility',
          visible: true,
          surface: 'toast',
          context: 'test_context',
        }),
      ])
    );
  });

  it('resolves successful submissions without emitting error telemetry', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-456',
          user: { id: 'user-456', is_anonymous: false, app_metadata: { provider: 'email' } },
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        message: 'Catch logged successfully',
        points_earned: 25,
        enrichment: {
          has_exif_gps: true,
          depth_found: false,
          substrate_found: false,
          depth_meters: null,
          substrate: null,
        },
        catch: { id: 'catch-1', depth_meters: null, substrate: null },
        warnings: [],
        raw: {
          success: true,
          catchId: 'catch-1',
          photoUrl: null,
        },
      }),
    });

    const telemetry: CatchLoggerTelemetryEvent[] = [];
    const successSpy = jest.fn();

    const { result } = renderHook(() =>
      useCatchLogger({
        onTelemetry: (event) => telemetry.push(event),
        onSuccess: successSpy,
        telemetryContext: 'test_context',
        errorSurface: 'toast',
      })
    );

    let response: unknown;
    await act(async () => {
      response = await result.current.logCatch(minimalCatchInput);
    });

    expect(response).toEqual(
      expect.objectContaining({
        success: true,
        points_earned: 25,
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // user_id is extracted from Authorization header by API, not sent in form data
    const fetchOptions = fetchMock.mock.calls[0][1];
    expect(fetchOptions.headers.Authorization).toBe('Bearer token-456');
    expect(successSpy).toHaveBeenCalled();
    expect(telemetry).toHaveLength(0);
  });
});
