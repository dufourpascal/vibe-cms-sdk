# Integration Tests

This directory contains integration tests that run against real Vibe CMS API endpoints. Unlike unit tests which use mocked data, these tests make actual HTTP requests to verify SDK behavior with real APIs.

## Quick Start

### Option 1: CLI Arguments (Fastest)

Pass project and asset IDs directly as arguments:

```bash
npm run test:integration:local -- --project=9D57HEG7F54H624GC2C455 --asset=xipxoehgsad
```

**Advantages:**
- No file configuration needed
- Easy to switch between projects
- Perfect for quick tests

### Option 2: Environment File (Persistent Config)

1. **Copy the environment template:**
   ```bash
   cp .env.test.example .env.test.local
   ```

2. **Configure your environment:**
   Edit `.env.test.local` with your project details:
   ```bash
   TEST_ENV=local
   VIBE_LOCAL_PROJECT_ID=your_project_id
   VIBE_LOCAL_ASSET_IMAGE=your_asset_id
   ```

3. **Run the tests:**
   ```bash
   # Test against local environment (default)
   npm run test:integration:local

   # Test against dev environment
   npm run test:integration:dev

   # Test against staging
   npm run test:integration:staging

   # Test against production
   npm run test:integration:prod
   ```

### Combining Both Methods

CLI arguments override .env file values:

```bash
# Use .env for base config, override project ID via CLI
npm run test:integration:local -- --project=DIFFERENT_PROJECT
```

## Environment Configuration

### Available Environments

- **local**: Local development server (`http://localhost:8000`)
- **dev**: Deployed development environment
- **staging**: Staging environment (future)
- **prod**: Production environment (future)

### Required Configuration

Each environment requires:

- **Base URL**: The API endpoint URL
- **Project ID**: Your Vibe CMS project ID
- **Asset IDs**: At least one valid image asset ID for testing
- **Collection Slugs**: Names of collections to test (faq, blog-post, landing-page)

### CLI Arguments

You can pass configuration via command-line arguments:

```bash
npm run test:integration:local -- --project=PROJECT_ID --asset=ASSET_ID
```

**Available arguments:**
- `--project=<id>` - Project ID to test against
- `--asset=<id>` - Asset ID for asset tests
- `--env=<name>` - Environment name (local, dev, staging, prod)
- `--watch` - Run in watch mode

**Priority order:**
1. CLI arguments (highest priority)
2. Environment-specific variables (`VIBE_{ENV}_PROJECT_ID`)
3. Empty string (tests will skip)

### Configuration via Environment Variables

All settings can be configured via environment variables. See `.env.test.example` for the complete list.

**Example for local environment:**
```bash
VIBE_LOCAL_BASE_URL=http://localhost:8000
VIBE_LOCAL_PROJECT_ID=proj_test123
VIBE_LOCAL_ASSET_IMAGE=asset_abc123
VIBE_LOCAL_COLLECTION_FAQ=faq
VIBE_LOCAL_COLLECTION_BLOG=blog-post
VIBE_LOCAL_COLLECTION_LANDING=landing-page
```

## Test Suites

### Collections Tests (`collections.test.ts`)

Tests content retrieval from collections:

- **FAQ Collection**: Regular collection with multiple items
  - `.first()` - Get first item
  - `.many({ limit })` - Get multiple items with limit
  - `.all()` - Get all items
  - Caching behavior

- **Blog Post Collection**: Regular collection
  - Query methods
  - Item retrieval by ID
  - Field extraction

- **Landing Page Collection**: Singleton collection
  - Singleton-specific behavior
  - Field extraction

**Features tested:**
- Response structure validation
- Caching and cache invalidation
- Error handling
- Connectivity (ping)

### Assets Tests (`assets.test.ts`)

Tests asset URL generation and downloads:

- **URL Generation**:
  - Original asset URLs
  - Variant URLs (original, web, thumbnail)
  - Size transformations (width, height)
  - Locale parameters

- **Asset Downloads**:
  - Download original assets
  - Download with variants
  - Download with transformations
  - Binary data handling
  - Caching behavior

- **Asset Extraction**:
  - Extract asset URLs from collection items
  - Bulk asset URL generation

