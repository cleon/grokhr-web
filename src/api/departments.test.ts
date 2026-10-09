import { afterEach, describe, expect, it, vi } from 'vitest';
import { listDepartments } from './departments.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('department API', () => {
  it('lists departments from GET /departments', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([{ id: 'dept_eng', name: 'Engineering', extra: true }]),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listDepartments()).resolves.toEqual([{ id: 'dept_eng', name: 'Engineering' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/departments',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
  });

  it('rejects a payload that is not a list of id and name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ departments: [] })));
    await expect(listDepartments()).rejects.toThrow(/not a list/);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 'dept_eng' }])));
    await expect(listDepartments()).rejects.toThrow(/missing name/);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
