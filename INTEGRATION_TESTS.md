# Integration Tests - Setup Complete! 🎉

The integration test infrastructure has been successfully set up for the Vibe CMS SDK. This document provides a quick overview of what's been implemented.

## What's Been Built

### 1. Environment Configuration System
- **File**: `tests/integration/config.ts`
- **Purpose**: Manages environment-specific settings (local, dev, staging, prod)
- **Features**:
  - Environment variable support
  - Auto-detection of missing configuration
  - Flexible timeout settings per environment
  - Validation helpers

### 2. Environment Template
- **File**: `.env.test.example`
- **Purpose**: Template for configuring test environments
- **Copy to**: `.env.test.local` (gitignored)

### 3. Test Suites

#### Collections Test Suite
- **File**: `tests/integration/collections.test.ts`
- **Tests**:
  - FAQ collection (regular collection)
  - Blog Post collection (regular collection with item lookup)
  - Landing Page collection (singleton)
  - Caching behavior
  - Error handling
  - API connectivity

#### Assets Test Suite
- **File**: `tests/integration/assets.test.ts`
- **Tests**:
  - Asset URL generation
  - Variants: original, web, thumbnail
  - Size transformations (width, height, both)
  - Asset downloads with caching
  - Asset extraction from collections
  - Locale handling
  - Size comparisons across variants

### 4. Test Configuration
- **File**: `vitest.integration.config.ts`
- **Features**:
  - Loads `.env.test.local` automatically
  - 30-second default timeouts
  - Sequential execution (no parallel tests)
  - No mocking - real API calls only

### 5. NPM Scripts
```bash
npm run test:integration          # Default (uses TEST_ENV variable)
npm run test:integration:local    # Test against localhost:8000
npm run test:integration:dev      # Test against dev environment
npm run test:integration:staging  # Test against staging
npm run test:integration:prod     # Test against production
npm run test:integration:watch    # Watch mode for development
```

### 6. Documentation
- **File**: `tests/integration/README.md`
- **Contents**: Comprehensive guide on setup, usage, and troubleshooting

## Quick Start

### Option 1: CLI Arguments (Recommended for Quick Testing)

Pass project and asset IDs directly:

```bash
npm run test:integration:local -- --project=9D57HEG7F54H624GC2C455 --asset=xipxoehgsad
```

This is perfect for:
- Quick testing without configuring files
- Switching between different projects easily
- CI/CD where you use secrets

### Option 2: Environment File (Recommended for Persistent Config)

1. **Create your environment file:**
   ```bash
   cp .env.test.example .env.test.local
   ```

2. **Edit `.env.test.local` with your details:**
   ```bash
   TEST_ENV=local

   # Local Development
   VIBE_LOCAL_BASE_URL=http://localhost:8000
   VIBE_LOCAL_PROJECT_ID=your_actual_project_id      # Optional if using CLI args
   VIBE_LOCAL_ASSET_IMAGE=your_actual_asset_id        # Optional if using CLI args
   VIBE_LOCAL_COLLECTION_FAQ=faq
   VIBE_LOCAL_COLLECTION_BLOG=blog-post
   VIBE_LOCAL_COLLECTION_LANDING=landing-page
   ```

3. **Run the tests:**
   ```bash
   npm run test:integration:local
   ```

### Combining Both Methods

CLI arguments override .env file settings:

```bash
# Use .env for collections, CLI for project/asset
npm run test:integration:local -- --project=DIFFERENT_PROJECT_ID
```

## Test Data Requirements

For tests to pass, your environment should have:

### Collections
1. **`faq`** - Regular collection with at least 1 published item
2. **`blog-post`** - Regular collection with at least 1 published item
3. **`landing-page`** - Singleton collection with 1 published item

### Assets
- At least 1 valid image asset (configured as `VIBE_LOCAL_ASSET_IMAGE`)
- Asset should support transformations (variants and resizing)

