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

const config = [
  // Ignore build and vendor directories and non-critical debug/scripts
  { ignores: [
    '**/.next/**',
    '**/node_modules/**',
    '**/.vercel/**',
    '**/dist/**',
    '**/build/**',
    '**/public/**',
    'next-env.d.ts',
    'debug-*.js',
    'debug/**',
    'scripts/**',
    'examples/**',
    'final-card-audit.js',
    'img-optimizer/**',
    'services/astro_highlights/astro_highlights/.venv/**',
    'api/python/.venv/**',
    // Ignore config files to avoid parser/sourceType mismatches
    '**/*.config.js',
    '**/*.config.cjs',
    '**/*.config.mjs',
    'next.config.*',
    'postcss.config.js',
    'jest.config.js',
  ]},

  // Include recommended JS config
  js.configs.recommended,
  
  // Apply TypeScript configuration
  ...typescript,
  
  // Convert eslint-config-next to flat config format
  ...compat.extends('eslint-config-next'),
  
  // General JS/JSX/TSX rules
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

export default config;
