// jest.config.js
import nextJest from 'next/jest'

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
}

export default createJestConfig(customJestConfig)