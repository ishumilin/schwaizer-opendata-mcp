import { describe, it, expect, vi } from 'vitest';

// Mock CKAN client used by org-taxonomy tool handlers (additions)
vi.mock('../../src/api/ckan-client.js', () => ({
  organizationList: vi.fn(async (args) => ({
    success: true,
    result: [{ id: 'org1' }, { id: 'org2' }],
    args,
  })),
  organizationShow: vi.fn(async (id) => ({
    success: true,
    result: { id, title: 'An Organization' },
  })),
  groupList: vi.fn(async (args) => ({
    success: true,
    result: [{ name: 'group-a' }, { name: 'group-b' }],
    args,
  })),
  groupShow: vi.fn(async (id) => ({
    success: true,
    result: { id, title: 'A Group' },
  })),
  tagList: vi.fn(async (args) => ({
    success: true,
    result: [{ name: 'open-data' }, { name: 'switzerland' }],
    args,
  })),
  tagAutocomplete: vi.fn(async (q, limit) => ({
    success: true,
    result: [{ name: 'opendata' }, { name: 'opendataswiss' }].slice(0, limit || 2),
    q,
    limit,
  })),
  licenseList: vi.fn(async () => ({
    success: true,
    result: [{ id: 'odc-odbl' }, { id: 'cc-by' }],
  })),
  vocabularyList: vi.fn(async () => ({
    success: true,
    result: [{ name: 'tags' }, { name: 'themes' }],
  })),
  vocabularyShow: vi.fn(async (id) => ({
    success: true,
    result: { name: id, tags: [{ name: 'health' }] },
  })),
  tagShow: vi.fn(async (id) => ({
    success: true,
    result: { name: id, packages: 10 },
  })),
}));

import { getOrgTaxonomyHandlers } from '../../src/tools/org-taxonomy.js';
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
} from '../../src/api/ckan-client.js';

describe('org-taxonomy additions tools', () => {
  it('organization_list validates and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const invalid = await handlers.organization_list({ limit: -1 });
    expect(invalid.isError).toBe(true);

    const res = await handlers.organization_list({ limit: 5, offset: 0, all_fields: true });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(organizationList).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 0, all_fields: true })
    );
  });

  it('organization_show requires id and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const invalid = await handlers.organization_show({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.organization_show({ id: 'org1' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(organizationShow).toHaveBeenCalledWith('org1');
  });

  it('group_list validates and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const invalid = await handlers.group_list({ limit: -2 });
    expect(invalid.isError).toBe(true);

    const res = await handlers.group_list({ order_by: 'title', limit: 3, offset: 1, all_fields: false });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(groupList).toHaveBeenCalledWith(
      expect.objectContaining({ order_by: 'title', limit: 3, offset: 1, all_fields: false })
    );
  });

  it('group_show requires id and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const invalid = await handlers.group_show({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.group_show({ id: 'grp1' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(groupShow).toHaveBeenCalledWith('grp1');
  });

  it('tag_list accepts optional query and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const res = await handlers.tag_list({ query: 'open' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(tagList).toHaveBeenCalledWith(expect.objectContaining({ query: 'open' }));
  });

  it('tag_autocomplete validates and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const invalid = await handlers.tag_autocomplete({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.tag_autocomplete({ q: 'open', limit: 1 });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(tagAutocomplete).toHaveBeenCalledWith('open', 1);
  });

  it('license_list accepts empty args and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const res = await handlers.license_list({});
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(licenseList).toHaveBeenCalled();
  });

  it('vocabulary_list accepts empty args and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const res = await handlers.vocabulary_list({});
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(vocabularyList).toHaveBeenCalled();
  });

  it('vocabulary_show requires id and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const invalid = await handlers.vocabulary_show({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.vocabulary_show({ id: 'tags' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(vocabularyShow).toHaveBeenCalledWith('tags');
  });

  it('tag_show requires id and calls API', async () => {
    const handlers = getOrgTaxonomyHandlers();

    const invalid = await handlers.tag_show({});
    expect(invalid.isError).toBe(true);

    const res = await handlers.tag_show({ id: 'opendata' });
    expect(res.isError).toBeUndefined();
    const text = res.content[0]?.text || '';
    expect(text).toContain('"success": true');
    expect(tagShow).toHaveBeenCalledWith('opendata');
  });
});
