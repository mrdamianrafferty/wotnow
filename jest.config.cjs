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
  /**
   * Restart a worker once it has grown past this, because they leak.
   *
   * `npx jest` failed intermittently with a SIGSEGV in a worker process — a
   * different, unrelated suite each run (`growHreflang`, `PollenWarning`,
   * `criterionDirection`), never reproducible on its own, and never in CI.
   *
   * The clue was that FEWER workers made it WORSE: measured over three runs
   * each, 9 workers crashed 0/3, 6 workers 0/3, and 4 workers 2/3. That
   * inverts the obvious explanation. Contention between workers would get
   * better as you remove them; accumulation INSIDE one gets worse, because
   * every worker you take away hands the survivors more suites to run in the
   * same process.
   *
   * `--logHeapUsage` on a single worker shows it plainly. The heap starts at
   * 143 MB and finishes at about 770 MB, roughly 6 MB a suite, never released:
   *
   *     callLocationSheet.test.tsx   143 MB
   *     callDaylight.test.ts         208 MB
   *     ...
   *     unifiedWeather.moon.test.ts  769 MB
   *
   * Every suite runs in `jsdom`, including the many that touch no DOM at all,
   * and a jsdom environment is not free to stand up or to tear down. Recycling
   * the worker is the cheap fix; giving the pure-logic suites the `node`
   * environment is the better one and is a separate piece of work.
   *
   * 384MB and 512MB both took a failing configuration (4 workers, 2/3 runs
   * crashed) to 0/3.
   */
  workerIdleMemoryLimit: '512MB',
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