import '@testing-library/jest-dom/vitest';

// Ensure all tests run in mock mode — no real API calls, no cost.
// (Vitest already sets NODE_ENV=test.)
process.env.USE_MOCKS = 'true';
