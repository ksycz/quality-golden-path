// ESLint settings for `npm run lint`: catches likely bugs and unused code before review.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Generated files are never linted.
  { ignores: ['node_modules/', 'reports/', '.stryker-tmp/', 'test-results/', 'playwright-report/'] },
  // ESLint's recommended JavaScript rules, plus the recommended TypeScript rules.
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // The gate scripts run in Node, so they may use Node's globals.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
);
