import { z } from 'zod';
import { statusShow, helpShow } from '../api/ckan-client.js';

/**
 * Zod schema for help_show input.
 * @typedef {Object} HelpShowInput
 * @property {string} name - CKAN action name to get help for (e.g., "package_show", "package_search", "datastore_search").
 */
const HelpShowSchema = z.object({
  name: z.string(),
});

/**
 * Produce a JSON Schema for a given Zod schema, or an empty-object schema when none is needed.
 * This structure is used as MCP tool inputSchema.
 * @param {import('zod').ZodTypeAny | null} schema - Zod schema or null for no-args.
 * @returns {object} JSON Schema compatible object.
 */
function jsonSchema(schema) {
  if (schema === HelpShowSchema) {
    return {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description:
            'CKAN action name to get help for, e.g. "package_show", "package_search", "datastore_search"',
        },
      },
      required: ['name'],
      additionalProperties: false,
    };
  }
  // status_show has no args
  return { type: 'object', additionalProperties: false };
}

/**
 * Get tool definitions for status and help endpoints.
 * @returns {Array<{name: string, description: string, inputSchema: object}>} Tool descriptors.
 */
export function getStatusTools() {
  return [
    {
      name: 'status_show',
      description: 'Platform status (CKAN status_show)',
      inputSchema: jsonSchema(null),
    },
    {
      name: 'help_show',
      description: 'Show CKAN help for a given action (CKAN help_show)',
      inputSchema: jsonSchema(HelpShowSchema),
    },
  ];
}

/**
 * Get handler implementations for status and help tools.
 * Each handler returns MCP-compatible results: { content: [{ type: 'text', text }], isError?: boolean }.
 * @returns {{ status_show: (args?: object) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>, help_show: (args?: object) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}> }}
 */
export function getStatusHandlers() {
  return {
    /**
     * Return CKAN platform status information.
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async status_show() {
      try {
        const data = await statusShow();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Return CKAN help text for the given action name.
     * @param {Partial<HelpShowInput>=} args - Arguments object containing the action name.
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async help_show(args) {
      const parsed = HelpShowSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await helpShow(parsed.data.name);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },
  };
}
