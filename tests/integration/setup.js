/**
 * Integration Test Setup
 * 
 * Configuration and utilities for integration tests that make real API calls
 * to opendata.swiss CKAN instance.
 */

import { beforeEach } from 'vitest';

// Longer timeout for real API calls
export const INTEGRATION_TIMEOUT = 30000; // 30 seconds

// Delay between tests to respect rate limits
export const TEST_DELAY = 200; // 200ms

/**
 * Known stable test data from opendata.swiss
 * These are real, publicly available datasets that should remain stable
 */
export const TEST_DATA = {
  // A stable dataset from BFS (Swiss Federal Statistical Office)
  DATASET_ID: '9da4fd46-2998-4a80-acb3-4e3f399dfbc9',
  
  // A resource with datastore enabled (we'll discover this dynamically)
  RESOURCE_ID: '3c53fa57-51a6-4cd1-885d-7b9fe0677408',
  
  // Known organization
  ORGANIZATION: 'envidat',
  
  // Known group
  GROUP: 'educ',
  
  // Known tag
  TAG: 'geodata',
};

/**
 * Add delay between tests to respect API rate limits
 */
export function setupRateLimiting() {
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, TEST_DELAY));
  });
}

/**
 * Helper to check if integration tests should run
 * Can be disabled via environment variable
 */
export function shouldRunIntegrationTests() {
  return process.env.SKIP_INTEGRATION_TESTS !== 'true';
}

/**
 * Helper to validate CKAN API response structure
 */
export function validateCkanResponse(response) {
  if (!response) {
    throw new Error('Response is null or undefined');
  }
  
  if (!response.success) {
    throw new Error(`CKAN API error: ${response.error?.message || 'Unknown error'}`);
  }
  
  return response.result;
}

/**
 * Helper to extract resource ID from a dataset
 */
export function getResourceIdFromDataset(dataset) {
  if (!dataset.resources || dataset.resources.length === 0) {
    throw new Error('Dataset has no resources');
  }
  
  return dataset.resources[0].id;
}

/**
 * Helper to find a resource with datastore enabled
 */
export function findDatastoreResource(dataset) {
  if (!dataset.resources) {
    return null;
  }
  
  return dataset.resources.find(r => r.datastore_active === true);
}
