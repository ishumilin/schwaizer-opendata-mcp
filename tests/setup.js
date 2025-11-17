import { afterEach, vi } from 'vitest';

// Keep logs quiet and avoid pretty transport during tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Align with src/config.js expectations
process.env.BASE_URL = process.env.BASE_URL || 'https://opendata.swiss/api/3/action';
process.env.TIMEOUT_MS = process.env.TIMEOUT_MS || '15000';
process.env.ENABLE_SQL = process.env.ENABLE_SQL || 'false';
process.env.MAX_ROWS = process.env.MAX_ROWS || '1000';
process.env.DEFAULT_ROWS = process.env.DEFAULT_ROWS || '25';

// Generic cleanup between tests
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
