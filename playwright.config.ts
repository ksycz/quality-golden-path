// Playwright settings for the smoke tests (npm run smoke). They call the API directly,
// so no browser is downloaded or started; the end-to-end tests will add one later.
import { defineConfig } from '@playwright/test';

const port = 4310;

export default defineConfig({
  testDir: 'smoke',
  testMatch: '*.smoke.ts',
  forbidOnly: !!process.env.CI,   // a stray test.only must never pass CI
  retries: 0,                     // a flaky smoke test is a bug to fix, not to retry
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://127.0.0.1:${port}` },
  // Start the real server before the tests and stop it after.
  webServer: {
    command: 'node src/server.ts',
    url: `http://127.0.0.1:${port}/health`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
