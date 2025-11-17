import { describe, it, expect, vi } from 'vitest';

// Mock CKAN client used by resources tool handlers (additions)
vi.mock('../../src/api/ckan-client.js', () => ({
  resourceShow: vi.fn(async (id) => ({
    success: true,
    result: { id, type: 'resource' },
  })),
  resourceViewShow: vi.fn(async (id) => ({
    success: true,
    result: { id, type: 'resource_view' },
  })),
  resourceViewList: vi.fn(async (resource_id) => ({
    success: true,
    result: [{ id: 'view-1' }, { id: 'view-2' }],
    resource_id,
  })),
}));

import { getResourcesHandlers } from '../../src/tools/resources.js';
import {
  resourceShow,
  resourceViewShow,
  resourceViewList,
} from '../../src/api/ckan-client.js';

describe('resources additions tools', () => {
  it('resource_show validates and calls API', async () => {
    const handlers = getResourcesHandlers();

    const invalid = await handlers.resource_show({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.resource_show({ id: 'r1' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(resourceShow).toHaveBeenCalledWith('r1');
  });

  it('resource_view_show validates and calls API', async () => {
    const handlers = getResourcesHandlers();

    const invalid = await handlers.resource_view_show({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.resource_view_show({ id: 'rv1' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(resourceViewShow).toHaveBeenCalledWith('rv1');
  });

  it('resource_view_list validates and calls API', async () => {
    const handlers = getResourcesHandlers();

    const invalid = await handlers.resource_view_list({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.resource_view_list({ resource_id: 'r1' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(resourceViewList).toHaveBeenCalledWith('r1');
  });
});
