// eslint.config.js - proper configuration for ESLint 9.x using flat config
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Create a compatibility instance with specific paths for Next.js
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended
});

// Create TypeScript parser config
const typescript = tseslint.config(
  // Add TypeScript specific configuration
  tseslint.configs.recommended
);

export default [
  // Include recommended JS config
  js.configs.recommended,
  
  // Apply TypeScript configuration
  ...typescript,
  
  // Convert eslint-config-next to flat config format
  ...compat.extends('eslint-config-next'),
  
  // Custom rules for your project
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Disable rules that might cause issues with your existing code
      'react/no-unescaped-entities': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-explicit-any': 'warn', // Downgrade from error to warning
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
];
