import { describe, it, expect, vi } from 'vitest';

// Mock CKAN client used by datastore tool handlers
vi.mock('../../src/api/ckan-client.js', () => ({
  datastoreInfo: vi.fn(async (id, include_private) => ({
    success: true,
    result: { id, include_private: !!include_private, fields: [{ id: '_id', type: 'int' }] },
  })),
  datastoreSearch: vi.fn(async (args) => ({
    success: true,
    result: {
      resource_id: args.resource_id,
      total: args.include_total ? 1 : undefined,
      records: [{ _id: 1, name: 'row1' }],
    },
  })),
  datastoreSearchSql: vi.fn(async (sql) => ({
    success: true,
    result: { sql, records: [{ _id: 1 }] },
  })),
}));

import { getDatastoreHandlers } from '../../src/tools/datastore.js';
import {
  datastoreInfo,
  datastoreSearch,
  datastoreSearchSql,
} from '../../src/api/ckan-client.js';

describe('datastore tools', () => {
  it('datastore_info validates and calls API', async () => {
    const handlers = getDatastoreHandlers();

    const invalid = await handlers.datastore_info({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.datastore_info({ id: 'resource-1', include_private: true });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(datastoreInfo).toHaveBeenCalledWith('resource-1', true);
  });

  it('datastore_search validates and calls API', async () => {
    const handlers = getDatastoreHandlers();

    const invalid = await handlers.datastore_search({}); // missing resource_id
    expect(invalid.isError).toBe(true);

    const res = await handlers.datastore_search({
      resource_id: 'resource-1',
      q: { name: 'john' },
      include_total: true,
      limit: 5,
    });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"resource-1"');
    expect(text).toContain('"records"');
    expect(datastoreSearch).toHaveBeenCalledTimes(1);
    expect(datastoreSearch).toHaveBeenCalledWith(
      expect.objectContaining({ resource_id: 'resource-1', limit: 5 })
    );
  });

  it('datastore_search_sql validates and calls API', async () => {
    const handlers = getDatastoreHandlers();

    const invalid = await handlers.datastore_search_sql({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.datastore_search_sql({ sql: 'SELECT * FROM "abc"' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('SELECT *');
    expect(datastoreSearchSql).toHaveBeenCalledWith('SELECT * FROM "abc"');
  });
});
