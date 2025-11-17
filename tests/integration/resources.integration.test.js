/**
 * Integration Tests for Resources Tools
 * 
 * These tests make real API calls to opendata.swiss to verify
 * that resource tools work correctly with the actual CKAN API.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as ckanClient from '../../src/api/ckan-client.js';
import { 
  INTEGRATION_TIMEOUT, 
  TEST_DATA,
  setupRateLimiting,
  shouldRunIntegrationTests,
  validateCkanResponse,
  getResourceIdFromDataset
} from './setup.js';

// Skip all tests if integration tests are disabled
const describeIntegration = shouldRunIntegrationTests() ? describe : describe.skip;

describeIntegration('Resources Tools Integration', () => {
  let testResourceId;

  beforeAll(async () => {
    // Get a dataset and extract a resource ID
    const response = await ckanClient.packageShow({ id: TEST_DATA.DATASET_ID });
    const dataset = validateCkanResponse(response);
    testResourceId = getResourceIdFromDataset(dataset);
  }, INTEGRATION_TIMEOUT);

  setupRateLimiting();

  describe('resource_show', () => {
    it('should get resource details by ID', async () => {
      const response = await ckanClient.resourceShow({ id: testResourceId });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(testResourceId);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('package_id');
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid resource ID', async () => {
      await expect(
        ckanClient.resourceShow({ id: 'invalid-resource-id-12345' })
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });

  describe('resource_view_list', () => {
    it('should list views for a resource', async () => {
      const response = await ckanClient.resourceViewList({ resource_id: testResourceId });
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      // Views may be empty for some resources
      if (result.length > 0) {
        const view = result[0];
        expect(view).toHaveProperty('id');
        expect(view).toHaveProperty('resource_id');
        expect(view.resource_id).toBe(testResourceId);
        expect(view).toHaveProperty('view_type');
      }
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid resource ID', async () => {
      await expect(
        ckanClient.resourceViewList({ resource_id: 'invalid-resource-id-12345' })
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });

  describe('resource_view_show', () => {
    it('should get view details if views exist', async () => {
      // First get list of views
      const listResponse = await ckanClient.resourceViewList({ resource_id: testResourceId });
      const views = validateCkanResponse(listResponse);
      
      if (views.length === 0) {
        console.warn('Skipping test: resource has no views');
        return;
      }
      
      const viewId = views[0].id;
      const response = await ckanClient.resourceViewShow({ id: viewId });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(viewId);
      expect(result).toHaveProperty('resource_id');
      expect(result).toHaveProperty('view_type');
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid view ID', async () => {
      await expect(
        ckanClient.resourceViewShow({ id: 'invalid-view-id-12345' })
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });
});
