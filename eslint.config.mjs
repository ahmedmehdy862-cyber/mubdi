import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  Buffer: 'readonly',
  fetch: 'readonly',
  WebSocket: 'readonly',
  URL: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/spikes/**',
      '**/release/**',
      'out/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // Node scripts and Electron main process.
  {
    files: ['apps/desktop/**/*.{js,cjs}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: nodeGlobals,
      sourceType: 'module',
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // The Electron renderer runs in the Chromium page, not in Node.
  {
    files: ['apps/desktop/renderer.js'],
    languageOptions: {
      globals: browserGlobals,
      sourceType: 'script',
    },
  },
  // CommonJS preload: `require` is the only module system available.
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  // Integration boundaries wrap third-party/OS APIs whose types are `any`.
  // Typed code (core, design-knowledge, schemas) keeps the rule as an error.
  {
    files: [
      'packages/psd-engine/**/*.ts',
      'packages/adapters/**/*.ts',
      'apps/api/**/*.ts',
      'apps/desktop/**/*.js',
      'tests/**/*.ts',
    ],
    rules: { '@typescript-eslint/no-explicit-any': 'warn' },
  },
  // Test and script helpers may swallow best-effort errors.
  {
    files: ['tests/**/*.ts'],
    rules: { 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
];
