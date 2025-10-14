# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a framework-agnostic TypeScript SDK for Vibe CMS (VMS) - an AI-powered content management system. The SDK provides a chainable API for querying published content with built-in caching, internationalization support, and asset management capabilities.

**Target Environment**: Browser (uses native Fetch API, localStorage/sessionStorage)
**Build Tool**: tsup (builds both ESM and CJS outputs)
**Test Framework**: Vitest with jsdom

## Development Commands

```bash
# Build the SDK
npm run build

# Development mode with watch
npm run dev

# Type checking (without emitting)
npm run type-check

# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Pre-publish checks (type-check + test + build)
npm run prepublishOnly
```

### Running Individual Tests

```bash
# Run a specific test file
npx vitest run tests/client.test.ts

# Run tests matching a pattern
npx vitest run -t "should validate locale format"
```

## Architecture

### Core System Design

The SDK follows a **layered architecture** with clear separation of concerns:

1. **Factory Layer** (`factory.ts`): Entry point that creates `VibeCMSClient` instances
2. **Client Layer** (`core/client.ts`): Main API surface, manages configuration and locale state
3. **Query Layer** (`core/collection.ts`): Chainable collection queries (`.first()`, `.many()`, `.all()`, `.item()`)
4. **Result Layer** (`core/result.ts`): Enhanced result wrapper with field extraction and asset helpers
5. **Infrastructure Layer**:
   - `core/fetcher.ts`: HTTP request wrapper with error handling
   - `core/cache.ts`: Browser storage abstraction with TTL support
   - `core/asset.ts`: Asset URL generation and binary download management

### Key Design Patterns

**Chainable API Pattern**: The SDK uses method chaining to create an intuitive query interface:
```typescript
cms.collection('blog_posts').first()  // CollectionQuery → CollectionResult
```

**Result Wrapper Pattern**: All queries return `CollectionResult<T>` which wraps raw data and provides:
- Backward compatibility via `.raw` property
- Field extraction via `.field(name)` method
- Asset URL generation via `.asset_url(field, options)` method
- Array-like operations (`.map()`, `.filter()`, `.find()`, iteration)

**Cache Key Strategy**: Cache keys include locale for proper isolation:
- Collection: `vms:{projectId}:{locale}:{collectionSlug}:{queryType}[:{itemId}][:{paramHash}]`
- Assets: `vms:{projectId}:{locale}:asset:{queryType}:{assetId}[:{paramHash}]`

### Locale Management

Locales are treated as **first-class citizens**:
- Each locale maintains separate cache entries (prevents cross-locale data leaks)
- Asset URLs automatically include the current locale parameter
- Locale changes create a new `AssetManager` instance to maintain consistency
- Locale validation follows BCP 47 standard (enforced in `types/config.ts:validateLocale()`)

### Caching Strategy

The SDK implements **intelligent multi-tier caching**:
1. **Storage Priority**: localStorage → sessionStorage → in-memory (automatic fallback)
2. **TTL-based expiration**: Default 5 minutes, customizable per cache entry
3. **Null result caching**: Empty/not-found results cached for 1 minute to reduce unnecessary API calls
4. **Storage Adapters**: Abstracted through `StorageAdapter` interface for consistent behavior across storage types

### Type System

The SDK provides **generic type support** throughout:
```typescript
interface BlogPost { title: string; content: string }
const result = await cms.collection<BlogPost>('blog_posts').first()
// result is CollectionResult<BlogPost>
```

Types are structured in `types/` directory:
- `api.ts`: Public API response types
- `config.ts`: Configuration and validation
- `cache.ts`: Cache-related types
- `index.ts`: Re-exports all types

## Important Implementation Details

### Validation Patterns

**Project IDs**: Must match `^[a-zA-Z0-9_-]+$` (validated in `client.ts:34`)
**Collection Slugs**: Must match `^[a-z0-9_-]+$` - **lowercase only** (validated in `client.ts:40`)
**Asset IDs**: Must match `^[a-zA-Z0-9_-]+$` (validated in `asset.ts:14`)
**Locales**: Must be BCP 47 format, 2-20 characters (validated in `types/config.ts`)

### Error Handling

The SDK uses a **custom error class** (`VibeCMSError`) that includes:
- HTTP status code
- User-friendly error message
- Additional error details
- Follows the same pattern as the frontend's `useApi.ts` composable

Error responses are parsed in order of preference:
1. `errorData.message` (custom backend messages)
2. `errorData.detail` (FastAPI default)
3. `errorData.error` (generic error field)
4. `errorData.detail.message` (nested detail objects)

### Asset Management

**Asset URLs** are generated client-side (no API call) and include:
- Base URL from fetcher
- Project ID and asset ID in path
- Optional transformation parameters (width, height, variant)
- Current locale parameter

**Asset Downloads** fetch binary data and:
- Convert to base64 for caching (ArrayBuffer cannot be JSON-serialized)
- Cache asset data with configurable TTL
- Return `AssetData` objects with metadata (contentType, contentLength, fileName)

### Test Structure

Tests mirror the source structure and use shared mocks from `tests/setup.ts`:
- Mock data matches backend test fixtures (e.g., `TEST_PROJECT_ID`, `MOCK_PUBLIC_CONTENT_ITEM`)
- Global fetch mock configured in setup
- Mock storage implementations for localStorage/sessionStorage
- Helper functions: `createMockResponse()`, `createMockErrorResponse()`, `createMockNetworkError()`

## Build Output

The SDK builds to dual formats:
- **ESM**: `dist/index.js` with `dist/index.d.ts`
- **CJS**: `dist/index.cjs` with `dist/index.d.cts`

Both formats are specified in `package.json` exports for proper module resolution in all environments.

## Notes for AI Assistants

1. **Maintain backward compatibility**: The `.raw` property on `CollectionResult` must always return the underlying data unchanged
2. **Locale changes are immutable**: Changing locale creates new `AssetManager` instances rather than mutating state
3. **Cache keys must include locale**: Never generate cache keys without the locale component
4. **Validate inputs early**: All public methods validate their inputs (project IDs, collection slugs, asset IDs, locales)
5. **Type safety is paramount**: Generic type parameters should flow through the entire query chain
6. **Zero dependencies**: The SDK uses only browser native APIs (Fetch, Storage APIs). Do not add external dependencies.
