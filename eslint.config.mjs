// eslint.config.mjs - ESLint 9 flat config for Next.js
//
// eslint-config-next 16 ships flat configs only. Loading it through
// FlatCompat, as this file did for 15, crashes ESLint before it lints
// anything ("Converting circular structure to JSON"). core-web-vitals
// includes the base `next` config.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  // Ignore build and vendor directories and non-critical debug/scripts
  { ignores: [
    // Superseded code kept for reference — see archive/code/README.md. Not
    // built, not routed, and deliberately not held to the current lint rules.
    'archive/**',
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
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    settings: { next: { rootDir: ['.'] } },
    rules: {
      // eslint-config-next 16 brings eslint-plugin-react-hooks 7, whose new
      // rules are the React Compiler's checks. This app is on React 18 and
      // does not use the compiler. On the Next 16.4 upgrade they raised 176
      // errors in unchanged code — every one a compiler concern, the one that
      // looked like a bug (shared-login.tsx, "accessed before declared") is
      // an effect calling a function defined below it, which is fine at
      // runtime. Off, to keep lint exactly as strict as it was on Next 16.0;
      // turning them on is a job of its own, rule by rule.
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',
      // New in 16.4 too. The eight hits are deliberate full reloads (error
      // boundary, push-notification taps, sign-out), not client navigations.
      '@next/next/no-location-assign-relative-destination': 'off',
    },
  },
];

export default eslintConfig;
