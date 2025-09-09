// eslint.config.js - proper configuration for ESLint 9.x using flat config
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Create a compatibility instance with specific paths for Next.js
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended
});

// Create TypeScript parser config, scoped to TS files only
const typescript = tseslint.config({
  files: ['**/*.ts', '**/*.tsx'],
  extends: [
    ...tseslint.configs.recommended,
  ],
});

export default [
  // Ignore build and vendor directories
  { ignores: [
    '**/.next/**',
    '**/node_modules/**',
    '**/.vercel/**',
    '**/dist/**',
    '**/build/**',
    '**/public/**',
    'next-env.d.ts',
    'debug-*.js',
    'img-optimizer/**',
    'services/astro_highlights/astro_highlights/.venv/**',
    'api/python/.venv/**',
  ]},
  // Include recommended JS config
  js.configs.recommended,
  
  // Apply TypeScript configuration
  ...typescript,
  
  // Convert eslint-config-next to flat config format
  ...compat.extends('eslint-config-next'),
  
  // General JS/JSX rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react/no-unescaped-entities': 'off',
      'react/react-in-jsx-scope': 'off',
    },
    settings: { react: { version: 'detect' } },
    linterOptions: { reportUnusedDisableDirectives: true },
  },
  // TS-specific rules
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
