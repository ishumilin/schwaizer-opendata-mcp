import { z } from 'zod';
import {
  datastoreInfo,
  datastoreSearch,
  datastoreSearchSql,
} from '../api/ckan-client.js';

const DatastoreInfoSchema = z.object({
  id: z.string().describe('Resource id'),
  include_private: z.boolean().optional(),
});

const DatastoreSearchSchema = z.object({
  resource_id: z.string().describe('Resource id'),
  q: z.union([z.string(), z.record(z.any())]).optional(),
  filters: z.record(z.any()).optional(),
  fields: z.array(z.string()).optional(),
  sort: z.string().optional(),
  language: z.string().optional(),
  include_total: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  distinct: z.boolean().optional(),
  plain: z.boolean().optional(),
  full_text: z.boolean().optional(),
});

const DatastoreSearchSqlSchema = z.object({
  sql: z.string().min(1),
});

/**
 * Convert a Zod schema to a minimal JSON Schema object for MCP inputSchema.
 * Keep this mapping in sync with the Zod definitions above.
 * @param {import('zod').ZodTypeAny} schema
 * @returns {object} JSON Schema compatible object
 */
function jsonSchema(schema) {
  if (schema === DatastoreInfoSchema) {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Resource id' },
        include_private: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    };
  }
  if (schema === DatastoreSearchSchema) {
    return {
      type: 'object',
      properties: {
        resource_id: { type: 'string', description: 'Resource id' },
        q: {
          anyOf: [{ type: 'string' }, { type: 'object' }],
          description:
            'Query string or object (CKAN supports object for advanced search).',
        },
        filters: {
          type: 'object',
          description: 'Filters object to match exact values on fields.',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Subset of fields to return.',
        },
        sort: { type: 'string', description: 'Sort expression (e.g., "date desc")' },
        language: { type: 'string', description: 'Language hint' },
        include_total: {
          type: 'boolean',
          description: 'Include total count (default false for performance)',
        },
        limit: { type: 'number', description: 'Row limit (server clamps to max)' },
        offset: { type: 'number', description: 'Offset for pagination' },
        distinct: { type: 'boolean' },
        plain: { type: 'boolean' },
        full_text: { type: 'boolean' },
      },
      required: ['resource_id'],
      additionalProperties: false,
    };
  }
  if (schema === DatastoreSearchSqlSchema) {
    return {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query for CKAN datastore' },
      },
      required: ['sql'],
      additionalProperties: false,
    };
  }
  return { type: 'object' };
}

/**
 * Get tool descriptors for CKAN datastore endpoints.
 * @returns {Array<{name: string, description: string, inputSchema: object}>}
 */
export function getDatastoreTools() {
  return [
    {
      name: 'datastore_info',
      description: 'Get datastore info for a resource (CKAN datastore_info).',
      inputSchema: jsonSchema(DatastoreInfoSchema),
    },
    {
      name: 'datastore_search',
      description:
        'Search rows in CKAN datastore (CKAN datastore_search). Supports q, filters, fields, sort, pagination.',
      inputSchema: jsonSchema(DatastoreSearchSchema),
    },
    {
      name: 'datastore_search_sql',
      description:
        'Execute SQL against CKAN datastore (CKAN datastore_search_sql). Disabled by default by server config.',
      inputSchema: jsonSchema(DatastoreSearchSqlSchema),
    },
  ];
}

/**
 * Get handler implementations for CKAN datastore tools.
 * Each handler validates args with Zod and returns MCP-compatible content.
 * @returns {{
 *   datastore_info: (args?: object) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>
 *   datastore_search: (args?: object) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>
 *   datastore_search_sql: (args?: object) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>
 * }}
 */
export function getDatastoreHandlers() {
  return {
    /**
     * Return datastore metadata (fields, etc.) for a resource.
     * @param {{ id: string, include_private?: boolean }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async datastore_info(args) {
      const parsed = DatastoreInfoSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await datastoreInfo(parsed.data.id, parsed.data.include_private);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Query CKAN datastore with filters, field selection, sorting and pagination.
     * @param {{
     *   resource_id: string, q?: string|Record<string, any>, filters?: Record<string, any>,
     *   fields?: string[], sort?: string, language?: string, include_total?: boolean,
     *   limit?: number, offset?: number, distinct?: boolean, plain?: boolean, full_text?: boolean
     * }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async datastore_search(args) {
      const parsed = DatastoreSearchSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await datastoreSearch(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Execute a SQL query against CKAN datastore (if enabled by server config).
     * @param {{ sql: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async datastore_search_sql(args) {
      const parsed = DatastoreSearchSqlSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await datastoreSearchSql(parsed.data.sql);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },
  };
}
