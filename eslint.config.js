// @ts-check
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: ['dist/**', 'bundles/**', 'node_modules/**', 'coverage/**', '*.config.js'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Pattern 2's whole guarantee depends on validators being pure, browser-safe functions —
    // no server-only imports allowed, since these files get bundled and run in the browser.
    files: ['src/validators/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs', message: 'validators/** must be browser-safe: no fs access.' },
            { name: 'node:fs', message: 'validators/** must be browser-safe: no fs access.' },
            { name: 'path', message: 'validators/** must be browser-safe: no path access.' },
            { name: 'node:path', message: 'validators/** must be browser-safe: no path access.' },
          ],
          patterns: [
            {
              group: ['../db/*', '../../db/*', '**/knex*', '**/config/env*'],
              message: 'validators/** must be browser-safe: no db or process.env access.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'validators/** must be browser-safe: no process.env access.' },
      ],
    },
  },
);
