/**
 * Integration test configuration.
 *
 * Tests run against a stable staging environment with hardcoded test data.
 * This allows tests to run without any configuration and validate against known expected values.
 *
 * The staging environment contains stable test data that should not change:
 * - test_collection_1: Regular collection with 2 items in en-US and es-ES
 * - test_singleton_2: Singleton collection with 1 item in en-US and es-ES
 */

import { STAGING_CONFIG, COLLECTIONS, ASSET_IDS } from './testData.js'

export interface TestConfig {
  name: string
  baseUrl: string
  projectId: string
  assets: {
    image1: string // First test asset
    image2: string // Second test asset
  }
  collections: {
    testCollection: string // test_collection_1
    testSingleton: string // test_singleton_2
  }
  timeout: number // Request timeout in ms
}

/**
 * Staging configuration with hardcoded stable test data.
 */
const stagingConfig: TestConfig = {
  name: 'Staging',
  baseUrl: STAGING_CONFIG.baseUrl,
  projectId: STAGING_CONFIG.projectId,
  assets: {
    image1: ASSET_IDS.IMAGE_1,
    image2: ASSET_IDS.IMAGE_2,
  },
  collections: {
    testCollection: COLLECTIONS.TEST_COLLECTION,
    testSingleton: COLLECTIONS.TEST_SINGLETON,
  },
  timeout: 15000,
}

/**
 * Get the test configuration.
 * Always returns staging configuration.
 */
export function getConfig(): TestConfig {
  return stagingConfig
}

/**
 * Get a descriptive message about the test environment.
 */
export function getEnvironmentInfo(): string {
  return `Testing against: ${stagingConfig.name} (${stagingConfig.baseUrl})\nProject ID: ${stagingConfig.projectId}`
}
