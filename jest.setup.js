// jest.setup.js
import '@testing-library/jest-dom';

// Set up environment variables for tests
process.env.NEXT_PUBLIC_OPENWEATHER_KEY = 'test-key';
process.env.STORMGLASS_SECRET_KEY = 'test-key';