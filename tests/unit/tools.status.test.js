import { describe, it, expect, vi } from 'vitest';

// ESM mocking of the CKAN client used by the tool handlers
vi.mock('../../src/api/ckan-client.js', () => ({
  statusShow: vi.fn(async () => ({ success: true, result: { site_read_only: false } })),
  helpShow: vi.fn(async (name) => ({ success: true, result: { name, help: 'ok' } })),
}));

import { getStatusHandlers } from '../../src/tools/status.js';
import { statusShow, helpShow } from '../../src/api/ckan-client.js';

describe('status tools', () => {
  it('status_show returns JSON content and not error', async () => {
    const handlers = getStatusHandlers();
    const res = await handlers.status_show({});
    expect(res).toBeTruthy();
    expect(res.isError).toBeUndefined();
    expect(Array.isArray(res.content)).toBe(true);
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(statusShow).toHaveBeenCalledTimes(1);
  });

  it('help_show validates args and calls API', async () => {
    const handlers = getStatusHandlers();
    // Missing "name" -> validation error
    const invalid = await handlers.help_show({});
    expect(invalid.isError).toBe(true);

    // Valid call
    const res = await handlers.help_show({ name: 'package_show' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"package_show"');
    expect(helpShow).toHaveBeenCalledWith('package_show');
  });
});
