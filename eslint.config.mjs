// eslint.config.mjs - ESLint 9 flat config for Next.js
import { FlatCompat } from '@eslint/eslintrc';

// Create a compatibility instance with specific paths for Next.js
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
  // Ignore build and vendor directories and non-critical debug/scripts
  { ignores: [
    '**/.next/**',
    '**/.claude/**',
    '**/node_modules/**',
    '**/.vercel/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/public/**',
    '**/coverage/**',
    '**/__tests__/**',
    'next-env.d.ts',
    'debug-*.js',
    'debug/**',
    'scripts/**',
    'examples/**',
    'tmp/**',
    'final-card-audit.js',
    'img-optimizer/**',
    'services/astro_highlights/astro_highlights/.venv/**',
    'api/python/.venv/**',
    'datras-fetcher/**',
    // Generated files
    '**/*.generated.ts',
    '**/*.generated.js',
    // Environment and system files
    '**/.env',
    '**/.env.local',
    '**/.env*.local',
    '**/*.log',
    '**/.DS_Store',
    // Ignore config files to avoid parser/sourceType mismatches
    '**/*.config.js',
    '**/*.config.cjs',
    '**/*.config.mjs',
    'next.config.*',
    'postcss.config.js',
    'jest.config.js',
    // WIP catch logging enrichment - has unfinished helper functions
    'lib/findr/generateInsights.ts',
    'pages/api/findr/get-insights.ts',
  ]},

  // Small overrides
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
    settings: { react: { version: 'detect' } },
    linterOptions: { reportUnusedDisableDirectives: true },
  },

  // IMPORTANT: Next.js config must be last so Next detects the plugin
  ...compat.config({
    extends: ['next', 'next/core-web-vitals', 'next/typescript'],
    settings: { next: { rootDir: ['.'] } },
  }),
];

export default eslintConfig;
