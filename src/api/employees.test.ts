import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmployee, deactivateEmployee, listEmployees, reactivateEmployee, updateEmployee } from './employees.ts';
import { ApiError } from './http.ts';

const sample = {
  id: 'emp_1',
  firstName: 'Avery',
  lastName: 'Chen',
  email: 'avery.chen@example.com',
  department: 'Engineering',
  title: 'Staff Engineer',
  hireDate: '2022-04-18',
  status: 'active',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('employee API', () => {
  it('lists a page of employees and accepts snake_case fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          {
            id: 'emp_2',
            first_name: 'Jordan',
            last_name: 'Hale',
            email: 'jordan.hale@example.com',
            department: 'People',
            title: 'HR Partner',
            hire_date: '2021-11-02T00:00:00',
            status: 'ACTIVE',
          },
        ],
        total: 40,
        page: 2,
        pageSize: 10,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await listEmployees({ page: 2, pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/employees?page=2&pageSize=10',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
    expect(result).toEqual({
      items: [
        {
          id: 'emp_2',
          firstName: 'Jordan',
          lastName: 'Hale',
          email: 'jordan.hale@example.com',
          department: 'People',
          title: 'HR Partner',
          hireDate: '2021-11-02',
          status: 'active',
        },
      ],
      total: 40,
      page: 2,
      pageSize: 10,
    });
  });

  it('defaults the directory request to page 1 and pageSize 25', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, pageSize: 25 }));
    vi.stubGlobal('fetch', fetchMock);

    await listEmployees();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/employees?page=1&pageSize=25');
  });

  it('rejects a bare employee array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([sample])));

    await expect(listEmployees()).rejects.toThrow(/not a page/);
  });

  it('rejects a page missing total', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ items: [sample], page: 1, pageSize: 25 })),
    );

    await expect(listEmployees()).rejects.toThrow(/missing total/);
  });

  it('creates and updates with camelCase JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...sample, id: 'emp_new' }, 201))
      .mockResolvedValueOnce(jsonResponse({ ...sample, id: 'emp_new', title: 'Principal Engineer' }));
    vi.stubGlobal('fetch', fetchMock);

    const created = await createEmployee({
      firstName: 'Avery',
      lastName: 'Chen',
      email: 'avery.chen@example.com',
      department: 'Engineering',
      title: 'Staff Engineer',
      hireDate: '2022-04-18',
      status: 'active',
    });
    const updated = await updateEmployee('emp_new', { title: 'Principal Engineer' });

    const post = fetchMock.mock.calls[0];
    expect(post?.[0]).toBe('http://localhost:8000/employees');
    expect(post?.[1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(post?.[1].body))).toMatchObject({ firstName: 'Avery', hireDate: '2022-04-18' });
    expect(created.id).toBe('emp_new');

    const patch = fetchMock.mock.calls[1];
    expect(patch?.[0]).toBe('http://localhost:8000/employees/emp_new');
    expect(patch?.[1]).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(String(patch?.[1].body))).toEqual({ title: 'Principal Engineer' });
    expect(updated.title).toBe('Principal Engineer');
  });

  it('deactivates and reactivates with a status patch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...sample, status: 'inactive' }))
      .mockResolvedValueOnce(jsonResponse(sample));
    vi.stubGlobal('fetch', fetchMock);

    const inactive = await deactivateEmployee('emp/1');
    const active = await reactivateEmployee('emp/1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/employees/emp%2F1');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1].body))).toEqual({ status: 'inactive' });
    expect(fetchMock.mock.calls[0]?.[1].method).toBe('PATCH');
    expect(inactive.status).toBe('inactive');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1].body))).toEqual({ status: 'active' });
    expect(active.status).toBe('active');
  });

  it('surfaces FastAPI validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email address' }] },
          422,
        ),
      ),
    );

    await expect(listEmployees()).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: 'email: value is not a valid email address',
    } satisfies Partial<ApiError>);
  });

  it('reports a down API as a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(listEmployees()).rejects.toThrow(/Cannot reach the GrokHR API/);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
