import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmployee, deleteEmployee, listEmployees, reactivateEmployee, updateEmployee } from './employees.ts';
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
  it('lists employees and accepts snake_case plus wrapped pages', async () => {
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
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const rows = await listEmployees();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/employees',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) }),
    );
    expect(rows).toEqual([
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
    ]);
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

  it('deletes an employee with DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await deleteEmployee('emp/1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/employees/emp%2F1');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' });
    expect(fetchMock.mock.calls[0]?.[1].body).toBeUndefined();
  });

  it('surfaces a delete conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ detail: 'Employee is referenced by an open review' }, 409)),
    );

    await expect(deleteEmployee('emp_1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Employee is referenced by an open review',
    } satisfies Partial<ApiError>);
  });

  it('reactivates with a status patch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sample));
    vi.stubGlobal('fetch', fetchMock);

    const active = await reactivateEmployee('emp/1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8000/employees/emp%2F1');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1].body))).toEqual({ status: 'active' });
    expect(fetchMock.mock.calls[0]?.[1].method).toBe('PATCH');
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
