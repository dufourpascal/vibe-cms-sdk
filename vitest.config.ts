import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'tests',
        '**/*.test.ts',
        '**/*.spec.ts',
        'vitest.config.ts',
        'tsup.config.ts',
      ],
    },
  },
})