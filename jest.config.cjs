// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './', // path to your Next.js app
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jsdom',
  // Prevent Jest from creating babel config files
  transform: {},
  // Use Next.js built-in SWC transforms
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // Exclude E2E tests, fixtures, and helpers (should only run with Playwright).
  // `.claude/worktrees/` holds full checkouts of this repo created for agent
  // worktree sessions. Without this, Jest discovers and runs every test twice —
  // once here and once in each stale worktree copy — so a suite fixed on main
  // still reports failures from an old checkout, and the counts are doubled.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/.next/',
    '/.claude/worktrees/',
    '/__tests__/fixtures/',
    '/__tests__/helpers/',
  ],
}

module.exports = createJestConfig(customJestConfig)