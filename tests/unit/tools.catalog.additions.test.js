import { describe, it, expect, vi } from 'vitest';

// Mock CKAN client used by catalog tool handlers (additions)
vi.mock('../../src/api/ckan-client.js', () => ({
  packageList: vi.fn(async (args) => ({
    success: true,
    result: { results: ['ds1', 'ds2'], ...args },
  })),
  currentPackageListWithResources: vi.fn(async (args) => ({
    success: true,
    result: [{ id: 'ds1', resources: [{ id: 'r1' }] }],
    args,
  })),
  packageAutocomplete: vi.fn(async (q, limit) => ({
    success: true,
    result: [{ name: 'dataset-1' }, { name: 'dataset-2' }].slice(0, limit || 2),
    q,
    limit,
  })),
  packageActivityList: vi.fn(async (args) => ({
    success: true,
    result: [{ activity: 'new', id: args?.id }],
  })),
  recentlyChangedPackagesActivityList: vi.fn(async (args) => ({
    success: true,
    result: [{ id: 'ds1' }, { id: 'ds2' }],
    args,
  })),
}));

import { getCatalogHandlers } from '../../src/tools/catalog.js';
import {
  packageList,
  currentPackageListWithResources,
  packageAutocomplete,
  packageActivityList,
  recentlyChangedPackagesActivityList,
} from '../../src/api/ckan-client.js';

describe('catalog additions tools', () => {
  it('package_list validates and calls API', async () => {
    const handlers = getCatalogHandlers();

    const invalid = await handlers.package_list({ limit: -1 });
    expect(invalid.isError).toBe(true);

    const res = await handlers.package_list({ limit: 10, offset: 0 });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(packageList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 })
    );
  });

  it('current_package_list_with_resources validates and calls API', async () => {
    const handlers = getCatalogHandlers();

    const invalid = await handlers.current_package_list_with_resources({ limit: -5 });
    expect(invalid.isError).toBe(true);

    const res = await handlers.current_package_list_with_resources({ limit: 5 });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(currentPackageListWithResources).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5 })
    );
  });

  it('package_autocomplete validates and calls API', async () => {
    const handlers = getCatalogHandlers();

    const invalid = await handlers.package_autocomplete({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.package_autocomplete({ q: 'wat', limit: 1 });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(packageAutocomplete).toHaveBeenCalledWith('wat', 1);
  });

  it('package_activity_list validates and calls API', async () => {
    const handlers = getCatalogHandlers();

    const invalid = await handlers.package_activity_list({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.package_activity_list({ id: 'ds1', limit: 2 });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(packageActivityList).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ds1', limit: 2 })
    );
  });

  it('recently_changed_packages_activity_list validates and calls API', async () => {
    const handlers = getCatalogHandlers();

    const res = await handlers.recently_changed_packages_activity_list({
      since_time: '2024-01-01T00:00:00Z',
      limit: 2,
    });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(recentlyChangedPackagesActivityList).toHaveBeenCalledWith(
      expect.objectContaining({ since_time: '2024-01-01T00:00:00Z', limit: 2 })
    );
  });
});
