/**
 * Integration Tests for Organization & Taxonomy Tools
 * 
 * These tests make real API calls to opendata.swiss to verify
 * that organization, group, tag, and taxonomy tools work correctly.
 */

import { describe, it, expect } from 'vitest';
import * as ckanClient from '../../src/api/ckan-client.js';
import { 
  INTEGRATION_TIMEOUT, 
  TEST_DATA,
  setupRateLimiting,
  shouldRunIntegrationTests,
  validateCkanResponse
} from './setup.js';

// Skip all tests if integration tests are disabled
const describeIntegration = shouldRunIntegrationTests() ? describe : describe.skip;

describeIntegration('Organization & Taxonomy Tools Integration', () => {
  setupRateLimiting();

  describe('organization_list', () => {
    it('should list organizations', async () => {
      const response = await ckanClient.organizationList({ limit: 10 });
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);
    }, INTEGRATION_TIMEOUT);

    it('should list organizations with full details', async () => {
      const response = await ckanClient.organizationList({ 
        all_fields: true,
        limit: 5
      });
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify full details are included
      const org = result[0];
      expect(org).toHaveProperty('id');
      expect(org).toHaveProperty('name');
      expect(org).toHaveProperty('title');
      expect(org).toHaveProperty('description');
    }, INTEGRATION_TIMEOUT);
  });

  describe('organization_show', () => {
    it('should get organization details', async () => {
      const response = await ckanClient.organizationShow({ id: TEST_DATA.ORGANIZATION });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(TEST_DATA.ORGANIZATION);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('package_count');
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid organization ID', async () => {
      await expect(
        ckanClient.organizationShow({ id: 'invalid-org-id-12345' })
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });

  describe('group_list', () => {
    it('should list groups', async () => {
      const response = await ckanClient.groupList({ limit: 10 });
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(10);
    }, INTEGRATION_TIMEOUT);

    it('should list groups with full details', async () => {
      const response = await ckanClient.groupList({ 
        all_fields: true,
        limit: 5
      });
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify full details are included
      const group = result[0];
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('name');
      expect(group).toHaveProperty('title');
    }, INTEGRATION_TIMEOUT);
  });

  describe('group_show', () => {
    it('should get group details', async () => {
      const response = await ckanClient.groupShow({ id: TEST_DATA.GROUP });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(TEST_DATA.GROUP);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid group ID', async () => {
      await expect(
        ckanClient.groupShow({ id: 'invalid-group-id-12345' })
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });

  describe('tag_list', () => {
    it('should list tags', async () => {
      const response = await ckanClient.tagList({});
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result[0]).toBe('string');
    }, INTEGRATION_TIMEOUT);

    it('should filter tags by query', async () => {
      const response = await ckanClient.tagList({ query: 'pop' });
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      // Results should contain tags matching 'pop'
      if (result.length > 0) {
        expect(result.some(tag => tag.toLowerCase().includes('pop'))).toBe(true);
      }
    }, INTEGRATION_TIMEOUT);
  });

  describe('tag_autocomplete', () => {
    it('should autocomplete tags', async () => {
      const response = await ckanClient.tagAutocomplete({ q: 'pop', limit: 5 });
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
      
      // Verify autocomplete structure
      const tag = result[0];
      expect(tag).toHaveProperty('name');
    }, INTEGRATION_TIMEOUT);
  });

  describe('tag_show', () => {
    it('should get tag details', async () => {
      const response = await ckanClient.tagShow({ id: TEST_DATA.TAG });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(TEST_DATA.TAG);
      expect(result).toHaveProperty('id');
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid tag ID', async () => {
      await expect(
        ckanClient.tagShow({ id: 'invalid-tag-id-12345-xyz' })
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });

  describe('license_list', () => {
    it('should list available licenses', async () => {
      const response = await ckanClient.licenseList();
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify license structure
      const license = result[0];
      expect(license).toHaveProperty('id');
      expect(license).toHaveProperty('title');
    }, INTEGRATION_TIMEOUT);
  });

  describe('vocabulary_list', () => {
    it('should list vocabularies', async () => {
      const response = await ckanClient.vocabularyList();
      const result = validateCkanResponse(response);
      
      expect(Array.isArray(result)).toBe(true);
      // Vocabularies may be empty on some CKAN instances
      if (result.length > 0) {
        const vocab = result[0];
        expect(vocab).toHaveProperty('id');
        expect(vocab).toHaveProperty('name');
      }
    }, INTEGRATION_TIMEOUT);
  });

  describe('vocabulary_show', () => {
    it('should get vocabulary details if vocabularies exist', async () => {
      // First get list of vocabularies
      const listResponse = await ckanClient.vocabularyList();
      const vocabs = validateCkanResponse(listResponse);
      
      if (vocabs.length === 0) {
        console.warn('Skipping test: no vocabularies available');
        return;
      }
      
      const vocabId = vocabs[0].id;
      const response = await ckanClient.vocabularyShow({ id: vocabId });
      const result = validateCkanResponse(response);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(vocabId);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('tags');
      expect(Array.isArray(result.tags)).toBe(true);
    }, INTEGRATION_TIMEOUT);
  });
});
