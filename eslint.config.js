import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'reports/', '.stryker-tmp/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Gate scripts run in Node.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
);
