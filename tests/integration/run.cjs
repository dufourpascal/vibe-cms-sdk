#!/usr/bin/env node

/**
 * Integration Test Runner
 *
 * Wrapper script that parses command-line arguments and runs vitest
 * with the integration test configuration.
 *
 * Usage:
 *   npm run test:integration:local -- --project=ABC123 --asset=xyz
 *   npm run test:integration:dev -- --project=DEF456
 *
 * Arguments:
 *   --project=<id>   Project ID to test against
 *   --asset=<id>     Asset ID to use in asset tests
 *   --env=<name>     Environment name (local, dev, staging, prod)
 *   --watch          Run in watch mode
 */

const { spawn } = require('child_process')
const path = require('path')

// Parse command-line arguments
function parseArgs(args) {
  const parsed = {
    project: null,
    asset: null,
    env: null,
    watch: false,
    vitestArgs: []
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg.startsWith('--project=')) {
      parsed.project = arg.split('=')[1]
    } else if (arg.startsWith('--asset=')) {
      parsed.asset = arg.split('=')[1]
    } else if (arg.startsWith('--env=')) {
      parsed.env = arg.split('=')[1]
    } else if (arg === '--watch') {
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

  // Build environment variables
  const env = { ...process.env }

  // Set PROJECT_ID if provided
  if (args.project) {
    env.PROJECT_ID = args.project
    console.log(`🔧 Using project ID: ${args.project}`)
  }

  // Set ASSET_ID if provided
  if (args.asset) {
    env.ASSET_ID = args.asset
    console.log(`🔧 Using asset ID: ${args.asset}`)
  }

  // Set TEST_ENV if provided
  if (args.env) {
    env.TEST_ENV = args.env
    console.log(`🔧 Using environment: ${args.env}`)
  }

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

  console.log(`🧪 Running integration tests...\n`)

  // Spawn vitest process
  const vitest = spawn('npx', ['vitest', ...vitestArgs], {
    env,
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
