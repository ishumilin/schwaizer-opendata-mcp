import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Only measure coverage for application source
      include: ['src/**/*.js'],
      // Exclude entrypoint and integration-heavy adapters not exercised by unit tests
      exclude: [
        'node_modules/**',
        'coverage/**',
        'src/index.js',
        'src/api/ckan-client.js',
      ],
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 45,
        statements: 80,
      },
    },
    setupFiles: ['./tests/setup.js'],
  },
});
