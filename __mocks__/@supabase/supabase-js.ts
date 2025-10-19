// __mocks__/@supabase/supabase-js.ts
/**
 * Mock Supabase client for testing
 * This mock provides a basic implementation of the Supabase client
 * that can be customized per test.
 */

interface _MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  contains: jest.Mock;
  containedBy: jest.Mock;
  range: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  then?: jest.Mock;
}

function createMockQueryBuilder() {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    csv: jest.fn().mockResolvedValue({ data: '', error: null }),
    explain: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((resolve) => 
      Promise.resolve({ data: [], error: null }).then(resolve)
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockSupabaseClient: any = {
  from: jest.fn(() => createMockQueryBuilder()),
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test/file.jpg' },
      }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};

export const createClient = jest.fn(() => mockSupabaseClient);

// Helper to reset all mocks
export const resetSupabaseMocks = () => {
  jest.clearAllMocks();
};

// Helper to set mock data for a specific table query
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mockSupabaseQuery = (tableName: string, data: any, error: any = null) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockSupabaseClient.from as any).mockImplementation((table: string) => {
    if (table === tableName) {
      const builder = createMockQueryBuilder();
      builder.single.mockResolvedValue({ data, error });
      builder.maybeSingle.mockResolvedValue({ data, error });
      builder.then = jest.fn((resolve) => {
        return Promise.resolve({ data: Array.isArray(data) ? data : [data], error }).then(resolve);
      });
      return builder;
    }
    return createMockQueryBuilder();
  });
};
