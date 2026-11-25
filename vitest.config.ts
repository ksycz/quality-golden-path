// Vitest settings: which files are tests. Used by `npm test` and by Stryker's mutation runs.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
