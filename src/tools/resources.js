import { z } from 'zod';
import { resourceShow, resourceViewShow, resourceViewList } from '../api/ckan-client.js';

const ResourceIdSchema = z.object({
  id: z.string().describe('Resource id'),
});

const ResourceViewListSchema = z.object({
  resource_id: z.string().describe('Resource id'),
});

/**
 * Convert a Zod schema to a minimal JSON Schema object for MCP inputSchema.
 * Keep this mapping in sync with the Zod definitions above.
 * @param {import('zod').ZodTypeAny} schema
 * @returns {object} JSON Schema compatible object
 */
function jsonSchema(schema) {
  if (schema === ResourceIdSchema) {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Resource id' },
      },
      required: ['id'],
      additionalProperties: false,
    };
  }
  if (schema === ResourceViewListSchema) {
    return {
      type: 'object',
      properties: {
        resource_id: { type: 'string', description: 'Resource id' },
      },
      required: ['resource_id'],
      additionalProperties: false,
    };
  }
  return { type: 'object' };
}

/**
 * Get tool descriptors for CKAN resource endpoints.
 * @returns {Array<{name: string, description: string, inputSchema: object}>}
 */
export function getResourcesTools() {
  return [
    {
      name: 'resource_show',
      description: 'Get resource by id (CKAN resource_show).',
      inputSchema: jsonSchema(ResourceIdSchema),
    },
    {
      name: 'resource_view_show',
      description: 'Get resource view by id (CKAN resource_view_show).',
      inputSchema: jsonSchema(ResourceIdSchema),
    },
    {
      name: 'resource_view_list',
      description: 'List views for a resource (CKAN resource_view_list).',
      inputSchema: jsonSchema(ResourceViewListSchema),
    },
  ];
}

/**
 * Get handler implementations for CKAN resource tools.
 * Each handler validates args with Zod and returns MCP-compatible content.
 * @returns {{
 *   resource_show: (args?: { id: string }) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>,
 *   resource_view_show: (args?: { id: string }) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>,
 *   resource_view_list: (args?: { resource_id: string }) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>
 * }}
 */
export function getResourcesHandlers() {
  return {
    /**
     * Return resource details by id.
     * @param {{ id: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async resource_show(args) {
      const parsed = ResourceIdSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await resourceShow(parsed.data.id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Return resource view details by view id.
     * @param {{ id: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async resource_view_show(args) {
      const parsed = ResourceIdSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await resourceViewShow(parsed.data.id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Return list of views for a given resource id.
     * @param {{ resource_id: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async resource_view_list(args) {
      const parsed = ResourceViewListSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await resourceViewList(parsed.data.resource_id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },
  };
}
