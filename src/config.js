import dotenv from 'dotenv';

dotenv.config();

/**
 * Server configuration resolved from environment variables.
 * @typedef {Object} Config
 * @property {string} BASE_URL Base CKAN action URL (no trailing slash)
 * @property {boolean} ENABLE_SQL Enable datastore_search_sql helper
 * @property {number} TIMEOUT_MS Default HTTP timeout in milliseconds
 * @property {string} USER_AGENT User-Agent header sent to CKAN
 * @property {number} MAX_ROWS Maximum allowed rows parameter for list/search
 * @property {number} DEFAULT_ROWS Default rows when not provided
 */
/** @type {Config} */
export const CONFIG = {
  BASE_URL: process.env.BASE_URL?.trim() || 'https://opendata.swiss/api/3/action',
  ENABLE_SQL: (process.env.ENABLE_SQL || 'false').toLowerCase() === 'true',
  TIMEOUT_MS: Number.isFinite(Number(process.env.TIMEOUT_MS))
    ? Number(process.env.TIMEOUT_MS)
    : 15000,
  USER_AGENT:
    process.env.USER_AGENT?.trim() || 'schwaizer-opendata-mcp/0.1.0 (+https://opendata.swiss)',
  MAX_ROWS: Number.isFinite(Number(process.env.MAX_ROWS))
    ? Number(process.env.MAX_ROWS)
    : 1000,
  DEFAULT_ROWS: Number.isFinite(Number(process.env.DEFAULT_ROWS))
    ? Number(process.env.DEFAULT_ROWS)
    : 25,
};
