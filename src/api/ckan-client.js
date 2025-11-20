import ky from 'ky';
import { CONFIG } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Build a ky client with sensible defaults.
 */
const http = ky.create({
  prefixUrl: CONFIG.BASE_URL.replace(/\/+$/, ''), // no trailing slash
  timeout: CONFIG.TIMEOUT_MS,
  headers: {
    'user-agent': CONFIG.USER_AGENT,
    accept: 'application/json',
    'content-type': 'application/json',
  },
  hooks: {
    beforeRequest: [
      (req) => {
        logger.debug({ url: req.url, method: req.method }, 'CKAN request');
      },
    ],
    afterResponse: [
      async (req, _options, res) => {
        logger.debug({ url: req.url, status: res.status }, 'CKAN response');
      },
    ],
  },
});

/**
 * Encode a value for CKAN query params:
 * - Arrays: JSON-encoded (e.g., ["tags","keywords"]) as expected by CKAN for facet.field
 * - Objects: JSON-encoded (used for q or filters in datastore)
 * - Strings/numbers/booleans: as-is
 */
function encodeParam(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value;
}

/**
 * Utility to build search params while skipping undefined/null.
 */
function buildSearchParams(args = {}) {
  const sp = new URLSearchParams();
  Object.entries(args).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    sp.set(k, encodeParam(v));
  });
  return sp;
}

/**
 * Centralized error mapping to friendly error messages.
 */
async function mapError(e, actionName) {
  try {
    if (e.response) {
      const bodyText = await e.response.text();
      let body;
      try {
        body = JSON.parse(bodyText);
      } catch {
        // non-json
      }
      const errField = body?.error;
      const errFieldString =
        typeof errField === 'string'
          ? errField
          : errField
          ? JSON.stringify(errField)
          : undefined;
      const message =
        body?.error?.message ||
        errFieldString ||
        bodyText ||
        e.message ||
        'Unknown error';
      const status = e.response.status;
      const url = e.request?.url || '';
      return new Error(
        `[CKAN ${actionName}] HTTP ${status} - ${message}\nURL: ${url}`
      );
    }
  } catch {
    // fallthrough
  }
  return new Error(`[CKAN ${actionName}] ${e.message || String(e)}`);
}

/**
 * GET wrapper for CKAN /action endpoints with query params.
 */
async function getAction(path, params, actionName) {
  try {
    const searchParams = buildSearchParams(params);
    const perRequestTimeout =
      actionName === 'recently_changed_packages_activity_list'
        ? CONFIG.TIMEOUT_MS * 2
        : CONFIG.TIMEOUT_MS;
    const res = await http.get(path, { searchParams, timeout: perRequestTimeout }).json();
    return res;
  } catch (e) {
    throw await mapError(e, actionName);
  }
}

/**
 * POST wrapper for CKAN /action endpoints with JSON body.
 */
async function postAction(path, json, actionName) {
  try {
    const perRequestTimeout =
      actionName === 'recently_changed_packages_activity_list'
        ? CONFIG.TIMEOUT_MS * 2
        : CONFIG.TIMEOUT_MS;
    const res = await http.post(path, { json, timeout: perRequestTimeout }).json();
    return res;
  } catch (e) {
    throw await mapError(e, actionName);
  }
}

/**
 * Catalog / Datasets
 */
/**
 * Search datasets (CKAN package_search).
 * @param {{ q?: string, fq?: string|string[], sort?: string, rows?: number, start?: number, facetField?: string[], facetLimit?: number }} [args]
 * @returns {Promise<any>} Raw CKAN response JSON
 */
