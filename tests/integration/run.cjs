#!/usr/bin/env node

/**
 * Integration Test Runner
 *
 * Wrapper script that runs vitest with the integration test configuration.
 * Tests always run against the hardcoded staging environment.
 *
 * Usage:
 *   npm run test:integration         # Run once
 *   npm run test:integration:watch   # Watch mode
 */

const { spawn } = require('child_process')

// Parse command-line arguments
function parseArgs(args) {
  const parsed = {
    watch: false,
    vitestArgs: []
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--watch') {
      parsed.watch = true
    } else {
      // Pass through any other arguments to vitest
      parsed.vitestArgs.push(arg)
    }
  }

  return parsed
}

// Main execution
function main() {
  const args = parseArgs(process.argv.slice(2))

  // Build vitest command
  const vitestArgs = [
    'run',
    '--config',
    'vitest.integration.config.ts'
  ]

  // Add watch flag if specified
  if (args.watch) {
    // Replace 'run' with no command for watch mode
    vitestArgs[0] = '--config'
    vitestArgs.splice(0, 0) // Remove 'run'
  }

  // Add any additional vitest arguments
  vitestArgs.push(...args.vitestArgs)

  console.log(`🧪 Running integration tests against staging environment...\n`)

  // Spawn vitest process
  const vitest = spawn('npx', ['vitest', ...vitestArgs], {
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32' // Use shell on Windows
  })

  // Handle vitest exit
  vitest.on('exit', (code) => {
    process.exit(code)
  })

  // Handle errors
  vitest.on('error', (error) => {
    console.error('❌ Failed to start vitest:', error.message)
    process.exit(1)
  })
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = { parseArgs }