**Variants tested:**
- `original` - Original uploaded asset
- `web` - Web-optimized variant
- `thumbnail` - Thumbnail variant

**Transformations tested:**
- Width only: 400px, 800px, 1920px
- Height only: 300px, 600px, 1080px
- Both: 800x600, 1920x1080, 200x200

## Running Tests

### Run all integration tests
```bash
npm run test:integration
```

### Run against specific environment
```bash
npm run test:integration:local     # Local dev
npm run test:integration:dev       # Deployed dev
npm run test:integration:staging   # Staging
npm run test:integration:prod      # Production
```

### Watch mode (re-run on file changes)
```bash
npm run test:integration:watch
```

### Run with specific environment variable
```bash
TEST_ENV=staging npm run test:integration
```

## Test Behavior

### Skip if Not Configured

Tests will automatically skip if the selected environment is not properly configured. This prevents test failures when testing against unavailable environments.

**Example output:**
```
⚠️  Environment not configured. Skipping integration tests.
   Copy .env.test.example to .env.test.local and configure it.
```

### Test Timeouts

Integration tests have longer timeouts than unit tests (30 seconds by default) to account for network latency and API processing time.

### Sequential Execution

Integration tests run sequentially (not in parallel) to avoid rate limiting and ensure consistent results.

### Caching

Tests verify that caching works correctly:
- First request hits the API
- Subsequent requests use cache
- Cache invalidation works as expected
- Locale-specific caching

## Expected Test Data

### Collections

Your test environment should have:

1. **FAQ Collection** (`faq`):
   - At least one published item
   - Should be a regular collection (not singleton)

2. **Blog Post Collection** (`blog-post`):
   - At least one published item
   - Should be a regular collection
   - Ideally has asset fields for asset extraction tests

3. **Landing Page Collection** (`landing-page`):
   - Exactly one published item (singleton)
   - Should be configured as singleton

### Assets

You need at least one valid image asset with ID configured in your environment variables. The asset should:
- Be a valid image format (JPEG, PNG, etc.)
- Be accessible via the public asset API
- Support transformations (variants and resizing)

## Troubleshooting

### Tests are skipping

**Problem**: All tests show as skipped.

**Solution**: Ensure your `.env.test.local` file exists and has valid configuration:
```bash
# Check if file exists
cat .env.test.local

# Verify required fields are set
grep VIBE_LOCAL_PROJECT_ID .env.test.local
grep VIBE_LOCAL_ASSET_IMAGE .env.test.local
```

### Connection errors

**Problem**: Tests fail with network errors.

**Solutions**:
- Verify the base URL is correct and accessible
- Check if local dev server is running (for local environment)
- Verify firewall/network settings
- Check API server logs for errors

### 404 errors

**Problem**: Tests fail with "Collection not found" or "Asset not found".

**Solutions**:
- Verify collection slugs match exactly (case-sensitive)
- Ensure collections have published items
- Verify asset IDs are correct
- Check project ID is correct

### Timeout errors

**Problem**: Tests timeout before completing.

**Solutions**:
- Increase timeout in `vitest.integration.config.ts`
- Check API server performance
- Verify network connectivity

## Best Practices

1. **Don't commit `.env.test.local`**: This file contains environment-specific configuration and should not be committed to version control.

2. **Use different data for each environment**: Avoid using production data in test environments.

3. **Keep test data stable**: Integration tests work best with stable, predictable test data.

4. **Run before releases**: Always run integration tests before publishing new SDK versions.

5. **Test against staging first**: Before testing against production, verify everything works in staging.

6. **Monitor test duration**: If tests become too slow, consider:
   - Reducing the number of test cases
   - Using smaller test assets
   - Optimizing test data

## CI/CD Integration

### Method 1: CLI Arguments with Secrets (Recommended)

```yaml
# Example GitHub Actions
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

## Contributing

When adding new integration tests:

1. Follow existing test patterns
2. Add appropriate timeouts
3. Handle missing data gracefully
4. Document expected test data requirements
5. Test against at least 2 environments before submitting

## Questions?

If you have questions about integration tests, please:
- Check the main README.md for SDK documentation
- Review the test code for examples
- Open an issue on GitHub
