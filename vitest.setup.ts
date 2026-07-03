import '@testing-library/jest-dom/vitest';

// Ensure all tests run in mock mode — no real API calls, no cost.
process.env.USE_MOCKS = 'true';
process.env.NODE_ENV = 'test';
