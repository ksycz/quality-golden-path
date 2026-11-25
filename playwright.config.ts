// Playwright settings for two kinds of tests against the real server:
//   smoke (npm run smoke): API calls only, no browser download. Fast proof the service starts and answers.
//   e2e   (npm run e2e):   a real Chromium on the transfer page, the customer's view of each risk.
import { defineConfig, devices } from '@playwright/test';

const port = 4310;

export default defineConfig({
  forbidOnly: !!process.env.CI,   // a stray test.only must never pass CI
  retries: 0,                     // a flaky test is a bug to fix, not to retry
  fullyParallel: true,            // every test has its own customer, so tests in one file can run at once
  // In CI, the HTML report is kept too; the workflow uploads it with the traces when a test fails.
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // A failed test keeps a trace: each step with the page, network and console. Open it with npx playwright show-trace.
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'smoke', testDir: 'smoke', testMatch: '*.smoke.ts' },
    { name: 'e2e', testDir: 'e2e', testMatch: '*.e2e.ts', use: { ...devices['Desktop Chrome'] } },
  ],
  // Start the real server before the tests and stop it after.
  webServer: {
    command: 'node src/server.ts',
    url: `http://127.0.0.1:${port}/health`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
