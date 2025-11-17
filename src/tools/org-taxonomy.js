import { z } from 'zod';
import {
  organizationList,
  organizationShow,
  groupList,
  groupShow,
  tagList,
  tagAutocomplete,
  licenseList,
  vocabularyList,
  vocabularyShow,
  tagShow,
} from '../api/ckan-client.js';

const OrganizationListSchema = z.object({
  all_fields: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

const OrganizationShowSchema = z.object({
  id: z.string(),
});

const GroupListSchema = z.object({
  order_by: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  all_fields: z.boolean().optional(),
});

const GroupShowSchema = z.object({
  id: z.string(),
});

const TagListSchema = z.object({
  query: z.string().optional(),
});

const TagAutocompleteSchema = z.object({
  q: z.string(),
  limit: z.number().int().positive().optional(),
});

const LicenseListSchema = z.object({}).strict();

const VocabularyListSchema = z.object({}).strict();

const VocabularyShowSchema = z.object({
  id: z.string(),
});

const TagShowSchema = z.object({
  id: z.string(),
});

/**
 * Convert a Zod schema to a minimal JSON Schema object for MCP inputSchema.
 * Keep this mapping in sync with the Zod definitions above.
 * @param {import('zod').ZodTypeAny} schema
 * @returns {object} JSON Schema compatible object
 */
function jsonSchema(schema) {
  if (schema === OrganizationListSchema) {
    return {
      type: 'object',
      properties: {
        all_fields: { type: 'boolean' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      additionalProperties: false,
    };
  }
  if (schema === OrganizationShowSchema) {
    return {
      type: 'object',
      properties: { id: { type: 'string', description: 'Organization id or name' } },
      required: ['id'],
      additionalProperties: false,
    };
  }
  if (schema === GroupListSchema) {
    return {
      type: 'object',
      properties: {
        order_by: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' },
        all_fields: { type: 'boolean' },
      },
      additionalProperties: false,
    };
  }
  if (schema === GroupShowSchema) {
    return {
      type: 'object',
      properties: { id: { type: 'string', description: 'Group id or name' } },
      required: ['id'],
      additionalProperties: false,
    };
  }
  if (schema === TagListSchema) {
    return {
      type: 'object',
      properties: { query: { type: 'string' } },
      additionalProperties: false,
    };
  }
  if (schema === TagAutocompleteSchema) {
    return {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Query prefix' },
        limit: { type: 'number' },
      },
      required: ['q'],
      additionalProperties: false,
    };
  }
  if (schema === LicenseListSchema) {
    return {
      type: 'object',
      additionalProperties: false,
    };
  }
  if (schema === VocabularyListSchema) {
    return {
      type: 'object',
      additionalProperties: false,
    };
  }
  if (schema === VocabularyShowSchema) {
    return {
      type: 'object',
      properties: { id: { type: 'string', description: 'Vocabulary name' } },
      required: ['id'],
      additionalProperties: false,
    };
  }
  if (schema === TagShowSchema) {
    return {
      type: 'object',
      properties: { id: { type: 'string', description: 'Tag name' } },
      required: ['id'],
      additionalProperties: false,
    };
  }
  return { type: 'object' };
}

/**
 * Get tool descriptors for CKAN organization, group, tag and taxonomy endpoints.
 * @returns {Array<{name: string, description: string, inputSchema: object}>}
 */
export function getOrgTaxonomyTools() {
  return [
    {
      name: 'organization_list',
      description: 'List organizations (CKAN organization_list)',
      inputSchema: jsonSchema(OrganizationListSchema),
    },
    {
      name: 'organization_show',
      description: 'Get organization by id or name (CKAN organization_show)',
      inputSchema: jsonSchema(OrganizationShowSchema),
    },
    {
      name: 'group_list',
      description: 'List groups (CKAN group_list)',
      inputSchema: jsonSchema(GroupListSchema),
    },
    {
      name: 'group_show',
      description: 'Get group by id or name (CKAN group_show)',
      inputSchema: jsonSchema(GroupShowSchema),
    },
    {
      name: 'tag_list',
      description: 'List tags (CKAN tag_list)',
      inputSchema: jsonSchema(TagListSchema),
    },
    {
      name: 'tag_autocomplete',
      description: 'Autocomplete tags (CKAN tag_autocomplete)',
      inputSchema: jsonSchema(TagAutocompleteSchema),
    },
    {
      name: 'license_list',
      description: 'List known licenses (CKAN license_list)',
      inputSchema: jsonSchema(LicenseListSchema),
    },
    {
      name: 'vocabulary_list',
      description: 'List vocabularies (CKAN vocabulary_list)',
      inputSchema: jsonSchema(VocabularyListSchema),
    },
    {
      name: 'vocabulary_show',
      description: 'Show a vocabulary and its tags (CKAN vocabulary_show)',
      inputSchema: jsonSchema(VocabularyShowSchema),
    },
    {
      name: 'tag_show',
      description: 'Show details for a tag (CKAN tag_show)',
      inputSchema: jsonSchema(TagShowSchema),
    },
  ];
}

/**
 * Get handler implementations for CKAN organization, group, tag and taxonomy tools.
 * Each handler validates args with Zod and returns MCP-compatible content.
 * @returns {{[key: string]: (args?: object) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}}
 */
export function getOrgTaxonomyHandlers() {
  return {
    /**
     * List organizations.
     * @param {{ all_fields?: boolean, limit?: number, offset?: number }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async organization_list(args) {
      const parsed = OrganizationListSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await organizationList(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Get organization details by id or name.
     * @param {{ id: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async organization_show(args) {
      const parsed = OrganizationShowSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await organizationShow(parsed.data.id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * List groups.
     * @param {{ order_by?: string, limit?: number, offset?: number, all_fields?: boolean }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async group_list(args) {
      const parsed = GroupListSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await groupList(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Get group details by id or name.
     * @param {{ id: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async group_show(args) {
      const parsed = GroupShowSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await groupShow(parsed.data.id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * List tags, optionally filtered by query.
     * @param {{ query?: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async tag_list(args) {
      const parsed = TagListSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await tagList(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Autocomplete tags by query prefix.
     * @param {{ q: string, limit?: number }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async tag_autocomplete(args) {
      const parsed = TagAutocompleteSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await tagAutocomplete(parsed.data.q, parsed.data.limit);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * List known licenses.
     * @param {{}} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async license_list(args) {
      const parsed = LicenseListSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await licenseList();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * List vocabularies.
     * @param {{}} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async vocabulary_list(args) {
      const parsed = VocabularyListSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await vocabularyList();
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Get vocabulary details by id (name).
     * @param {{ id: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async vocabulary_show(args) {
      const parsed = VocabularyShowSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await vocabularyShow(parsed.data.id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    /**
     * Get tag details by id (name).
     * @param {{ id: string }} args
     * @returns {Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}
     */
    async tag_show(args) {
      const parsed = TagShowSchema.safeParse(args || {});
      if (!parsed.success) {
        return { isError: true, content: [{ type: 'text', text: parsed.error.message }] };
      }
      try {
        const data = await tagShow(parsed.data.id);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },
  };
}