export async function packageSearch(args = {}) {
  // Defensives: clamp rows
  const rows =
    typeof args.rows === 'number'
      ? Math.min(Math.max(0, args.rows), CONFIG.MAX_ROWS)
      : CONFIG.DEFAULT_ROWS;

  // Normalize fq for common Solr pitfalls, e.g. hyphens misinterpreted as minus
  // Wrap unquoted organization slug values: organization:bundesamt-fur-statistik-bfs -> organization:"bundesamt-fur-statistik-bfs"
  function normalizeFq(fq) {
    if (typeof fq !== 'string') return fq;
    // Quote unquoted organization slugs
    const quoted = fq.replace(/(\borganization:)([^"\s][^\s]*)/g, (_m, p1, p2) => `${p1}"${p2}"`);
    // Expand organization filter to include publisher field as fallback on instances that index it
    return quoted.replace(/\borganization:"([^"]+)"/g, (_m, val) => `(organization:"${val}" OR publisher:"${val}")`);
  }

  // Normalize q: CKAN/Solr match-all is *:*, not bare *
  function normalizeQ(q) {
    if (q === undefined || q === null || q === '') return '*:*';
    if (q === '*') return '*:*';
    return q;
  }

  // CKAN expects facet.field as JSON array string if provided
  const params = {
    q: normalizeQ(args.q),
    fq: normalizeFq(args.fq),
    sort: args.sort,
    rows,
    start: args.start,
    'facet.field': args.facetField,
    'facet.limit': args.facetLimit,
  };

  return getAction('package_search', params, 'package_search');
}

/**
 * Get a dataset by id or name (CKAN package_show).
 * @param {{id: string}|string} idOrName - Dataset id or name
 * @returns {Promise<any>}
 */
export async function packageShow(idOrName) {
  const id = (idOrName && typeof idOrName === 'object') ? idOrName.id : idOrName;
  return getAction('package_show', { id }, 'package_show');
}

/**
 * List dataset ids (CKAN package_list).
 * @param {{ offset?: number, limit?: number, since?: string }} [args]
 * @returns {Promise<any>}
 */
export async function packageList(args = {}) {
  const params = {
    offset: typeof args.offset === 'number' ? Math.max(0, args.offset) : undefined,
    limit:
      typeof args.limit === 'number'
        ? Math.min(Math.max(0, args.limit), CONFIG.MAX_ROWS)
        : undefined,
    since: args.since,
  };
  return getAction('package_list', params, 'package_list');
}

/**
 * List datasets with embedded resources (CKAN current_package_list_with_resources).
 * @param {{ offset?: number, limit?: number }} [args]
 * @returns {Promise<any>}
 */
export async function currentPackageListWithResources(args = {}) {
  const params = {
    offset: typeof args.offset === 'number' ? Math.max(0, args.offset) : undefined,
    limit:
      typeof args.limit === 'number'
        ? Math.min(Math.max(0, args.limit), CONFIG.MAX_ROWS)
        : undefined,
  };
  return getAction(
    'current_package_list_with_resources',
    params,
    'current_package_list_with_resources'
  );
}

/**
 * Autocomplete dataset names (CKAN package_autocomplete).
 * @param {{ q: string, limit?: number }|string} argsOrQ - Query or object with q and limit
 * @param {number} [limit] - Optional limit when first arg is a string
 * @returns {Promise<any>}
 */
export async function packageAutocomplete(argsOrQ, limit) {
  const q = argsOrQ && typeof argsOrQ === 'object' ? argsOrQ.q : argsOrQ;
  const lim =
    argsOrQ && typeof argsOrQ === 'object' ? argsOrQ.limit : limit;

  const params = {
    q,
    limit:
      typeof lim === 'number'
        ? Math.min(Math.max(0, lim), CONFIG.MAX_ROWS)
        : undefined,
  };
  return getAction('package_autocomplete', params, 'package_autocomplete');
}

/**
 * Activity stream for a dataset (CKAN package_activity_list).
 * @param {{ id: string, limit?: number, offset?: number }} [args]
 * @returns {Promise<any>}
 */
export async function packageActivityList(args = {}) {
  const params = {
    id: args.id,
    limit:
      typeof args.limit === 'number'
        ? Math.min(Math.max(0, args.limit), CONFIG.MAX_ROWS)
        : undefined,
    offset: typeof args.offset === 'number' ? Math.max(0, args.offset) : undefined,
  };
  return getAction('package_activity_list', params, 'package_activity_list');
}

/**
 * Global activity feed for recently changed datasets (CKAN recently_changed_packages_activity_list).
 * @param {{ since_time?: string, limit?: number, offset?: number }} [args]
 * @returns {Promise<any>}
 */
export async function recentlyChangedPackagesActivityList(args = {}) {
  // Provide a tighter default window (1h) to avoid heavy queries and timeouts
  const defaultSince = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
  const params = {
    since_time: args.since_time || defaultSince,
    limit:
      typeof args.limit === 'number'
        ? Math.min(Math.max(0, args.limit), CONFIG.MAX_ROWS)
        : undefined,
    offset: typeof args.offset === 'number' ? Math.max(0, args.offset) : undefined,
  };
  return getAction(
    'recently_changed_packages_activity_list',
    params,
    'recently_changed_packages_activity_list'
  );
}

/**
 * Organizations / Groups / Tags
 */
/**
 * List organizations (CKAN organization_list).
 * @param {{ all_fields?: boolean, limit?: number, offset?: number }} [args]
 * @returns {Promise<any>}
 */
export async function organizationList(args = {}) {
  const params = {
    all_fields: args.all_fields,
    limit:
      typeof args.limit === 'number'
        ? Math.min(Math.max(0, args.limit), CONFIG.MAX_ROWS)
        : undefined,
    offset: args.offset,
  };
  return getAction('organization_list', params, 'organization_list');
}

/**
 * Get organization by id or name (CKAN organization_show).
 * @param {{id: string}|string} id
 * @returns {Promise<any>}
 */
export async function organizationShow(id) {
  const orgId = (id && typeof id === 'object') ? id.id : id;
  return getAction('organization_show', { id: orgId }, 'organization_show');
}

/**
 * List groups (CKAN group_list).
 * @param {{ order_by?: string, limit?: number, offset?: number, all_fields?: boolean }} [args]
 * @returns {Promise<any>}
 */
export async function groupList(args = {}) {
  const params = {
    order_by: args.order_by,
    limit:
      typeof args.limit === 'number'
        ? Math.min(Math.max(0, args.limit), CONFIG.MAX_ROWS)
        : undefined,
    offset: args.offset,
    all_fields: args.all_fields,
  };
  return getAction('group_list', params, 'group_list');
}

/**
 * Get group by id or name (CKAN group_show).
 * @param {{id: string}|string} id
 * @returns {Promise<any>}
 */
export async function groupShow(id) {
  const groupId = (id && typeof id === 'object') ? id.id : id;
  return getAction('group_show', { id: groupId }, 'group_show');
}

/**
 * List tags (CKAN tag_list).
 * @param {{ query?: string }} [args]
 * @returns {Promise<any>}
 */
export async function tagList(args = {}) {
  const params = {
    query: args.query,
  };
  // CKAN tag_list does not support limit directly; tag_autocomplete does.
  return getAction('tag_list', params, 'tag_list');
}

/**
 * Autocomplete tags (CKAN tag_autocomplete).
 * @param {{ q: string, limit?: number }|string} argsOrQ
 * @param {number} [limit]
 * @returns {Promise<{ result?: Array<{name: string}> }|any>}
 */
export async function tagAutocomplete(argsOrQ, limit) {
  const q = argsOrQ && typeof argsOrQ === 'object' ? argsOrQ.q : argsOrQ;
  const lim =
    argsOrQ && typeof argsOrQ === 'object' ? argsOrQ.limit : limit;

  const params = {
    q,
    limit:
      typeof lim === 'number'
        ? Math.min(Math.max(0, lim), CONFIG.MAX_ROWS)
        : undefined,
  };
  const res = await getAction('tag_autocomplete', params, 'tag_autocomplete');
  // Normalize result shape to array of { name }
  if (res && Array.isArray(res.result)) {
    const normalized = res.result.map((item) =>
      typeof item === 'string' ? { name: item } : item
    );
    return { ...res, result: normalized };
  }
  return res;
}

/**
 * List known licenses (CKAN license_list).
 * @returns {Promise<any>}
 */
export async function licenseList() {
  return getAction('license_list', {}, 'license_list');
}

/**
 * List vocabularies (CKAN vocabulary_list).
 * @returns {Promise<any>}
 */
export async function vocabularyList() {
  return getAction('vocabulary_list', {}, 'vocabulary_list');
}

/**
 * Get vocabulary details (CKAN vocabulary_show).
 * @param {{id: string}|string} id - Vocabulary name/id
 * @returns {Promise<any>}
 */
export async function vocabularyShow(id) {
  const vocabId = (id && typeof id === 'object') ? id.id : id;
  return getAction('vocabulary_show', { id: vocabId }, 'vocabulary_show');
}

/**
 * Get tag details (CKAN tag_show).
 * @param {{id: string}|string} id - Tag name/id
 * @returns {Promise<any>}
 */
export async function tagShow(id) {
  const tagId = (id && typeof id === 'object') ? id.id : id;
  return getAction('tag_show', { id: tagId }, 'tag_show');
}

/**
 * Resources & Views
 */
/**
 * Get resource by id (CKAN resource_show).
 * @param {{id: string}|string} id
 * @returns {Promise<any>}
 */
export async function resourceShow(id) {
  const resourceId = (id && typeof id === 'object') ? id.id : id;
  return getAction('resource_show', { id: resourceId }, 'resource_show');
}

/**
 * Get resource view by id (CKAN resource_view_show).
 * @param {{id: string}|string} id
 * @returns {Promise<any>}
 */
export async function resourceViewShow(id) {
  const viewId = (id && typeof id === 'object') ? id.id : id;
  return getAction('resource_view_show', { id: viewId }, 'resource_view_show');
}

/**
 * List views for a resource (CKAN resource_view_list).
 * @param {{resource_id?: string, id?: string}|string} argsOrId - Resource id or object containing it
 * @returns {Promise<any>}
 */
export async function resourceViewList(argsOrId) {
  const resId =
    argsOrId && typeof argsOrId === 'object'
      ? (argsOrId.resource_id || argsOrId.id)
      : argsOrId;
  return getAction('resource_view_list', { id: resId }, 'resource_view_list');
}

/**
 * Platform status / help
 */
/**
 * Platform status (CKAN status_show).
 * @returns {Promise<any>}
 */
export async function statusShow() {
  return getAction('status_show', {}, 'status_show');
}

/**
 * Show CKAN help for a given action (CKAN help_show).
 * @param {string} name - Action name, e.g., "package_search"
 * @returns {Promise<any>}
 */
export async function helpShow(name) {
  return getAction('help_show', { name }, 'help_show');
}

/**
 * Datastore
 */
/**
 * Get datastore info (CKAN datastore_info).
 * @param {string} id - Resource id
 * @param {boolean} [include_private]
 * @returns {Promise<any>}
 */
export async function datastoreInfo(id, include_private) {
  const params = { id, include_private };
  return getAction('datastore_info', params, 'datastore_info');
}

/**
 * Search datastore (CKAN datastore_search).
 * Prefer POST when using object filters/q to avoid URL-length issues.
 * @param {{
 *   resource_id: string, q?: string|Record<string, any>, filters?: Record<string, any>,
 *   fields?: string[], sort?: string, language?: string, include_total?: boolean,
 *   limit?: number, offset?: number, distinct?: boolean, plain?: boolean, full_text?: boolean
 * }} args
 * @returns {Promise<any>}
 */
export async function datastoreSearch(args) {
  const {
    resource_id,
    q,
    filters,
    fields,
    sort,
    language,
    include_total,
    limit,
    offset,
    distinct,
    plain,
    full_text,
  } = args;

  const safeLimit =
    typeof limit === 'number'
      ? Math.min(Math.max(0, limit), CONFIG.MAX_ROWS)
      : CONFIG.DEFAULT_ROWS;

  // Prefer POST when passing complex objects (filters/q objects) to avoid URL size issues
  const usePost =
    (filters && typeof filters === 'object') ||
    (q && typeof q === 'object') ||
    (fields && Array.isArray(fields));

  const payload = {
    resource_id,
    q,
    filters,
    fields,
    sort,
    language,
    include_total:
      typeof include_total === 'boolean' ? include_total : false,
    limit: safeLimit,
    offset,
    distinct,
    plain,
    full_text,
  };

  if (usePost) {
    return postAction('datastore_search', payload, 'datastore_search');
  }
  // GET with encoded parameters
  const params = {
    resource_id,
    q,
    filters,
    fields,
    sort,
    language,
    include_total:
      typeof include_total === 'boolean' ? include_total : false,
    limit: safeLimit,
    offset,
    distinct,
    plain,
    full_text,
  };
  return getAction('datastore_search', params, 'datastore_search');
}

/**
 * Execute SQL query against datastore (CKAN datastore_search_sql).
 * SQL must be read-only; DDL/DML verbs are blocked.
 * @param {{sql: string}|string} argsOrSql
 * @returns {Promise<any>}
 * @throws {Error} If SQL disabled via config or forbidden verb detected
 */
export async function datastoreSearchSql(argsOrSql) {
  const sql =
    argsOrSql && typeof argsOrSql === 'object' ? argsOrSql.sql : argsOrSql;

  if (!CONFIG.ENABLE_SQL) {
    throw new Error(
      '[CKAN datastore_search_sql] Disabled by server configuration (ENABLE_SQL=false)'
    );
  }
  // Basic guardrail: deny obvious DDL/DML
  const forbidden = /\b(drop|delete|update|insert|alter|create|grant|revoke)\b/i;
  if (forbidden.test(sql)) {
    throw new Error('[CKAN datastore_search_sql] Forbidden SQL verb detected');
  }
  return postAction('datastore_search_sql', { sql }, 'datastore_search_sql');
}

/**
 * Small helper to fetch arbitrary resource URLs (non-CKAN /action).
 * Returns an object with contentType and base64 data.
 */
/**
 * Fetch arbitrary resource (non-CKAN /action), returning base64 data and contentType.
 * @param {string} url
 * @param {number} [maxBytes=5*1024*1024] - Max allowed size (bytes)
 * @returns {Promise<{ contentType: string, base64: string }>}
 */
export async function fetchResource(url, maxBytes = 5 * 1024 * 1024) {
  try {
    const res = await ky.get(url, {
      timeout: CONFIG.TIMEOUT_MS,
      headers: { 'user-agent': CONFIG.USER_AGENT },
    });
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const ab = await res.arrayBuffer();
    if (ab.byteLength > maxBytes) {
      throw new Error(
        `Resource exceeds maximum allowed size (${ab.byteLength} > ${maxBytes})`
      );
    }
    const base64 = Buffer.from(ab).toString('base64');
    return { contentType, base64 };
  } catch (e) {
    throw await mapError(e, 'fetch_resource');
  }
}
