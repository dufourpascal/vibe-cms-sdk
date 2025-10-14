import { defineConfig } from 'vitest/config'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.test.local if it exists
const envPath = path.resolve(__dirname, '.env.test.local')
dotenv.config({ path: envPath })

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Integration tests - DO NOT use setup file with mocks
    // setupFiles: [], // No mocks for integration tests

    // Integration tests are slower - increase timeouts
    testTimeout: 30000, // 30 seconds default
    hookTimeout: 30000,

    // Run integration tests sequentially to avoid rate limiting
    threads: false,

    // Include only integration tests
    include: ['tests/integration/**/*.test.ts'],

    // Exclude standard patterns
    exclude: [
      'node_modules',
      'dist',
      'tests/setup.ts', // Exclude unit test setup
      'tests/*.test.ts', // Exclude root-level test files
      'tests/!(integration)/**/*.test.ts', // Exclude non-integration test directories
    ],

    coverage: {
      enabled: false, // Disable coverage for integration tests
    },
  },
})
