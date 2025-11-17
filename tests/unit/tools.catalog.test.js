import { describe, it, expect, vi } from 'vitest';

// Mock CKAN client used by catalog tool handlers
vi.mock('../../src/api/ckan-client.js', () => ({
  packageSearch: vi.fn(async (args) => ({
    success: true,
    result: { count: 1, q: args?.q ?? '', results: [{ id: 'ds1', name: 'dataset-1' }] },
  })),
  packageShow: vi.fn(async (id) => ({
    success: true,
    result: { id, name: 'dataset-1' },
  })),
}));

import { getCatalogHandlers } from '../../src/tools/catalog.js';
import { packageSearch, packageShow } from '../../src/api/ckan-client.js';

describe('catalog tools', () => {
  it('package_search validates and calls API', async () => {
    const handlers = getCatalogHandlers();

    // invalid: rows must be positive int (negative value)
    const invalid = await handlers.package_search({ rows: -5 });
    expect(invalid.isError).toBe(true);

    const res = await handlers.package_search({ q: 'water', rows: 10 });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(text).toContain('"water"');
    expect(packageSearch).toHaveBeenCalledTimes(1);
    expect(packageSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'water', rows: 10 })
    );
  });

  it('package_show validates and calls API', async () => {
    const handlers = getCatalogHandlers();

    // invalid: missing id
    const invalid = await handlers.package_show({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.package_show({ id: 'ds1' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"ds1"');
    expect(packageShow).toHaveBeenCalledWith('ds1');
  });
});
