// jest.setup.js
import '@testing-library/jest-dom';

// Set up environment variables for tests
process.env.NEXT_PUBLIC_OPENWEATHER_KEY = 'test-key';
process.env.STORMGLASS_SECRET_KEY = 'test-key';

// Supabase environment variables for API tests
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key'; // Used by predictions API
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Stripe environment variables for Stripe API tests
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID = 'price_test123';

// Mock global fetch for all tests
global.fetch = jest.fn();