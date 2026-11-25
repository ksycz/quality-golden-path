// Vitest settings: which files are tests. Used by `npm test` and by Stryker's mutation runs.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // On GitHub, keep Vitest's failure annotations but not its own Summary report: Stryker runs the
    // tests once per mutant, which would add dozens of reports. scripts/ci-summary.mjs writes one result.
    reporters: process.env.GITHUB_ACTIONS ? ['default', ['github-actions', { jobSummary: { enabled: false } }]] : ['default'],
  },
});
