import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Ensure all tests run in mock mode — no real API calls, no cost.
// (Vitest already sets NODE_ENV=test.)
process.env.USE_MOCKS = 'true';

// Mock `server-only` — it throws outside React Server Components context.
// In tests, we import server modules directly which is safe.
vi.mock('server-only', () => ({}));
