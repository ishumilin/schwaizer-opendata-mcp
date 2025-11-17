/**
 * Integration Tests: Status Tools
 * 
 * Tests for platform status and help tools that query CKAN instance metadata.
 */

import { describe, it, expect } from 'vitest';
import * as ckanClient from '../../src/api/ckan-client.js';
import {
  INTEGRATION_TIMEOUT,
  setupRateLimiting,
  shouldRunIntegrationTests,
  validateCkanResponse,
} from './setup.js';

// Skip all tests if integration tests are disabled
const describeIntegration = shouldRunIntegrationTests() ? describe : describe.skip;

describeIntegration('Status Integration Tests', () => {
  setupRateLimiting();

  describe('status_show', () => {
    it('should return platform status information', async () => {
      const response = await ckanClient.statusShow();
      const result = validateCkanResponse(response);

      // Status should contain version and other metadata
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // Common status fields (may vary by CKAN version)
      // Just verify we got a valid response structure
      expect(response.success).toBe(true);
    }, INTEGRATION_TIMEOUT);
  });

  describe('help_show', () => {
    it('should return help for package_search action', async () => {
      const response = await ckanClient.helpShow('package_search');
      const result = validateCkanResponse(response);

      // Help text should be a string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      
      // Should contain information about the action
      expect(result.toLowerCase()).toContain('search');
    }, INTEGRATION_TIMEOUT);

    it('should return help for package_show action', async () => {
      const response = await ckanClient.helpShow('package_show');
      const result = validateCkanResponse(response);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, INTEGRATION_TIMEOUT);

    it('should return help for datastore_search action', async () => {
      const response = await ckanClient.helpShow('datastore_search');
      const result = validateCkanResponse(response);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result.toLowerCase()).toContain('datastore');
    }, INTEGRATION_TIMEOUT);

    it('should handle invalid action name gracefully', async () => {
      await expect(
        ckanClient.helpShow('nonexistent_action_12345')
      ).rejects.toThrow();
    }, INTEGRATION_TIMEOUT);
  });
});
