# Testing Setup Guide

## Overview
This guide explains the testing infrastructure for the WotNow Findr API, including mocking strategies, test fixtures, and best practices.

## Architecture

### 1. Mock System (`__mocks__/`)

#### Supabase Mock (`__mocks__/@supabase/supabase-js.ts`)
- Provides a complete mock of the Supabase client
- Includes mocked methods for: queries, auth, storage, RPC
- All query methods are chainable
- Default responses can be overridden per test

**Key Features:**
- `createClient()` - Returns mock Supabase client
- `mockSupabaseQuery()` - Helper to set mock data for specific tables
- `resetSupabaseMocks()` - Clears all mock state

**Usage:**
```typescript
import { mockSupabaseClient, mockSupabaseQuery } from '__mocks__/@supabase/supabase-js';

// Mock a query response
mockSupabaseQuery('findr_species', mockSpeciesData);

// Access the mock
expect(mockSupabaseClient.from).toHaveBeenCalledWith('findr_species');
```

### 2. Test Fixtures (`__tests__/fixtures/`)

#### Mock Data (`mockData.ts`)
Contains realistic test data for all entities:
- `mockSpecies` - Species data (COD, BSS, MAC)
- `mockTechniques` - Fishing techniques with effectiveness scores
- `mockBait` - Bait types with effectiveness scores
- `mockSubstrates` - Substrate preferences
- `mockPredictions` - Bite predictions with scores
- `mockRectangle` - Geographic rectangle data
- `mockUser` - Test user data
- `mockSession` - Authentication session
- `mockCatchLog` - Catch log entries

**Usage:**
```typescript
import { mockSpecies, mockPredictions } from '__tests__/fixtures/mockData';

// Use in tests
mockSupabaseQuery('findr_species', mockSpecies.COD);
```

### 3. Test Helpers (`__tests__/helpers/`)

#### Test Utilities (`testHelpers.ts`)
Provides common testing utilities:

**Authentication Helpers:**
- `mockAuthenticatedSession()` - Mock logged-in user
- `mockUnauthenticatedSession()` - Mock logged-out state

**Query Helpers:**
- `mockQueryResponse()` - Mock successful query
- `mockQueryError()` - Mock query error
- `resetAllMocks()` - Reset all mocks to defaults

**Request Helpers:**
- `createMockRequestWithAuth()` - Create request with auth headers

**Usage:**
```typescript
import { mockAuthenticatedSession, mockQueryResponse } from '__tests__/helpers/testHelpers';

beforeEach(() => {
  mockAuthenticatedSession();
  mockQueryResponse('findr_predictions', mockPredictions);
});
```

## Test Structure

### Standard Test Pattern

```typescript
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/findr/[endpoint]';
import { mockSupabaseClient, mockSupabaseQuery } from '__mocks__/@supabase/supabase-js';
import { mockData } from '__tests__/fixtures/mockData';
import { resetAllMocks, mockAuthenticatedSession } from '__tests__/helpers/testHelpers';

// Mock modules
jest.mock('@supabase/supabase-js');
jest.mock('../../../lib/supabase/serverClient', () => ({
  getSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

describe('API Endpoint Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    // Setup mocks for this test suite
  });

  it('should handle valid request', async () => {
    // Arrange: Setup mocks
    mockSupabaseQuery('table_name', mockData);
    
    // Act: Make request
    const { req, res } = createMocks({
      method: 'POST',
      body: { /* data */ },
    });
    await handler(req, res);
    
    // Assert: Check response
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('expected_field');
  });
});
```

## Test Categories

### 1. Validation Tests
Test parameter validation and error handling:
```typescript
it('should return 400 for missing parameters', async () => {
  const { req, res } = createMocks({
    method: 'POST',
    body: {}, // Empty body
  });
  
  await handler(req, res);
  
  expect(res._getStatusCode()).toBe(400);
  expect(JSON.parse(res._getData())).toHaveProperty('error');
});
```

### 2. Authentication Tests
Test auth requirements:
```typescript
it('should require authentication', async () => {
  mockUnauthenticatedSession();
  
  const { req, res } = createMocks({
    method: 'POST',
    body: validData,
  });
  
  await handler(req, res);
  
  expect(res._getStatusCode()).toBe(401);
});
```

