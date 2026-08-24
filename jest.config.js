const nextJest = require('next/jest')

// Point this at your Next.js app root (where next.config.js lives)
const createJestConfig = nextJest({ dir: './' })

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['<rootDir>/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  // Fallback in case next/jest doesn't auto-parse the "@/*" path from
  // tsconfig.json (can happen with moduleResolution: "bundler").
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

// createJestConfig is exported this way so Next.js can load the Next.js config,
// which is async
module.exports = createJestConfig(customJestConfig)