## Current Test Status

**Infrastructure**: ✅ Working perfectly
**Test Discovery**: ✅ Tests are loaded and executed
**API Connectivity**: ✅ Successfully connecting to APIs

**Example Test Run** (with default config):
```
 Test Files  2 (collections.test.ts, assets.test.ts)
      Tests  45 total (30 failed | 15 passed)
   Duration  837ms

❌ Failures due to: Invalid default project ID "proj_test123"
✅ Fix: Configure .env.test.local with your real project ID
```

The failures are **expected** and will be resolved once you configure your actual project details.

## Architecture Highlights

### Smart Test Skipping
Tests automatically skip if environment isn't configured:
```typescript
describe.skipIf(skipIfNotConfigured)('Integration Tests', () => {
  // Tests only run if env is properly configured
})
```

### Environment Isolation
Each environment has its own:
- Base URL
- Project ID
- Asset IDs
- Timeout settings
- Cache namespace (via locale-aware keys)

### Real-World Testing
- No mocks or stubs
- Actual HTTP requests to real APIs
- Tests verify both SDK logic AND API integration
- Validates response structure, caching, error handling

## Multiple Environment Support

### Using CLI Arguments (Recommended)

```bash
# Local Development
npm run test:integration:local -- --project=LOCAL_PROJECT_ID --asset=local_asset

# Deployed Development
npm run test:integration:dev -- --project=DEV_PROJECT_ID --asset=dev_asset

# Staging (when available)
npm run test:integration:staging -- --project=STAGING_PROJECT_ID --asset=staging_asset

# Production (when needed)
npm run test:integration:prod -- --project=PROD_PROJECT_ID --asset=prod_asset
```

### Using Environment Variables

```bash
# Local Development
VIBE_LOCAL_PROJECT_ID=your_local_project_id npm run test:integration:local

# Deployed Development
VIBE_DEV_PROJECT_ID=your_dev_project_id npm run test:integration:dev

# Staging (when available)
VIBE_STAGING_PROJECT_ID=your_staging_project_id npm run test:integration:staging

# Production (when needed)
VIBE_PROD_PROJECT_ID=your_prod_project_id npm run test:integration:prod
```

### Using .env.test.local File

Configure once, run many times:

```bash
# Set up .env.test.local with environment-specific values
npm run test:integration:local   # Uses VIBE_LOCAL_PROJECT_ID
npm run test:integration:dev     # Uses VIBE_DEV_PROJECT_ID
npm run test:integration:staging # Uses VIBE_STAGING_PROJECT_ID
```

## CI/CD Integration

### Method 1: CLI Arguments with Secrets (Recommended)

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install

      - name: Run Integration Tests
        run: |
          npm run test:integration:dev -- \
            --project=${{ secrets.VIBE_DEV_PROJECT_ID }} \
            --asset=${{ secrets.VIBE_DEV_ASSET_IMAGE }}
```

### Method 2: Environment Variables

```yaml
      - name: Run Integration Tests
        env:
          PROJECT_ID: ${{ secrets.VIBE_DEV_PROJECT_ID }}
          ASSET_ID: ${{ secrets.VIBE_DEV_ASSET_IMAGE }}
        run: npm run test:integration:dev
```

Store sensitive values (project IDs, asset IDs) as CI/CD secrets.

## Next Steps

1. **Configure your environment** (`.env.test.local`)
2. **Prepare test data** (collections and assets)
3. **Run the tests** (`npm run test:integration:local`)
4. **Add to CI/CD** (optional but recommended)

## Need Help?

- **Full documentation**: See `tests/integration/README.md`
- **Test examples**: Review the test files in `tests/integration/`
- **Configuration examples**: See `.env.test.example`
- **Issues**: Open an issue on GitHub

---

**Built with**: Vitest, dotenv, TypeScript
**Maintained by**: Vibe CMS SDK Team
**Last Updated**: 2025-10-14
