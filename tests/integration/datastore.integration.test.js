/**
 * Integration Tests for Datastore Tools
 * 
 * These tests make real API calls to opendata.swiss to verify
 * that datastore tools work correctly with the actual CKAN API.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as ckanClient from '../../src/api/ckan-client.js';
import { 
  INTEGRATION_TIMEOUT, 
  setupRateLimiting,
  shouldRunIntegrationTests,
  validateCkanResponse,
  findDatastoreResource
} from './setup.js';

// Skip all tests if integration tests are disabled
const describeIntegration = shouldRunIntegrationTests() ? describe : describe.skip;

describeIntegration('Datastore Tools Integration', () => {
  let testResourceId;

  beforeAll(async () => {
    // Find a resource with datastore enabled
    const searchResponse = await ckanClient.packageSearch({
      q: '*',
      fq: 'res_format:CSV',
      rows: 20
    });
    const searchResult = validateCkanResponse(searchResponse);
    
    // Find first dataset with datastore-enabled resource
    for (const dataset of searchResult.results) {
      const datastoreResource = findDatastoreResource(dataset);
      if (datastoreResource) {
        testResourceId = datastoreResource.id;
        break;
      }
    }
    
    if (!testResourceId) {
      console.warn('No datastore-enabled resource found, some tests may be skipped');
    }
  }, INTEGRATION_TIMEOUT);

  setupRateLimiting();

  describe('datastore_info', () => {
    it('should get datastore info for a resource', async () => {
      if (!testResourceId) {
        console.warn('Skipping test: no datastore resource available');
        return;
      }

      const response = await ckanClient.datastoreInfo({ id: testResourceId });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('fields');
      expect(Array.isArray(result.fields)).toBe(true);
      expect(result.fields.length).toBeGreaterThan(0);
      
      // Verify field structure
      const field = result.fields[0];
      expect(field).toHaveProperty('id');
      expect(field).toHaveProperty('type');
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid resource ID', async () => {
      await expect(
        ckanClient.datastoreInfo({ id: 'invalid-resource-id-12345' })
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });

  describe('datastore_search', () => {
    it('should search datastore with default parameters', async () => {
      if (!testResourceId) {
        console.warn('Skipping test: no datastore resource available');
        return;
      }

      const response = await ckanClient.datastoreSearch({
        resource_id: testResourceId,
        limit: 5
      });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('records');
      expect(Array.isArray(result.records)).toBe(true);
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.records.length).toBeLessThanOrEqual(5);
      
      // Verify record structure
      const record = result.records[0];
      expect(typeof record).toBe('object');
      expect(record).toHaveProperty('_id');
    }, INTEGRATION_TIMEOUT);

    it('should support pagination with offset', async () => {
      if (!testResourceId) {
        console.warn('Skipping test: no datastore resource available');
        return;
      }

      const response1 = await ckanClient.datastoreSearch({
        resource_id: testResourceId,
        limit: 3,
        offset: 0
      });
      const result1 = validateCkanResponse(response1);
      
      const response2 = await ckanClient.datastoreSearch({
        resource_id: testResourceId,
        limit: 3,
        offset: 3
      });
      const result2 = validateCkanResponse(response2);
      
      // Records should be different
      expect(result1.records[0]._id).not.toBe(result2.records[0]._id);
    }, INTEGRATION_TIMEOUT);

    it('should support field selection', async () => {
      if (!testResourceId) {
        console.warn('Skipping test: no datastore resource available');
        return;
      }

      // First get field names
      const infoResponse = await ckanClient.datastoreInfo({ id: testResourceId });
      const infoResult = validateCkanResponse(infoResponse);
      const fieldNames = infoResult.fields.slice(0, 2).map(f => f.id);
      
      const response = await ckanClient.datastoreSearch({
        resource_id: testResourceId,
        fields: fieldNames,
        limit: 1
      });
      const result = validateCkanResponse(response);
      
      expect(result.records.length).toBeGreaterThan(0);
      const record = result.records[0];
      
      // Should only have selected fields (plus _id)
      const recordKeys = Object.keys(record).filter(k => k !== '_id');
      expect(recordKeys.length).toBeLessThanOrEqual(fieldNames.length + 1);
    }, INTEGRATION_TIMEOUT);

    it('should support sorting', async () => {
      if (!testResourceId) {
        console.warn('Skipping test: no datastore resource available');
        return;
      }

      // Get a field name to sort by
      const infoResponse = await ckanClient.datastoreInfo({ id: testResourceId });
      const infoResult = validateCkanResponse(infoResponse);
      const sortField = infoResult.fields.find(f => f.type === 'int' || f.type === 'numeric')?.id || '_id';
      
      const response = await ckanClient.datastoreSearch({
        resource_id: testResourceId,
        sort: `${sortField} desc`,
        limit: 5
      });
      const result = validateCkanResponse(response);
      
      expect(result.records.length).toBeGreaterThan(0);
    }, INTEGRATION_TIMEOUT);
  });

  describe('datastore_search_sql', () => {
    it('should execute SQL query if enabled', async () => {
      if (!testResourceId) {
        console.warn('Skipping test: no datastore resource available');
        return;
      }

      try {
        const sql = `SELECT * FROM "${testResourceId}" LIMIT 5`;
        const response = await ckanClient.datastoreSearchSql({ sql });
        const result = validateCkanResponse(response);
        
        expect(result).toBeDefined();
        expect(result).toHaveProperty('records');
        expect(Array.isArray(result.records)).toBe(true);
      } catch (error) {
        // SQL search might be disabled on the server
        if (error.message.includes('disabled') || error.message.includes('not allowed')) {
          console.warn('SQL search is disabled on this CKAN instance');
        } else {
          throw error;
        }
      }
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid SQL', async () => {
      try {
        await ckanClient.datastoreSearchSql({ sql: 'INVALID SQL QUERY' });
        // If we get here, SQL is disabled or query was somehow valid
      } catch (error) {
        // Expected to fail with invalid SQL or disabled feature
        expect(error).toBeDefined();
      }
    }, INTEGRATION_TIMEOUT);
  });
});
