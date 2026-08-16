const nextJest = require('next/jest')

// Point this at your Next.js app root (where next.config.js lives)
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  // next/jest already reads the "paths" from your tsconfig.json, so "@/..."
  // imports resolve automatically. Only add moduleNameMapper entries here if
  // you have aliases that AREN'T in tsconfig.json.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
}

// createJestConfig is exported this way so Next.js can load the Next.js config,
// which is async
module.exports = createJestConfig(customJestConfig)