### 3. Data Retrieval Tests
Test successful data retrieval:
```typescript
it('should return data for valid request', async () => {
  mockSupabaseQuery('findr_species', mockSpecies.COD);
  
  const { req, res } = createMocks({
    method: 'GET',
    query: { species_code: 'COD' },
  });
  
  await handler(req, res);
  
  expect(res._getStatusCode()).toBe(200);
  const data = JSON.parse(res._getData());
  expect(data.species_code).toBe('COD');
});
```

### 4. Error Handling Tests
Test error scenarios:
```typescript
it('should handle database errors gracefully', async () => {
  mockSupabaseQuery('findr_species', null, {
    message: 'Connection error',
    code: '500',
  });
  
  const { req, res } = createMocks({
    method: 'GET',
    query: { species_code: 'COD' },
  });
  
  await handler(req, res);
  
  expect(res._getStatusCode()).toBe(500);
});
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npx jest __tests__/api/findr/predictions.api.test.ts
```

### Watch Mode
```bash
npm test -- --watch
```

### With Coverage
```bash
npm test -- --coverage
```

### Single Test Suite
```bash
npx jest __tests__/api/findr/ --runInBand
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach()` to reset mocks
- Don't rely on test execution order

### 2. Descriptive Test Names
```typescript
// Good
it('should return 404 when species code does not exist', async () => {});

// Bad
it('test species endpoint', async () => {});
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should do something', async () => {
  // Arrange: Setup
  mockSupabaseQuery('table', data);
  
  // Act: Execute
  const { req, res } = createMocks({...});
  await handler(req, res);
  
  // Assert: Verify
  expect(res._getStatusCode()).toBe(200);
});
```

### 4. Mock Granularity
- Mock at the module boundary (Supabase client)
- Don't mock internal business logic
- Use realistic test data

### 5. Test Coverage Goals
- **API Routes**: Aim for 80%+ coverage
- Cover: success cases, validation, errors, edge cases
- Don't test: external API internals, library code

## Debugging Tests

### View Mock Calls
```typescript
console.log(mockSupabaseClient.from.mock.calls);
console.log(mockSupabaseClient.auth.getSession.mock.calls);
```

### Debug Response
```typescript
const data = JSON.parse(res._getData());
console.log('Response:', data);
console.log('Status:', res._getStatusCode());
console.log('Headers:', res._getHeaders());
```

### Run Single Test
```bash
npx jest -t "should return predictions for valid rectangleCode"
```

## Common Issues & Solutions

### Issue: Mock not being used
**Solution**: Ensure mock is defined before importing the module
```typescript
jest.mock('@supabase/supabase-js'); // Must be before handler import
import handler from '../../../pages/api/findr/endpoint';
```

### Issue: Authentication failing in tests
**Solution**: Use `mockAuthenticatedSession()` helper
```typescript
beforeEach(() => {
  mockAuthenticatedSession();
});
```

### Issue: Query not returning expected data
**Solution**: Setup mock for specific table
```typescript
mockSupabaseQuery('findr_predictions', mockPredictions);
```

### Issue: Tests passing locally but failing in CI
**Solution**: 
- Check environment variables in `jest.setup.js`
- Ensure `resetAllMocks()` in `beforeEach()`
- Use `--runInBand` flag for serial execution

## Adding New Tests

### 1. Create Test File
```bash
touch __tests__/api/findr/new-endpoint.api.test.ts
```

### 2. Add Mock Data
```typescript
// In __tests__/fixtures/mockData.ts
export const mockNewEntity = {
  id: 'test-id',
  field: 'value',
};
```

### 3. Write Tests
Follow the standard test pattern above

### 4. Run Tests
```bash
npx jest __tests__/api/findr/new-endpoint.api.test.ts
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:
```yaml
# .github/workflows/test.yml
- name: Run API Tests
  run: npm test -- __tests__/api/
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [node-mocks-http](https://github.com/howardabrams/node-mocks-http)
- [Testing Next.js API Routes](https://nextjs.org/docs/testing)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/testing)

## Maintenance

### Updating Mock Data
When API structure changes:
1. Update fixtures in `__tests__/fixtures/mockData.ts`
2. Update mock implementations in `__mocks__/@supabase/supabase-js.ts`
3. Update relevant tests
4. Run full test suite to verify

### Adding New Endpoints
1. Create test file
2. Add mock data if needed
3. Write tests following patterns
4. Update this guide if new patterns emerge
