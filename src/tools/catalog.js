import { z } from 'zod';
import {
  packageSearch,
  packageShow,
  packageList,
  currentPackageListWithResources,
  packageAutocomplete,
  packageActivityList,
  recentlyChangedPackagesActivityList,
} from '../api/ckan-client.js';

const PackageSearchSchema = z.object({
  q: z.string().optional(),
  fq: z.union([z.string(), z.array(z.string())]).optional(),
  sort: z.string().optional(),
  rows: z.number().int().positive().optional(),
  start: z.number().int().nonnegative().optional(),
  facetField: z.array(z.string()).optional(),
  facetLimit: z.number().int().positive().optional(),
});

const PackageShowSchema = z.object({
  id: z.string(),
});

const PackageListSchema = z.object({
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
  since: z.string().optional(),
});

const CurrentPackageListWithResourcesSchema = z.object({
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
});

const PackageAutocompleteSchema = z.object({
  q: z.string(),
  limit: z.number().int().positive().optional(),
});

const PackageActivityListSchema = z.object({
  id: z.string(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

const RecentlyChangedPackagesActivityListSchema = z.object({
  since_time: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
});

/**
 * Convert a Zod schema to a minimal JSON Schema object for MCP inputSchema.
 * Keep this mapping in sync with the Zod definitions above.
 * @param {import('zod').ZodTypeAny} zodSchema
 * @returns {object} JSON Schema compatible object
 */
function toJsonSchema(zodSchema) {
  // Minimal hand-written JSON Schemas matching the Zod above to avoid extra deps.
  // Keep in sync with the Zod definitions.
  if (zodSchema === PackageSearchSchema) {
    return {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Free text query' },
        fq: {
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
          description:
            'Filter query (CKAN fq). Accepts string or array of strings. Examples: "language:de", "organization:bundesamt-fur-statistik-bfs"',
        },
        sort: {
          type: 'string',
          description: 'Sort expression, e.g. "score desc, metadata_created desc"',
        },
        rows: { type: 'number', description: 'Number of results per page' },
        start: { type: 'number', description: 'Starting offset for results' },
        facetField: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Facet fields to aggregate (CKAN facet.field), e.g. ["tags","keywords"]',
        },
        facetLimit: {
          type: 'number',
          description: 'Max facet values per field (CKAN facet.limit)',
        },
      },
      additionalProperties: false,
    };
  }
  if (zodSchema === PackageShowSchema) {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Dataset id or name' },
      },
      required: ['id'],
      additionalProperties: false,
    };
  }
  if (zodSchema === PackageListSchema) {
    return {
      type: 'object',
      properties: {
        offset: { type: 'number', description: 'Starting offset' },
        limit: { type: 'number', description: 'Max items to return' },
        since: { type: 'string', description: 'ISO time or CKAN since parameter' },
      },
      additionalProperties: false,
    };
  }
  if (zodSchema === CurrentPackageListWithResourcesSchema) {
    return {
      type: 'object',
      properties: {
        offset: { type: 'number', description: 'Starting offset' },
        limit: { type: 'number', description: 'Max items to return' },
      },
      additionalProperties: false,
    };
  }
  if (zodSchema === PackageAutocompleteSchema) {
    return {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Query prefix' },
        limit: { type: 'number', description: 'Max items to return' },
      },
      required: ['q'],
      additionalProperties: false,
    };
  }
  if (zodSchema === PackageActivityListSchema) {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Dataset id or name' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      required: ['id'],
      additionalProperties: false,
    };
  }
  if (zodSchema === RecentlyChangedPackagesActivityListSchema) {
    return {
      type: 'object',
      properties: {
        since_time: { type: 'string', description: 'ISO timestamp filter' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
      additionalProperties: false,
    };
  }
  return { type: 'object' };
}

/**
 * Get tool descriptors for CKAN catalog endpoints.
 * @returns {Array<{name: string, description: string, inputSchema: object}>}
 */
export function getCatalogTools() {
  return [
    {
      name: 'package_search',
      description:
        'Search datasets on opendata.swiss (CKAN package_search). Supports q, fq, sorting, pagination and facets.',
      inputSchema: toJsonSchema(PackageSearchSchema),
    },
    {
      name: 'package_show',
      description: 'Get a dataset (package) by id or name (CKAN package_show).',
      inputSchema: toJsonSchema(PackageShowSchema),
    },
    {
      name: 'package_list',
      description: 'List dataset ids (CKAN package_list).',
      inputSchema: toJsonSchema(PackageListSchema),
    },
    {
      name: 'current_package_list_with_resources',
      description: 'List datasets with embedded resources (CKAN current_package_list_with_resources).',
      inputSchema: toJsonSchema(CurrentPackageListWithResourcesSchema),
    },
    {
      name: 'package_autocomplete',
      description: 'Autocomplete dataset names (CKAN package_autocomplete).',
      inputSchema: toJsonSchema(PackageAutocompleteSchema),
    },
    {
      name: 'package_activity_list',
      description: 'Activity stream for a dataset (CKAN package_activity_list).',
      inputSchema: toJsonSchema(PackageActivityListSchema),
    },
    {
      name: 'recently_changed_packages_activity_list',
      description: 'Global activity feed for recently changed datasets (CKAN recently_changed_packages_activity_list).',
      inputSchema: toJsonSchema(RecentlyChangedPackagesActivityListSchema),
    },
  ];
}

/**
 * Get handler implementations for CKAN catalog tools.
 * Each handler validates args with Zod and returns MCP-compatible content.
 * @returns {{[key: string]: (args?: object) => Promise<{content: Array<{type: 'text', text: string}>, isError?: boolean}>}}
 */
export function getCatalogHandlers() {
  return {
    async package_search(args) {
      const parsed = PackageSearchSchema.safeParse(args || {});
      if (!parsed.success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Invalid arguments for package_search: ${parsed.error.message}`,
            },
          ],
        };
      }
      try {
        const data = await packageSearch(parsed.data);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (e) {
        return {
          isError: true,
          content: [{ type: 'text', text: String(e) }],
        };
      }
    },

    async package_show(args) {
      const parsed = PackageShowSchema.safeParse(args || {});
      if (!parsed.success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Invalid arguments for package_show: ${parsed.error.message}`,
            },
          ],
        };
      }
      try {
        const data = await packageShow(parsed.data.id);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (e) {
        return {
          isError: true,
          content: [{ type: 'text', text: String(e) }],
        };
      }
    },

    async package_list(args) {
      const parsed = PackageListSchema.safeParse(args || {});
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid arguments for package_list: ${parsed.error.message}` }],
        };
      }
      try {
        const data = await packageList(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    async current_package_list_with_resources(args) {
      const parsed = CurrentPackageListWithResourcesSchema.safeParse(args || {});
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid arguments for current_package_list_with_resources: ${parsed.error.message}` }],
        };
      }
      try {
        const data = await currentPackageListWithResources(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    async package_autocomplete(args) {
      const parsed = PackageAutocompleteSchema.safeParse(args || {});
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid arguments for package_autocomplete: ${parsed.error.message}` }],
        };
      }
      try {
        const data = await packageAutocomplete(parsed.data.q, parsed.data.limit);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    async package_activity_list(args) {
      const parsed = PackageActivityListSchema.safeParse(args || {});
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid arguments for package_activity_list: ${parsed.error.message}` }],
        };
      }
      try {
        const data = await packageActivityList(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },

    async recently_changed_packages_activity_list(args) {
      const parsed = RecentlyChangedPackagesActivityListSchema.safeParse(args || {});
      if (!parsed.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Invalid arguments for recently_changed_packages_activity_list: ${parsed.error.message}` }],
        };
      }
      try {
        const data = await recentlyChangedPackagesActivityList(parsed.data);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { isError: true, content: [{ type: 'text', text: String(e) }] };
      }
    },
  };
}
