/**
 * Test data constants for integration tests.
 *
 * This file contains hardcoded expected data from the stable staging environment.
 * Data corresponds to a fixed Vibe CMS project used exclusively for integration testing.
 *
 * Project: https://vibe-cms-app-staging-yldiw.ondigitalocean.app
 * Project ID: 1c623367-1276-456d-9850-14bc9ae75c7d
 */

/**
 * Asset IDs used in the test collections
 */
export const ASSET_IDS = {
  IMAGE_1: '75e81c8a-962a-495b-8a35-f42571f08bbd',
  IMAGE_2: '22fbd679-f7b6-4609-af0e-a1a57a8efda4',
} as const

/**
 * Collection slugs
 */
export const COLLECTIONS = {
  TEST_COLLECTION: 'test_collection_1',
  TEST_SINGLETON: 'test_singleton_2',
} as const

/**
 * Test locales
 */
export const LOCALES = {
  EN_US: 'en-US',
  ES_ES: 'es-ES',
} as const

/**
 * Expected data for test_collection_1 (regular collection with multiple items)
 */
export const TEST_COLLECTION_1_DATA = {
  'en-US': [
    {
      id: '487e142b-c18a-4aed-a092-794743a089b6',
      locale: 'en-US',
      data: {
        text_field_1: 'it1 - f1 - en',
        text_field_2: 'it1 - f2 - en',
        md_field_3: 'it 1 - f3 - en',
        file_field_4: ASSET_IDS.IMAGE_1,
        multifile_field_5: [ASSET_IDS.IMAGE_2, ASSET_IDS.IMAGE_1],
      },
    },
    {
      id: '9cdb58e0-be10-4e42-ba30-3784242df896',
      locale: 'en-US',
      data: {
        text_field_1: 'it2 - f1 - en',
        text_field_2: 'it2 - f2 - en',
        md_field_3: 'it2 - f2 - en',
        file_field_4: ASSET_IDS.IMAGE_2,
        multifile_field_5: [ASSET_IDS.IMAGE_1],
      },
    },
  ],
  'es-ES': [
    {
      id: '487e142b-c18a-4aed-a092-794743a089b6',
      locale: 'es-ES',
      data: {
        text_field_1: 'it1 - f1 - es',
        text_field_2: 'it1 - f2 - es',
        md_field_3: 'it1 - f3 - es',
        file_field_4: ASSET_IDS.IMAGE_2,
        multifile_field_5: [ASSET_IDS.IMAGE_2, ASSET_IDS.IMAGE_1],
      },
    },
    {
      id: '9cdb58e0-be10-4e42-ba30-3784242df896',
      locale: 'es-ES',
      data: {
        text_field_1: 'it2 - f1 - es',
        text_field_2: 'it2 - f2 - es',
        md_field_3: 'it2 - f2 - es',
        file_field_4: ASSET_IDS.IMAGE_2,
        multifile_field_5: [ASSET_IDS.IMAGE_1],
      },
    },
  ],
} as const

/**
 * Expected data for test_singleton_2 (singleton collection with single item)
 */
export const TEST_SINGLETON_2_DATA = {
  'en-US': {
    id: '3710ff16-7887-4b5c-b28c-9776cd51847d',
    locale: 'en-US',
    data: {
      field_1: 'sit1 - f1 - en',
      field_2: 'sit1 - f1 - en',
    },
  },
  'es-ES': {
    id: '3710ff16-7887-4b5c-b28c-9776cd51847d',
    locale: 'es-ES',
    data: {
      field_1: 'sit1 - f1 - es',
      field_2: 'sit1 - f1 - es',
    },
  },
} as const

/**
 * Staging environment configuration
 */
export const STAGING_CONFIG = {
  baseUrl: 'https://vibe-cms-app-staging-yldiw.ondigitalocean.app',
  projectId: '1c623367-1276-456d-9850-14bc9ae75c7d',
} as const
